<template>
  <div :class="'h-full ' + (simulationOnly ? 'simulation-experiment-only' : 'simulation-experiment')">
    <Toolbar :id="toolbarId" class="p-1!">
      <template #start>
        <Button class="p-1!" icon="pi pi-play-circle" severity="secondary" text @click="onRun()" />
        <Button class="p-1!" disabled icon="pi pi-stop-circle" severity="secondary" text />
      </template>
    </Toolbar>
    <Splitter class="border-none! h-full m-0" layout="vertical">
      <SplitterPanel :size="simulationOnly ? 100 : 89">
        <Splitter>
          <SplitterPanel class="ml-4 mr-4 mb-4 min-w-fit" :size="25">
            <SimulationPropertyEditor :file="fileTabModel.file" />
            <!--
                  <SolversPropertyEditor />
                  <GraphsPropertyEditor />
                  <ParametersPropertyEditor />
                  -->
            <Fieldset legend="X-axis">
              <Select
                v-model="xParameter"
                filter
                filterMode="lenient"
                :options="parameters"
                size="small"
                class="w-full"
                @change="updatePlot()"
              />
            </Fieldset>
            <Fieldset legend="Y-axis">
              <Select
                v-model="yParameter"
                filter
                filterMode="lenient"
                :options="parameters"
                size="small"
                class="w-full"
                @change="updatePlot()"
              />
            </Fieldset>
          </SplitterPanel>
          <SplitterPanel :size="75">
            <GraphPanelWidget :plots="plots" />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel v-if="!simulationOnly" :size="11">
        <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="fileTabModel.consoleContents" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as common from '../../../../common'
import * as locCommon from '../../../../locCommon'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'
import { type IFileTab } from '../ContentsComponent.vue'

const fileTabModel = defineModel<IFileTab>({ required: true })
const props = defineProps<{
  isActiveFile: boolean
  simulationOnly?: boolean
}>()

const toolbarId = `simulationExperimentToolbar_${String(fileTabModel.value.file.path())}`
const editorId = `simulationExperimentEditor_${String(fileTabModel.value.file.path())}`
const instance = fileTabModel.value.file.instance()
const instanceTask = instance.task(0)

const parameters = vue.ref<string[]>([])
const xParameter = vue.ref(instanceTask.voiName())
const yParameter = vue.ref(instanceTask.stateName(0))
const plots = vue.ref<IGraphPanelPlot[]>([])

function addParameter(param: string): void {
  parameters.value.push(param)
}

addParameter(instanceTask.voiName())

for (let i = 0; i < instanceTask.stateCount(); i++) {
  addParameter(instanceTask.stateName(i))
}

for (let i = 0; i < instanceTask.rateCount(); i++) {
  addParameter(instanceTask.rateName(i))
}

for (let i = 0; i < instanceTask.constantCount(); i++) {
  addParameter(instanceTask.constantName(i))
}

for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
  addParameter(instanceTask.computedConstantName(i))
}

for (let i = 0; i < instanceTask.algebraicCount(); i++) {
  addParameter(instanceTask.algebraicName(i))
}

function onRun(): void {
  // Run the instance, output the simulation time to the console, and update the plot.

  const simulationTime = instance.run()

  fileTabModel.value.consoleContents =
    String(fileTabModel.value.consoleContents) +
    `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`

  void vue.nextTick().then(() => {
    const consoleElement = document.getElementById(editorId)?.getElementsByClassName('ql-editor')[0]

    if (consoleElement !== undefined) {
      consoleElement.scrollTop = consoleElement.scrollHeight
    }
  })

  updatePlot()
}

const xInfo = vue.computed(() => locCommon.simulationDataInfo(instanceTask, xParameter.value))
const yInfo = vue.computed(() => locCommon.simulationDataInfo(instanceTask, yParameter.value))

function updatePlot() {
  plots.value = [
    {
      x: {
        data: locCommon.simulationData(instanceTask, xInfo.value)
      },
      y: {
        data: locCommon.simulationData(instanceTask, yInfo.value)
      }
    }
  ]
}

// "Initialise" our plot.

vue.onMounted(() => {
  updatePlot()
})

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

.simulation-experiment-only {
  height: calc(100vh - var(--simulation-experiment-toolbar-height));
}

.simulation-experiment {
  height: calc(
    100vh - var(--main-menu-height) - var(--file-tablist-height) - var(--simulation-experiment-toolbar-height)
  );
}
</style>
