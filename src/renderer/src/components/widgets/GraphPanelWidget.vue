<template>
  <div class="flex flex-row h-full">
    <div v-if="showMarker" class="w-0.75 bg-primary" />
    <div ref="mainDivRef" class="grow h-full" @contextmenu="onContextMenu" />
    <ContextMenu ref="contextMenuRef" :model="contextMenuItems" />
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';

import ContextMenu from 'primevue/contextmenu';
import type { MenuItem } from 'primevue/menuitem';
import * as vue from 'vue';

import * as colors from '../../common/colors';
import * as common from '../../common/common';
import { LONG_DELAY, NO_DELAY, SHORT_DELAY } from '../../common/constants';
import * as dependencies from '../../common/dependencies';
import * as math from '../../common/math';
import * as vueCommon from '../../common/vueCommon';

import type { IProgressMessage } from '../OpenCOR.vue';

const CONTEXT_MENU_EVENT: string = 'graph-panel-context-menu-open';

interface IPlotlyAxis {
  range?: [number, number];
}

interface IPlotlyLayout {
  xaxis?: IPlotlyAxis;
  yaxis?: IPlotlyAxis;
}

export interface IGraphPanelPlotTrace {
  name: string;
  traceId?: string;
  xValue: string;
  x: math.FloatArray;
  yValue: string;
  y: math.FloatArray;
  color: string;
  zorder?: number;
}

type PlotlyTraceVisible = boolean | 'legendonly';

interface IPlotlyTraceState {
  name?: string;
  traceId?: string;
  xValue?: string;
  yValue?: string;
  visible?: PlotlyTraceVisible;
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

const sameMargins = (firstMargins: IGraphPanelMargins | undefined, secondMargins: IGraphPanelMargins): boolean => {
  return firstMargins?.left === secondMargins.left && firstMargins?.right === secondMargins.right;
};

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

const trackSize = (): void => {
  trackedWidth = mainDivRef.value?.clientWidth || 0;
  trackedHeight = mainDivRef.value?.clientHeight || 0;
};

const queueResize = (): void => {
  if (resizeQueued) {
    return;
  }

  resizeQueued = true;

  requestAnimationFrame(() => {
    resizeQueued = false;

    resize();
  });
};

const resize = (): Promise<unknown> => {
  if (!mainDivRef.value || !plotIsReady) {
    return Promise.resolve();
  }

  return Promise.resolve(dependencies._plotlyJs.Plots.resize(mainDivRef.value)).then(() => {
    trackSize();

    updateMarginsAsync();
  });
};

defineExpose({
  resize
});

const instanceId = Symbol('GraphPanelWidget');
const mainDivRef = vue.ref<HTMLElement | null>(null);
const margins = vue.ref<IGraphPanelMargins>({ left: -1, right: -1 });
const theme = vueCommon.useTheme();
const contextMenuRef = vue.ref<InstanceType<typeof ContextMenu> | null>(null);
const progressMessage = vue.inject<IProgressMessage>('progressMessage');
let updatingMargins = false;
let plotIsReady = false;
let resizeQueued = false;
let trackedWidth = 0;
let trackedHeight = 0;
let trackedMargins: IGraphPanelMargins | undefined;
let stopTrackingContainerSize: (() => void) | undefined;

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

  contextMenuRef.value?.show(event);
};

const zoomIn = (): void => {
  if (!mainDivRef.value) {
    return;
  }

  const layout = (mainDivRef.value as unknown as { layout?: IPlotlyLayout }).layout;

  if (!layout?.xaxis?.range || !layout?.yaxis?.range) {
    return;
  }

  const xRange = layout.xaxis.range as [number, number];
  const yRange = layout.yaxis.range as [number, number];

  const xCenter = 0.5 * (xRange[0] + xRange[1]);
  const yCenter = 0.5 * (yRange[0] + yRange[1]);
  const xSpan = 0.5 * (xRange[1] - xRange[0]);
  const ySpan = 0.5 * (yRange[1] - yRange[0]);

  dependencies._plotlyJs.relayout(mainDivRef.value, {
    'xaxis.range': [xCenter - 0.5 * xSpan, xCenter + 0.5 * xSpan],
    'yaxis.range': [yCenter - 0.5 * ySpan, yCenter + 0.5 * ySpan]
  });

  emit('resetMargins');
};

const zoomOut = (): void => {
  if (!mainDivRef.value) {
    return;
  }

  const layout = (mainDivRef.value as unknown as { layout?: IPlotlyLayout }).layout;

  if (!layout?.xaxis?.range || !layout?.yaxis?.range) {
    return;
  }

  const xRange = layout.xaxis.range as [number, number];
  const yRange = layout.yaxis.range as [number, number];

  const xCenter = 0.5 * (xRange[0] + xRange[1]);
  const yCenter = 0.5 * (yRange[0] + yRange[1]);
  const xSpan = 0.5 * (xRange[1] - xRange[0]);
  const ySpan = 0.5 * (yRange[1] - yRange[0]);

  dependencies._plotlyJs.relayout(mainDivRef.value, {
    'xaxis.range': [xCenter - 2 * xSpan, xCenter + 2 * xSpan],
    'yaxis.range': [yCenter - 2 * ySpan, yCenter + 2 * ySpan]
  });

  emit('resetMargins');
};

const resetZoom = (): void => {
  if (!mainDivRef.value) {
    return;
  }

  dependencies._plotlyJs.relayout(mainDivRef.value, {
    'xaxis.autorange': true,
    'yaxis.autorange': true
  });

  emit('resetMargins');
};

const copyToClipboard = async (): Promise<void> => {
  if (!mainDivRef.value) {
    return;
  }

  try {
    const imageData = await dependencies._plotlyJs.toImage(mainDivRef.value, {
      format: 'png',
      width: mainDivRef.value.clientWidth,
      height: mainDivRef.value.clientHeight
    });

    const binaryData = atob(imageData.split(',')[1]);
    const array = Uint8Array.from(binaryData, (c) => c.charCodeAt(0));

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': new Blob([array], { type: 'image/png' })
      })
    ]);
  } catch (error: unknown) {
    console.warn('OpenCOR: failed to copy to clipboard:', common.formatError(error));
  }
};

const exportToImage = async (format: 'jpeg' | 'png' | 'svg' | 'webp'): Promise<void> => {
  if (!mainDivRef.value) {
    return;
  }

  try {
    await dependencies._plotlyJs.downloadImage(mainDivRef.value, {
      format: format,
      width: mainDivRef.value.clientWidth,
      height: mainDivRef.value.clientHeight,
      filename: 'plot'
    });
  } catch (error: unknown) {
    console.warn('OpenCOR: failed to export image:', common.formatError(error));
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

    for (const trace of props.data.traces) {
      headerParts.push(trace.name.replace(/<[^>]*>|,/g, '') || trace.yValue);
      // Note: we remove any HTML tags and commas to ensure the CSV is well-formed.
    }

    csvLines.push(headerParts.join(','));

    // Data rows: collect all unique X values and build value maps.

    const allXValues = new Set<number>();
    const traceMaps: Map<number, number>[] = [];

    for (const trace of props.data.traces) {
      const map = new Map<number, number>();

      for (let i = 0; i < trace.x.length; ++i) {
        const xValue = trace.x[i];
        const yValue = trace.y[i];

        if (xValue !== undefined && yValue !== undefined) {
          allXValues.add(xValue);

          map.set(xValue, yValue);
        }
      }

      traceMaps.push(map);
    }

    // Process the rows and update the progress message at regular intervals to keep the UI responsive.

    const sortedXValues = Array.from(allXValues).sort((a, b) => a - b);
    const chunkSize = Math.max(1, Math.floor(0.01 * sortedXValues.length));
    const percentPerRow = 100 / sortedXValues.length;
    let processedRows = 0;

    for (const sortedXValue of sortedXValues) {
      const rowParts: string[] = [String(sortedXValue)];

      for (let traceIndex = 0; traceIndex < props.data.traces.length; ++traceIndex) {
        const yValue = traceMaps[traceIndex]?.get(sortedXValue);

        rowParts.push(yValue !== undefined ? String(yValue) : '');
      }

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

    console.warn('OpenCOR: failed to export to CSV:', common.formatError(error));
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

  const useLightMode = theme.useLightMode();

  const axisThemeData = (): IAxisThemeData => {
    return {
      zerolinecolor: useLightMode ? '#94a3b8' : '#71717a', // --p-surface-400 / --p-surface-500
      gridcolor: useLightMode ? '#e2e8f0' : '#3f3f46', // --p-surface-200 / --p-surface-700
      minor: {
        gridcolor: useLightMode ? '#f1f5f9' : '#27272a' // --p-surface-100 / --p-surface-800
      }
    };
  };

  return {
    paper_bgcolor: useLightMode ? '#ffffff' : '#18181b', // --p-content-background
    plot_bgcolor: useLightMode ? '#ffffff' : '#18181b', // --p-content-background
    font: {
      color: useLightMode ? '#334155' : '#ffffff' // --p-text-color
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
  const mainDiv = mainDivRef.value;

  if (!mainDiv) {
    return {
      left: 0,
      right: 0
    };
  }

  // Retrieve the width of the Y ticks.

  const yTicks = mainDiv.querySelectorAll('.ytick text');
  let yTicksWidth = 0;

  if (yTicks?.length) {
    yTicks.forEach((yTick: Element) => {
      yTicksWidth = Math.max(yTicksWidth, yTick.getBoundingClientRect()?.width || 0);
    });
  }

  // Retrieve the width of the Y Axis title.

  const yTitleWidth = props.data.yAxisTitle ? mainDiv.querySelector('.ytitle')?.getBoundingClientRect()?.width || 0 : 0;

  // Compute the final left margin.

  const leftMargin = yTicksWidth + yTitleWidth;

  // Retrieve the width of the legend, if it's to be shown, and that last X tick.
  // Note #1: for the last X tick, we only use half its width since the tick is centered on the tick mark.
  // Note #2: to get the correct width of the last X tick, we temporarily set its display to block in case it was
  //          hidden, something that can happen if the tick label is long for instance.

  let rightMargin = 0;

  if (props.showLegend) {
    rightMargin = mainDiv.querySelector('.legend')?.getBoundingClientRect()?.width || 0;
  }

  const xTicks = mainDiv.querySelectorAll('.xtick text');

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

const canMeasureMargins = (): boolean => {
  const mainDiv = mainDivRef.value;

  if (!mainDiv) {
    return false;
  }

  const { width, height } = mainDiv.getBoundingClientRect();

  return width > 0 && height > 0;
};

const updateMarginsAsync = (): void => {
  // Skip if we are already updating our margins.

  if (updatingMargins) {
    return;
  }

  updatingMargins = true;

  // Use requestAnimationFrame for optimal timing.

  requestAnimationFrame(() => {
    // Make sure that we can measure our margins before proceeding.

    if (!canMeasureMargins()) {
      updatingMargins = false;

      return;
    }

    const newMargins = compMargins();

    // Emit an update if our margins have changed.

    if (!sameMargins(trackedMargins, newMargins)) {
      trackedMargins = newMargins;

      emit('marginsUpdated', newMargins);
    }

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
      dependencies._plotlyJs.relayout(mainDivRef.value, relayoutUpdates);
    }

    updatingMargins = false;
  });
};

const updatePlot = (): void => {
  plotIsReady = false;

  // Reset our margins if they are not overridden.

  if (!props.margins) {
    margins.value.left = -1;
    margins.value.right = -1;
  }

  // Update the plots.

  const traceVisibilityKey = (trace: IPlotlyTraceState): string | undefined => {
    if (trace.traceId) {
      return `id::${trace.traceId}`;
    }

    if (trace.name && trace.xValue && trace.yValue) {
      return `expr::${trace.xValue}::${trace.yValue}::${trace.name}`;
    }

    return undefined;
  };

  const previousTraceVisibilityByKey: Record<string, PlotlyTraceVisible> = {};
  const previousPlotlyData = (mainDivRef.value as unknown as { data?: IPlotlyTraceState[] })?.data;

  for (const plotlyTrace of previousPlotlyData ?? []) {
    const plotlyTraceKey = traceVisibilityKey(plotlyTrace);

    if (plotlyTraceKey && plotlyTrace.visible !== undefined) {
      previousTraceVisibilityByKey[plotlyTraceKey] = plotlyTrace.visible;
    }
  }

  const traces = props.data.traces.map((trace) => {
    const traceKey = traceVisibilityKey(trace);
    const visible = traceKey ? previousTraceVisibilityByKey[traceKey] : undefined;

    return {
      ...trace,
      visible,
      line: { color: trace.color },
      legendrank: trace.zorder
    };
  });

  dependencies._plotlyJs
    .react(
      mainDivRef.value,
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
      plotIsReady = true;

      // Force Plotly to recalculate the layout after each react() call to keep the graph aligned with sibling panels.

      queueResize();
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

  contextMenuRef.value?.hide?.();
};

vue.onMounted(() => {
  window.addEventListener(CONTEXT_MENU_EVENT, handleContextMenu);

  const { stop } = vueusecore.useResizeObserver(
    mainDivRef,
    () => {
      const width = mainDivRef.value?.clientWidth || 0;
      const height = mainDivRef.value?.clientHeight || 0;

      if (!plotIsReady || width <= 0 || height <= 0) {
        return;
      }

      if (width === trackedWidth && height === trackedHeight) {
        return;
      }

      trackedWidth = width;
      trackedHeight = height;

      queueResize();
    },
    {
      box: 'border-box'
    }
  );

  stopTrackingContainerSize = stop;

  vue.nextTick(() => {
    // Reset our margins on double-click and relayout.

    const plotlyElement = mainDivRef.value as IPlotlyHTMLElement;

    plotlyElement.on('plotly_doubleclick', () => {
      emit('resetMargins');
    });

    plotlyElement.on('plotly_relayout', (...args: unknown[]) => {
      const eventData = args[0] as Record<string, unknown> | undefined;

      if (eventData && ('xaxis.range[0]' in eventData || 'yaxis.range[0]' in eventData)) {
        emit('resetMargins');
      }
    });
  });
});

vue.onUnmounted(() => {
  window.removeEventListener(CONTEXT_MENU_EVENT, handleContextMenu);

  stopTrackingContainerSize?.();
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
      if (plotIsReady && mainDivRef.value) {
        dependencies._plotlyJs.relayout(mainDivRef.value, {
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
        if (plotIsReady && mainDivRef.value) {
          return dependencies._plotlyJs.relayout(mainDivRef.value, {
            'margin.l': resolvedMargin(props.margins?.left, margins.value.left),
            'margin.r': resolvedMargin(props.margins?.right, margins.value.right)
          });
        }
      })
      .then(() => {
        if (!props.margins) {
          // When shared margins are unset, we need to clear our tracked margins so that we can emit them.

          trackedMargins = undefined;

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
      if (plotIsReady && mainDivRef.value) {
        dependencies._plotlyJs
          .relayout(mainDivRef.value, {
            showlegend: props.showLegend
          })
          .then(() => {
            updateMarginsAsync();
          });
      }
    });
  },
  { immediate: true }
);
</script>
