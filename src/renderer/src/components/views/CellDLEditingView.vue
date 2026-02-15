<template>
  <component :is="common.celldlEditor"
    :editorCommand="celldlEditorCommand"
    @editorData="onEditorData"
    @error="onError" />
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../../common/common.ts';

type CellDLEditorCommand = {
  command: string;
  options?: Record<string, unknown>
};
type EditorData = {
  kind: string;
  data?: unknown
};

const celldlEditorCommand = vue.ref<CellDLEditorCommand>({
  command: ''
});

vueusecore.useEventListener(document, 'file-edited', (_: Event) => {
  // The current diagram has has been modified, so update any local state (e.g., add a modified indicator to the
  // diagram's title).
});

async function onEditorData(data: EditorData) {
  if (data.kind === 'export') {
    // const uri = 'https://example.org/some_uri_to_identify_the_celldl_source_';
    // const cellmlObject = celldl2cellml(uri, data.data);
    // if (cellmlObject.cellml) {
    //   // Save `cellmlObject.cellml`.
    // } else if (cellmlObject.issues) {
    //   window.alert(cellmlObject.issues.join('\n'));
    // }
  } else {
    // Process `data.data`.
  }
}

function onError(msg: string) {
  window.alert(msg);
}

/*
The editor is initialised with a blank window.

1. To load a CellDL diagram set:

  celldlEditorCommand.value = {
    command: 'file',
    options: {
      action: 'open',
      data: celldlSource,
      name: filename
    }
  }

2. To get serialised CellDL from the editing window set:

  celldlEditorCommand.value = {
    command: 'file',
    options: {
      action: 'data',
      kind: 'export'
    }
  }

with `kind` set as appropriate. This will result in an `editorData` event, to be handled as above.

3. To clear the editing window set:

  celldlEditorCommand.value = {
    command: 'file',
    options: {
      action: 'close'
    }
  }
*/
</script>
