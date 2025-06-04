<template>
  <div :class="'flex flex-row h-full ' + (simulationOnly ? 'simulation-experiment-only' : 'simulation-experiment')">
    <div v-if="issues.length === 0" class="flex flex-row grow">
      <div class="ml-4 mr-4 mb-4">
        <Fieldset legend="Input parameters">
          <SimulationExperimentUiInputWidget
            v-for="(input, index) in (fileTab.uiJson as any).input"
            :key="'input_' + index"
            :defaultValue="input.defaultValue"
            :name="input.name"
            :maximumValue="input.maximumValue"
            :minimumValue="input.minimumValue"
            :possibleValues="input.possibleValues"
            :stepValue="input.stepValue"
            :class="index !== 0 ? 'mt-4' : ''"
            @change="
              (name: string, value: number) => {
                console.log(`${name} <- ${value}`)
              }
            "
          />
        </Fieldset>
      </div>
      <div :id="plotsDivId" class="grow">
        <GraphPanelWidget
          v-for="(_plot, index) in (fileTab.uiJson as any).output.plots"
          :key="'plot_' + index"
          class="graph-panel-widget"
          :canAutoResize="isActiveFile"
          :plots="plots"
        />
      </div>
    </div>
    <IssuesView v-else class="grow" :issues="issues" :simulationOnly="simulationOnly" />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import * as locApi from '../../../../libopencor/locApi'

import { type IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue'
import { type IFileTab } from '../ContentsComponent.vue'

const fileTabModel = defineModel()
defineProps<{
  isActiveFile: boolean
  simulationOnly?: boolean
}>()

const fileTab = fileTabModel.value as IFileTab
const instance = fileTab.file.instance()
const instanceTask = instance.task(0)
const plotsDivId = 'plotsDiv_' + String(fileTab.file.path())
const plots = vue.ref<IGraphPanelPlot[]>([])
const issues = vue.ref(locApi.uiJsonIssues(fileTab.uiJson))

vue.onMounted(() => {
  // Run the instance and update the plot.

  instance.run()

  plots.value = [
    {
      x: {
        data: instanceTask.voi()
      },
      y: {
        data: instanceTask.state(0)
      }
    }
  ]

  // Determine the sibling count for the height calculation.

  const plotsDiv = document.getElementById(plotsDivId)

  plotsDiv?.style.setProperty('--sibling-count', plotsDiv.children.length.toString())
})
</script>

<style scoped>
.graph-panel-widget {
  height: calc(100% / var(--sibling-count));
}

.simulation-experiment-only {
  height: 100vh;
}

.simulation-experiment {
  height: calc(100vh - var(--main-menu-height) - var(--file-tablist-height));
}
</style>
