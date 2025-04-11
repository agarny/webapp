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
        <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="fileTab.consoleContents" />
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
const editorId = `simulationExperimentEditor_${String(fileTab.file.path())}`

function onRun(): void {
  // Run the instance and output the simulation time to the console.

  const sedInstance = fileTab.file.sedInstance()
  const simulationTime = sedInstance.run()

  fileTab.consoleContents =
    String(fileTab.consoleContents) + `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`

  vue
    .nextTick()
    .then(() => {
      const consoleElement = document.getElementById(editorId)?.getElementsByClassName('ql-editor')[0]

      if (consoleElement !== undefined) {
        consoleElement.scrollTop = consoleElement.scrollHeight
      }
    })
    .catch((error: unknown) => {
      console.error('Error scrolling to the bottom of the console:', error)
    })

  const sedInstanceTask = sedInstance.task(0)
  const xData = sedInstanceTask.voi()
  const yData = sedInstanceTask.state(0)
  const data: [number, number][] = []

  for (let i = 0; i < xData.length; ++i) {
    data.push([xData[i], yData[i]])
  }

  option.value.series[0].data = data
  option.value.xAxis.min = Math.min(...xData)
  option.value.xAxis.max = Math.max(...xData)
  option.value.yAxis.min = Math.min(...yData)
  option.value.yAxis.max = Math.max(...yData)
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

let option = vue.ref<EChartsOption>({
  animation: false,
  xAxis: {
    name: 'x',
    min: 0,
    max: 1,
    minorTick: {
      show: true
    },
    minorSplitLine: {
      show: true
    }
  },
  yAxis: {
    name: 'y',
    min: 0,
    max: 1,
    minorTick: {
      show: true
    },
    minorSplitLine: {
      show: true
    }
  },
  series: [
    {
      type: 'line',
      showSymbol: false,
      clip: true
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
