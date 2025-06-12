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
          <SplitterPanel class="ml-4 mr-4 mb-4" :size="25">
            <SimulationPropertyEditor :file="vue.toRaw(fileTab.file)" />
            <!--
                  <SolversPropertyEditor />
                  <GraphsPropertyEditor />
                  <ParametersPropertyEditor />
                  -->
            <Fieldset legend="X-axis">
              <TreeSelect
                v-model="xParameter"
                filter
                filterMode="lenient"
                :options="parameters"
                class="w-full"
                @change="updatePlot()"
              />
            </Fieldset>
            <Fieldset legend="Y-axis">
              <TreeSelect
                v-model="yParameter"
                filter
                filterMode="lenient"
                :options="parameters"
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
        <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="fileTab.consoleContents" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import * as common from '../../common'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'
import { type IFileTab } from '../ContentsComponent.vue'

const fileTabModel = defineModel()
const props = defineProps<{
  isActiveFile: boolean
  simulationOnly?: boolean
}>()

const fileTab = fileTabModel.value as IFileTab
const toolbarId = `simulationExperimentToolbar_${String(fileTab.file.path())}`
const editorId = `simulationExperimentEditor_${String(fileTab.file.path())}`
const instance = fileTab.file.instance()
const instanceTask = instance.task(0)

interface IParameter {
  key: string
  label: string
}

const parameters = vue.ref<IParameter[]>([])
const xParameter = vue.ref({ [instanceTask.voiName()]: true })
const yParameter = vue.ref({ [instanceTask.stateName(0)]: true })
const plots = vue.ref<IGraphPanelPlot[]>([])

function addParameter(param: string): void {
  parameters.value.push({ key: param, label: param })
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

  fileTab.consoleContents =
    String(fileTab.consoleContents) + `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`

  void vue.nextTick().then(() => {
    const consoleElement = document.getElementById(editorId)?.getElementsByClassName('ql-editor')[0]

    if (consoleElement !== undefined) {
      consoleElement.scrollTop = consoleElement.scrollHeight
    }
  })

  updatePlot()
}

function updatePlot() {
  interface IGraphParameter {
    name: string
    unit: string
    data: number[]
  }

  function checkGraphParameter(param: string): IGraphParameter | undefined {
    if (param === instanceTask.voiName()) {
      return {
        name: instanceTask.voiName(),
        unit: instanceTask.voiUnit(),
        data: instanceTask.voi()
      }
    }

    for (let i = 0; i < instanceTask.stateCount(); i++) {
      if (param === instanceTask.stateName(i)) {
        return {
          name: instanceTask.stateName(i),
          unit: instanceTask.stateUnit(i),
          data: instanceTask.state(i)
        }
      }
    }

    for (let i = 0; i < instanceTask.rateCount(); i++) {
      if (param === instanceTask.rateName(i)) {
        return {
          name: instanceTask.rateName(i),
          unit: instanceTask.rateUnit(i),
          data: instanceTask.rate(i)
        }
      }
    }

    for (let i = 0; i < instanceTask.constantCount(); i++) {
      if (param === instanceTask.constantName(i)) {
        return {
          name: instanceTask.constantName(i),
          unit: instanceTask.constantUnit(i),
          data: instanceTask.constant(i)
        }
      }
    }

    for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
      if (param === instanceTask.computedConstantName(i)) {
        return {
          name: instanceTask.computedConstantName(i),
          unit: instanceTask.computedConstantUnit(i),
          data: instanceTask.computedConstant(i)
        }
      }
    }

    for (let i = 0; i < instanceTask.algebraicCount(); i++) {
      if (param === instanceTask.algebraicName(i)) {
        return {
          name: instanceTask.algebraicName(i),
          unit: instanceTask.algebraicUnit(i),
          data: instanceTask.algebraic(i)
        }
      }
    }

    return undefined
  }

  const xGraphParam = checkGraphParameter(Object.keys(xParameter.value)[0])
  const yGraphParam = checkGraphParameter(Object.keys(yParameter.value)[0])

  if (xGraphParam === undefined || yGraphParam === undefined) {
    plots.value = []

    return
  }

  plots.value = [
    {
      x: {
        data: xGraphParam.data
      },
      y: {
        data: yGraphParam.data
      }
    }
  ]
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
