<template>
  <div class="flex flex-row h-full">
    <div v-if="showMarker" class="w-[3px] bg-primary" />
    <div ref="mainDiv" class="grow h-full" />
  </div>
</template>

<script setup lang="ts">
import Plotly from 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@3.3.0/+esm';
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon';
import { MEDIUM_DELAY } from '../../common/constants';

let oldMainDivClientWidth = -1;
let oldMainDivClientHeight = -1;

function resizeIfNeeded() {
  if (mainDiv.value !== null) {
    if (mainDiv.value.clientWidth !== oldMainDivClientWidth || mainDiv.value.clientHeight !== oldMainDivClientHeight) {
      oldMainDivClientWidth = mainDiv.value.clientWidth;
      oldMainDivClientHeight = mainDiv.value.clientHeight;

      Plotly.Plots.resize(mainDiv.value);
    }
  }

  setTimeout(resizeIfNeeded, MEDIUM_DELAY);
}

vue.onMounted(() => {
  resizeIfNeeded();
});

interface IGraphPanelPlotData {
  data: number[];
}

export interface IGraphPanelPlot {
  x: IGraphPanelPlotData;
  y: IGraphPanelPlotData;
}

const props = withDefaults(
  defineProps<{
    plots: IGraphPanelPlot[];
    showMarker?: boolean;
  }>(),
  {
    showMarker: false
  }
);

const mainDiv = vue.ref<InstanceType<typeof Element> | null>(null);
const theme = vueCommon.useTheme();

interface IAxisThemeData {
  zerolinecolor: string;
  gridcolor: string;
  minor: {
    gridcolor: string;
  };
}

interface IThemeData {
  paper_bgcolor: string;
  plot_bgcolor: string;
  font: { color: string };
  colorway: string[];
  xaxis: IAxisThemeData;
  yaxis: IAxisThemeData;
}

function themeData(): IThemeData {
  // Note: the various keys can be found at https://plotly.com/javascript/reference/.

  function axisThemeData(): IAxisThemeData {
    return {
      zerolinecolor: theme.useLightMode() ? '#94a3b8' : '#71717a', // --p-surface-400 / --p-surface-500
      gridcolor: theme.useLightMode() ? '#e2e8f0' : '#3f3f46', // --p-surface-200 / --p-surface-700
      minor: {
        gridcolor: theme.useLightMode() ? '#f1f5f9' : '#27272a' // --p-surface-100 / --p-surface-800
      }
    };
  }

  return {
    paper_bgcolor: theme.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    plot_bgcolor: theme.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    font: {
      color: theme.useLightMode() ? '#334155' : '#ffffff' // --p-text-color
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
  };
}

vue.watch(
  () => [props.plots, theme.useLightMode()],
  () => {
    Plotly.react(
      mainDiv.value,
      props.plots.map((plot) => ({
        x: plot.x.data,
        y: plot.y.data
        // type: 'scattergl'
        //---OPENCOR---
        // Ideally, we would render using WebGL, but... Web browsers impose a limit on the number of active WebGL
        // contexts that can be used (8 to 16, apparently). So, depending on how the OpenCOR component is used, we may
        // reach that limit and get the following warning as a result:
        //   Too many active WebGL contexts. Oldest context will be lost.
        // and nothing gets rendered. Apparently, plotly.js added support for virtual-webgl in version 2.28.0 (see
        // https://github.com/plotly/plotly.js/releases/tag/v2.28.0), but to do what they say in
        // https://github.com/plotly/plotly.js/pull/6784#issue-1991790973 still results in the same behaviour as above.
        // So, it looks like we have no choice but to disable WebGL rendering. The downside is that 1) it doesn't look
        // as good and 2) it is not as fast to render when there are a lot of data points. However, to use a virtual
        // WebGL would mean that all WebGL-based components would also be using virtual WebGL, which might not be
        // desirable.
      })),
      {
        // Note: the various keys can be found at https://plotly.com/javascript/reference/.

        ...themeData(),
        margin: {
          t: 5,
          l: 30,
          b: 20,
          r: 5
        },
        showlegend: false,
        xaxis: {
          tickangle: 0
        },
        yaxis: {
          tickangle: 0
        }
      },
      {
        // Note: the various keys can be found at https://plotly.com/javascript/configuration-options/.

        responsive: true,
        displayModeBar: false,
        doubleClickDelay: 1000,
        scrollZoom: true,
        showTips: false
      }
    );
  }
);
</script>
