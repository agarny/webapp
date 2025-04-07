<template>
  <BackgroundComponent v-show="files.length === 0" />
  <Tabs v-show="files.length !== 0" id="fileTabs" v-model:value="activeFile" :scrollable="true" :selectOnFocus="true">
    <TabList id="fileTablist" class="file-tablist">
      <Tab v-for="file in files" :id="'tab_' + file.path()" :key="'tab_' + file.path()" :value="file.path()">
        <div class="flex gap-2 items-center">
          <div>
            {{
              file
                .path()
                .split(/(\\|\/)/g)
                .pop()
            }}
          </div>
          <div class="pi pi-times remove-button" @mousedown.prevent @click.stop="closeFile(file.path())" />
        </div>
      </Tab>
    </TabList>
    <TabPanels class="p-0!">
      <TabPanel v-for="file in files" :key="'tabPanel_' + file.path()" :value="file.path()">
        <div class="tab-panel-container">
          <Toolbar id="fileTablistToolbar" class="p-1!">
            <template #start>
              <Button class="p-1!" icon="pi pi-play-circle" severity="secondary" text />
              <Button class="p-1!" disabled icon="pi pi-stop-circle" severity="secondary" text />
            </template>
          </Toolbar>
          <Splitter v-if="file.issues().length === 0" class="border-none! h-full m-0" layout="vertical">
            <SplitterPanel :size="89">
              <Splitter>
                <SplitterPanel class="ml-4 mr-4 mb-4" :size="25">
                  <SimulationPropertyEditorComponent :file="vue.toRaw(file)" />
                  <!--
                  <SolversPropertyEditorComponent />
                  <GraphsPropertyEditorComponent />
                  <ParametersPropertyEditorComponent />
                  -->
                </SplitterPanel>
                <SplitterPanel :size="75">
                  <v-chart autoresize :option="option" :theme="theme" />
                </SplitterPanel>
              </Splitter>
            </SplitterPanel>
            <SplitterPanel :size="11">
              <ScrollPanel class="h-full ml-1 mr-1 mb-1 text-sm">
                <div class="leading-4">First entry...</div>
                <div class="leading-4">Second entry...</div>
                <div class="leading-4">Third entry...</div>
              </ScrollPanel>
            </SplitterPanel>
          </Splitter>
          <div v-else class="issues-container">
            <Fieldset legend="Issues">
              <div
                v-for="(issue, index) in file.issues()"
                :key="'issue_' + issue.type + '_' + issue.description"
                :class="index > 0 ? 'mt-4!' : ''"
              >
                <Message v-if="issue.type === locAPI.IssueType.Error" severity="error" icon="pi pi-times-circle">
                  {{ issue.description }}
                </Message>
                <Message v-else severity="warn" icon="pi pi-exclamation-triangle">
                  {{ issue.description }}
                </Message>
              </div>
            </Fieldset>
          </div>
        </div>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as locAPI from '../../../libopencor/locAPI'

import * as common from '../common'

import * as echarts from 'echarts/core'
import { GridComponent, GridComponentOption, DataZoomComponent, DataZoomComponentOption } from 'echarts/components'
import { LineChart, LineSeriesOption } from 'echarts/charts'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

const files = vue.ref<locAPI.File[]>([])
const activeFile = vue.ref<string>('')

defineExpose({ openFile, closeCurrentFile, closeAllFiles, hasFile, hasFiles, selectFile })

export interface IContentsComponent {
  openFile(file: locAPI.File): void
  closeCurrentFile(): void
  closeAllFiles(): void
  hasFile(filePath: string): boolean
  hasFiles(): boolean
  selectFile(filePath: string): void
}

function openFile(file: locAPI.File): void {
  const filePath = file.path()

  files.value.splice(files.value.findIndex((file) => file.path() === activeFile.value) + 1, 0, file)

  selectFile(filePath)
}

function hasFile(filePath: string): boolean {
  return files.value.find((file) => file.path() === filePath) !== undefined
}

function hasFiles(): boolean {
  return files.value.length > 0
}

function selectFile(filePath: string): void {
  activeFile.value = filePath

  vue
    .nextTick()
    .then(() => {
      const tabElement = document.getElementById('tab_' + filePath)

      if (tabElement !== null) {
        // Note: when removing a tab, unless it is the last one, it will flash (whether we scroll it into view or not).
        //       To prevent this, we temporarily remove the 'p-tab' class (!?).

        tabElement.classList.remove('p-tab')
        tabElement.scrollIntoView({ block: 'nearest' })
        tabElement.classList.add('p-tab')
      }
    })
    .catch((error: unknown) => {
      console.error('Error scrolling to tab:', error)
    })
}

function selectNextFile(): void {
  const activeFileIndex = files.value.findIndex((file) => file.path() === activeFile.value)
  const nextFileIndex = (activeFileIndex + 1) % files.value.length

  selectFile(files.value[nextFileIndex].path())
}

function selectPreviousFile(): void {
  const activeFileIndex = files.value.findIndex((file) => file.path() === activeFile.value)
  const nextFileIndex = (activeFileIndex - 1 + files.value.length) % files.value.length

  selectFile(files.value[nextFileIndex].path())
}

function closeFile(filePath: string): void {
  locAPI.fileManager.unmanage(filePath)

  const activeFileIndex = files.value.findIndex((file) => file.path() === filePath)

  files.value.splice(activeFileIndex, 1)

  if (activeFile.value === filePath && files.value.length > 0) {
    selectFile(files.value[Math.min(activeFileIndex, files.value.length - 1)].path())
  }
}

function closeCurrentFile(): void {
  closeFile(activeFile.value)
}

function closeAllFiles(): void {
  while (files.value.length > 0) {
    closeCurrentFile()
  }
}

// Track our file tablist and toolbar.

common.trackElementResizing('fileTablist')
common.trackElementResizing('fileTablistToolbar')

// Keyboard shortcuts.

if (!common.isMobile()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (files.value.length === 0) {
      return
    }

    if (event.ctrlKey && !event.shiftKey && event.code === 'Tab') {
      event.preventDefault()

      selectNextFile()
    } else if (event.ctrlKey && event.shiftKey && event.code === 'Tab') {
      event.preventDefault()

      selectPreviousFile()
    }
  })
}

// Add an ECharts object.

const theme = vue.computed(() => {
  return common.isLightMode.value ? 'macarons' : 'dark'
})

echarts.use([GridComponent, DataZoomComponent, LineChart, CanvasRenderer, UniversalTransition])

type EChartsOption = echarts.ComposeOption<GridComponentOption | DataZoomComponentOption | LineSeriesOption>

function func(x: number) {
  x /= 10
  return Math.sin(x) * Math.cos(x * 2 + 1) * Math.sin(x * 3 + 2) * 50
}

function generateData() {
  const data: [number, number][] = []

  for (let i = -200; i <= 200; i += 0.1) {
    data.push([i, func(i)])
  }

  return data
}

const option = vue.ref<EChartsOption>({
  animation: false,
  grid: {
    top: 40,
    left: 50,
    right: 40,
    bottom: 50
  },
  xAxis: {
    name: 'x',
    minorTick: {
      show: true
    },
    minorSplitLine: {
      show: true
    }
  },
  yAxis: {
    name: 'y',
    min: -100,
    max: 100,
    minorTick: {
      show: true
    },
    minorSplitLine: {
      show: true
    }
  },
  dataZoom: [
    {
      show: true,
      type: 'inside',
      filterMode: 'none',
      xAxisIndex: [0],
      startValue: -20,
      endValue: 20
    },
    {
      show: true,
      type: 'inside',
      filterMode: 'none',
      yAxisIndex: [0],
      startValue: -20,
      endValue: 20
    }
  ],
  series: [
    {
      type: 'line',
      showSymbol: false,
      clip: true,
      data: generateData()
    }
  ]
})
</script>

<style scoped>
.file-tablist {
  border-bottom: 1px solid var(--p-primary-color);
}

.issues-container {
  padding: var(--p-tabs-tabpanel-padding);
}

:deep(.p-button) {
  transition: none;
}

:deep(.p-button-icon) {
  font-size: 1.5rem;
}

:deep(.p-button-icon-only) {
  width: 2rem;
}

:deep(.p-button-label) {
  height: 0;
}

.p-tab {
  padding: 0.25rem 0.5rem;
  border-right: 1px solid var(--p-content-border-color);
  outline: none;
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

:deep(.p-tablist-prev-button),
:deep(.p-tablist-next-button),
:deep(.p-tabpanel) {
  outline: none !important;
}

.p-toolbar {
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--p-content-border-color);
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

.tab-panel-container {
  height: var(--available-viewport-height);
}
</style>
