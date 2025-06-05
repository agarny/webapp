<template>
  <div class="h-full">
    <div v-if="showMarker" class="marker" />
    <div ref="mainDiv" class="h-full" />
  </div>
</template>

<script setup lang="ts">
import Plotly from 'plotly.js-dist-min'
import * as vue from 'vue'

import * as common from '../../common'

interface IGraphPanelPlotData {
  data: number[]
}

export interface IGraphPanelPlot {
  x: IGraphPanelPlotData
  y: IGraphPanelPlotData
}

interface IProps {
  canAutoResize: boolean
  plots: IGraphPanelPlot[]
  showMarker?: boolean
}

const { plots, showMarker = false } = defineProps<IProps>()

const mainDiv = vue.ref<InstanceType<typeof Element> | null>(null)

function themeData() {
  // Note: the various keys can be found at https://plotly.com/javascript/reference/.

  function axisThemeData() {
    return {
      zerolinecolor: common.isDarkMode.value ? '#71717a' : '#94a3b8', // --p-surface-500 / --p-surface-400
      gridcolor: common.isDarkMode.value ? '#3f3f46' : '#e2e8f0', // --p-surface-700 / --p-surface-200
      minor: {
        gridcolor: common.isDarkMode.value ? '#27272a' : '#f1f5f9' // --p-surface-800 / --p-surface-100
      }
    }
  }

  return {
    paper_bgcolor: common.isDarkMode.value ? '#18181b' : '#ffffff', // --p-content-background
    plot_bgcolor: common.isDarkMode.value ? '#18181b' : '#ffffff', // --p-content-background
    font: {
      color: common.isDarkMode.value ? '#ffffff' : '#334155' // --p-text-color
    },
    colorway: [
      '#7289ab', // Blue
      '#ea7e53', // Orange
      '#eedd78', // Yellow
      '#e69d87', // Pink
      '#73a373', // Green
      '#73b9bc', // Cyan
      '#dd6b66' // Red
    ],
    xaxis: axisThemeData(),
    yaxis: axisThemeData()
  }
}

vue.watch(
  () => [plots, common.isDarkMode.value],
  () => {
    Plotly.react(
      mainDiv.value,
      plots.map((plot) => ({
        x: plot.x.data,
        y: plot.y.data,
        mode: 'lines'
      })),
      {
        // Note: the various keys can be found at https://plotly.com/javascript/reference/.

        ...themeData(),
        margin: {
          t: 5,
          l: 30,
          b: 30,
          r: 5
        },
        showlegend: false
      },
      {
        // Note: the various keys can be found at https://plotly.com/javascript/configuration-options/.

        responsive: true,
        displayModeBar: false,
        doubleClickDelay: 1000,
        scrollZoom: true,
        showTips: false
      }
    )
  }
)
</script>

<style scoped>
.marker {
  width: 3px;
  background-color: var(--p-primary-color);
}
</style>
