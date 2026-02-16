<template>
  <div class="w-full h-full" style="background-color: var(--p-content-background); color: var(--p-content-color);">
    <iframe ref="iframeRef" class="w-full h-full"
      :srcdoc="iframeHtml"
    ></iframe>
    <BlockingMessageComponent v-if="!editorReady"
      message="Loading the CellDL editing view..."
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

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
    };

const celldlEditorCommand = vue.ref<CellDLEditorCommand>({ command: '' });

defineExpose({ celldlEditorCommand });

const emit = defineEmits<{
  (event: 'editor-data', payload: EditorData): void;
  (event: 'editor-error', payload: string): void;
}>();

const iframeRef = vue.ref<HTMLIFrameElement | null>(null);
const editorReady = vue.ref(false);

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
      // Mark the editor as ready.

      editorReady.value = true;

      // Send any pending command.

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
