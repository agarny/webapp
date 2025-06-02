<template>
  <div class="h-full">
    <div v-if="showMarker" class="marker" />
    <v-chart :autoresize="canAutoResize" :option="option" :theme="theme" />
  </div>
</template>

<script setup lang="ts">
import { LineChart, type LineSeriesOption } from 'echarts/charts'
import { DataZoomComponent, DataZoomComponentOption, GridComponent, GridComponentOption } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import * as vue from 'vue'
import VChart from 'vue-echarts'

import * as common from '../../common'

import { registerGraphPanelWidgetDarkTheme } from './GraphPanelWidgetDarkTheme'
import { registerGraphPanelWidgetLightTheme } from './GraphPanelWidgetLightTheme'

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
  showSliders?: boolean
}

const { canAutoResize, plots, showMarker = false, showSliders = false } = defineProps<IProps>()

const darkTheme = registerGraphPanelWidgetDarkTheme()
const lightTheme = registerGraphPanelWidgetLightTheme()
const theme = vue.computed(() => {
  return common.isLightMode.value ? lightTheme : darkTheme
})

echarts.use([CanvasRenderer, DataZoomComponent, GridComponent, LineChart])

type EchartsOption = echarts.ComposeOption<DataZoomComponentOption | GridComponentOption | LineSeriesOption>

function defaultOption(): EchartsOption {
  const res: EchartsOption = {
    animation: false,
    xAxis: {
      type: 'value',
      scale: true,
      minorTick: {
        show: true
      },
      minorSplitLine: {
        show: true
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      minorTick: {
        show: true
      },
      minorSplitLine: {
        show: true
      }
    },
    dataZoom: [
      {
        type: 'inside',
        filterMode: 'none',
        xAxisIndex: 0
      },
      {
        type: 'inside',
        filterMode: 'none',
        yAxisIndex: 0
      }
    ],
    series: []
  }

  if (plots.length === 0) {
    if (res.xAxis !== undefined && !Array.isArray(res.xAxis)) {
      res.xAxis.min = 0
      res.xAxis.max = 1000
    }

    if (res.yAxis !== undefined && !Array.isArray(res.yAxis)) {
      res.yAxis.min = 0
      res.yAxis.max = 1000
    }
  }

  if (showSliders) {
    res.dataZoom = [
      {
        type: 'slider',
        filterMode: 'none',
        xAxisIndex: 0
      },
      {
        type: 'slider',
        filterMode: 'none',
        yAxisIndex: 0,
        orient: 'vertical',
        left: '93%'
      }
    ]
  }

  return res
}

const option = vue.ref<EchartsOption>(defaultOption())

vue.watch(
  () => plots,
  (plots) => {
    option.value = defaultOption()

    option.value.series = plots.map((plot) => ({
      type: 'line',
      showSymbol: false,
      data: common.coordinates(plot.x.data, plot.y.data)
    }))
  }
)
</script>

<style scoped>
.marker {
  width: 3px;
  background-color: var(--p-primary-color);
}
</style>
