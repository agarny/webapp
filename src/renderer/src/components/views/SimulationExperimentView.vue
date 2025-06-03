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
            <GraphPanelWidget :canAutoResize="isActiveFile" :plots="plots" />
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
const sedInstance = fileTab.file.sedInstance()
const sedInstanceTask = sedInstance.task(0)

interface IParameter {
  key: string
  label: string
}

const parameters = vue.ref<IParameter[]>([])
const xParameter = vue.ref({ [sedInstanceTask.voiName()]: true })
const yParameter = vue.ref({ [sedInstanceTask.stateName(0)]: true })
const plots = vue.ref<IGraphPanelPlot[]>([])

function addParameter(param: string): void {
  parameters.value.push({ key: param, label: param })
}

addParameter(sedInstanceTask.voiName())

for (let i = 0; i < sedInstanceTask.stateCount(); i++) {
  addParameter(sedInstanceTask.stateName(i))
}

for (let i = 0; i < sedInstanceTask.rateCount(); i++) {
  addParameter(sedInstanceTask.rateName(i))
}

for (let i = 0; i < sedInstanceTask.constantCount(); i++) {
  addParameter(sedInstanceTask.constantName(i))
}

for (let i = 0; i < sedInstanceTask.computedConstantCount(); i++) {
  addParameter(sedInstanceTask.computedConstantName(i))
}

for (let i = 0; i < sedInstanceTask.algebraicCount(); i++) {
  addParameter(sedInstanceTask.algebraicName(i))
}

function onRun(): void {
  // Run the instance, output the simulation time to the console, and update the plot.

  const simulationTime = sedInstance.run()

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
    if (param === sedInstanceTask.voiName()) {
      return {
        name: sedInstanceTask.voiName(),
        unit: sedInstanceTask.voiUnit(),
        data: sedInstanceTask.voi()
      }
    }

    for (let i = 0; i < sedInstanceTask.stateCount(); i++) {
      if (param === sedInstanceTask.stateName(i)) {
        return {
          name: sedInstanceTask.stateName(i),
          unit: sedInstanceTask.stateUnit(i),
          data: sedInstanceTask.state(i)
        }
      }
    }

    for (let i = 0; i < sedInstanceTask.rateCount(); i++) {
      if (param === sedInstanceTask.rateName(i)) {
        return {
          name: sedInstanceTask.rateName(i),
          unit: sedInstanceTask.rateUnit(i),
          data: sedInstanceTask.rate(i)
        }
      }
    }

    for (let i = 0; i < sedInstanceTask.constantCount(); i++) {
      if (param === sedInstanceTask.constantName(i)) {
        return {
          name: sedInstanceTask.constantName(i),
          unit: sedInstanceTask.constantUnit(i),
          data: sedInstanceTask.constant(i)
        }
      }
    }

    for (let i = 0; i < sedInstanceTask.computedConstantCount(); i++) {
      if (param === sedInstanceTask.computedConstantName(i)) {
        return {
          name: sedInstanceTask.computedConstantName(i),
          unit: sedInstanceTask.computedConstantUnit(i),
          data: sedInstanceTask.computedConstant(i)
        }
      }
    }

    for (let i = 0; i < sedInstanceTask.algebraicCount(); i++) {
      if (param === sedInstanceTask.algebraicName(i)) {
        return {
          name: sedInstanceTask.algebraicName(i),
          unit: sedInstanceTask.algebraicUnit(i),
          data: sedInstanceTask.algebraic(i)
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
