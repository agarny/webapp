// A simple CORS proxy handler for Cloudflare Workers (see https://workers.cloudflare.com/).
// Note: the proxy accepts any target URL, but it only returns content that is a CellML file, a SED-ML file, an OMEX file,
//       or a CSV file (as expected by the app), and that is not too large (see MAX_SIZE). Such content is returned as
//       an opaque, sandboxed download, so that a browser never renders or executes it.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'false'
};

const CONTENT_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/octet-stream',
  'Content-Security-Policy': "sandbox; default-src 'none'",
  'X-Content-Type-Options': 'nosniff'
};

const SNIFF_SIZE = 64 * 1024; // 64 KB.
const MAX_SIZE = 32 * 1024 * 1024; // 32 MB.
// Note: an OMEX file needs to be fully read (see forwardRequest()), so MAX_SIZE must be small enough for at least two
//       copies of it to fit in the memory available to a Cloudflare Worker (i.e. 128 MB).

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE = 0x07064b50;

const extractTargetUrl = (url) => url.searchParams.get('url');

const isValidTargetUrl = (targetUrl) => {
  try {
    return ['http:', 'https:'].includes(new URL(targetUrl).protocol);
  } catch {
    return false;
  }
};

const concatenate = (chunks, length) => {
  const bytes = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);

    offset += chunk.length;
  }

  return bytes;
};

const readBytes = async (reader, maxSize) => {
  // Read up to (roughly) the given number of bytes and let the caller know whether the end of the stream was reached.

  const chunks = [];
  let length = 0;
  let done = false;

  while (length < maxSize) {
    const result = await reader.read();

    if (result.done) {
      done = true;

      break;
    }

    chunks.push(result.value);

    length += result.value.length;
  }

  return { bytes: concatenate(chunks, length), done };
};

const replayStream = (bytes, reader) => {
  // Return a stream that first outputs the given bytes (i.e. those we already read to check the content) and then the
  // rest of the given reader's data, unless there is too much data, in which case the stream errors.

  let size = bytes.length;

  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
    },
    async pull(controller) {
      const { done, value } = await reader.read();

      if (done) {
        controller.close();

        return;
      }

      size += value.length;

      if (size > MAX_SIZE) {
        await reader.cancel();

        controller.error(new Error('The target content is too large.'));

        return;
      }

      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    }
  });
};

const isZipFile = (bytes) => {
  // Check that the given bytes are a ZIP file by looking for the local file header signature at the start of the file.

  return (
    bytes.length >= 4 &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) ===
      ZIP_LOCAL_FILE_HEADER_SIGNATURE
  );
};

const isOmexFile = (bytes) => {
  // An OMEX file is a ZIP file with a manifest.xml file at its root, so look for it in the ZIP file's central
  // directory.

  // Find the end of central directory record, which is at the end of the ZIP file, but may be followed by a comment of
  // up to 65,535 bytes.

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOfCentralDirectoryOffset = -1;

  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 22 - 0xffff); --offset) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      endOfCentralDirectoryOffset = offset;

      break;
    }
  }

  if (endOfCentralDirectoryOffset === -1) {
    return false;
  }

  // Use the ZIP64 end of central directory record, if needed.

  let nbOfEntries = view.getUint16(endOfCentralDirectoryOffset + 10, true);
  let offset = view.getUint32(endOfCentralDirectoryOffset + 16, true);

  if (
    (nbOfEntries === 0xffff || offset === 0xffffffff) &&
    endOfCentralDirectoryOffset >= 20 &&
    view.getUint32(endOfCentralDirectoryOffset - 20, true) === ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE
  ) {
    const zip64EndOfCentralDirectoryOffset = Number(view.getBigUint64(endOfCentralDirectoryOffset - 12, true));

    if (
      zip64EndOfCentralDirectoryOffset + 56 > bytes.length ||
      view.getUint32(zip64EndOfCentralDirectoryOffset, true) !== ZIP64_END_OF_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      return false;
    }

    nbOfEntries = Number(view.getBigUint64(zip64EndOfCentralDirectoryOffset + 32, true));
    offset = Number(view.getBigUint64(zip64EndOfCentralDirectoryOffset + 48, true));
  }

  // Look for a central directory entry with the name "manifest.xml".

  const textDecoder = new TextDecoder();

  for (let i = 0; i < nbOfEntries; ++i) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE) {
      return false;
    }

    const fileNameLength = view.getUint16(offset + 28, true);
    const extraFieldLength = view.getUint16(offset + 30, true);
    const fileCommentLength = view.getUint16(offset + 32, true);

    if (offset + 46 + fileNameLength > bytes.length) {
      return false;
    }

    if (textDecoder.decode(bytes.subarray(offset + 46, offset + 46 + fileNameLength)) === 'manifest.xml') {
      return true;
    }

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return false;
};

const xmlRootElement = (text) => {
  // Return the local name and namespace of the root element of the given XML text, skipping its prolog (i.e. its XML
  // declaration, processing instructions, comments, and document type declaration).

  const skipPast = (string, marker, from = 0) => {
    const index = string.indexOf(marker, from);

    return index === -1 ? null : string.slice(index + marker.length);
  };

  let rest = text;

  for (;;) {
    rest = rest.trimStart();

    if (rest.startsWith('<?')) {
      rest = skipPast(rest, '?>');
    } else if (rest.startsWith('<!--')) {
      rest = skipPast(rest, '-->');
    } else if (rest.startsWith('<!DOCTYPE')) {
      const internalSubsetStart = rest.indexOf('[');
      const declarationEnd = rest.indexOf('>');

      rest =
        internalSubsetStart !== -1 && internalSubsetStart < declarationEnd
          ? skipPast(rest, '>', rest.indexOf(']', internalSubsetStart))
          : skipPast(rest, '>');
    } else {
      break;
    }

    if (rest === null) {
      return null;
    }
  }

  const match = /^<(?:([\w.-]+):)?([\w.-]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/.exec(rest);

  if (!match) {
    return null;
  }

  const [, prefix, name, attributes] = match;
  const namespaceAttribute = prefix ? `xmlns:${prefix}` : 'xmlns';

  for (const [, attribute, doubleQuotedValue, singleQuotedValue] of attributes.matchAll(
    /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  )) {
    if (attribute === namespaceAttribute) {
      return { name, namespace: doubleQuotedValue ?? singleQuotedValue };
    }
  }

  return { name, namespace: null };
};

const isCellmlOrSedmlFile = (bytes) => {
  const rootElement = xmlRootElement(new TextDecoder().decode(bytes));

  if (!rootElement?.namespace) {
    return false;
  }

  return (
    (rootElement.name === 'model' && rootElement.namespace.startsWith('http://www.cellml.org/cellml/')) ||
    (rootElement.name === 'sedML' && rootElement.namespace.startsWith('http://sed-ml.org/'))
  );
};

const isCsvFile = (bytes, complete) => {
  // Check that the given bytes are a CSV file as expected by the app (see parseExternalCsvData()), i.e. text (without
  // control characters other than tabs and line breaks) where lines are separated by line breaks and values by commas,
  // and where there are at least two lines (i.e. a header and some data) and every line has the same number of values,
  // which must be at least two (i.e. a VOI column and a data column). Like the app, we decode the text as UTF-8
  // (replacing invalid byte sequences, like Response.text() does), trim lines, and skip blank lines.
  // Note: we don't check that the CSV file can be used by the app since the app can tell the user why it cannot be used
  //       (see parseExternalCsvData()). If we only have the start of the CSV file, then we ignore its last (and likely
  //       incomplete) line.

  const text = new TextDecoder().decode(bytes, { stream: !complete });

  // biome-ignore lint/suspicious/noControlCharactersInRegex: we are looking for control characters.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    return false;
  }

  const lines = text.split(/\r?\n/);

  if (!complete) {
    lines.pop();
  }

  let nbOfLines = 0;
  let nbOfValuesPerLine = -1;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const nbOfValues = trimmedLine.split(',').length;

    if (nbOfValues < 2 || (nbOfValuesPerLine !== -1 && nbOfValues !== nbOfValuesPerLine)) {
      return false;
    }

    nbOfValuesPerLine = nbOfValues;

    ++nbOfLines;
  }

  return nbOfLines >= 2;
};

const rejectedResponse = (reason) =>
  new Response(`Target content is not allowed (${reason}).`, {
    status: 403,
    headers: CONTENT_HEADERS
  });

const forwardRequest = async (targetUrl, request) => {
  const forwardHeaders = new Headers(request.headers);

  for (const header of [
    'authorization',
    'cookie',
    'connection',
    'if-range',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'range',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade'
  ]) {
    forwardHeaders.delete(header);
  }

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: forwardHeaders
  });

  // Note: we don't return the body of an error response since it is likely to be an HTML page.

  if (!response.ok || !response.body) {
    return response.ok
      ? rejectedResponse('no content')
      : new Response(null, {
          status: response.status,
          headers: CONTENT_HEADERS
        });
  }

  // Reject content that we know is too large.
  // Note: the content length may not be known or, if the content is compressed, it may be smaller than the actual size
  //       of the content, so we also check the size of the content as we read it.

  if (Number(response.headers.get('content-length')) > MAX_SIZE) {
    await response.body.cancel();

    return rejectedResponse('too large');
  }

  // A CellML, SED-ML, or CSV file only needs its start to be checked, after which it can be streamed.

  const reader = response.body.getReader();
  const { bytes: head, done } = await readBytes(reader, SNIFF_SIZE);

  if (isCellmlOrSedmlFile(head) || isCsvFile(head, done)) {
    return new Response(done ? head : replayStream(head, reader), {
      status: response.status,
      headers: CONTENT_HEADERS
    });
  }

  // An OMEX file needs to be fully read since we need its central directory, which is at the end of the file.

  if (!isZipFile(head)) {
    await reader.cancel();

    return rejectedResponse('not a CellML, SED-ML, OMEX, or CSV file');
  }

  let bytes = head;

  if (!done) {
    // Note: we read (up to) one more byte than allowed, so that we know whether the OMEX file is too large.

    const rest = await readBytes(reader, MAX_SIZE - head.length + 1);

    if (head.length + rest.bytes.length > MAX_SIZE) {
      await reader.cancel();

      return rejectedResponse('too large');
    }

    bytes = concatenate([head, rest.bytes], head.length + rest.bytes.length);
  }

  if (!isOmexFile(bytes)) {
    return rejectedResponse('OMEX file without a manifest.xml file');
  }

  return new Response(bytes, {
    status: response.status,
    headers: CONTENT_HEADERS
  });
};

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204, // No Content.
          headers: CORS_HEADERS
        });
      }

      const targetUrl = extractTargetUrl(url);

      if (!targetUrl) {
        return new Response('Missing "url" query parameter.', { status: 400 });
      }

      if (!isValidTargetUrl(targetUrl)) {
        return new Response('Target URL is not allowed.', { status: 403 });
      }

      if (request.method !== 'GET') {
        return new Response('Method not allowed.', { status: 405 });
      }

      return await forwardRequest(targetUrl, request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return new Response(`An error occurred: ${message}`, { status: 500 });
    }
  }
};
