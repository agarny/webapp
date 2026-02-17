<template>
  <div class="w-full h-full" style="background-color: var(--p-content-background); color: var(--p-content-color);">
    <iframe ref="iframeRef" :class="['w-full h-full', { 'pointer-events-none': dragNDropActive }]"
      :srcdoc="iframeHtml"
    ></iframe>
    <BlockingMessageComponent v-if="!editorReady"
      message="Loading the CellDL editing view..."
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import { LONG_DELAY } from '../../common/constants.ts';

import iframeHtml from './CellDLEditingView.html?raw';

type CellDLEditorCommand = {
  command: string;
  options?: Record<string, unknown>;
};
type EditorData = {
  kind: string;
  data?: unknown;
};
type IframeMessage =
  | {
      type: 'celldl-editor-command';
      payload?: CellDLEditorCommand;
    }
  | {
      type: 'celldl-editor-data';
      payload: EditorData;
    }
  | {
      type: 'celldl-editor-error';
      payload: string;
    }
  | {
      type: 'celldl-editor-ready';
    }
  | {
      type: 'celldl-editor-dragenter';
    }
  | {
      type: 'celldl-editor-dragleave';
    };

const celldlEditorCommand = vue.ref<CellDLEditorCommand>({ command: '' });

defineExpose({ celldlEditorCommand });

const emit = defineEmits<{
  (event: 'editor-data', payload: EditorData): void;
  (event: 'editor-error', payload: string): void;
}>();

const iframeRef = vue.ref<HTMLIFrameElement | null>(null);
const editorReady = vue.ref(false);
const dragNDropActive = vue.ref(false);

// Forward local `celldlEditorCommand` changes to the iframe.

vue.watch(
  celldlEditorCommand,
  (newCelldlEditorCommand) => {
    const contentWindow = iframeRef.value?.contentWindow;

    if (contentWindow) {
      contentWindow.postMessage({ type: 'celldl-editor-command', payload: newCelldlEditorCommand }, '*');
    }
  },
  { deep: true }
);

// Receive events from the iframe and forward them to our local handlers.

const onIframeMessage = (event: MessageEvent<IframeMessage>) => {
  // Make sure that the message is from our iframe and that it has the expected shape.

  if (event.source !== iframeRef.value?.contentWindow) {
    return;
  }

  // Make sure that the message has the expected shape.

  if (!event.data || typeof event.data.type !== 'string') {
    return;
  }

  // Handle the message based on its type.

  switch (event.data.type) {
    case 'celldl-editor-data':
      emit('editor-data', event.data.payload);

      if (event.data.payload.kind === 'export') {
        // Handle export as before.
      } else {
        // Process other kinds.
      }

      break;
    case 'celldl-editor-error':
      emit('editor-error', event.data.payload);

      break;
    case 'celldl-editor-ready': {
      // Mark the editor as ready and send any pending comand, but after a long delay.
      // Note: the long delay is so that we get a chance to see the loading message before the editor is ready.

      setTimeout(() => {
        editorReady.value = true;

        const contentWindow = iframeRef.value?.contentWindow;

        if (contentWindow && celldlEditorCommand.value.command) {
          contentWindow.postMessage(
            {
              type: 'celldl-editor-command',
              payload: celldlEditorCommand.value
            },
            '*'
          );
        }
      }, LONG_DELAY);

      break;
    }
    case 'celldl-editor-dragenter': {
      dragNDropActive.value = true;

      break;
    }
    case 'celldl-editor-dragleave': {
      dragNDropActive.value = false;

      break;
    }
  }
};

vue.onMounted(() => {
  window.addEventListener('message', onIframeMessage);
});

vue.onUnmounted(() => {
  window.removeEventListener('message', onIframeMessage);
});
</script>
