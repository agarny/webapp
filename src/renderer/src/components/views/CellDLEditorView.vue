<template>
  <div class="celldl-editor relative h-full flex flex-col overflow-hidden" :class="{ 'celldl-dark-mode': isDarkMode }">
    <template v-if="loading">
      <BlockingMessageComponent class="m-0!" message="Loading CellDL Editor" />
    </template>
    <IssuesView v-else-if="errorMsg" class="m-4" style="height: calc(100% - 2rem);"
      :issues="[{
        type: EIssueType.ERROR,
        description: errorMsg
      }]"
    />
    <CellDLEditor v-else-if="ready"
      :editorCommand="editorCommand"
      :theme="editorTheme"
      @editorState="onEditorState"
    />
  </div>
</template>

<script setup lang="ts">
import CellDLEditor from '@celldl/editor';
import type { CellDLEditorCommand, Theme } from '@celldl/editor';
import * as rdf from '@celldl/editor-rdf';

import * as vue from 'vue';

import * as common from '../../common/common';
import { SHORT_DELAY } from '../../common/constants';
import { useTheme } from '../../common/vueCommon';
import type * as locApi from '../../libopencor/locApi';
import { EIssueType } from '../../libopencor/locLoggerApi';

import '../../assets/celldl-editor.css';

const { theme: opencorTheme, useDarkMode } = useTheme();

const props = defineProps<{
  file: locApi.File;
}>();

const loading = vue.ref(true);
const ready = vue.ref(false);
const errorMsg = vue.ref<string | null>(null);
const editorCommand = vue.ref<CellDLEditorCommand>();

const editorTheme = vue.computed<Theme>(() => {
  return opencorTheme() as Theme;
});

const isDarkMode = vue.computed(() => {
  return useDarkMode();
});

async function loadFile(): Promise<void> {
  try {
    const contents = props.file.contents();
    const decoder = new TextDecoder();
    const svg = decoder.decode(contents);
    const filename = props.file.path().split('/').pop() ?? 'Untitled.svg';

    loading.value = false;
    ready.value = true;

    await new Promise((resolve) => {
      setTimeout(resolve, SHORT_DELAY);
    });

    editorCommand.value = {
      command: 'file',
      options: { action: 'open', data: svg, name: filename }
    };
  } catch (error: unknown) {
    loading.value = false;

    errorMsg.value = `Unable to open the CellDL file: ${common.formatError(error)}`;
  }
}

vue.onMounted(async () => {
  try {
    if (!rdf.initialised()) {
      await rdf.initialise();
    }

    await loadFile();
  } catch (error: unknown) {
    loading.value = false;

    errorMsg.value = `Failed to initialise the CellDL Editor: ${common.formatError(error)}`;
  }
});

vue.onBeforeUnmount(() => {
  editorCommand.value = {
    command: 'file',
    options: {
      action: 'close'
    }
  };
});

function onEditorState(state: { error: string }): void {
  errorMsg.value = state.error;
}
</script>

<style>
/* The CellDL Editor stylesheet paints every SVG with the editor's canvas background. Its styles are imported inside the
 * `celldl-editor` layer (see src/renderer/assets/celldl-editor.css), but layered author styles still beat the browser's
 * defaults, so restore the default background for all SVGs outside the editor. SVGs inside the editor keep their canvas
 * background via the editor's own stylesheet.
 */

svg:not(.celldl-editor svg) {
  background-color: initial;
}
</style>
