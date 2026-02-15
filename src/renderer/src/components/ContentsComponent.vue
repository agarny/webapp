<template>
  <div v-if="simulationOnly" class="h-full">
    <div v-for="fileTab in fileTabs" :key="`tabPanel_${fileTab.file.path()}`" class="h-full" :value="fileTab.file.path()">
      <IssuesView v-if="fileTab.file.issues().length" class="m-4" style="height: calc(100% - 2rem);"
        :issues="fileTab.file.issues()"
      />
      <SimulationExperimentView v-else class="h-full"
        :isActive="isActive"
        :uiEnabled="uiEnabled"
        :file="fileTab.file"
        :isActiveFile="fileTab.file.path() === activeFile"
        :simulationOnly="simulationOnly"
        :uiJson="fileTab.uiJson!"
      />
    </div>
  </div>
  <div v-else class="h-full flex flex-col">
    <BackgroundComponent v-show="!fileTabs.length" class="h-full" />
    <Tabs v-show="fileTabs.length" id="fileTabs" class="h-full flex flex-col"
      v-model:value="activeFile"
      :scrollable="true"
      :selectOnFocus="true"
    >
      <TabList :id="fileTablistId" class="border-b border-b-primary shrink-0">
        <Tab
          v-for="fileTab in fileTabs"
          :id="`tab_${fileTab.file.path()}`"
          :key="`tab_${fileTab.file.path()}`"
          :value="fileTab.file.path()"
        >
          <div class="flex gap-2 items-center">
            <div>
              {{
                common.fileName(fileTab.file.path())
              }}
            </div>
            <div class="pi pi-times remove-button" @mousedown.prevent @click.stop="closeFile(fileTab.file.path())" />
          </div>
        </Tab>
      </TabList>
      <TabPanels class="p-0! grow min-h-0">
        <TabPanel v-for="fileTab in fileTabs" class="h-full"
          :key="`tabPanel_${fileTab.file.path()}`"
          :value="fileTab.file.path()"
        >
          <IssuesView v-if="fileTab.file.issues().length" class="m-4" style="height: calc(100% - 2rem);"
            :issues="fileTab.file.issues()"
          />
<!-- TODO: enable once our CellDL integration is fully ready.
          <SimulationExperimentView v-else
            :isActive="isActive"
            :uiEnabled="uiEnabled"
            :file="fileTab.file"
            :isActiveFile="fileTab.file.path() === activeFile"
            :uiJson="fileTab.uiJson!"
            @error="$emit('error', $event)"
          />
 -->
          <CellDLEditingView v-else />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../common/common.ts';
import { electronApi } from '../common/electronApi.ts';
import * as locApi from '../libopencor/locApi.ts';

interface IFileTab {
  file: locApi.File;
  uiJson?: locApi.IUiJson;
}

const props = defineProps<{
  isActive: boolean;
  simulationOnly?: boolean;
  uiEnabled: boolean;
}>();
defineEmits<(event: 'error', message: string) => void>();

export interface IContentsComponent {
  openFile(file: locApi.File): void;
  closeCurrentFile(): void;
  closeAllFiles(): void;
  hasFile(filePath: string): boolean;
  hasFiles(): boolean;
  selectFile(filePath: string): void;
}

const fileTablistId = vue.ref('contentsComponentFileTablist');
const fileTabs = vue.ref<IFileTab[]>([]);
const activeFile = vue.ref<string>('');

const filePaths = vue.computed(() => {
  const res: string[] = [];

  for (const fileTab of fileTabs.value) {
    res.push(fileTab.file.path());
  }

  return res;
});

// Some methods to handle files and file tabs.

const hasFile = (filePath: string): boolean => {
  return fileTabs.value.find((fileTab) => fileTab.file.path() === filePath) !== undefined;
};

const hasFiles = (): boolean => {
  return fileTabs.value.length > 0;
};

const selectFile = (filePath: string): void => {
  activeFile.value = filePath;
};

const selectNextFile = (): void => {
  const fileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === activeFile.value);

  if (fileTabIndex !== -1) {
    selectFile(fileTabs.value[(fileTabIndex + 1) % fileTabs.value.length].file.path());
  }
};

const selectPreviousFile = (): void => {
  const fileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === activeFile.value);

  if (fileTabIndex !== -1) {
    selectFile(fileTabs.value[(fileTabIndex - 1 + fileTabs.value.length) % fileTabs.value.length].file.path());
  }
};

const openFile = (file: locApi.File): void => {
  const filePath = file.path();
  const prevActiveFile = activeFile.value;

  selectFile(filePath);

  fileTabs.value.splice(fileTabs.value.findIndex((fileTab) => fileTab.file.path() === prevActiveFile) + 1, 0, {
    file: file,
    uiJson: file.uiJson()
  });

  electronApi?.fileOpened(filePath);
};

const closeFile = (filePath: string): void => {
  locApi.fileManager.unmanage(filePath);

  const fileTabIndex = fileTabs.value.findIndex((fileTab) => fileTab.file.path() === filePath);

  fileTabs.value.splice(fileTabIndex, 1);

  if (activeFile.value === filePath && fileTabs.value.length) {
    const nextFileTab = fileTabs.value[Math.min(fileTabIndex, fileTabs.value.length - 1)];

    if (nextFileTab) {
      selectFile(nextFileTab.file.path());
    }
  }

  electronApi?.fileClosed(filePath);
};

const closeCurrentFile = (): void => {
  closeFile(activeFile.value);
};

const closeAllFiles = (): void => {
  while (fileTabs.value.length) {
    closeCurrentFile();
  }
};

defineExpose({
  openFile,
  closeCurrentFile,
  closeAllFiles,
  hasFile,
  hasFiles,
  selectFile
});

// Some watchers to let people know about changes to the opened files and the selected file.

vue.watch(filePaths, (newFilePaths: string[]) => {
  electronApi?.filesOpened(newFilePaths);
});

vue.watch(activeFile, (newActiveFile: string) => {
  // Note: activeFile can get updated by clicking on a tab or by calling selectFile(), hence we need to watch it to let
  //       people know that a file has been selected.

  electronApi?.fileSelected(newActiveFile);
});

// Various things that need to be done once we are mounted.

const crtInstance = vue.getCurrentInstance();

vue.onMounted(() => {
  // Customise our IDs.

  fileTablistId.value = `contentsComponentFileTablist${String(crtInstance?.uid)}`;
});

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActive || !props.uiEnabled || !fileTabs.value.length) {
      return;
    }

    if (event.ctrlKey && !event.shiftKey && event.code === 'Tab') {
      event.preventDefault();

      selectNextFile();
    } else if (event.ctrlKey && event.shiftKey && event.code === 'Tab') {
      event.preventDefault();

      selectPreviousFile();
    }
  });
}
</script>

<style scoped>
.p-tab {
  padding: 0.125rem 0.5rem;
  border-right: 1px solid var(--p-content-border-color);
}

.p-tab:first-of-type {
  border-left: 1px solid var(--p-content-border-color);
}

.p-tab:hover {
  background-color: var(--p-content-hover-background) !important;
}

.p-tab .remove-button {
  visibility: hidden;
}

.p-tab:hover .remove-button,
.p-tab-active .remove-button {
  visibility: visible;
}

.p-tab-active,
.p-tab-active:hover {
  background-color: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color);
}

:deep(.p-tablist-active-bar) {
  display: none;
}

.remove-button {
  padding: 0.15rem;
  font-size: 0.75rem;
}

.remove-button:hover {
  border-radius: var(--p-border-radius-sm);
  background-color: var(--p-red-500);
  color: var(--p-red-50);
}

@media (prefers-color-scheme: dark) {
  .remove-button:hover {
    background-color: var(--p-red-400);
  }
}
</style>
