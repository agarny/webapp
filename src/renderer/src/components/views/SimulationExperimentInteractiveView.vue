<template>
  <div ref="rootRef" class="simulation-experiment-view h-full flex flex-col">
    <IssuesView v-if="issues.length" class="m-4 mb-0" style="height: calc(100% - 2rem);" :issues="issues" />
    <template v-else>
      <Toolbar class="p-1! shrink-0">
        <template #start>
          <div class="flex gap-1 invisible">
            <Button class="p-1! toolbar-button"
              icon="pi pi-play-circle"
            />
            <Button class="p-1! toolbar-button"
              icon="pi pi-stop-circle"
            />
          </div>
        </template>
        <template #end>
          <div class="flex gap-1">
            <Button class="p-1! toolbar-button"
              icon="pi pi-download"
              text severity="secondary"
              title="Export COMBINE archive"
              @click="onDownloadCombineArchive"
            />
            <Button class="p-1! toolbar-button"
              icon="pi pi-cog"
              text severity="secondary"
              title="Settings"
              @click="settingsVisible = true"
            />
          </div>
        </template>
      </Toolbar>
      <div class="grow min-h-0">
        <div class="flex h-full">
          <div v-if="uiJsonEmpty" class="flex flex-col items-center justify-center grow">
            <i class="pi pi-info-circle text-[1.5rem]! text-muted-color mb-3"></i>
            <p class="text-muted-color text-center">
              The view needs to be configured.<br />
              Please click on the <i class="pi pi-cog"></i> icon in the top-right corner.
            </p>
          </div>
          <IssuesView v-else-if="uiJsonIssues.length" class="w-full m-4" :issues="uiJsonIssues" />
          <div v-else class="flex grow min-h-0">
            <div class="ml-4 mr-4 mb-4">
              <ScrollPanel class="h-full">
                <Fieldset legend="Simulation inputs">
                  <InputWidget
                    v-for="(input, index) in actualUiJson.input"
                    v-model="inputValues[index]!"
                    v-show="showInput[index]"
                    :key="`input_${index}`"
                    :name="input.name"
                    :maximumValue="locApi.isScalarInput(input) ? input.maximumValue : undefined"
                    :minimumValue="locApi.isScalarInput(input) ? input.minimumValue : undefined"
                    :possibleValues="locApi.isDiscreteInput(input) ? input.possibleValues : undefined"
                    :stepValue="locApi.isScalarInput(input) ? input.stepValue : undefined"
                    :class="index !== 0 ? 'mt-6' : ''"
                    @change="updateSimulation()"
                  />
                </Fieldset>
                <Fieldset legend="Runs">
                  <div class="flex flex-col gap-4">
                    <div class="flex gap-2">
                      <Button class="grow"
                        icon="pi pi-plus"
                        label="Track run"
                        outlined
                        size="small"
                        :title="isSimulating ? 'Wait for the simulation to finish' : 'Track current run'"
                        :disabled="isSimulating || simulationIssues.length > 0"
                        @click="onTrackRun"
                      />
                      <Button class="w-9!"
                        icon="pi pi-trash"
                        outlined severity="danger"
                        size="small"
                        title="Remove all tracked runs"
                        @click="onRemoveAllRuns"
                        :disabled="runs.length === 1"
                      />
                    </div>
                    <div class="flex flex-col gap-2">
                      <div v-for="(run, index) in runs"
                        :key="run.id"
                        class="run-card rounded-lg p-1 pl-2 opacity-75 hover:opacity-100"
                        :class="{ 'run-card-live': run.isLiveRun, 'opacity-50': !run.isVisible }"
                      >
                        <div class="flex items-center">
                          <div class="w-1 h-6 rounded-xs mr-2" :style="`background-color: ${run.color};`"></div>
                          <TooltipWidget :content="run.isLiveRun ? '' : run.tooltip"
                            class="grow text-sm"
                            :class="{ 'cursor-help': !run.isLiveRun, 'opacity-50': !run.isVisible }"
                          >
                            {{ run.isLiveRun ? 'Live run' : `Run #${index}` }}
                          </TooltipWidget>
                          <div class="flex items-center">
                            <Button class="p-0! w-5! h-5! run-action-button"
                              icon="pi pi-palette"
                              text
                              size="small"
                              :style="`color: ${run.color};`"
                              :title="`Change ${run.isLiveRun ? 'live run' : 'run'} colour`"
                              @click="onToggleRunColorPopover(index, $event)"
                            />
                            <Button class="p-0! w-5! h-5! run-action-button"
                              :icon="run.isVisible ? 'pi pi-eye' : 'pi pi-eye-slash'"
                              text :severity="run.isVisible ? 'info' : 'secondary'"
                              size="small"
                              :title="`${run.isVisible ? 'Hide' : 'Show'} ${run.isLiveRun ? 'live run' : 'run'}`"
                              @click="onToggleRun(index)"
                            />
                            <Button v-if="!run.isLiveRun" class="p-0! w-5! h-5! run-action-button"
                              icon="pi pi-times"
                              text severity="danger"
                              size="small"
                              title="Remove run"
                              @click="onRemoveRun(index)"
                            />
                            <div v-else class="w-5 h-5"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-if="runs.length === 1" class="empty-state p-2 text-center rounded-lg">
                      <i class="pi pi-info-circle empty-state-icon mb-1.5 opacity-50"></i>
                      <p class="text-xs">
                        No runs are being tracked.
                      </p>
                    </div>
                  </div>
                </Fieldset>
                <Fieldset v-if="preSimulationDuration" legend="Note" class="note">
                  The simulation was run for <br/>
                  <strong>{{ preSimulationDuration }} {{ instanceTask ? instanceTask.voiUnit() : '' }}</strong> prior to plotting.
                </Fieldset>
              </ScrollPanel>
            </div>
            <div class="relative flex flex-col grow h-full min-h-0">
              <div class="flex flex-col grow gap-2 min-h-0" :class="{ 'invisible pointer-events-none': simulationIssues.length }">
                <GraphPanelWidget
                  v-for="(_plot, index) in actualUiJson.output.plots"
                  :ref="(element: any) => graphPanelRefs[index] = element"
                  :key="`plot_${index}`"
                  class="w-full min-h-0"
                  :margins="compMargins"
                  :data="compData[index] || { traces: [] }"
                  @marginsUpdated="(newMargins: IGraphPanelMargins) => onMarginsUpdated(`plot_${index}`, newMargins)"
                  @resetMargins="() => onResetMargins()"
                />
              </div>
              <IssuesView v-show="simulationIssues.length" class="absolute inset-0 m-4 ml-0" :issues="simulationIssues" />
            </div>
          </div>
        </div>
      </div>
      <SimulationExperimentInteractiveViewSettingsDialog
        v-model:visible="settingsVisible"
        :settings="settings"
        :voiId="voiId"
        :voiName="voiName"
        :voiUnit="instanceTask ? instanceTask.voiUnit() : ''"
        :allModelParameters="allModelParameters"
        :editableModelParameters="editableModelParameters"
        @ok="onSettingsOk"
        @close="settingsVisible = false"
      />
      <Popover ref="runColorPopoverRef" :appendTo="appendTarget">
        <div class="flex p-1.5 gap-2">
          <button class="color-swatch cursor-pointer w-6 h-6 outline-2 outline-transparent rounded-md hover:scale-[1.15]"
            v-for="(name, color) in colors.PALETTE" :key="color"
            :style="`background-color: ${color};`"
            :class="{ 'color-swatch-selected': color === runs[runColorPopoverIndex].color }"
            :title="name"
            @click="onRunColorChange(runColorPopoverIndex, color)"
          />
        </div>
      </Popover>
    </template>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';
import Popover from 'primevue/popover';
import * as vue from 'vue';

import type { IOpenCORExternalDataEvent, IOpenCORSimulationDataEvent } from '../../../index';

import * as colors from '../../common/colors';
import * as common from '../../common/common';
import * as dependencies from '../../common/dependencies';
import * as externalData from '../../common/externalData';
import * as locCommon from '../../common/locCommon';
import * as math from '../../common/math';
import * as vueCommon from '../../common/vueCommon';
import * as locApi from '../../libopencor/locApi';
import * as locSedApi from '../../libopencor/locSedApi';
import * as locUiJsonApi from '../../libopencor/locUiJsonApi';

import type { ISimulationExperimentInteractiveViewSettingsDialog } from '../dialogs/SimulationExperimentInteractiveViewSettingsDialog.vue';
import GraphPanelWidget from '../widgets/GraphPanelWidget.vue';
import type { IGraphPanelData, IGraphPanelMargins, IGraphPanelPlotTrace } from '../widgets/GraphPanelWidget.vue';

import './simulation-experiment-view.css';

interface ISimulationRun {
  id: string;
  inputParameters: Record<string, number>;
  isVisible: boolean;
  data: IGraphPanelData[];
  color: string;
  tooltip: string;
  isLiveRun: boolean;
}

interface IExternalDataValues {
  x: math.FloatArray;
  y: math.FloatArray;
}

const props = defineProps<{
  file: locApi.File;
  simulationOnly?: boolean;
  uiJson?: locApi.IUiJson;
}>();

const emit = defineEmits<{
  error: [message: string];
  simulationData: [];
}>();

const rootRef = vue.ref<HTMLElement | null>(null);
const settingsVisible = vue.ref<boolean>(false);
const document = props.file.document();
const documentIssues = document.issues();
const isDocumentValid = documentIssues.length === 0;
const uniformTimeCourse = isDocumentValid ? (document.simulation(0) as locApi.SedUniformTimeCourse) : null;
const cvode = uniformTimeCourse?.cvode() ?? null;
let instance = isDocumentValid ? document.instantiate() : null;
const issues = documentIssues.length > 0 ? documentIssues : (instance?.issues() ?? []);
let instanceTask = issues.length > 0 ? null : (instance?.task(0) ?? null);
const allModelParameters = vue.ref<string[]>([]);
const editableModelParameters = vue.ref<string[]>([]);
const voiName = vue.ref(instanceTask ? instanceTask.voiName() : '');
const voiId = vue.ref(instanceTask ? (voiName.value.split('/')[1] ?? '') : '');

const actualUiJson = vue.ref<locApi.IUiJson>(
  props.uiJson
    ? (JSON.parse(JSON.stringify(props.uiJson, locApi.uiJsonReplacer)) as locApi.IUiJson)
    : {
        input: [],
        output: {
          data: [
            {
              id: voiId.value,
              name: voiName.value
            }
          ],
          plots: []
        },
        parameters: []
      }
);

const uiJsonEmpty = vue.computed<boolean>(() => {
  if (
    actualUiJson.value.input.length === 0 &&
    actualUiJson.value.parameters.length === 0 &&
    (actualUiJson.value.output.externalData?.length ?? 0) === 0 &&
    actualUiJson.value.output.plots.length === 0
  ) {
    if (actualUiJson.value.output.data.length === 0) {
      return true;
    }

    if (actualUiJson.value.output.data.length === 1) {
      const data = actualUiJson.value.output.data[0];

      return !!(data && data.id === voiId.value && data.name === voiName.value);
    }
  }

  return false;
});

const mathEval = new math.Float64ArrayMath();
const model = document.model(0);
const isSimulating = vue.ref<boolean>(false);
const liveData = vue.ref<IGraphPanelData[]>([]);
let margins: Record<string, IGraphPanelMargins> = {};
const compMargins = vue.ref<IGraphPanelMargins>();

const uiJsonIssues = vue.ref<locApi.IIssue[]>(
  locApi.validateUiJson(actualUiJson.value, {
    allModelParameters: allModelParameters.value,
    editableModelParameters: editableModelParameters.value
  })
);

const simulationIssues = vue.ref<locApi.IIssue[]>([]);
const inputValues = vue.ref<number[]>([]);
const showInput = vue.ref<boolean[]>([]);
const idToInfo: Record<string, locCommon.ISimulationDataInfo> = {};

const runs = vue.ref<ISimulationRun[]>([
  {
    id: 'live',
    inputParameters: {},
    isVisible: true,
    data: [],
    color: colors.DEFAULT_COLOR,
    tooltip: '',
    isLiveRun: true
  }
]);

let trackedRunId = 0;
let simulationGeneration = 0;
const runColorPopoverIndex = vue.ref<number>(-1);
const runColorPopoverRef = vue.ref<InstanceType<typeof Popover> | undefined>();
const graphPanelRefs = vue.ref<Record<number, InstanceType<typeof GraphPanelWidget> | undefined>>({});
const appendTarget = vueCommon.useAppendTarget(rootRef as unknown as vue.Ref<HTMLElement | null>);

const compData = vue.computed<IGraphPanelData[]>(() => {
  // Combine the live data with the data from the tracked runs.

  const liveDataVal = liveData.value;
  const runsVal = runs.value;
  const runsCount = runsVal.length;
  const res: IGraphPanelData[] = [];
  const paletteColors = colors.PALETTE_COLORS;
  const paletteColorsLength = paletteColors.length;

  const addRunTraces = (traces: IGraphPanelPlotTrace[], plotIndex: number, runIndex: number): void => {
    const run = runsVal[runIndex];

    if (!run) {
      return;
    }

    if (!run.isVisible) {
      return;
    }

    const runColorIndex = paletteColors.indexOf(run.color);
    const baseColorIndex = runColorIndex >= 0 ? runColorIndex : 0;
    const data = run.isLiveRun ? liveDataVal[plotIndex] : run.data[plotIndex];
    const dataTraces = data?.traces;

    if (!dataTraces?.length) {
      return;
    }

    const suffix = runsCount === 1 ? '' : run.isLiveRun ? ' [Live]' : ` [#${runIndex}]`;

    for (let k = 0; k < dataTraces.length; ++k) {
      const dataTrace = dataTraces[k];

      if (!dataTrace) {
        continue;
      }

      traces.push({
        ...dataTrace,
        traceId: `${run.id}::${dataTrace.traceId ?? `${dataTrace.xValue}::${dataTrace.yValue}::${k}`}`,
        name: dataTrace.name + suffix,
        color: paletteColors[(baseColorIndex + k) % paletteColorsLength] ?? colors.DEFAULT_COLOR,
        zorder: run.isLiveRun ? 1 : undefined
      });
    }
  };

  for (let i = 0; i < liveDataVal.length; ++i) {
    const traces: IGraphPanelPlotTrace[] = [];

    // Add the traces for the tracked runs first and then the live run, so that the live run is always drawn on top of
    // the tracked runs (Plotly draws traces in the order in which they appear in the data array).
    // Note: the legend order is unaffected since the live run's traces have a zorder of 1 (mapped to Plotly's
    //       legendrank) while tracked runs use the default of 1000.

    for (let j = 1; j < runsCount; ++j) {
      addRunTraces(traces, i, j);
    }

    addRunTraces(traces, i, 0);

    res.push({
      xAxisTitle: liveDataVal[i]?.xAxisTitle,
      yAxisTitle: liveDataVal[i]?.yAxisTitle,
      traces
    });
  }

  return res;
});

const settings = vue.computed<ISimulationExperimentInteractiveViewSettingsDialog>(() => {
  const actualUiJsonVal = actualUiJson.value;

  return {
    simulation: {
      initialPoint: uniformTimeCourse?.initialTime() ?? 0,
      startingPoint: uniformTimeCourse?.outputStartTime() ?? 0,
      endingPoint: uniformTimeCourse?.outputEndTime() ?? 0,
      pointInterval: uniformTimeCourse
        ? (uniformTimeCourse.outputEndTime() - uniformTimeCourse.outputStartTime()) / uniformTimeCourse.numberOfSteps()
        : 1
    },
    solvers: {
      cvodeMaximumStep: cvode?.maximumStep() ?? 0
    },
    interactive: {
      uiJson: actualUiJsonVal
    }
  };
});

const preSimulationDuration = vue.computed<number>(() => {
  const settingsVal = settings.value;

  return settingsVal.simulation.startingPoint - settingsVal.simulation.initialPoint;
});

const oldSettings = vue.ref<string>(JSON.stringify(vue.toRaw(settings.value)));

// Information issue shown when an interactive simulation error occurs.

const informationIssue: locApi.IIssue = {
  type: locApi.EIssueType.INFORMATION,
  description:
    'Please check the settings (click on the <i class="pi pi-cog"></i> icon in the top-right corner) and try again.'
};

// Update (initialise) our UI from the current actualUiJson.

const updateUi = (): void => {
  inputValues.value = actualUiJson.value.input.map((input: locApi.IUiJsonInput) => {
    return input.defaultValue;
  });
  showInput.value = actualUiJson.value.input.map((input: locApi.IUiJsonInput) => {
    return (input.visible ?? 'true') !== 'false';
  });
};

// A helper function to generate a unique external data ID based on a candidate name and a set of already used IDs.

const uniqueOutputDataId = (name: string, usedIds: Set<string>): string => {
  const normalisedId = `${name.replace(/[^A-Za-z0-9_]/g, '_')}_ext`;
  let res = normalisedId;
  let suffix = 0;

  while (usedIds.has(res)) {
    res = `${normalisedId}_${++suffix}`;
  }

  usedIds.add(res);

  return res;
};

// A helper function to replace data IDs in an expression with its corresponding external data IDs.

const replaceWithExternalDataIds = (expression: string, mapping: Record<string, string>): string => {
  let res = expression;
  const dataIds = Object.keys(mapping).sort((a, b) => {
    return b.length - a.length;
  });

  for (const dataId of dataIds) {
    const externalDataId = mapping[dataId];
    let newRes = '';
    let i = 0;

    while (i < res.length) {
      if (res.startsWith(dataId, i)) {
        const prevChar = i === 0 ? '' : res[i - 1];
        const nextChar = i + dataId.length >= res.length ? '' : res[i + dataId.length];

        if (!/[A-Za-z0-9_]/.test(prevChar) && !/[A-Za-z0-9_]/.test(nextChar)) {
          newRes += externalDataId;

          i += dataId.length;

          continue;
        }
      }

      newRes += res[i++];
    }

    res = newRes;
  }

  return res;
};

// A helper function to add some external data to the simulation.

const addedExternalDataHashes = new Set<string>();
const inFlightExternalDataHashes = new Set<string>();

const addExternalData = async (
  csv: string,
  voiExpression: string | undefined,
  modelParameters: string[]
): Promise<IOpenCORExternalDataEvent> => {
  const addedEvent = (): IOpenCORExternalDataEvent => {
    return {
      type: 'added',
      csv,
      issues: []
    };
  };
  const issueEvent = (issueMessages: string[]): IOpenCORExternalDataEvent => {
    return {
      type: 'issue',
      csv,
      issues: issueMessages
    };
  };

  // Make sure that we are in simulation-only mode.

  if (!props.simulationOnly) {
    return Promise.resolve(
      issueEvent(['The exposed addExternalData() method is only available in simulation-only mode.'])
    );
  }

  // Make sure that we can retrieve the CSV data.

  let csvContents: string = '';

  if (common.isUrl(csv)) {
    try {
      const response = await fetch(common.corsProxyUrl(csv));

      if (!response.ok) {
        return Promise.resolve(
          issueEvent([`Could not retrieve the CSV file from ${csv} (${response.status}: ${response.statusText}).`])
        );
      }

      csvContents = await response.text();
    } catch (error: unknown) {
      return Promise.resolve(
        issueEvent([
          `Could not retrieve the CSV file from ${csv} (${common.formatMessage(common.formatError(error), false)}).`
        ])
      );
    }
  } else {
    csvContents = csv;
  }

  if (!csvContents) {
    return Promise.resolve(addedEvent());
  }

  // Make sure that we haven't already added this CSV data (based on a hash of the CSV contents) to avoid accidentally
  // adding the same data multiple times.

  const csvHash = common.xxh64(csvContents);

  if (addedExternalDataHashes.has(csvHash) || inFlightExternalDataHashes.has(csvHash)) {
    return Promise.resolve(issueEvent(['The external data has already been added.']));
  }

  inFlightExternalDataHashes.add(csvHash);

  try {
    // Make sure that we can parse the CSV data.

    let parsedCsv: externalData.IExternalCsvData;

    try {
      parsedCsv = externalData.parseExternalCsvData(csvContents);
    } catch (error: unknown) {
      return Promise.resolve(issueEvent([common.formatMessage(common.formatError(error))]));
    }

    // Make sure that the number of model parameters matches the number of data columns in the CSV file.

    if (parsedCsv.headers.length - 1 !== modelParameters.length) {
      return Promise.resolve(
        issueEvent([
          `The number of model parameters provided must match the number of data columns in the CSV file (i.e. ${parsedCsv.headers.length - 1}, not ${modelParameters.length}).`
        ])
      );
    }

    // Make sure that the model parameters are valid.

    const trimmedModelParameters = modelParameters.map((modelParameter) => {
      return modelParameter?.trim() ?? '';
    });
    const validationIssues: string[] = [];

    for (let i = 0; i < trimmedModelParameters.length; ++i) {
      const modelParameter = trimmedModelParameters[i];

      if (!modelParameter) {
        validationIssues.push(`Model parameter #${i + 1} must be a non-empty string.`);
      } else if (!/^\w+\/\w+$/.test(modelParameter)) {
        validationIssues.push(`Model parameter #${i + 1} must be of the form '<component>/<variable>'.`);
      }
    }

    if (validationIssues.length) {
      return Promise.resolve(issueEvent(validationIssues));
    }

    // Determine the output IDs that are currently being used so that we can avoid conflicts when adding our external
    // data IDs.

    const existingExternalData = actualUiJson.value.output.externalData ?? [];
    const usedOutputIds = new Set<string>();

    for (const existingExternalDataEntry of existingExternalData) {
      for (const dataEntry of existingExternalDataEntry.data) {
        if (dataEntry.id) {
          usedOutputIds.add(dataEntry.id);
        }
      }
    }

    for (const outputData of actualUiJson.value.output.data) {
      if (outputData.id) {
        usedOutputIds.add(outputData.id);
      }
    }

    // Add the external data to our UI JSON, making sure that we generate unique output data IDs for the new data
    // entries.

    const dataSeries: locApi.IUiJsonOutputExternalDataSeries[] = [];
    const data: locApi.IUiJsonOutputData[] = [];
    const dataIdToExternalDataId: Record<string, string> = {};

    for (let columnIndex = 1; columnIndex < parsedCsv.headers.length; ++columnIndex) {
      const name = parsedCsv.headers[columnIndex];
      const id = uniqueOutputDataId(name, usedOutputIds);

      dataSeries.push({
        name,
        values: new Float64Array(parsedCsv.columns[columnIndex])
      });
      data.push({
        id,
        name
      });

      const modelParameter = trimmedModelParameters[columnIndex - 1];

      for (const outputData of actualUiJson.value.output.data) {
        if (outputData.name === modelParameter) {
          dataIdToExternalDataId[outputData.id] = id;

          break;
        }
      }
    }

    if (!actualUiJson.value.output.externalData) {
      // Initialise the external data array if it doesn't already exist.

      actualUiJson.value.output.externalData = [];
    }

    actualUiJson.value.output.externalData.push({
      data,
      dataSeries,
      description: `External data ${csvHash}`,
      voiExpression: voiExpression?.trim() || 'voi',
      voiValues: new Float64Array(parsedCsv.columns[0])
    });

    // Go through the plots' main trace and additional traces and add a corresponding trace where the original model
    // parameters are replaced with their corresponding external data. If an original trace has no corresponding
    // external data then no corresponding trace is added.

    for (let plotIndex = 0; plotIndex < actualUiJson.value.output.plots.length; ++plotIndex) {
      const plot = actualUiJson.value.output.plots[plotIndex];

      if (!plot) {
        continue;
      }

      // Initialise the additional traces array if it doesn't already exist.

      if (!plot.additionalTraces) {
        plot.additionalTraces = [];
      }

      // Use a set of trace keys to determine whether a candidate trace already exists or not.

      const traceKey = (x: string, y: string): string => {
        return `${x}::${y}`;
      };
      const originalSimulationKeys = new Set<string>();
      const originalAdditionalTraceCount =
        nbOfOriginalAdditionalTracesInPlots[plotIndex] ?? plot.additionalTraces.length;

      originalSimulationKeys.add(traceKey(plot.xValue, plot.yValue));

      for (let additionalTraceIndex = 0; additionalTraceIndex < originalAdditionalTraceCount; ++additionalTraceIndex) {
        const additionalTrace = plot.additionalTraces[additionalTraceIndex];

        if (!additionalTrace) {
          continue;
        }

        originalSimulationKeys.add(traceKey(additionalTrace.xValue, additionalTrace.yValue));
      }

      // Retrieve the candidate traces for this plot.

      const candidateTraces: Array<{ xValue: string; yValue: string }> = [
        {
          xValue: plot.xValue,
          yValue: plot.yValue
        }
      ];

      for (let additionalTraceIndex = 0; additionalTraceIndex < originalAdditionalTraceCount; ++additionalTraceIndex) {
        const additionalTrace = plot.additionalTraces[additionalTraceIndex];

        if (!additionalTrace) {
          continue;
        }

        candidateTraces.push({
          xValue: additionalTrace.xValue,
          yValue: additionalTrace.yValue
        });
      }

      // Go through the candidate traces and add corresponding external data based traces where possible.

      for (let candidateTraceIndex = 0; candidateTraceIndex < candidateTraces.length; ++candidateTraceIndex) {
        const candidateTrace = candidateTraces[candidateTraceIndex];

        if (!candidateTrace) {
          continue;
        }

        // Make sure that the candidate trace is not one of our original traces (i.e. no replacements were made).

        const externalX = replaceWithExternalDataIds(candidateTrace.xValue, dataIdToExternalDataId);
        const externalY = replaceWithExternalDataIds(candidateTrace.yValue, dataIdToExternalDataId);

        if (originalSimulationKeys.has(traceKey(externalX, externalY))) {
          continue;
        }

        // Add an additional trace for externalValue.

        plot.additionalTraces.push({
          xValue: externalX,
          yValue: externalY
        });
      }
    }

    // Update our simulation and reset the plot margins to accommodate any new traces that have been added.

    updateSimulation();
    onResetMargins();

    addedExternalDataHashes.add(csvHash);

    return Promise.resolve(addedEvent());
  } finally {
    inFlightExternalDataHashes.delete(csvHash);
  }
};

// A helper function to retrieve simulation data for one or more model parameters.

const simulationData = (modelParameters: string[]): Promise<IOpenCORSimulationDataEvent> => {
  const simulationDataResult = common.emptySimulationData(modelParameters);

  if (!props.simulationOnly) {
    return Promise.resolve({
      type: 'issue',
      simulationData: simulationDataResult,
      issues: ['The exposed simulationData() method is only available in simulation-only mode.']
    });
  }

  if (!instanceTask) {
    return Promise.resolve({
      type: 'issue',
      simulationData: simulationDataResult,
      issues: ['No SED-ML instance task available.']
    });
  }

  const task = instanceTask as locSedApi.SedInstanceTask;
  const issueMessages: string[] = [];

  for (const modelParameter of modelParameters) {
    const info = locCommon.simulationDataInfo(task, modelParameter === 'VOI' ? task.voiName() : modelParameter);

    if (locCommon.isNoSimulationDataInfo(info)) {
      issueMessages.push(`No simulation data information was found for model parameter "${modelParameter}".`);

      continue;
    }

    try {
      simulationDataResult[modelParameter] = locCommon.simulationDataValue(task, info);
    } catch (error: unknown) {
      issueMessages.push(`Error for model parameter "${modelParameter}": ${common.formatError(error)}`);
    }
  }

  if (issueMessages.length) {
    return Promise.resolve({
      type: 'issue',
      simulationData: simulationDataResult,
      issues: issueMessages
    });
  }

  return Promise.resolve({
    type: 'updated',
    simulationData: simulationDataResult,
    issues: []
  });
};

// Exposed methods.

defineExpose({
  // Simulation-only methods.

  addExternalData,
  simulationData
});

// Populate our model parameters.

if (instanceTask) {
  vueCommon.populateParameters(allModelParameters, instanceTask);
  vueCommon.populateParameters(editableModelParameters, instanceTask, true);
}

// Update (initialise) our interactive UI..

updateUi();

// Watch for changes to our UI JSON and reset the compiled expressions when it changes, as well as keeping track of the
// number of additional traces in each plot.

let nbOfOriginalAdditionalTracesInPlots: number[] = [];

vue.watch(
  () => actualUiJson.value,
  () => {
    mathEval.resetCompiledExpressions();

    nbOfOriginalAdditionalTracesInPlots = actualUiJson.value.output.plots.map(
      (plot: locUiJsonApi.IUiJsonOutputPlot) => {
        return plot.additionalTraces?.length ?? 0;
      }
    );
  },
  { deep: true, immediate: true }
);

// A helper function to interpolate external data values at the VOI values of our simulation.

const externalDataValues = (voi: math.FloatArray, externalDataMapping: IExternalDataValues): math.FloatArray => {
  const voiLength = voi.length;
  const res = new Float64Array(voiLength);
  const { x, y } = externalDataMapping;
  const inputLength = Math.min(x.length, y.length);

  if (inputLength < 2) {
    // Not enough VOI samples to interpolate.

    res.fill(Number.NaN);

    return res;
  }

  // Determine whether we can use the input data as-is (i.e. strictly increasing X values) for interpolation or whether
  // we need to normalise it first (i.e. sort and deduplicate the input data before interpolation).

  let useInputAsIs = true;

  for (let i = 1; i < inputLength && useInputAsIs; ++i) {
    useInputAsIs = x[i] > x[i - 1];
  }

  let normalisedX: math.FloatArray;
  let normalisedY: math.FloatArray;
  let normalisedLength = inputLength;

  if (useInputAsIs) {
    normalisedX = x;
    normalisedY = y;
  } else {
    const sortedIndices = new Array<number>(inputLength);

    for (let i = 0; i < inputLength; ++i) {
      sortedIndices[i] = i;
    }

    sortedIndices.sort((index1, index2) => {
      return x[index1] - x[index2];
    });

    const sortedX = new Float64Array(sortedIndices.length);
    const sortedY = new Float64Array(sortedIndices.length);
    let count = 0;

    for (let i = 0; i < sortedIndices.length; ++i) {
      const xValue = x[sortedIndices[i]];
      const yValue = y[sortedIndices[i]];

      if (count === 0 || xValue !== sortedX[count - 1]) {
        sortedX[count] = xValue;
        sortedY[count] = yValue;

        ++count;
      } else {
        // If VOI has duplicate X values then keep the last value.

        sortedY[count - 1] = yValue;
      }
    }

    if (count < 2) {
      res.fill(Number.NaN);

      return res;
    }

    normalisedX = count === sortedX.length ? sortedX : sortedX.slice(0, count);
    normalisedY = count === sortedY.length ? sortedY : sortedY.slice(0, count);

    normalisedLength = count;
  }

  // Precompute segment coefficients once and then evaluate with either a sweep (sorted VOI) or binary search (unsorted
  // VOI).

  const segmentCount = normalisedLength - 1;
  const segmentSlope = new Float64Array(segmentCount);

  for (let i = 0; i < segmentCount; ++i) {
    const deltaX = normalisedX[i + 1] - normalisedX[i];

    segmentSlope[i] = deltaX > 0 ? (normalisedY[i + 1] - normalisedY[i]) / deltaX : Number.NaN;
    // Note: deltaX should always be greater than zero due to the checks above, but we add a safeguard against division
    //       by zero just in case.
  }

  let isVoiIncreasing = true;

  for (let i = 1; i < voiLength; ++i) {
    if (voi[i] < voi[i - 1]) {
      isVoiIncreasing = false;

      break;
    }
  }

  const xFirst = normalisedX[0];
  const xLast = normalisedX[normalisedLength - 1];

  if (isVoiIncreasing) {
    let j = 0;

    for (let i = 0; i < voiLength; ++i) {
      const voiValue = voi[i];

      if (voiValue < xFirst || voiValue > xLast) {
        res[i] = Number.NaN;

        continue;
      }

      while (j + 1 < normalisedLength && normalisedX[j + 1] < voiValue) {
        ++j;
      }

      const slope = segmentSlope[j];

      if (!Number.isFinite(slope)) {
        res[i] = Number.NaN;

        continue;
      }

      res[i] = normalisedY[j] + (voiValue - normalisedX[j]) * slope;
    }
  } else {
    for (let i = 0; i < voiLength; ++i) {
      const voiValue = voi[i];

      if (voiValue < xFirst || voiValue > xLast) {
        res[i] = Number.NaN;

        continue;
      }

      // Binary search for the enclosing segment index j where x[j] <= voiValue <= x[j + 1].

      let low = 0;
      let high = normalisedLength - 1;

      while (low + 1 < high) {
        const mid = Math.floor(0.5 * (low + high));

        if (normalisedX[mid] <= voiValue) {
          low = mid;
        } else {
          high = mid;
        }
      }

      const slope = segmentSlope[low];

      if (!Number.isFinite(slope)) {
        res[i] = Number.NaN;

        continue;
      }

      res[i] = normalisedY[low] + (voiValue - normalisedX[low]) * slope;
    }
  }

  return res;
};

// A helper function to reinstantiate our instance.

const reinstantiateInstance = (): locApi.SedInstance => {
  instance = document.instantiate();
  instanceTask = instance.task(0);

  return instance;
};

// Run the interactive simulation.

const updateSimulation = async (): Promise<void> => {
  // Make sure that the view is usable, i.e. that we have an instance.

  if (!instance) {
    return;
  }

  // Make sure that there are no issues with the UI JSON.

  if (uiJsonIssues.value.length) {
    return;
  }

  // Increment the simulation generation so that we can cancel any previous simulation runs that are still in progress.

  const currentSimulationGeneration = ++simulationGeneration;

  // Keep track of the fact that we are simulating.

  isSimulating.value = true;

  // Stop the current simulation if it is still running or paused.

  if (instance.status() !== locSedApi.ESedInstanceStatus.IDLE) {
    instance.stopRun();
  }

  // Check if we have been superseded by a newer call.

  if (currentSimulationGeneration !== simulationGeneration) {
    return;
  }

  // Create a scope for the model using the current input values.

  const modelScope: math.ExpressionScope = {};

  for (let i = 0; i < actualUiJson.value.input.length; ++i) {
    const input = actualUiJson.value.input[i];

    if (input) {
      modelScope[input.id] = inputValues.value[i];
    }
  }

  // Reset our issues.

  simulationIssues.value = [];

  // Show/hide the input widgets.

  for (let i = 0; i < actualUiJson.value.input.length; ++i) {
    const input = actualUiJson.value.input[i];

    if (input) {
      try {
        showInput.value[i] = Boolean(mathEval.evaluate(input.visible ?? 'true', modelScope));
      } catch (error: unknown) {
        showInput.value[i] = false;

        simulationIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating visibility for input '${input.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  // Update the SED-ML document.

  model.removeAllChanges();

  for (const parameter of actualUiJson.value.parameters) {
    const componentVariableNames = parameter.name.split('/');

    if (componentVariableNames[0] && componentVariableNames[1]) {
      try {
        model.addChange(
          componentVariableNames[0],
          componentVariableNames[1],
          String(mathEval.evaluate(parameter.value, modelScope))
        );
      } catch (error: unknown) {
        simulationIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while applying parameter change for '${parameter.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  // Make sure that we haven't come across any issues so far.

  if (simulationIssues.value.length) {
    simulationIssues.value.push(informationIssue);

    isSimulating.value = false;

    return;
  }

  // Check if we have been superseded by a newer call while we were setting up the model.

  if (currentSimulationGeneration !== simulationGeneration) {
    return;
  }

  // Create a fresh instance for the new simulation run.
  // Note: this ensures that the instance picks up the latest model changes and avoids reusing an instance which
  //       internal state may have been corrupted by a previous cancellation.

  const crtInstance = reinstantiateInstance();

  // Start the simulation in a background thread and yield to the UI to keep it responsive while the simulation runs.

  if (!crtInstance.startRun()) {
    isSimulating.value = false;

    return;
  }

  await vueCommon.waitWhileRunning(crtInstance).promise;

  // Check if we have been superseded by a newer call while the simulation was running.

  if (currentSimulationGeneration !== simulationGeneration) {
    return;
  }

  // Make sure that we haven't come across any issues during the simulation.

  if (crtInstance.hasIssues()) {
    simulationIssues.value = crtInstance.issues();

    isSimulating.value = false;

    return;
  }

  // A helper function to evaluate an expression within the given scope.

  const evaluateExpression = (expression: string, scope: math.ExpressionScope): math.FloatArray => {
    const res = mathEval.evaluate(expression, scope);

    if (typeof res === 'boolean') {
      return new Float64Array([res ? 1 : 0]);
    }

    if (typeof res === 'number') {
      return new Float64Array([res]);
    }

    return res;
  };

  // Interpolate any external data at the VOI values of our simulation and add the interpolated values to our scope.

  if (instanceTask) {
    const simulationVoi = instanceTask.voi();

    for (const externalDataItem of actualUiJson.value.output.externalData ?? []) {
      try {
        const voiValues = externalDataItem.voiValues;
        const voiExpression = externalDataItem.voiExpression?.trim();
        const externalDataItemVoi =
          !voiExpression || voiExpression === 'voi' ? voiValues : evaluateExpression(voiExpression, { voi: voiValues });

        const requiredSeriesNames = new Set<string>();

        for (const dataItem of externalDataItem.data) {
          requiredSeriesNames.add(dataItem.name);
        }

        const externalDataSeries: Record<string, math.FloatArray> = Object.create(null);

        for (const externalDataSerie of externalDataItem.dataSeries) {
          if (requiredSeriesNames.has(externalDataSerie.name)) {
            externalDataSeries[externalDataSerie.name] = externalDataSerie.values;
          }
        }

        for (const dataItem of externalDataItem.data) {
          const externalDataSerie = externalDataSeries[dataItem.name];

          if (externalDataSerie) {
            modelScope[dataItem.id] = externalDataValues(simulationVoi, {
              x: externalDataItemVoi,
              y: externalDataSerie
            });
          }
        }
      } catch (error: unknown) {
        simulationIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating the VOI expression '${externalDataItem.voiExpression}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  // Make sure that we haven't come across any issues so far.

  if (simulationIssues.value.length) {
    simulationIssues.value.push(informationIssue);

    isSimulating.value = false;

    return;
  }

  // Update our mapping of data IDs to simulation data information.

  Object.keys(idToInfo).forEach((key) => {
    delete idToInfo[key];
  });

  actualUiJson.value.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    if (data.id && instanceTask) {
      idToInfo[data.id] = locCommon.simulationDataInfo(instanceTask, data.name);
    }
  });

  // Update our scope with the latest simulation data.

  if (instanceTask) {
    // Latest simulation data.
    // Note: we make a copy of the data since, with the WASM version of libOpenCOR, it may be a view of the WASM heap.
    //       If we were to keep it as is, it would become a dangling view (with potentially corrupted data) as soon as
    //       the corresponding instance gets reinstantiated and destroyed by a newer simulation run, which would in turn
    //       mess up our plots (in particular those of our tracked runs).

    for (const data of actualUiJson.value.output.data) {
      modelScope[data.id] = new Float64Array(locCommon.simulationDataValue(instanceTask, idToInfo[data.id]).data);
    }
  }

  // Evaluate the plot expressions to get the data to display.

  const normaliseFloat64Arrays = (
    x: math.FloatArray,
    y: math.FloatArray
  ): { x: math.FloatArray; y: math.FloatArray } => {
    // Return the arrays as they are if they are of the same length.

    if (x.length === y.length) {
      return {
        x,
        y
      };
    }

    // If one of the arrays is of length 1, broadcast it to the length of the other array.

    if (x.length === 1 && y.length > 1) {
      const value = x[0];
      const broadcastX = new Float64Array(y.length);

      broadcastX.fill(value);

      return {
        x: broadcastX,
        y
      };
    }

    if (y.length === 1 && x.length > 1) {
      const value = y[0];
      const broadcastY = new Float64Array(x.length);

      broadcastY.fill(value);

      return {
        x,
        y: broadcastY
      };
    }

    // We can't reconcile the lengths of these arrays, so fall back to the minimum length, which preserves as many valid
    // (x, y) pairs as possible.

    const minLength = Math.min(x.length, y.length);

    return {
      x: x.slice(0, minLength),
      y: y.slice(0, minLength)
    };
  };

  const newLiveData: IGraphPanelData[] = [];

  for (let i = 0; i < actualUiJson.value.output.plots.length; ++i) {
    const plot = actualUiJson.value.output.plots[i];

    if (!plot) {
      newLiveData[i] = {
        xAxisTitle: '',
        yAxisTitle: '',
        traces: []
      };

      continue;
    }

    let xMain: math.FloatArray = common.EMPTY_FLOAT64_ARRAY;

    try {
      xMain = evaluateExpression(plot.xValue, modelScope);
    } catch (error: unknown) {
      simulationIssues.value.push({
        type: locApi.EIssueType.ERROR,
        description: `An error occurred while evaluating the X value expression for plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
      });
    }

    let yMain: math.FloatArray = common.EMPTY_FLOAT64_ARRAY;

    try {
      yMain = evaluateExpression(plot.yValue, modelScope);
    } catch (error: unknown) {
      simulationIssues.value.push({
        type: locApi.EIssueType.ERROR,
        description: `An error occurred while evaluating the Y value expression for plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
      });
    }

    const normalisedMain = normaliseFloat64Arrays(xMain, yMain);

    const traces: IGraphPanelPlotTrace[] = [
      {
        traceId: `plot_${i}::trace_0`,
        name: vueCommon.traceName(plot.name, plot.xValue, plot.yValue),
        xValue: plot.xValue,
        x: normalisedMain.x,
        yValue: plot.yValue,
        y: normalisedMain.y,
        color: colors.DEFAULT_COLOR
      }
    ];

    for (
      let additionalTraceIndex = 0;
      additionalTraceIndex < (plot.additionalTraces ?? []).length;
      ++additionalTraceIndex
    ) {
      const additionalTrace = plot.additionalTraces?.[additionalTraceIndex];

      if (!additionalTrace) {
        continue;
      }

      let xAdditional: math.FloatArray = common.EMPTY_FLOAT64_ARRAY;

      try {
        xAdditional = evaluateExpression(additionalTrace.xValue, modelScope);
      } catch (error: unknown) {
        simulationIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating the X value expression for additional trace #${additionalTraceIndex + 1} of plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }

      let yAdditional: math.FloatArray = common.EMPTY_FLOAT64_ARRAY;

      try {
        yAdditional = evaluateExpression(additionalTrace.yValue, modelScope);
      } catch (error: unknown) {
        simulationIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating the Y value expression for additional trace #${additionalTraceIndex + 1} of plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }

      const normalisedAdditional = normaliseFloat64Arrays(xAdditional, yAdditional);

      traces.push({
        traceId: `plot_${i}::trace_${additionalTraceIndex + 1}`,
        name: vueCommon.traceName(additionalTrace.name, additionalTrace.xValue, additionalTrace.yValue),
        xValue: additionalTrace.xValue,
        x: normalisedAdditional.x,
        yValue: additionalTrace.yValue,
        y: normalisedAdditional.y,
        color: colors.DEFAULT_COLOR
      });
    }

    newLiveData[i] = {
      xAxisTitle: plot.xAxisTitle,
      yAxisTitle: plot.yAxisTitle,
      traces
    };
  }

  liveData.value = newLiveData;

  // The simulation has completed, so we are no longer simulating.

  isSimulating.value = false;

  // Make sure that we haven't come across any issues so far.

  if (simulationIssues.value.length) {
    simulationIssues.value.push(informationIssue);

    return;
  }

  // Let people know that the simulation data has been updated.

  emit('simulationData');
};

// Margins-related event handlers.

const onMarginsUpdated = (plotId: string, newMargins: IGraphPanelMargins): void => {
  margins[plotId] = newMargins;

  let marginCount = 0;
  let maxLeft = 0;
  let maxRight = 0;

  for (const key in margins) {
    const margin = margins[key];

    if (!margin) {
      continue;
    }

    ++marginCount;

    maxLeft = Math.max(maxLeft, margin.left);
    maxRight = Math.max(maxRight, margin.right);
  }

  if (marginCount !== actualUiJson.value.output.plots.length) {
    compMargins.value = undefined;

    return;
  }

  compMargins.value = {
    left: maxLeft,
    right: maxRight
  };
};

const onResetMargins = (): void => {
  margins = {};
  compMargins.value = undefined;
};

// Runs-related event handlers

const onTrackRun = (): void => {
  // Make sure that there is no simulation in progress or any issue with the current simulation data. Indeed, if we were
  // to track the current run while a simulation is still running, then we would end up tracking the data of the
  // previous run while using the input values of the new run, which would result in a mismatch between the two.

  if (isSimulating.value || simulationIssues.value.length) {
    return;
  }

  // Create a new run from the live run.

  const inputParameters: Record<string, number> = {};

  for (let i = 0; i < actualUiJson.value.input.length; ++i) {
    const input = actualUiJson.value.input[i];

    if (!input) {
      continue;
    }

    const inputValue = inputValues.value[i];

    if (inputValue !== undefined) {
      inputParameters[input.id] = inputValue;
    }
  }

  // Compute the tooltip for this run, keeping in mind that some simulation inputs may not be visible.

  const tooltipRows: string[] = [];

  for (let i = 0; i < actualUiJson.value.input.length; ++i) {
    if (!showInput.value[i]) {
      continue;
    }

    const input = actualUiJson.value.input[i];

    if (!input) {
      continue;
    }

    let inputValue: string | number | undefined = inputParameters[input.id];

    if (locApi.isDiscreteInput(input)) {
      const selectedValue = input.possibleValues.find((possibleValue) => {
        return possibleValue.value === inputParameters[input.id];
      });

      if (selectedValue?.name) {
        inputValue = selectedValue.name.charAt(0).toLowerCase() + selectedValue.name.slice(1);
      } else {
        inputValue = inputParameters[input.id];
      }
    }

    tooltipRows.push(`<tr style="vertical-align: top;">
      <td style="font-weight: bold;">
        ${input.name}:
      </td>
      <td style="padding-left: 8px;">
        ${inputValue}
      </td>
    </tr>`);
  }

  const tooltip = `<table>
  <tbody>
    ${tooltipRows.join('')}
  </tbody>
</table>`;

  // Determine the colour (of the first trace) by using the next unused colour in the palette unless all the colours
  // have already been used.

  const usedColors = new Set<string>();

  for (const run of runs.value) {
    usedColors.add(run.color);
  }

  const lastColor = runs.value[runs.value.length - 1]?.color ?? colors.DEFAULT_COLOR;
  const lastColorIndex = colors.PALETTE_COLORS.indexOf(lastColor);
  let color: string = colors.DEFAULT_COLOR;

  for (let i = 1; i <= colors.PALETTE_COLORS.length; ++i) {
    const newColor = colors.PALETTE_COLORS[(lastColorIndex + i) % colors.PALETTE_COLORS.length];

    if (newColor && (!usedColors.has(newColor) || usedColors.size === colors.PALETTE_COLORS.length)) {
      color = newColor;

      break;
    }
  }

  // Add the new run.

  runs.value.push({
    id: `run_${++trackedRunId}`,
    inputParameters,
    isVisible: true,
    data: liveData.value,
    color,
    tooltip,
    isLiveRun: false
  });
};

const onRemoveRun = (index: number): void => {
  // Remove the given run.

  runs.value.splice(index, 1);
};

const onRemoveAllRuns = (): void => {
  // Remove all the runs except the live run.

  runs.value.splice(1);
};

const onToggleRun = (index: number): void => {
  // Toggle the visibility of the given run.

  const run = runs.value[index];

  if (run) {
    run.isVisible = !run.isVisible;
  }
};

const onRunColorChange = (index: number, color: string): void => {
  const run = runs.value[index];

  if (run) {
    run.color = color;
  }
};

const onToggleRunColorPopover = (index: number, event: MouseEvent): void => {
  runColorPopoverIndex.value = index;

  runColorPopoverRef.value?.toggle(event);
};

// Download COMBINE archive.

const onDownloadCombineArchive = (): void => {
  const jsZip = new dependencies._jsZip();
  const baseFileName = common.fileName(props.file.path()).replace(/\.[^/.]+$/, '');
  const modelFile = model.file();

  if (!modelFile) {
    emit('error', 'Cannot create COMBINE archive: no model file available.');

    return;
  }

  jsZip.file(
    'manifest.xml',
    `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<omexManifest xmlns="http://identifiers.org/combine.specifications/omex-manifest">
  <content location="." format="http://identifiers.org/combine.specifications/omex"/>
  <content location="document.sedml" format="http://identifiers.org/combine.specifications/sed-ml" master="true"/>
  <content location="model.cellml" format="http://identifiers.org/combine.specifications/cellml"/>
  <content location="simulation.json" format="http://purl.org/NET/mediatypes/application/json"/>
</omexManifest>
`
  );
  jsZip.file('model.cellml', modelFile.contents());
  jsZip.file('document.sedml', document.serialise().replace(modelFile.path(), 'model.cellml'));
  jsZip.file('simulation.json', JSON.stringify(actualUiJson.value, locApi.uiJsonReplacer, 2));

  jsZip
    .generateAsync({
      type: 'blob',
      compression: 'DEFLATE'
    })
    .then((content: Blob) => {
      common.downloadFile(`${baseFileName}.omex`, content, 'application/zip');
    })
    .catch((error: unknown) => {
      console.warn('OpenCOR: failed to generate COMBINE archive:', common.formatError(error));
    });
};

// Settings dialog event handler.

const onSettingsOk = (updatedSettings: ISimulationExperimentInteractiveViewSettingsDialog): void => {
  if (!uniformTimeCourse || !cvode) {
    settingsVisible.value = false;

    return;
  }

  const newSettingsJson = JSON.stringify(vue.toRaw(updatedSettings));
  const settingsHaveChanges = newSettingsJson !== oldSettings.value;

  oldSettings.value = newSettingsJson;

  if (!settingsHaveChanges) {
    settingsVisible.value = false;

    return;
  }

  // Clear all our tracked runs.

  onRemoveAllRuns();

  // Update our settings and hide the dialog.

  const oldCvodeMaximumStep = cvode.maximumStep();

  uniformTimeCourse.setInitialTime(updatedSettings.simulation.initialPoint);
  uniformTimeCourse.setOutputStartTime(updatedSettings.simulation.startingPoint);
  uniformTimeCourse.setOutputEndTime(updatedSettings.simulation.endingPoint);
  uniformTimeCourse.setNumberOfSteps(
    Math.max(
      1,
      Math.round(
        (updatedSettings.simulation.endingPoint - updatedSettings.simulation.startingPoint) /
          updatedSettings.simulation.pointInterval
      )
    )
  );

  cvode.setMaximumStep(updatedSettings.solvers.cvodeMaximumStep);

  actualUiJson.value = locApi.cleanUiJson(updatedSettings.interactive.uiJson);
  settingsVisible.value = false;

  // Validate the new UI JSON settings.

  uiJsonIssues.value = locApi.validateUiJson(updatedSettings.interactive.uiJson, {
    allModelParameters: allModelParameters.value,
    editableModelParameters: editableModelParameters.value
  });

  if (uiJsonIssues.value.length > 0) {
    return;
  }

  // Reinstantiate our instance in case we modified CVODE's maximum step.

  if (cvode.maximumStep() !== oldCvodeMaximumStep) {
    reinstantiateInstance();
  }

  // Update our UI.

  updateUi();

  // Update the simulation with the new UI JSON settings.

  updateSimulation();

  if (simulationIssues.value.length) {
    return;
  }

  // Reset the margins of our various plots.
  // Note: this is needed when the number of plots changes or simulation couldn't originally be run and now it can be
  //       run with the new settings. Without this, the plots will start with incorrect margins before they get updated
  //       which results in some flashing.

  onResetMargins();
};

// Make sure that any pending simulation updates are discarded once we get unmounted.

vue.onBeforeUnmount(() => {
  ++simulationGeneration;

  if (instance?.status() !== locSedApi.ESedInstanceStatus.IDLE) {
    instance?.stopRun();
  }
});

// Various things that need to be done once we are mounted.

vue.onMounted(() => {
  updateSimulation();

  const windowIsFocused = vueusecore.useWindowFocus();

  vue.watch(
    () => windowIsFocused.value,
    (isFocused) => {
      if (!isFocused) {
        if (runColorPopoverIndex.value !== -1) {
          runColorPopoverRef.value?.hide();

          runColorPopoverIndex.value = -1;
        }
      }
    }
  );
});
</script>

<style scoped>
.color-swatch:hover {
  box-shadow: 0 2px 8px var(--p-shadow-color, rgba(0, 0, 0, 0.15));
}

@media (prefers-color-scheme: dark) {
  .color-swatch:hover {
    box-shadow: 0 2px 8px var(--p-shadow-color-dark, rgba(255, 255, 255, 0.15));
  }
}

.color-swatch-selected {
  outline-color: var(--p-text-color);
}

.color-swatch-selected:focus {
  outline: 2px solid var(--p-text-color) !important;
}

.empty-state {
  color: var(--p-text-muted-color);
  border: 1px dashed var(--p-content-border-color);
}

.empty-state-icon {
  font-size: 1.25rem;
}

.note {
  color: var(--p-text-muted-color);
  margin-top: 0.5rem;
  border: 1px dashed var(--p-content-border-color);
  padding: 0 0.5rem 0.5rem 0.5rem !important;
  text-align: center;
  font-size: 0.75rem;
}

.note :deep(.p-fieldset-legend) {
  font-size: 0.875rem;
  padding-top: 0;
  padding-bottom: 0;
}

.run-action-button {
  opacity: 0.75;
}

.run-action-button:hover {
  opacity: 1;
  transform: scale(1.15);
}

.run-card {
  border: 1px solid var(--p-content-border-color);
}

.run-card-live {
  border-style: dashed;
  border-color: var(--p-primary-color);
}
</style>
