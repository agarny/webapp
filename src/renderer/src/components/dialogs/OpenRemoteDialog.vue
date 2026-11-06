<template>
  <BaseDialog header="Open Remote" class="w-169" @cancel="reset">
    <div class="flex flex-col gap-2 mt-1 mb-2">
      <p class="description">Enter the URL of a CellML file, SED-ML file, or COMBINE archive.</p>
      <IconField>
        <InputIcon class="pi pi-link" />
        <InputText v-model="url" autofocus fluid
          :invalid="showIssue"
          placeholder="https://example.com/model.omex"
          spellcheck="false"
          autocomplete="off"
          @blur="checked = true"
          @keydown.enter.prevent="emitOpenRemote"
        />
        <InputIcon v-if="url" class="clear-button pi pi-times" v-hint="'Clear'" @mousedown.prevent @click="reset" />
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

// The URL to open, if valid, i.e. the given URL without any leading/trailing whitespace and with an https:// scheme if
// it has no scheme (e.g., "example.com/model.omex" becomes "https://example.com/model.omex").

const normalisedUrl = vue.computed<string>(() => {
  const trimmedUrl = url.value.trim();

  if (!trimmedUrl) {
    return '';
  }

  const urlWithScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

  try {
    const parsedUrl = new URL(urlWithScheme);

    if (
      (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
      (parsedUrl.hostname.includes('.') || parsedUrl.hostname === 'localhost')
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

.clear-button {
  color: var(--p-text-muted-color);
  cursor: pointer;
}

.clear-button:hover {
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
