<template>
  <div ref="rootRef" class="simulation-experiment-view standard-view toolbar-based-view h-full flex flex-col">
    <IssuesView v-if="issues.length" class="m-4 mb-0" style="height: calc(100% - 2rem);" :issues="issues" />
    <template v-else>
      <Toolbar class="shrink-0">
        <template #start>
          <div class="flex gap-1">
            <ToolbarButtonWidget
              :icon="simulationStatus !== locSedApi.ESedInstanceStatus.RUNNING ? 'pi pi-play-circle' : 'pi pi-pause-circle'"
              :accent="simulationStatus !== locSedApi.ESedInstanceStatus.RUNNING ? 'primary' : 'warning'"
              :label="(simulationStatus === locSedApi.ESedInstanceStatus.IDLE ? 'Run' : simulationStatus === locSedApi.ESedInstanceStatus.RUNNING ? 'Pause' : 'Resume') + ' simulation'"
              shortcut="F9"
              :disabled="isFinishing"
              @click="onRunPause"
            />
            <ToolbarButtonWidget
              icon="pi pi-stop-circle"
              accent="danger"
              label="Stop simulation"
              :disabled="simulationStatus === locSedApi.ESedInstanceStatus.IDLE"
              @click="onStop"
            />
            <!--
            Note: our run status is in a live region (which must exist before its contents change for them to get
                  announced by assistive technologies), which doesn't affect our layout.
            -->
            <span class="contents" role="status">
              <span v-if="runStatus" class="run-status" :class="`run-status-${runStatus.type}`">
                <i :class="runStatus.icon"></i>
                <span>{{ runStatus.label }}</span>
              </span>
            </span>
          </div>
        </template>
        <template #end>
          <div class="flex gap-1 invisible">
            <ToolbarButtonWidget icon="pi pi-download" />
            <ToolbarButtonWidget icon="pi pi-cog" />
          </div>
        </template>
      </Toolbar>
      <ProgressBar class="run-progress" :class="{ 'run-progress-visible': progress > 0 }" :showValue="false" :value="progress" />
      <div class="grow flex flex-col min-h-0">
        <Splitter class="border-none! flex-1 m-0 min-h-0" layout="vertical">
          <SplitterPanel :size="simulationOnly ? 100 : 89">
            <Splitter>
              <SplitterPanel class="min-w-56" :size="17">
                <ScrollPanel class="h-full">
                  <div class="side-panel">
                    <SimulationPropertyEditor v-if="instanceTask && uniformTimeCourse" :uniformTimeCourse="uniformTimeCourse" :instanceTask="instanceTask" :disabled="simulationSettingsDisabled" />
                    <!-- <SolversPropertyEditor />
                    <GraphsPropertyEditor />
                    <ParametersPropertyEditor /> -->
                    <section class="side-panel-section">
                      <h3 class="opencor-section-title opencor-section-title-small">Plot</h3>
                      <div class="side-panel-fields">
                        <FloatLabel variant="on">
                          <Select
                            v-model="xParameter"
                            ariaLabel="X axis"
                            editable
                            filter
                            filterMode="lenient"
                            :options="parameters"
                            size="small"
                            class="w-full"
                            :appendTo="appendTarget"
                            @change="onParameterChange"
                          />
                          <label>X axis</label>
                        </FloatLabel>
                        <FloatLabel variant="on">
                          <Select
                            v-model="yParameter"
                            ariaLabel="Y axis"
                            editable
                            filter
                            filterMode="lenient"
                            :options="parameters"
                            size="small"
                            class="w-full"
                            :appendTo="appendTarget"
                            @change="onParameterChange"
                          />
                          <label>Y axis</label>
                        </FloatLabel>
                      </div>
                    </section>
                  </div>
                </ScrollPanel>
              </SplitterPanel>
              <SplitterPanel :size="83">
                <GraphPanelWidget
                  :key="'standard-graph-panel'"
                  :data="data"
                  :showLegend="false"
                />
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>
          <SplitterPanel v-if="!simulationOnly" class="flex flex-col min-h-0" :size="11">
            <div class="console-header">
              <span class="opencor-section-title opencor-section-title-small">Console</span>
              <div class="flex gap-0.5">
                <ToolbarButtonWidget
                  v-bind="copyToClipboard.buttonProps('Copy console')"
                  small
                  tooltipAlign="end"
                  @click="copyConsole"
                />
                <ToolbarButtonWidget
                  icon="pi pi-eraser"
                  label="Clear console"
                  small
                  tooltipAlign="end"
                  @click="clearConsole"
                />
              </div>
            </div>
            <div ref="editorRef" class="grow min-h-0 console overflow-y-auto px-3 pb-1.5 leading-[1.42] text-[13px] select-text" v-html="consoleContents"></div>
          </SplitterPanel>
        </Splitter>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as colors from '../../common/colors';
import * as common from '../../common/common';
import { MEDIUM_DELAY, TOAST_LIFE } from '../../common/constants';
import * as locCommon from '../../common/locCommon';
import * as vueCommon from '../../common/vueCommon';
import * as locApi from '../../libopencor/locApi';
import * as locSedApi from '../../libopencor/locSedApi';

import { useOpenCORContext, useOpenCORKeyStroke } from '../OpenCORContext';
import type { IGraphPanelData } from '../widgets/GraphPanelWidget.vue';

import './simulation-experiment-view.css';

const props = defineProps<{
  file: locApi.File;
  isActiveFile: boolean;
}>();

const emit = defineEmits<{
  simulationData: [];
}>();

const { simulationOnly } = useOpenCORContext();

const rootRef = vue.shallowRef<HTMLElement | null>(null);
const editorRef = vue.shallowRef<HTMLElement | null>(null);
const document = props.file.document();
const documentIssues = document.issues();
const isDocumentValid = documentIssues.length === 0;
const uniformTimeCourse = isDocumentValid ? (document.simulation(0) as locApi.SedUniformTimeCourse) : null;
const instance = isDocumentValid ? document.instantiate() : null;
const issues = documentIssues.length > 0 ? documentIssues : (instance?.issues() ?? []);
const instanceTask = issues.length > 0 ? null : (instance?.task(0) ?? null);
const parameters = vue.ref<string[]>([]);
const xParameter = vue.ref(instanceTask ? instanceTask.voiName() : '');
const yParameter = vue.ref(instanceTask ? instanceTask.stateName(0) : '');

const data = vue.ref<IGraphPanelData>({
  xAxisTitle: instanceTask ? xParameter.value : undefined,
  yAxisTitle: instanceTask ? yParameter.value : undefined,
  traces: []
});

const initialConsoleContents = `<b>${props.file.path()}</b>`;
const consoleContents = vue.ref<string>(initialConsoleContents);
const progress = vue.ref<number>(0);
const simulationStatus = vue.ref<locSedApi.ESedInstanceStatus>(instance?.status() ?? locSedApi.ESedInstanceStatus.IDLE);

// The outcome of our last simulation run, if any, and the status of our simulation, which we show in our toolbar.

interface ILastRun {
  outcome: 'completed' | 'issues' | 'stopped' | 'failed';
  time?: number;
}

const lastRun = vue.ref<ILastRun | null>(null);

// Whether our simulation run is finishing, i.e. whether its run is over, but its results have yet to be plotted and our
// UI to be painted with them (see onRunPause()), during which a new run cannot be started.

const isFinishing = vue.ref<boolean>(false);

// The status of our simulation run.
// Note: our console is not shown when we are in simulation-only mode, so we only refer to it when it is shown.

const seeConsole = vue.computed<string>(() => {
  return simulationOnly.value ? '' : ' (see console)';
});

const runStatus = vue.computed<{ type: string; icon: string; label: string } | null>(() => {
  const percentage = Math.round(progress.value);

  if (simulationStatus.value === locSedApi.ESedInstanceStatus.RUNNING || isFinishing.value) {
    return { type: 'running', icon: 'pi pi-hourglass', label: `Running… ${percentage}%` };
  }

  if (simulationStatus.value === locSedApi.ESedInstanceStatus.PAUSED) {
    return { type: 'paused', icon: 'pi pi-pause', label: `Paused at ${percentage}%` };
  }

  switch (lastRun.value?.outcome) {
    case 'completed':
      return {
        type: 'completed',
        icon: 'pi pi-check-circle',
        label: `Completed in ${common.formatTime(lastRun.value.time ?? 0)}`
      };
    case 'issues':
      return {
        type: 'issues',
        icon: 'pi pi-exclamation-triangle',
        label: `Completed with issues${seeConsole.value}`
      };
    case 'stopped':
      return { type: 'stopped', icon: 'pi pi-stop-circle', label: 'Stopped' };
    case 'failed':
      return { type: 'failed', icon: 'pi pi-times-circle', label: `Failed${seeConsole.value}` };
    default:
      return null;
  }
});

// Hide the status of our last run after a while (i.e. as long as a toast would be shown) if it is only a confirmation
// (i.e. our simulation has either completed or been stopped), but keep it if it requires people's attention (i.e. our
// simulation has issues or has failed).

let runStatusTimer: ReturnType<typeof setTimeout> | undefined;

vue.watch(
  () => runStatus.value?.type,
  (type) => {
    clearTimeout(runStatusTimer);

    if (type === 'completed' || type === 'stopped') {
      runStatusTimer = setTimeout(() => {
        runStatusTimer = undefined;

        lastRun.value = null;
      }, TOAST_LIFE);
    }
  }
);

const simulationSettingsDisabled = vue.computed<boolean>(() => {
  return simulationStatus.value !== locSedApi.ESedInstanceStatus.IDLE;
});

const runAborted = vue.ref(false);
let progressResetCancel: (() => void) | undefined;
let progressResetTimer: ReturnType<typeof setTimeout> | undefined;
const appendTarget = vueCommon.useAppendTarget(rootRef as unknown as vue.Ref<HTMLElement | null>);

if (instanceTask) {
  vueCommon.populateParameters(parameters, instanceTask);
}

const xInfo = vue.computed<locCommon.ISimulationDataInfo>(() => {
  return instanceTask ? locCommon.simulationDataInfo(instanceTask, xParameter.value) : locCommon.NoSimulationDataInfo;
});

const yInfo = vue.computed<locCommon.ISimulationDataInfo>(() => {
  return instanceTask ? locCommon.simulationDataInfo(instanceTask, yParameter.value) : locCommon.NoSimulationDataInfo;
});

// Our live data, i.e. the data that we have retrieved so far while a simulation is running.
// Note: while a simulation is running, we only retrieve the data that has been computed since our last update (rather
//       than all of it every time) and store it in some buffers, which we then plot using views of them (so no copy is
//       involved, while only providing GraphPanelWidget with the data that we have retrieved so far). Also, libOpenCOR
//       counts a step as completed just before storing its results, so the last point that we retrieved may not have
//       been stored at the time, which is why we always retrieve it again.

interface ILiveData {
  task: locSedApi.SedInstanceTask;
  xInfo: locCommon.ISimulationDataInfo;
  yInfo: locCommon.ISimulationDataInfo;
  x: Float64Array;
  y: Float64Array;
  size: number;
}

let liveData: ILiveData | null = null;

const retrieveLiveData = (task: locSedApi.SedInstanceTask, dataSize: number): ILiveData => {
  // (Re)create our buffers if needed (e.g., at the start of a simulation run or if the X or Y parameter has changed) or
  // grow them if they are too small.

  if (!liveData || liveData.task !== task || liveData.xInfo !== xInfo.value || liveData.yInfo !== yInfo.value) {
    const capacity = Math.max(dataSize, (uniformTimeCourse?.numberOfSteps() ?? 0) + 1);

    liveData = {
      task,
      xInfo: xInfo.value,
      yInfo: yInfo.value,
      x: new Float64Array(capacity),
      y: new Float64Array(capacity),
      size: 0
    };
  } else if (dataSize > liveData.x.length) {
    const x = new Float64Array(dataSize);
    const y = new Float64Array(dataSize);

    x.set(liveData.x);
    y.set(liveData.y);

    liveData.x = x;
    liveData.y = y;
  }

  // Retrieve the data that has been computed since our last update (as well as our last point, see above).

  const start = Math.max(0, liveData.size - 1);

  if (dataSize > start) {
    const x = locCommon.simulationDataValue(task, liveData.xInfo, start, dataSize).data;
    const y = locCommon.simulationDataValue(task, liveData.yInfo, start, dataSize).data;

    liveData.x.set(x, start);
    liveData.y.set(y, start);

    liveData.size = Math.max(liveData.size, start + Math.min(x.length, y.length));
  }

  return liveData;
};

const updatePlot = (dataSize: number = 0): void => {
  if (!instanceTask) {
    data.value = {
      xAxisTitle: undefined,
      yAxisTitle: undefined,
      traces: []
    };

    return;
  }

  // Specify the range of the X and Y axes if they are the variable of integration. Otherwise, leave the range undefined
  // so that GraphPanelWidget can automatically determine the range based on the data.

  const xAxisRange: [number, number] | undefined =
    uniformTimeCourse && xInfo.value.type === locCommon.ESimulationDataInfoType.VOI
      ? [uniformTimeCourse.outputStartTime(), uniformTimeCourse.outputEndTime()]
      : undefined;

  const yAxisRange: [number, number] | undefined =
    uniformTimeCourse && yInfo.value.type === locCommon.ESimulationDataInfoType.VOI
      ? [uniformTimeCourse.outputStartTime(), uniformTimeCourse.outputEndTime()]
      : undefined;

  // Retrieve the data for the selected X and Y parameters and update the plot.
  // Note: while a simulation is running (i.e. dataSize > 0), we use our live data (see retrieveLiveData()). Otherwise,
  //       we retrieve all the data. With the C++ version of libOpenCOR, that data is a copy that we own, so we can use
  //       it as is. With the WASM version of libOpenCOR, that data is a view of the WASM heap, so we need to copy it.

  let xData: Float64Array;
  let yData: Float64Array;

  if (dataSize > 0) {
    const live = retrieveLiveData(instanceTask, dataSize);

    xData = live.x.subarray(0, live.size);
    yData = live.y.subarray(0, live.size);
  } else {
    liveData = null;

    const ownData = (values: Float64Array): Float64Array => {
      return locApi.cppVersion() ? values : values.slice();
    };

    xData = ownData(locCommon.simulationDataValue(instanceTask, xInfo.value).data);
    yData = ownData(locCommon.simulationDataValue(instanceTask, yInfo.value).data);
  }

  data.value = {
    xAxisTitle: xParameter.value,
    yAxisTitle: yParameter.value,
    xAxisRange,
    yAxisRange,
    traces: [
      {
        name: vueCommon.traceName(undefined, xParameter.value, yParameter.value),
        xValue: xParameter.value,
        x: xData,
        yValue: yParameter.value,
        y: yData,
        color: colors.DEFAULT_COLOR
      }
    ]
  };
};

// Update the plot after the X or Y parameter has changed.
// Note: while a simulation is running or paused, only part of its data has been computed (the rest is either zeros or
//       the data of a previous run), so we only plot the data that has been computed so far (as we do while running,
//       see onRunPause()).

const onParameterChange = (): void => {
  if (instance && simulationStatus.value !== locSedApi.ESedInstanceStatus.IDLE) {
    updatePlot(Math.round(instance.progress() * (uniformTimeCourse?.numberOfSteps() ?? 0)) + 1);
  } else {
    updatePlot();
  }
};

// Release our instance (once it is idle) and our document.
// Note: an instance must not be released while it is running, hence we stop it and wait for it to be idle first.

let isUnmounted = false;
let isWaitingOnRun = false;

const releaseResources = async (): Promise<void> => {
  // Note: we always release our document, even if something goes wrong with our instance (e.g., if libOpenCOR throws an
  //       exception while we wait for it to be idle) since we would otherwise leak it.

  try {
    if (instance) {
      if (instance.status() !== locSedApi.ESedInstanceStatus.IDLE) {
        instance.stopRun();

        await vueCommon.waitWhileRunning(instance).promise;
      }

      instance.release();
    }
  } catch (error: unknown) {
    console.error('OpenCOR: an error occurred while releasing a simulation instance:', common.formatError(error));
  } finally {
    document.release();
  }
};

// Copy the contents of our console, as plain text, to the clipboard, so that they can easily be included in an issue
// report, for instance.
// Note: our console uses non-breaking spaces to indent its messages, so we replace them with normal spaces.

const copyToClipboard = vueCommon.useCopyToClipboard();

const copyConsole = (): void => {
  // biome-ignore lint/performance/useDomNodeTextContent: we need the rendered text (e.g., <br /> as a line break)
  void copyToClipboard.copy((editorRef.value?.innerText ?? '').replace(/\u00a0/g, ' '));
};

// Clear our console, i.e. only keep its initial contents (i.e. the path of our file).
// Note: the status of our last run may refer to our console (i.e. if our simulation has issues or has failed), in which
//       case we also hide it since our console doesn't contain the details of our last run anymore.

const clearConsole = (): void => {
  consoleContents.value = initialConsoleContents;

  if (lastRun.value?.outcome === 'issues' || lastRun.value?.outcome === 'failed') {
    lastRun.value = null;
  }
};

// A helper function to scroll our console to the bottom.

const scrollConsoleToBottom = (): void => {
  void vue.nextTick().then(() => {
    editorRef.value?.scrollTo({ top: editorRef.value.scrollHeight });
  });
};

// A helper function to report an error in our console.

const addConsoleError = (error: unknown): void => {
  consoleContents.value += `<br />&nbsp;&nbsp;<span style="color: ${colors.REVERTED_PALETTE.Red};"><strong>Error:</strong> ${common.formatMessage(common.formatError(error))}</span>`;

  scrollConsoleToBottom();
};

// Event handlers.

const onRunPause = async (): Promise<void> => {
  // Make sure that we have an instance (we don't if our document has issues) and that our previous run, if any, is not
  // finishing (i.e. that its results have been plotted).

  if (!instance || isFinishing.value) {
    return;
  }

  // Retrieve the status of our simulation.
  // Note: this may fail (e.g., if libOpenCOR throws an exception, see the handling of a run error below), in which case
  //       we report the error rather than let it go unnoticed.

  let status: locSedApi.ESedInstanceStatus;

  try {
    status = instance.status();
  } catch (error: unknown) {
    addConsoleError(error);

    return;
  }

  switch (status) {
    case locSedApi.ESedInstanceStatus.RUNNING:
      // Pause the simulation.

      instance.pauseRun();

      simulationStatus.value = locSedApi.ESedInstanceStatus.PAUSED;

      break;
    case locSedApi.ESedInstanceStatus.PAUSED:
      // Resume the simulation.

      instance.resumeRun();

      simulationStatus.value = locSedApi.ESedInstanceStatus.RUNNING;

      break;
    default: {
      // locSedApi.ESedInstanceStatus.IDLE:
      // Reset our abort flag and our live data.
      // Note: our live data is normally reset at the end of a simulation run (see updatePlot()), but not if the run was
      //       aborted or failed, in which case we would otherwise end up plotting (some of) the data of that run.

      runAborted.value = false;
      liveData = null;
      lastRun.value = null;

      // Cancel the reset of our progress bar by our previous run, if any, so that it doesn't reset the progress bar of
      // our new run.

      clearTimeout(progressResetTimer);

      progressResetTimer = undefined;

      // Start the simulation.

      if (!instance?.startRun()) {
        simulationStatus.value = instance?.status() ?? locSedApi.ESedInstanceStatus.IDLE;

        return;
      }

      simulationStatus.value = instance?.status() ?? locSedApi.ESedInstanceStatus.IDLE;

      // Wait for the simulation to finish, handling pause/resume cycles asynchronously so that the UI remains
      // responsive.

      const numberOfSteps = uniformTimeCourse?.numberOfSteps() ?? 0;
      let lastPlottingAreaUpdateTime = Date.now();
      let runIsOver = false;

      const { promise: runPromise, cancel: runCancel } = vueCommon.waitWhileRunning(
        instance,
        (newProgress: number) => {
          // Update the progress bar, unless our run is over, in which case we take care of it (see below), i.e. we
          // ignore the (delayed) reset of the progress bar by waitWhileRunning(), which could otherwise reset the
          // progress bar of our next run.

          if (runIsOver) {
            return;
          }

          progress.value = newProgress;

          // Update the plotting area only if the progress has changed and a certain amount of time has passed since the
          // last update (to avoid excessive updates).

          if (newProgress === 0) {
            return;
          }

          const now = Date.now();

          if (now - lastPlottingAreaUpdateTime >= MEDIUM_DELAY) {
            updatePlot(Math.round(0.01 * newProgress * numberOfSteps) + 1);

            lastPlottingAreaUpdateTime = now;
          }
        },
        (status) => {
          simulationStatus.value = status;
        },
        runAborted
      );

      // We store the cancel function in a variable so that we can call it on component unmount to avoid writing to
      // stale references after the component is torn down.

      progressResetCancel = runCancel;

      isWaitingOnRun = true;

      let runError: unknown = null;

      try {
        await runPromise;
      } catch (error: unknown) {
        runError = error;
      } finally {
        runIsOver = true;
        isWaitingOnRun = false;

        progressResetCancel = undefined;
      }

      // Release our resources if we got unmounted while the simulation was running (see onUnmounted() below).

      if (isUnmounted) {
        await releaseResources();

        return;
      }

      // Handle any error that occurred while waiting for the simulation to finish (e.g., if libOpenCOR threw an
      // exception), in which case we cannot rely on our instance anymore.
      // Note #1: we only know that we couldn't retrieve the status (or progress) of the simulation, which may therefore
      //          still be running (or be paused). So, we try to stop it and wait for it to be idle. Otherwise, our next
      //          run would, for instance, end up pausing the simulation rather than starting a new one (see the
      //          RUNNING case above). If this fails too, then there is nothing more that we can do.
      // Note #2: the run is over either way, so we reset our progress bar and live data, but we keep our plot as is (as
      //          when a run is aborted) so that the user can see how far the simulation went.

      if (runError) {
        isWaitingOnRun = true;

        try {
          instance.stopRun();

          await vueCommon.waitWhileRunning(instance).promise;
        } catch {
          // Our instance cannot be relied upon anymore, so there is nothing more that we can do.
        } finally {
          isWaitingOnRun = false;
        }

        if (isUnmounted) {
          await releaseResources();

          return;
        }

        simulationStatus.value = locSedApi.ESedInstanceStatus.IDLE;
        progress.value = 0;
        liveData = null;
        lastRun.value = { outcome: 'failed' };

        addConsoleError(runError);

        return;
      }

      // Let people see that our simulation has completed (i.e. that its progress is 100%) before we retrieve and plot
      // its results, which may take a while (e.g., for a long simulation) and during which our UI cannot be updated.
      // Note: we wait for our UI to be painted with a progress of 100%. We also need to be told if we get unmounted in
      //       the meantime, in which case our resources have to be released by us (see onUnmounted() below).

      if (!runAborted.value) {
        isFinishing.value = true;
        progress.value = 100;
        isWaitingOnRun = true;

        await common.waitForNextPaint();

        isWaitingOnRun = false;

        if (isUnmounted) {
          await releaseResources();

          return;
        }
      }

      // Retrieve and report the outcome of our simulation, and plot its results.
      // Note: this may fail (e.g., if libOpenCOR throws an exception), in which case we report the error, and still
      //       finish our run (see below), so that a new run can be started.

      try {
        // Update the console with any issues that occurred during the simulation, or display the simulation time if it
        // completed successfully.
        // Note: a simulation that was stopped may also have issues, in which case it is considered as having failed if
        //       one of them is an error, and as having been stopped otherwise.

        if (instance.hasIssues()) {
          const instanceIssues = instance.issues();

          lastRun.value = {
            outcome: instanceIssues.some((issue: locApi.IIssue) => issue.type === locApi.EIssueType.ERROR)
              ? 'failed'
              : runAborted.value
                ? 'stopped'
                : 'issues'
          };

          instanceIssues.forEach((issue: locApi.IIssue) => {
            const color =
              issue.type === locApi.EIssueType.ERROR
                ? colors.REVERTED_PALETTE.Red
                : issue.type === locApi.EIssueType.WARNING
                  ? colors.REVERTED_PALETTE.Orange
                  : colors.REVERTED_PALETTE.Blue;
            const issueType =
              issue.type === locApi.EIssueType.ERROR
                ? 'Error'
                : issue.type === locApi.EIssueType.WARNING
                  ? 'Warning'
                  : 'Info';
            const issueDescription = issue.description.replace('Task | ', '');

            consoleContents.value += `<br />&nbsp;&nbsp;<span style="color: ${color};"><strong>${issueType}:</strong> ${issueDescription}</span>`;
          });
        } else {
          const simulationTime = instance.waitForRun();

          lastRun.value = runAborted.value ? { outcome: 'stopped' } : { outcome: 'completed', time: simulationTime };

          consoleContents.value += `<br />&nbsp;&nbsp;<strong>Simulation time:</strong> <span style="color: ${colors.REVERTED_PALETTE.Blue};">${common.formatTime(simulationTime)}</span>`;
        }

        if (runAborted.value) {
          // Reset the progress bar after a short delay (mimicking the normal end of a simulation).

          progressResetTimer = setTimeout(() => {
            progressResetTimer = undefined;

            progress.value = 0;
          }, MEDIUM_DELAY);
        } else {
          updatePlot();
        }
      } catch (error: unknown) {
        // Reset our live data and, if our run was aborted (i.e. it is not finishing), our progress bar (otherwise, it
        // gets reset below).

        liveData = null;

        if (!isFinishing.value) {
          progress.value = 0;
        }

        lastRun.value = { outcome: 'failed' };

        addConsoleError(error);
      }

      // Our run is over and its results have been plotted, so reset our progress bar after a short delay, so that
      // people can see that our simulation has completed.
      // Note: our plot gets rendered after our UI has been updated, which may also take a while, so we wait for it to
      //       be rendered before starting our delay (otherwise our delay may be over before our UI gets rendered
      //       again).

      if (isFinishing.value) {
        await common.waitForNextPaint();

        if (isUnmounted) {
          return;
        }

        isFinishing.value = false;

        progressResetTimer = setTimeout(() => {
          progressResetTimer = undefined;

          progress.value = 0;
        }, MEDIUM_DELAY);
      }

      scrollConsoleToBottom();
    }
  }
};

const onStop = (): void => {
  runAborted.value = true;

  instance?.stopRun();

  // Note: the simulation status will be updated by the next poll cycle of waitWhileRunning(), so we don't set it here
  //       to avoid a race window where the user could re-trigger a run before the C++ thread has fully stopped.
};

// Initialise the plot on mount.

vue.onMounted(() => {
  updatePlot();
});

// Cancel any pending progress reset timers to avoid writing to stale refs after the component is torn down, and release
// our resources.

vue.onUnmounted(() => {
  isUnmounted = true;

  progressResetCancel?.();

  clearTimeout(progressResetTimer);
  clearTimeout(runStatusTimer);

  // Release our resources, unless a simulation run is still waiting on our instance, in which case they will be released
  // by that simulation run once it is done with our instance.

  if (!isWaitingOnRun) {
    releaseResources();
  }
});

// Track whether the view is the currently active view for keyboard shortcut handling.

let isActiveView = true;

vue.onActivated(() => {
  isActiveView = true;
});

vue.onDeactivated(() => {
  isActiveView = false;
});

// Keyboard shortcuts.

useOpenCORKeyStroke((event: KeyboardEvent) => {
  if (!isActiveView) {
    return;
  }

  if (
    props.isActiveFile &&
    issues.length === 0 &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.metaKey &&
    event.code === 'F9'
  ) {
    event.preventDefault();

    onRunPause();
  }
});
</script>

<style scoped>
/**
 * Side panel, i.e. our simulation settings and the parameters to plot.
 * Note: an input field has an intrinsic width (of about 20 characters), which would otherwise prevent our side panel
 *       from being narrower than that, so we let our number fields shrink to the width of our side panel.
 */

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.side-panel :deep(.p-inputnumber-input) {
  flex: 1 1 auto;
  width: 0;
  min-width: 0;
}

.side-panel-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.side-panel-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.375rem;
}

/**
 * Status of our simulation, which is shown next to our run/pause and stop buttons.
 */

.run-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.run-status .pi {
  font-size: 0.8125rem;
}

.run-status-running .pi,
.run-status-completed .pi {
  color: var(--p-primary-color);
}

.run-status-paused .pi,
.run-status-issues .pi {
  color: var(--opencor-warn-color);
}

.run-status-stopped .pi,
.run-status-failed .pi {
  color: var(--opencor-error-color);
}

/**
 * Progress of our simulation, which is shown as a thin line over the bottom border of our toolbar.
 */

.run-progress {
  position: relative;
  z-index: 11;
  flex-shrink: 0;
  height: 2px !important;
  margin-top: -2px;
  border-radius: 0;
  background: transparent;
  visibility: hidden;
}

.run-progress-visible {
  visibility: visible;
}

/**
 * Console.
 */

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 0.25rem 0.375rem 0.125rem 0.75rem;
}

/**
 * Splitters, which gutters are shown as thin lines that get highlighted when hovered or dragged.
 */

.standard-view :deep(.p-splitter-gutter) {
  position: relative;
  background-color: var(--p-content-border-color);
  transition: background-color 0.15s ease;
}

.standard-view :deep(.p-splitter-horizontal > .p-splitter-gutter) {
  width: 1px !important;
}

.standard-view :deep(.p-splitter-vertical > .p-splitter-gutter) {
  height: 1px !important;
}

.standard-view :deep(.p-splitter-gutter-handle) {
  opacity: 0;
}

/**
 * Note: a gutter is only 1px wide/high, so we make it easier to grab by extending its hit area.
 */

.standard-view :deep(.p-splitter-gutter)::after {
  position: absolute;
  inset: -3px;
  z-index: 1;
  content: "";
}

.standard-view :deep(.p-splitter-gutter:hover),
.standard-view :deep(.p-splitter-gutter[data-p-gutter-resizing="true"]) {
  background-color: var(--p-primary-color);
}
</style>
