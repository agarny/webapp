<template>
  <div class="h-full simulation-experiment">
    <Toolbar :id="toolbarId" class="p-1!">
      <template #start>
        <Button class="p-1!" icon="pi pi-play-circle" severity="secondary" text @click="onRun()" />
        <Button class="p-1!" disabled icon="pi pi-stop-circle" severity="secondary" text />
      </template>
    </Toolbar>
    <Splitter class="border-none! h-full m-0" layout="vertical">
      <SplitterPanel :size="89">
        <Splitter>
          <SplitterPanel class="ml-4 mr-4 mb-4" :size="25">
            <SimulationPropertyEditor :file="vue.toRaw(fileTab.file)" />
            <!--
                  <SolversPropertyEditor />
                  <GraphsPropertyEditor />
                  <ParametersPropertyEditor />
                  -->
          </SplitterPanel>
          <SplitterPanel :size="75">
            <v-chart autoresize :option="option" :theme="theme" />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel :size="11">
        <Editor class="border-none h-full" :readonly="true" v-model="fileTab.consoleContents" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as common from '../../common'

import { IFileTab } from '../ContentsComponent.vue'

import * as echarts from 'echarts/core'
import { GridComponent, GridComponentOption, DataZoomComponent, DataZoomComponentOption } from 'echarts/components'
import { LineChart, LineSeriesOption } from 'echarts/charts'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

const fileTabModel = defineModel()
const fileTab = fileTabModel.value as IFileTab
const props = defineProps<{
  isActiveFile: boolean
}>()
const toolbarId = `simulationExperimentToolbar_${String(fileTab.file.path())}`

function onRun(): void {
  const simulationTime = fileTab.file.sedInstance().run()

  fileTab.consoleContents =
    String(fileTab.consoleContents) + `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`

  vue
    .nextTick()
    .then(() => {
      const consoleElement = document.getElementsByClassName('ql-editor')[0]

      consoleElement.scrollTop = consoleElement.scrollHeight
    })
    .catch((error: unknown) => {
      console.error('Error scrolling to the bottom of the console:', error)
    })
}

// Track the height of our file tablist toolbar.

common.trackElementHeight(toolbarId)

// Keyboard shortcuts.

if (!common.isMobile()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (props.isActiveFile && !event.ctrlKey && !event.shiftKey && !event.metaKey && event.code === 'F9') {
      event.preventDefault()

      onRun()
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

:deep(.p-editor-content) {
  border: none !important;
}

:deep(.p-editor-toolbar) {
  display: none;
}

.p-toolbar {
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--p-content-border-color);
}

:deep(.ql-editor) {
  padding: 0.25rem 0.5rem;
}

:deep(.ql-editor > *) {
  cursor: default;
}

.simulation-experiment {
  height: calc(
    100vh - var(--main-menu-height) - var(--file-tablist-height) - var(--simulation-experiment-toolbar-height)
  );
}
</style>
