<template>
  <BaseDialog header="Open Remote" class="w-169" @cancel="reset">
    <div class="flex flex-col gap-2 mt-1 mb-2">
      <p class="description">Enter the URL of a CellML file, SED-ML file, or COMBINE archive.</p>
      <IconField>
        <InputIcon class="pi pi-link" />
        <InputText ref="inputRef" v-model="url" autofocus fluid
          :invalid="showIssue"
          placeholder="https://example.com/model.omex"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          inputmode="url"
          @blur="checked = true"
          @keydown.enter.prevent="emitOpenRemote"
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
        <p v-if="showIssue" class="issue">
          <i class="pi pi-exclamation-circle"></i>
          <span>Please enter a valid web address (e.g., <code>https://example.com/model.omex</code>).</span>
        </p>
        <p v-else-if="normalisedUrl && normalisedUrl !== url.trim()" class="hint" v-hint="`Will open ${normalisedUrl}.`">
          <i class="pi pi-info-circle"></i>
          <span>Will open <code>{{ normalisedUrl }}</code>.</span>
        </p>
      </div>
    </div>
    <template #footer>
      <Button label="Open" :disabled="!normalisedUrl" @click="emitOpenRemote" />
      <Button label="Cancel" severity="secondary" @click="emitClose" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import { vHint } from '../../common/hint';

const emit = defineEmits<{
  openRemote: [url: string];
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
//          localhost), so that, for instance, some random text is not considered as a valid URL. A URL with a scheme
//          can have any host (e.g., an intranet host, such as "http://modelserver/model.omex").
// Note #3: a data URL (e.g., "data:application/zip;base64,...") is also valid (as long as it has a comma after its
//          media type), since it can be opened like any other file (see OpenCOR.openFile()). It is used as is (so,
//          unlike for other URLs, we don't let people know which URL will be opened since it would be the same and it
//          can be very long).
// Note #4: a URL without a scheme must also have no user name and no password, so that, for instance, an email address
//          (e.g., "user@example.com") or a mailto link (e.g., "mailto:user@example.com", which has no "//" after its
//          scheme) is not considered as a valid URL, i.e. as "https://user@example.com" or as
//          "https://mailto:user@example.com" (where "mailto" would be a user name and "user" a password). A URL with a
//          scheme can have a user name and a password (e.g., "https://user@example.com/model.omex").

const DATA_URL_REGEX = /^data:[^,]*,/;

const normalisedUrl = vue.computed<string>(() => {
  const trimmedUrl = url.value.trim();

  if (!trimmedUrl) {
    return '';
  }

  if (DATA_URL_REGEX.test(trimmedUrl)) {
    return trimmedUrl;
  }

  const scheme = /^([a-z][a-z\d+.-]*):\/\//i.exec(trimmedUrl)?.[1];
  const urlWithScheme = scheme ? `${scheme.toLowerCase()}${trimmedUrl.slice(scheme.length)}` : `https://${trimmedUrl}`;

  try {
    const parsedUrl = new URL(urlWithScheme);

    if (
      (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
      (scheme ||
        (!parsedUrl.username &&
          !parsedUrl.password &&
          (parsedUrl.hostname.includes('.') ||
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

const showIssue = vue.computed<boolean>(() => {
  return checked.value && !!url.value.trim() && !normalisedUrl.value;
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

const emitOpenRemote = (): void => {
  checked.value = true;

  if (!normalisedUrl.value) {
    return;
  }

  // Note: decodeURI() throws if the URL contains a malformed percent-encoded sequence (e.g., "%E0"), in which case we
  //       use the URL as is.

  let decodedUrl = normalisedUrl.value;

  try {
    decodedUrl = decodeURI(decodedUrl);
  } catch {
    // The URL cannot be decoded, so use it as is.
  }

  emit('openRemote', decodedUrl);

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
