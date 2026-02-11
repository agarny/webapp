<template>
  <div class="flex flex-row h-full" :class="isVisible ? 'visible' : 'invisible'">
    <div v-if="showMarker" class="w-0.75 bg-primary" />
    <div ref="mainDiv" class="grow h-full" @contextmenu="onContextMenu" />
    <ContextMenu ref="contextMenu" :model="contextMenuItems" />
  </div>
</template>

<script setup lang="ts">
import Plotly from 'https://cdn.jsdelivr.net/npm/plotly.js-gl2d-dist-min@3.3.1/+esm';

import ContextMenu from 'primevue/contextmenu';
import type { MenuItem } from 'primevue/menuitem';
import * as vue from 'vue';

import * as colors from '../../common/colors.ts';
import * as common from '../../common/common.ts';
import { LONG_DELAY, NO_DELAY, SHORT_DELAY } from '../../common/constants.ts';
import * as vueCommon from '../../common/vueCommon.ts';

import type { IProgressMessage } from '../OpenCOR.vue';

const CONTEXT_MENU_EVENT: string = 'graph-panel-context-menu-open';

export interface IGraphPanelPlotTrace {
  name: string;
  xValue: string;
  x: Float64Array;
  yValue: string;
  y: Float64Array;
  color: string;
  zorder?: number;
}

export interface IGraphPanelData {
  xAxisTitle?: string;
  yAxisTitle?: string;
  traces: IGraphPanelPlotTrace[];
}

export interface IGraphPanelMargins {
  left: number;
  right: number;
}

const props = withDefaults(
  defineProps<{
    data: IGraphPanelData;
    showMarker?: boolean;
    margins?: IGraphPanelMargins;
    showLegend?: boolean;
  }>(),
  {
    showMarker: false,
    showLegend: true
  }
);
const emit = defineEmits<{
  (event: 'marginsUpdated', newMargins: IGraphPanelMargins): void;
  (event: 'resetMargins'): void;
}>();

const resize = (): Promise<unknown> => {
  return Promise.resolve()
    .then(() => {
      if (mainDiv.value) {
        Plotly.Plots.resize(mainDiv.value);
      }
    })
    .then(() => {
      updateMarginsAsync();
    });
};

defineExpose({
  resize
});

const instanceId = Symbol('GraphPanelWidget');
const mainDiv = vue.ref<HTMLElement | null>(null);
const isVisible = vue.ref(false);
const margins = vue.ref<IGraphPanelMargins>({ left: -1, right: -1 });
const theme = vueCommon.useTheme();
const contextMenu = vue.ref<InstanceType<typeof ContextMenu> | null>(null);
let updatingMargins = false;
const progressMessage = vue.inject<IProgressMessage>('progressMessage');

// Context menu functionality.

const contextMenuItems = vue.computed<MenuItem[]>(() => [
  {
    icon: 'pi pi-search-plus',
    label: 'Zoom In',
    command: () => zoomIn()
  },
  {
    icon: 'pi pi-search-minus',
    label: 'Zoom Out',
    command: () => zoomOut()
  },
  {
    icon: 'pi pi-refresh',
    label: 'Reset Zoom',
    command: () => resetZoom()
  },
  {
    separator: true
  },
  {
    icon: 'pi pi-copy',
    label: 'Copy to Clipboard',
    command: () => copyToClipboard()
  },
  {
    icon: 'pi pi-chart-line',
    label: 'Export Plot',
    items: [
      {
        icon: 'pi pi-file',
        label: 'Export to JPEG',
        command: () => exportToImage('jpeg')
      },
      {
        icon: 'pi pi-file',
        label: 'Export to PNG',
        command: () => exportToImage('png')
      },
      {
        icon: 'pi pi-file',
        label: 'Export to SVG',
        command: () => exportToImage('svg')
      },
      {
        icon: 'pi pi-file',
        label: 'Export to WebP',
        command: () => exportToImage('webp')
      }
    ]
  },
  {
    separator: true
  },
  {
    label: 'Export Data to CSV',
    icon: 'pi pi-download',
    command: () => exportToCsv()
  }
]);

const onContextMenu = (event: MouseEvent): void => {
  event.preventDefault();

  window.dispatchEvent(
    new CustomEvent(CONTEXT_MENU_EVENT, {
      detail: {
        sourceId: instanceId
      }
    })
  );

  contextMenu.value?.show(event);
};

const zoomIn = (): void => {
  if (!mainDiv.value) {
    return;
  }

  const layout = (mainDiv.value as unknown as { layout?: Partial<Plotly.Layout> }).layout;

  if (!layout?.xaxis?.range || !layout?.yaxis?.range) {
    return;
  }

  const xRange = layout.xaxis.range as [number, number];
  const yRange = layout.yaxis.range as [number, number];

  const xCenter = 0.5 * (xRange[0] + xRange[1]);
  const yCenter = 0.5 * (yRange[0] + yRange[1]);
  const xSpan = 0.5 * (xRange[1] - xRange[0]);
  const ySpan = 0.5 * (yRange[1] - yRange[0]);

  Plotly.relayout(mainDiv.value, {
    'xaxis.range': [xCenter - 0.5 * xSpan, xCenter + 0.5 * xSpan],
    'yaxis.range': [yCenter - 0.5 * ySpan, yCenter + 0.5 * ySpan]
  });

  emit('resetMargins');
};

const zoomOut = (): void => {
  if (!mainDiv.value) {
    return;
  }

  const layout = (mainDiv.value as unknown as { layout?: Partial<Plotly.Layout> }).layout;

  if (!layout?.xaxis?.range || !layout?.yaxis?.range) {
    return;
  }

  const xRange = layout.xaxis.range as [number, number];
  const yRange = layout.yaxis.range as [number, number];

  const xCenter = 0.5 * (xRange[0] + xRange[1]);
  const yCenter = 0.5 * (yRange[0] + yRange[1]);
  const xSpan = 0.5 * (xRange[1] - xRange[0]);
  const ySpan = 0.5 * (yRange[1] - yRange[0]);

  Plotly.relayout(mainDiv.value, {
    'xaxis.range': [xCenter - 2 * xSpan, xCenter + 2 * xSpan],
    'yaxis.range': [yCenter - 2 * ySpan, yCenter + 2 * ySpan]
  });

  emit('resetMargins');
};

const resetZoom = (): void => {
  if (!mainDiv.value) {
    return;
  }

  Plotly.relayout(mainDiv.value, {
    'xaxis.autorange': true,
    'yaxis.autorange': true
  });

  emit('resetMargins');
};

const copyToClipboard = async (): Promise<void> => {
  if (!mainDiv.value) {
    return;
  }

  try {
    const imageData = await Plotly.toImage(mainDiv.value, {
      format: 'png',
      width: mainDiv.value.clientWidth,
      height: mainDiv.value.clientHeight
    });

    const binaryData = atob(imageData.split(',')[1]);
    const array = Uint8Array.from(binaryData, (c) => c.charCodeAt(0));

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': new Blob([array], { type: 'image/png' })
      })
    ]);
  } catch (error: unknown) {
    console.error('Failed to copy to clipboard:', common.formatError(error));
  }
};

const exportToImage = async (format: 'jpeg' | 'png' | 'svg' | 'webp'): Promise<void> => {
  if (!mainDiv.value) {
    return;
  }

  try {
    await Plotly.downloadImage(mainDiv.value, {
      format: format,
      width: mainDiv.value.clientWidth,
      height: mainDiv.value.clientHeight,
      filename: 'plot'
    });
  } catch (error: unknown) {
    console.error('Failed to export image:', common.formatError(error));
  }
};

const exportToCsv = async (): Promise<void> => {
  // Make sure that we have at least one trace to export.

  const firstTrace = props.data.traces[0];

  if (!firstTrace) {
    return;
  }

  // Show the progress message.

  if (progressMessage) {
    progressMessage.show('Exporting data to CSV...');
  }

  let successfulExport: boolean = true;

  try {
    // Allow the UI to update before actually starting the export to CSV.

    await common.sleep(SHORT_DELAY);

    // Perform the export itself.
    // Note: to efficiently export to CSV, we build an array of CSV lines and only join them together at the end. This is
    //       much more efficient than concatenating strings together repeatedly.

    const csvLines: string[] = [];

    // Headers.

    const allXValuesEqual = props.data.traces.every((trace) => trace.xValue === firstTrace.xValue);
    const headerParts: string[] = [allXValuesEqual ? firstTrace.xValue : 'X'];

    props.data.traces.forEach((trace) => {
      headerParts.push(trace.name.replace(/<[^>]*>|,/g, '') || trace.yValue);
      // Note: we remove any HTML tags and commas to ensure the CSV is well-formed.
    });

    csvLines.push(headerParts.join(','));

    // Data rows: collect all unique X values and build value maps.

    const allXValues = new Set<number>();
    const traceMaps = props.data.traces.map((trace) => {
      const map = new Map<number, number>();

      for (let i = 0; i < trace.x.length; ++i) {
        const xValue = trace.x[i];
        const yValue = trace.y[i];

        if (xValue !== undefined && yValue !== undefined) {
          allXValues.add(xValue);

          map.set(xValue, yValue);
        }
      }

      return map;
    });

    // Process the rows and update the progress message at regular intervals to keep the UI responsive.

    const sortedXValues = Array.from(allXValues).sort((a, b) => a - b);
    const chunkSize = Math.max(1, Math.floor(0.01 * sortedXValues.length));
    const percentPerRow = 100 / sortedXValues.length;
    let processedRows = 0;

    for (const sortedXValue of sortedXValues) {
      const rowParts: string[] = [String(sortedXValue)];

      props.data.traces.forEach((_trace, traceIndex) => {
        const yValue = traceMaps[traceIndex]?.get(sortedXValue);

        rowParts.push(yValue !== undefined ? String(yValue) : '');
      });

      csvLines.push(rowParts.join(','));

      ++processedRows;

      if (progressMessage && (processedRows % chunkSize === 0 || processedRows === sortedXValues.length)) {
        progressMessage.update(Math.floor(percentPerRow * processedRows));

        await common.sleep(NO_DELAY);
      }
    }

    // Make sure that we show 100% before finishing.

    if (progressMessage) {
      progressMessage.update(100);
    }

    // Create and download the CSV file.

    common.downloadFile('data.csv', csvLines.join('\n'), 'text/csv;charset=utf-8;');
  } catch (error: unknown) {
    successfulExport = false;

    console.error('Failed to export to CSV:', common.formatError(error));
  } finally {
    // Hide the progress message. If the export succeeded then delay briefly so that the user can see that we reached
    // 100%. Otherwise, hide immediately to avoid blocking the UI unnecessarily.

    if (progressMessage) {
      if (successfulExport) {
        await common.sleep(LONG_DELAY);
      }

      progressMessage.hide();
    }
  }
};

// Plotly theme and layout data generation.

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

const themeData = (): IThemeData => {
  // Note: the various keys can be found at https://plotly.com/javascript/reference/.

  const axisThemeData = (): IAxisThemeData => {
    return {
      zerolinecolor: theme.useLightMode() ? '#94a3b8' : '#71717a', // --p-surface-400 / --p-surface-500
      gridcolor: theme.useLightMode() ? '#e2e8f0' : '#3f3f46', // --p-surface-200 / --p-surface-700
      minor: {
        gridcolor: theme.useLightMode() ? '#f1f5f9' : '#27272a' // --p-surface-100 / --p-surface-800
      }
    };
  };

  return {
    paper_bgcolor: theme.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    plot_bgcolor: theme.useLightMode() ? '#ffffff' : '#18181b', // --p-content-background
    font: {
      color: theme.useLightMode() ? '#334155' : '#ffffff' // --p-text-color
    },
    colorway: colors.PALETTE_COLORS,
    xaxis: axisThemeData(),
    yaxis: axisThemeData()
  };
};

interface IAxesDataAxis {
  automargin: boolean;
  tickangle: number;
  tickfont: {
    size: number;
  };
  title: {
    standoff: number;
    text?: string;
  };
}

interface IAxesData {
  xaxis: IAxesDataAxis;
  yaxis: IAxesDataAxis;
}

const axesData = (): IAxesData => {
  const axisTickFontSize = 10;

  return {
    xaxis: {
      automargin: true,
      tickangle: 0,
      tickfont: {
        size: axisTickFontSize
      },
      title: {
        standoff: 8,
        text: props.data.xAxisTitle
      }
    },
    yaxis: {
      automargin: true,
      tickangle: 0,
      tickfont: {
        size: axisTickFontSize
      },
      title: {
        standoff: 8,
        text: props.data.yAxisTitle
      }
    }
  };
};

const resolvedMargin = (propValue: number | undefined, compValue: number): number => {
  if (propValue !== undefined) {
    return propValue;
  }

  return compValue === -1 ? 0 : compValue;
};

const compMargins = (): IGraphPanelMargins => {
  // Retrieve the width of the Y ticks.

  const yTicks = mainDiv.value?.querySelectorAll('.ytick text');
  let yTicksWidth = 0;

  if (yTicks?.length) {
    yTicks.forEach((yTick: Element) => {
      yTicksWidth = Math.max(yTicksWidth, yTick.getBoundingClientRect()?.width || 0);
    });
  }

  // Retrieve the width of the Y Axis title.

  const yTitleWidth = props.data.yAxisTitle
    ? mainDiv.value?.querySelector('.ytitle')?.getBoundingClientRect()?.width || 0
    : 0;

  // Compute the final left margin.

  const leftMargin = yTicksWidth + yTitleWidth;

  // Retrieve the width of the legend, if it's to be shown, and that last X tick.
  // Note #1: for the last X tick, we only use half its width since the tick is centered on the tick mark.
  // Note #2: to get the correct width of the last X tick, we temporarily set its display to block in case it was
  //          hidden, something that can happen if the tick label is long for instance.

  let rightMargin = 0;

  if (props.showLegend) {
    rightMargin = mainDiv.value?.querySelector('.legend')?.getBoundingClientRect()?.width || 0;
  }

  const xTicks = mainDiv.value?.querySelectorAll('.xtick text');

  if (xTicks?.length) {
    const lastTick = xTicks[xTicks.length - 1] as HTMLElement;
    const originalDisplay = lastTick.style.display;

    lastTick.style.display = 'block';

    rightMargin += 0.5 * (lastTick?.getBoundingClientRect()?.width || 0);

    lastTick.style.display = originalDisplay;
  }

  return {
    left: leftMargin ? Math.ceil(leftMargin + 5) : 0,
    right: rightMargin ? Math.ceil(rightMargin + 5) : 0
  };
};

const updateMarginsAsync = (): void => {
  // Skip if we are already updating our margins.

  if (updatingMargins) {
    return;
  }

  updatingMargins = true;

  // Use requestAnimationFrame for optimal timing (after render, before next paint).

  requestAnimationFrame(() => {
    const newMargins = compMargins();

    emit('marginsUpdated', newMargins);

    // Update our margins if they have changed.

    const relayoutUpdates: Record<string, number> = {};

    if (!props.margins) {
      if (margins.value.left !== newMargins.left) {
        margins.value.left = newMargins.left;

        relayoutUpdates['margin.l'] = margins.value.left;
      }

      if (margins.value.right !== newMargins.right) {
        margins.value.right = newMargins.right;

        relayoutUpdates['margin.r'] = margins.value.right;
      }
    }

    if (Object.keys(relayoutUpdates).length) {
      Plotly.relayout(mainDiv.value, relayoutUpdates);
    }

    updatingMargins = false;
  });
};

const updatePlot = (): void => {
  // Reset our margins if they are not overridden.

  if (!props.margins) {
    margins.value.left = -1;
    margins.value.right = -1;
  }

  // Update the plots.

  const traces = props.data.traces.map((trace) => ({
    ...trace,
    ...{
      line: { color: trace.color },
      legendrank: trace.zorder
    }
  }));

  Plotly.react(
    mainDiv.value,
    traces,
    {
      // Note: the various keys can be found at https://plotly.com/javascript/reference/.

      ...themeData(),
      margin: {
        t: 0,
        l: resolvedMargin(props.margins?.left, margins.value.left),
        b: props.data.xAxisTitle ? 35 : 20,
        r: resolvedMargin(props.margins?.right, margins.value.right),
        pad: 0
      },
      showlegend: props.showLegend,
      ...axesData()
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
    .then(() => {
      if (!isVisible.value) {
        // Force Plotly to recalculate the layout after the plot is rendered to ensure that it has correct dimensions.

        return Plotly.Plots.resize(mainDiv.value);
      }
    })
    .then(() => {
      if (!isVisible.value) {
        // Show the component now that the plot has been properly sized.

        vue.nextTick(() => {
          isVisible.value = true;
        });
      }

      // Update our margins asynchronously after our initial render.

      updateMarginsAsync();
    });
};

interface IPlotlyHTMLElement extends HTMLElement {
  on(event: string, callback: (...args: unknown[]) => void): void;
}

const handleContextMenu = (event: Event): void => {
  // Hide our context menu if the event was dispatched by another instance of the Graph Panel widget. This ensures that
  // only one context menu is open at any given time.

  const detail = (event as CustomEvent<{ sourceId?: symbol }>)?.detail;

  if (!detail || detail.sourceId === instanceId) {
    return;
  }

  contextMenu.value?.hide?.();
};

vue.onMounted(() => {
  window.addEventListener(CONTEXT_MENU_EVENT, handleContextMenu);

  vue.nextTick(() => {
    // Reset our margins on double-click and relayout.

    const plotlyElement = mainDiv.value as IPlotlyHTMLElement;

    plotlyElement.on('plotly_doubleclick', () => {
      emit('resetMargins');
    });

    plotlyElement.on('plotly_relayout', (eventData: Partial<Plotly.Layout>) => {
      if (eventData && (eventData['xaxis.range[0]'] || eventData['yaxis.range[0]'])) {
        emit('resetMargins');
      }
    });
  });
});

vue.onUnmounted(() => {
  window.removeEventListener(CONTEXT_MENU_EVENT, handleContextMenu);
});

vue.watch(
  () => props.data,
  () => {
    vue.nextTick(() => {
      updatePlot();
    });
  },
  { immediate: true }
);

vue.watch(
  () => theme.useLightMode(),
  () => {
    vue.nextTick(() => {
      if (mainDiv.value) {
        Plotly.relayout(mainDiv.value, {
          ...themeData(),
          ...axesData()
        });
      }
    });
  },
  { immediate: true }
);

vue.watch(
  () => props.margins,
  () => {
    vue
      .nextTick(() => {
        if (mainDiv.value) {
          return Plotly.relayout(mainDiv.value, {
            'margin.l': resolvedMargin(props.margins?.left, margins.value.left),
            'margin.r': resolvedMargin(props.margins?.right, margins.value.right)
          });
        }
      })
      .then(() => {
        if (!props.margins) {
          updateMarginsAsync();
        }
      });
  },
  { immediate: true }
);

vue.watch(
  () => props.showLegend,
  () => {
    vue.nextTick(() => {
      if (mainDiv.value) {
        Plotly.relayout(mainDiv.value, {
          showlegend: props.showLegend
        }).then(() => {
          updateMarginsAsync();
        });
      }
    });
  },
  { immediate: true }
);
</script>
