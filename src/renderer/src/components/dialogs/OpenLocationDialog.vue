<template>
  <BaseDialog header="Open Location" class="w-169" @cancel="reset">
    <div class="flex flex-col gap-2 mt-1 mb-2">
      <p class="description">Enter the {{ inputDescription }} of a CellML file, SED-ML file, or COMBINE archive.</p>
      <IconField>
        <InputIcon class="pi pi-link" />
        <InputText ref="inputRef" v-model="url" autofocus fluid
          :invalid="showIssue"
          placeholder="https://example.com/model.omex"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          inputmode="url"
          @blur="checked = !!url.trim() && !normalisedUrl"
          @keydown.enter="onKeydownEnter"
        />
        <!--
        Note: our clear button is a real button (rather than an input icon) so that it can be used with the keyboard,
              but it is styled and positioned like an input icon (see .p-inputicon).
        -->
        <button v-if="url" class="p-inputicon clear-button pi pi-times" type="button" v-hint="'Clear'"
          @mousedown.prevent
          @click="onClear"
        />
      </IconField>

      <!--
      Message, which always takes the same space (whether there is a message to show or not), so that the height of the
      dialog doesn't change.
      -->

      <div class="message">
        <p v-if="showIssue" class="issue" role="alert">
          <i class="pi pi-exclamation-circle"></i>
          <span>Please enter a valid {{ validInputDescription }} (e.g., <code>https://example.com/model.omex</code>).</span>
        </p>
        <p v-else-if="normalisedUrl && normalisedUrl !== url.trim() && !normalisedUrl.startsWith('data:')" class="hint" v-hint="`Will open ${normalisedUrl}.`">
          <i class="pi pi-info-circle"></i>
          <span>Will open <code>{{ normalisedUrl }}</code>.</span>
        </p>
      </div>
    </div>
    <template #footer>
      <Button label="Open" :disabled="!normalisedUrl" @click="emitOpenLocation" />
      <Button label="Cancel" severity="secondary" @click="emitClose" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as common from '../../common/common';
import { electronApi } from '../../common/electronApi';
import { vHint } from '../../common/hint';

const emit = defineEmits<{
  openLocation: [url: string];
  close: [];
}>();

const url = vue.ref<string>('');
const checked = vue.ref<boolean>(false);

// The URL to open, if valid, i.e. the given URL without any leading/trailing whitespace, with a lowercase scheme (e.g.,
// "Https://" becomes "https://", as some mobile keyboards capitalise the first letter of what is typed), and with an
// https:// scheme if it has no scheme (e.g., "example.com/model.omex" becomes "https://example.com/model.omex").
// Note #1: a scheme is followed by "//", so that, for instance, "localhost:8080/model.omex" is not considered as having
//          a "localhost" scheme.
// Note #2: a URL without a scheme must have a host that looks like one (i.e. a domain name, an IP address, or
//          localhost), so that, for instance, some random text is not considered as a valid URL. A domain name or an
//          IPv4 address is a host (as typed, i.e. before it gets normalised by the URL parser) with at least two
//          dot-separated labels, none of which is empty (with an optional trailing dot), so that, for instance, a
//          relative path (e.g., "./model.omex", which host would be ".") is not considered as a valid URL. An IPv4
//          address must also be typed as the URL parser would normalise it (i.e. as four decimal numbers, without
//          leading zeros and without a trailing dot), so that, for instance, a number (e.g., "42" or "3.14", which the
//          URL parser would normalise to "0.0.0.42" or "3.0.0.14") or an address with leading zeros (e.g.,
//          "192.168.010.001", which the URL parser would normalise to "192.168.8.1" since "010" is an octal number) is
//          not considered as a valid URL. A URL with a scheme can have any host (e.g., an intranet host, such as
//          "http://modelserver/model.omex").
// Note #3: a data URL is also valid if it is a Base64-encoded COMBINE archive (i.e. "data:application/zip;base64,...")
//          or zipped CellML file (i.e. "data:application/x.vnd.zip-cellml+zip;base64,..."), since it can then be opened
//          like any other file (see OpenCOR.openFile() and locCommon.zipDataFromDataUrl()). It is used as is, apart
//          from its scheme, media type, and ";base64" which are lowercased (since locCommon.zipDataFromDataUrl()
//          expects them to be), so, unlike for other URLs, we don't let people know which URL will be opened since it
//          would be (nearly) the same and it can be very long.
// Note #4: a URL without a scheme must also have no user name and no password, so that, for instance, an email address
//          (e.g., "user@example.com") or a mailto link (e.g., "mailto:user@example.com", which has no "//" after its
//          scheme) is not considered as a valid URL, i.e. as "https://user@example.com" or as
//          "https://mailto:user@example.com" (where "mailto" would be a user name and "user" a password). A URL with a
//          scheme can have a user name and a password (e.g., "https://user@example.com/model.omex").
// Note #5: in OpenCOR (i.e. not in OpenCOR's Web app), a local file can also be opened, be it using a "file" URL (e.g.,
//          "file:///some/path/model.omex") or an absolute file path (e.g., "/some/path/model.omex" or, on Windows,
//          "C:\some\path\model.omex" or "\\server\share\model.omex"), since it can then be opened like any other file
//          (see OpenCOR.openFile()). It is used as is, apart from the scheme of a "file" URL which is lowercased, and
//          it is not decoded (see emitOpenLocation()). A relative file path is not considered as valid since it would
//          be relative to the working directory of OpenCOR, which people cannot know. Neither is a "file" URL or a file
//          path that doesn't end with a file name (e.g., "file:/", "file:///some/path/", "/", or "C:\"), since it
//          cannot refer to a file. Note that the query and fragment of a "file" URL are ignored by libOpenCOR (e.g.,
//          "file:///some/path/model.omex?a=b#c" refers to "/some/path/model.omex"), hence we only check its path.

const DATA_URL_REGEX = /^data:(application\/(?:zip|x\.vnd\.zip-cellml\+zip);base64),/i;
const DOTTED_HOST_REGEX = /^[^.]+(?:\.[^.]+)+\.?$/;
const IPV4_ADDRESS_REGEX = /^\d+\.\d+\.\d+\.\d+$/;
const FILE_URL_REGEX = /^file:\//i;
const FILE_URL_WITHOUT_FILE_NAME_PATH_REGEX = /(?:^|\/)(?:[a-z]:)?$/i;
const POSIX_ABSOLUTE_FILE_PATH_REGEX = /^\/.*[^/]$/;
const WINDOWS_ABSOLUTE_FILE_PATH_REGEX = /^(?:[a-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+[\\/]).*[^\\/]$/i;

// What can be entered, depending on whether local files are supported (see Note #5 above).

const localFilesSupported = !!electronApi;
const inputDescription = localFilesSupported ? 'URL or path' : 'URL';
const validInputDescription = localFilesSupported ? 'Web address or file path' : 'Web address';

// The local file to open, if any (see Note #5 above).

const localFile = vue.computed<string>(() => {
  if (!localFilesSupported) {
    return '';
  }

  const trimmedUrl = url.value.trim();

  if (FILE_URL_REGEX.test(trimmedUrl)) {
    const fileUrl = `file:${trimmedUrl.slice(5)}`;

    try {
      return FILE_URL_WITHOUT_FILE_NAME_PATH_REGEX.test(new URL(fileUrl).pathname) ? '' : fileUrl;
    } catch {
      return '';
    }
  }

  return (common.isWindows() ? WINDOWS_ABSOLUTE_FILE_PATH_REGEX : POSIX_ABSOLUTE_FILE_PATH_REGEX).test(trimmedUrl)
    ? trimmedUrl
    : '';
});

const normalisedUrl = vue.computed<string>(() => {
  const trimmedUrl = url.value.trim();

  if (!trimmedUrl) {
    return '';
  }

  if (localFile.value) {
    return localFile.value;
  }

  const dataUrlMediaType = DATA_URL_REGEX.exec(trimmedUrl)?.[1];

  if (dataUrlMediaType) {
    return `data:${dataUrlMediaType.toLowerCase()}${trimmedUrl.slice(5 + dataUrlMediaType.length)}`;
  }

  const scheme = /^([a-z][a-z\d+.-]*):\/\//i.exec(trimmedUrl)?.[1];
  const urlWithScheme = scheme ? `${scheme.toLowerCase()}${trimmedUrl.slice(scheme.length)}` : `https://${trimmedUrl}`;

  // The host of our URL, as typed, if it has no scheme (i.e. what comes before its path, query, or fragment, without
  // its port, if any).

  const typedHost = scheme ? '' : (trimmedUrl.split(/[/?#\\]/, 1)[0] ?? '').replace(/:\d*$/, '');

  try {
    const parsedUrl = new URL(urlWithScheme);

    if (
      (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
      (scheme ||
        (!parsedUrl.username &&
          !parsedUrl.password &&
          ((DOTTED_HOST_REGEX.test(typedHost) &&
            (!IPV4_ADDRESS_REGEX.test(parsedUrl.hostname) || parsedUrl.hostname === typedHost)) ||
            parsedUrl.hostname.startsWith('[') ||
            parsedUrl.hostname === 'localhost')))
    ) {
      return urlWithScheme;
    }
  } catch {
    // The URL is not valid.
  }

  return '';
});

// Let people know that their URL is not valid, but only once they are done typing it (i.e. once they leave our input
// field or try to open it), so that they are not told off while still typing it.
// Note #1: once our URL is valid, it is no longer considered as checked, so that people are not told off (again) while
//          editing it. Similarly, we only consider our URL as checked when leaving our input field if it is not valid
//          (e.g., not when people tab from a valid URL to our Open button and back to our URL to edit it).
// Note #2: our input field is also blurred when our dialog gets hidden (i.e. after we have been reset since the
//          keyboard focus is then given back to whatever had it before our dialog was shown), so we only consider our
//          URL as checked when leaving our input field if there is a URL to check. Otherwise, our URL would be
//          considered as checked the next time our dialog is shown and people would be told off while typing it.
// Note #3: our issue is an alert, so that it gets announced by assistive technologies when it is shown.

const showIssue = vue.computed<boolean>(() => {
  return checked.value && !!url.value.trim() && !normalisedUrl.value;
});

vue.watch(normalisedUrl, (newNormalisedUrl) => {
  if (newNormalisedUrl) {
    checked.value = false;
  }
});

const reset = (): void => {
  url.value = '';
  checked.value = false;
};

// Clear our URL and give the keyboard focus back to our input field.
// Note: our clear button disappears once our URL has been cleared, so if it has the keyboard focus (i.e. if it was used
//       with the keyboard), then the keyboard focus would otherwise be lost.

const inputRef = vue.useTemplateRef<{ $el: HTMLElement }>('inputRef');

const onClear = (): void => {
  reset();

  inputRef.value?.$el.focus();
};

// Open our URL when Enter is pressed, unless it is to confirm some text being composed using an input method editor
// (IME), e.g., for Chinese or Japanese (see common.isImeKeyDown()).

const onKeydownEnter = (event: KeyboardEvent): void => {
  if (common.isImeKeyDown(event)) {
    return;
  }

  event.preventDefault();

  emitOpenLocation();
};

const emitOpenLocation = (): void => {
  checked.value = true;

  if (!normalisedUrl.value) {
    return;
  }

  // Note #1: decodeURI() throws if the URL contains a malformed percent-encoded sequence (e.g., "%E0"), in which case
  //          we use the URL as is.
  // Note #2: a local file is not decoded since libOpenCOR decodes the path of a "file" URL itself, while a percent sign
  //          is a valid character in a file path (e.g., "/some/path/my%20file.omex" and "/some/path/my file.omex" are
  //          two different files).

  let decodedUrl = normalisedUrl.value;

  if (!localFile.value) {
    try {
      decodedUrl = decodeURI(decodedUrl);
    } catch {
      // The URL cannot be decoded, so use it as is.
    }
  }

  emit('openLocation', decodedUrl);

  emitClose();
};

const emitClose = (): void => {
  reset();

  emit('close');
};
</script>

<style scoped>
.description {
  margin: 0 0 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

/**
 * Note: PrimeVue's focus border takes precedence over its invalid border, so we make sure that an invalid URL is shown
 *       as such even while being edited.
 */

.p-inputtext.p-invalid,
.p-inputtext.p-invalid:focus {
  border-color: var(--p-inputtext-invalid-border-color, var(--p-red-400));
}

/**
 * Note: our clear button is a button that looks like an input icon, hence we reset the default styling of a button.
 */

.clear-button {
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  background: none;
  color: var(--p-text-muted-color);
  cursor: pointer;
}

.clear-button:hover {
  color: var(--p-text-color);
}

.clear-button:focus-visible {
  box-shadow: 0 0 0 2px var(--p-primary-color);
  color: var(--p-text-color);
}

.message {
  height: 1.25rem;
}

/**
 * Note: a message is shown on a single line (so that it never takes more space than we reserve for it), with an
 *       ellipsis if it is too long (e.g., because of a long URL), in which case its full text is shown in a tooltip.
 */

.hint,
.issue {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

.hint .pi,
.issue .pi {
  flex-shrink: 0;
  line-height: inherit;
}

.hint span,
.issue span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint {
  color: var(--p-text-muted-color);
}

.issue {
  color: var(--p-red-500);
}

code {
  font-size: 0.75rem;
}
</style>
