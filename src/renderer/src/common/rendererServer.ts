// Note: this is a very simple HTTP server to serve the renderer files from out/renderer. This is needed so that we can
// authenticate with GitHub OAuth when running the packaged version of OpenCOR. This means that we can get away with not
// checking a lot of things since the server is only accessible from localhost and only serves our own files. Still, we
// must make sure that a request cannot result in an exception being thrown in our main process.

import { createReadStream, promises as fs } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pipeline } from 'node:stream';

let rendererServer: http.Server | null = null;
let rendererBaseUrl: string | null = null;

export const startRendererServer = async (preferredPort: number = 0): Promise<string> => {
  // Note: we try to use the given preferred port (if any), so that the origin of our renderer remains the same from one
  //       launch to another (see src/main/index.ts), and fall back on a random available port if it cannot be used
  //       (e.g., because it is already in use by another application).

  // If we already have a base URL then return it.

  if (rendererBaseUrl) {
    return rendererBaseUrl;
  }

  // Create and start our HTTP server.
  // Note: we only support the MIME types that are needed by our renderer (check the files in out/renderer).

  const rendererDistPath = path.resolve(import.meta.dirname, '../../out/renderer');
  const rendererHost = 'localhost';
  const MIME_TYPES: Record<string, string> = {
    '.css': 'text/css',
    '.eot': 'application/vnd.ms-fontobject',
    '.html': 'text/html; charset=UTF-8',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  const notFound = (response: http.ServerResponse): void => {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    response.end('Not found');
  };

  const handleRequest = async (request: http.IncomingMessage, response: http.ServerResponse): Promise<void> => {
    // Retrieve the requested path (ignoring any query string or fragment, and decoding any percent-encoded character)
    // or default to /index.html.

    let requestPath: string;

    try {
      requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    } catch {
      notFound(response);

      return;
    }

    if (requestPath === '/') {
      requestPath = '/index.html';
    }

    // Make sure that the requested path is a file within our renderer distribution.
    // Note: since we decode the requested path, it could otherwise be used to access a file outside of our renderer
    //       distribution (e.g., using %2E%2E%2F, i.e. ../).

    const filePath = path.join(rendererDistPath, requestPath);

    if (!filePath.startsWith(rendererDistPath + path.sep)) {
      notFound(response);

      return;
    }

    try {
      if (!(await fs.stat(filePath)).isFile()) {
        notFound(response);

        return;
      }
    } catch {
      notFound(response);

      return;
    }

    // Set the headers and stream the file.
    // Note: we use pipeline() rather than pipe() so that our read stream gets destroyed (and its file descriptor
    //       closed) if the client aborts the request. Also, an error may still occur while streaming the file, in which
    //       case our headers will have been sent, so we can only destroy our response (trying to send a 404 would throw
    //       an ERR_HTTP_HEADERS_SENT error in our main process).

    const ext = path.extname(filePath).toLowerCase();

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    });

    pipeline(createReadStream(filePath), response, (error) => {
      if (error && !response.destroyed) {
        response.destroy();
      }
    });
  };

  // Optimise TCP for localhost connections by disabling Nagle's algorithm.

  rendererServer = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
    handleRequest(request, response).catch(() => {
      if (response.headersSent) {
        response.destroy();
      } else {
        notFound(response);
      }
    });
  });

  rendererServer.on('connection', (socket) => socket.setNoDelay(true));

  // Start listening on our preferred port or, if it cannot be used, on a random available port.

  const listen = (port: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      // Handle any errors that occur while starting the server.

      const onError = (error: Error): void => {
        reject(error);
      };

      rendererServer?.once('error', onError);

      // Start the server listening.

      rendererServer?.listen(port, rendererHost, () => {
        rendererServer?.off('error', onError);

        const addressInfo = rendererServer?.address() as AddressInfo | null;

        if (addressInfo?.port) {
          rendererBaseUrl = `http://${rendererHost}:${addressInfo.port}`;

          resolve();
        } else {
          reject(new Error("Failed to determine the renderer server's port."));
        }
      });
    });
  };

  try {
    await listen(preferredPort);
  } catch (error: unknown) {
    if (!preferredPort) {
      throw error;
    }

    await listen(0);
  }

  if (!rendererBaseUrl) {
    throw new Error('Failed to initialise the renderer server.');
  }

  return rendererBaseUrl;
};

export const stopRendererServer = async (): Promise<void> => {
  // Make sure that we have a server to stop.

  if (!rendererServer) {
    return;
  }

  // Close the server.

  await new Promise<void>((resolve, reject) => {
    rendererServer?.close((error) => {
      if (error) {
        // An error occurred, so reject the promise.

        reject(error);
      } else {
        resolve();
      }
    });
  });

  // Clear our server and base URL references.

  rendererServer = null;
  rendererBaseUrl = null;
};
