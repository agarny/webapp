<template>
  <div class="h-full">
    <IssuesView v-if="instanceIssues.length" class="m-4 mb-0" style="height: calc(100% - 2rem);" :issues="instanceIssues" />
    <div v-else class="w-full h-full flex flex-col">
    <Toolbar v-if="showToolbar" class="p-1! shrink-0">
      <template #start>
        <div :class="{ 'invisible': interactiveModeEnabled && interactiveLiveUpdatesEnabled }">
          <Button class="p-1! toolbar-button"
            icon="pi pi-play-circle"
            text severity="secondary"
            title="Run simulation (F9)"
            @click="onRun"
          />
        </div>
      </template>
      <template #center v-if="!simulationOnly">
        <div>
          <ToggleButton
            size="small"
            v-model="interactiveModeEnabled"
            onLabel="Interactive mode"
            offLabel="Standard mode"
          />
        </div>
      </template>
      <template #end>
        <div :class="{ 'invisible': !interactiveModeEnabled }" class="flex gap-1">
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
            @click="interactiveSettingsVisible = true"
          />
        </div>
      </template>
    </Toolbar>
    <div v-if="!interactiveModeEnabled" class="grow h-full min-h-0">
      <Splitter class="border-none! h-full m-0" layout="vertical">
        <SplitterPanel :size="simulationOnly ? 100 : 89">
          <Splitter>
            <SplitterPanel class="ml-4 mr-4 mb-4 min-w-fit" :size="25">
              <ScrollPanel class="h-full">
                <SimulationPropertyEditor v-if="standardInstanceTask" :uniformTimeCourse="standardUniformTimeCourse" :instanceTask="standardInstanceTask" />
                <!--
                    <SolversPropertyEditor />
                    <GraphsPropertyEditor />
                    <ParametersPropertyEditor />
                    -->
                <Fieldset legend="X Axis">
                  <Select
                    v-model="standardXParameter"
                    editable
                    filter
                    filterMode="lenient"
                    :options="standardParameters"
                    size="small"
                    class="w-full"
                    @change="updatePlot()"
                  />
                </Fieldset>
                <Fieldset legend="Y Axis">
                  <Select
                    v-model="standardYParameter"
                    editable
                    filter
                    filterMode="lenient"
                    :options="standardParameters"
                    size="small"
                    class="w-full"
                    @change="updatePlot()"
                  />
                </Fieldset>
              </ScrollPanel>
            </SplitterPanel>
            <SplitterPanel :size="75">
              <GraphPanelWidget
                :key="interactiveModeEnabled ? 'hidden-graph-panel' : 'visible-graph-panel'"
                :data="standardData"
                :showLegend="false"
              />
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
        <SplitterPanel v-if="!simulationOnly" :size="11">
          <div ref="editorRef" class="h-full console overflow-y-auto px-2 py-1 leading-[1.42] text-[13px]" aria-readonly="true" v-html="standardConsoleContents"></div>
        </SplitterPanel>
      </Splitter>
    </div>
    <div v-else class="grow min-h-0">
      <div class="flex h-full">
        <div v-if="interactiveUiJsonEmpty" class="flex flex-col items-center justify-center grow">
          <i class="pi pi-info-circle text-[1.5rem]! text-muted-color mb-3"></i>
          <p class="text-muted-color text-center">
            The <em>Interactive mode</em> needs to be configured.<br />
            Please click on the <i class="pi pi-cog"></i> icon in the top-right corner.
          </p>
        </div>
        <IssuesView v-else-if="interactiveUiJsonIssues.length" class="w-full m-4" :issues="interactiveUiJsonIssues" />
        <div v-else class="flex grow min-h-0">
          <div class="ml-4 mr-4 mb-4">
            <ScrollPanel class="h-full">
              <Fieldset legend="Simulation inputs">
                <InputWidget
                  v-for="(input, index) in interactiveUiJson.input"
                  v-model="interactiveInputValues[index]!"
                  v-show="interactiveShowInput[index]"
                  :key="`input_${index}`"
                  :name="input.name"
                  :maximumValue="locApi.isScalarInput(input) ? input.maximumValue : undefined"
                  :minimumValue="locApi.isScalarInput(input) ? input.minimumValue : undefined"
                  :possibleValues="locApi.isDiscreteInput(input) ? input.possibleValues : undefined"
                  :stepValue="locApi.isScalarInput(input) ? input.stepValue : undefined"
                  :class="index !== 0 ? 'mt-6' : ''"
                  @change="updateInteractiveSimulation()"
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
                      title="Track current run"
                      @click="onTrackRun"
                    />
                    <Button class="w-9!"
                      icon="pi pi-trash"
                      outlined severity="danger"
                      size="small"
                      title="Remove all tracked runs"
                      @click="onRemoveAllRuns"
                      :disabled="interactiveRuns.length === 1"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <div v-for="(run, index) in interactiveRuns"
                      :key="run.id"
                      class="run-card rounded-lg p-1 pl-2 opacity-75 hover:opacity-100"
                      :class="{ 'run-card-live': run.isLiveRun, 'opacity-50': !run.isVisible }"
                    >
                      <div class="flex items-center">
                        <div class="w-1 h-6 rounded-xs mr-2" :style="`background-color: ${run.color};`"></div>
                        <div class="grow text-sm"
                          :class="{ 'cursor-help': !run.isLiveRun, 'opacity-50': !run.isVisible }"
                          v-tippy="!run.isLiveRun ? {
                            allowHTML: true,
                            content: run.tooltip,
                            placement: 'bottom-start'
                          } : undefined"
                        >
                          {{ run.isLiveRun ? 'Live run' : `Run #${index}` }}
                        </div>
                        <div class="flex items-center">
                          <Button class="p-0! w-5! h-5! run-action-button"
                            icon="pi pi-palette"
                            text
                            size="small"
                            :style="`color: ${run.color};`"
                            :title="`Change ${run.isLiveRun ? 'live run' : 'run'} colour`"
                            @click="onToggleRunColorPopover(index, $event)"
                          />
                          <Popover :ref="(element: any) => interactiveRunColorPopoverRefs[index] = element"
                            v-if="interactiveRunColorPopoverIndex === index"
                          >
                            <div class="flex gap-2">
                              <button class="color-swatch cursor-pointer w-6 h-6 outline-2 outline-transparent rounded-md hover:scale-[1.15]"
                                v-for="(name, color) in colors.PALETTE" :key="color"
                                :style="`background-color: ${color};`"
                                :class="{ 'color-swatch-selected': color === run.color }"
                                :title="name"
                                @click="onRunColorChange(index, color)"
                              >
                              </button>
                            </div>
                          </Popover>
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
                  <div v-if="interactiveRuns.length === 1" class="empty-state p-2 text-center rounded-lg">
                    <i class="pi pi-info-circle empty-state-icon mb-1.5 opacity-50"></i>
                    <p class="text-xs">
                      No runs are being tracked.
                    </p>
                  </div>
                </div>
              </Fieldset>
            </ScrollPanel>
          </div>
          <div class="relative flex flex-col grow h-full min-h-0">
            <div class="flex flex-col grow gap-2 min-h-0" :class="{ 'invisible pointer-events-none': interactiveInstanceIssues.length }">
              <GraphPanelWidget
                v-for="(_plot, index) in interactiveUiJson.output.plots"
                :ref="(element: any) => interactiveGraphPanelRefs[index] = element"
                :key="`plot_${index}`"
                class="w-full min-h-0"
                :margins="interactiveCompMargins"
                :data="interactiveCompData[index] || { traces: [] }"
                @marginsUpdated="(newMargins: IGraphPanelMargins) => onMarginsUpdated(`plot_${index}`, newMargins)"
                @resetMargins="() => onResetMargins()"
              />
            </div>
            <IssuesView v-show="interactiveInstanceIssues.length" class="absolute inset-0 m-4 ml-0" :issues="interactiveInstanceIssues"
            />
          </div>
        </div>
      </div>
    </div>
    <SimulationExperimentViewSettingsDialog
      v-model:visible="interactiveSettingsVisible"
      :settings="interactiveSettings"
      :voiId="interactiveVoiId"
      :voiName="interactiveVoiName"
      :voiUnit="interactiveInstanceTask ? interactiveInstanceTask.voiUnit() : ''"
      :allModelParameters="interactiveAllModelParameters"
      :editableModelParameters="interactiveEditableModelParameters"
      @ok="onInteractiveSettingsOk"
      @close="interactiveSettingsVisible = false"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core';

import Popover from 'primevue/popover';
import * as vue from 'vue';

import type { IOpenCORSimulationDataEvent } from '../../../index';

import * as colors from '../../common/colors';
import * as common from '../../common/common';
import * as dependencies from '../../common/dependencies';
import * as locCommon from '../../common/locCommon';
import * as locApi from '../../libopencor/locApi';
import * as locSedApi from '../../libopencor/locSedApi';
import * as math from '../../common/math';

import type { ISimulationExperimentViewSettings } from '../dialogs/SimulationExperimentViewSettingsDialog.vue';
import GraphPanelWidget from '../widgets/GraphPanelWidget.vue';
import type { IGraphPanelData, IGraphPanelPlotTrace, IGraphPanelMargins } from '../widgets/GraphPanelWidget.vue';

interface ISimulationRun {
  id: string;
  inputParameters: Record<string, number>;
  isVisible: boolean;
  data: IGraphPanelData[];
  color: string;
  tooltip: string;
  isLiveRun: boolean;
}

const props = defineProps<{
  file: locApi.File;
  isActive: boolean;
  isActiveFile: boolean;
  simulationOnly?: boolean;
  uiEnabled: boolean;
  uiJson: locApi.IUiJson;
}>();

const emit = defineEmits<{
  (event: 'error', message: string): void;
  (event: 'simulationData'): void;
}>();

const editorRef = vue.ref<HTMLElement | null>(null);

// Populate the parameters of the given instance task.

const populateParameters = (
  parameters: vue.Ref<string[]>,
  instanceTask: locSedApi.SedInstanceTask,
  onlyEditableModelParameters = false
): void => {
  const addParameter = (param: string): void => {
    parameters.value.push(param);
  };

  if (!onlyEditableModelParameters) {
    addParameter(instanceTask.voiName());
  }

  for (let i = 0; i < instanceTask.stateCount(); i++) {
    addParameter(instanceTask.stateName(i));
  }

  if (!onlyEditableModelParameters) {
    for (let i = 0; i < instanceTask.rateCount(); i++) {
      addParameter(instanceTask.rateName(i));
    }
  }

  for (let i = 0; i < instanceTask.constantCount(); i++) {
    addParameter(instanceTask.constantName(i));
  }

  if (!onlyEditableModelParameters) {
    for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
      addParameter(instanceTask.computedConstantName(i));
    }

    for (let i = 0; i < instanceTask.algebraicVariableCount(); i++) {
      addParameter(instanceTask.algebraicVariableName(i));
    }
  }

  // Sort the parameters alphabetically.

  parameters.value.sort((parameter1: string, parameter2: string) => parameter1.localeCompare(parameter2));
};

// Event handlers.

const onRun = (): void => {
  // Run either the standard or interactive simulation.

  if (!interactiveModeEnabled.value) {
    // Run the standard simulation, i.e. run the instance, output the simulation time to the console, and update the
    // plot.

    const simulationTime = standardInstance.run();

    if (standardInstance.hasIssues()) {
      standardInstance.issues().forEach((issue: locApi.IIssue) => {
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

        standardConsoleContents.value += `<br />&nbsp;&nbsp;<span style="color: ${color};"><strong>${issueType}:</strong> ${issueDescription}</span>`;
      });
    } else {
      standardConsoleContents.value += `<br />&nbsp;&nbsp;<strong>Simulation time:</strong> <span style="color: ${colors.REVERTED_PALETTE.Blue};">${common.formatTime(simulationTime)}</span>`;
    }

    vue.nextTick(() => {
      const consoleElement = editorRef.value;

      if (consoleElement) {
        consoleElement.scrollTop = consoleElement.scrollHeight;
      }
    });

    updatePlot();

    return;
  }

  // Run the interactive simulation.

  updateInteractiveSimulation(true);
};

const onDownloadCombineArchive = (): void => {
  // Create and download a COMBINE archive that contains a manifest file, a CellML file, a SED-ML file, and a UI JSON
  // file.

  const jsZip = new dependencies._jsZip();
  const baseFileName = common.fileName(interactiveFile.path()).replace(/\.[^/.]+$/, '');
  const modelFile = interactiveModel.file();

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
  jsZip.file('document.sedml', interactiveDocument.serialise().replace(modelFile.path(), 'model.cellml'));
  jsZip.file('simulation.json', JSON.stringify(interactiveUiJson.value, null, 2));

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

const informationIssue: locApi.IIssue = {
  type: locApi.EIssueType.INFORMATION,
  description:
    'Please check the <em>Interactive mode</em> settings (click on the <i class="pi pi-cog"></i> icon in the top-right corner) and try again.'
};

const updateInteractiveUi = () => {
  // Populate our input values and visibility based on the input definitions in the UI JSON.

  interactiveInputValues.value = interactiveUiJson.value.input.map((input: locApi.IUiJsonInput) => input.defaultValue);
  interactiveShowInput.value = interactiveUiJson.value.input.map(
    (input: locApi.IUiJsonInput) => (input.visible ?? 'true') !== 'false'
  );

  // Update our mapping of interactive data IDs to simulation data information.

  Object.keys(interactiveIdToInfo).forEach((key) => {
    delete interactiveIdToInfo[key];
  });

  interactiveUiJson.value.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    if (data.id && interactiveInstanceTask) {
      interactiveIdToInfo[data.id] = locCommon.simulationDataInfo(interactiveInstanceTask, data.name);
    }
  });
};

const instanceIssues = vue.ref<locApi.IIssue[]>([]);
let hasInstanceIssues = false;

const NoGraphPanelData = {
  xAxisTitle: undefined,
  yAxisTitle: undefined,
  traces: []
};
const NoSimulationDataInfo: locCommon.ISimulationDataInfo = {
  type: locCommon.ESimulationDataInfoType.UNKNOWN,
  index: -1
};

const isNoSimulationDataInfo = (info: locCommon.ISimulationDataInfo): boolean => {
  return info.type === locCommon.ESimulationDataInfoType.UNKNOWN && info.index === -1;
};

// Standard mode.

const standardFile = props.file;
const standardDocument = standardFile.document();
const standardUniformTimeCourse = standardDocument.simulation(0) as locApi.SedUniformTimeCourse;
const standardInstance = standardDocument.instantiate();

instanceIssues.value = standardInstance.issues();
hasInstanceIssues = instanceIssues.value.length > 0;

const standardInstanceTask = hasInstanceIssues ? null : standardInstance.task(0);
const standardParameters = vue.ref<string[]>([]);
const standardXParameter = vue.ref(standardInstanceTask ? standardInstanceTask.voiName() : '');
const standardYParameter = vue.ref(standardInstanceTask ? standardInstanceTask.stateName(0) : '');
const standardData = vue.ref<IGraphPanelData>(NoGraphPanelData);
const standardConsoleContents = vue.ref<string>(`<b>${standardFile.path()}</b>`);

if (standardInstanceTask) {
  populateParameters(standardParameters, standardInstanceTask);
}

const traceName = (name: string | undefined, xValue: string, yValue: string): string => {
  return name ?? `${yValue} <i>vs.</i> ${xValue}`;
};

const xInfo = vue.computed<locCommon.ISimulationDataInfo>(() => {
  return standardInstanceTask
    ? locCommon.simulationDataInfo(standardInstanceTask, standardXParameter.value)
    : NoSimulationDataInfo;
});
const yInfo = vue.computed<locCommon.ISimulationDataInfo>(() => {
  return standardInstanceTask
    ? locCommon.simulationDataInfo(standardInstanceTask, standardYParameter.value)
    : NoSimulationDataInfo;
});

const updatePlot = () => {
  if (!standardInstanceTask) {
    standardData.value = NoGraphPanelData;

    return;
  }

  standardData.value = {
    xAxisTitle: standardXParameter.value,
    yAxisTitle: standardYParameter.value,
    traces: [
      {
        name: traceName(undefined, standardXParameter.value, standardYParameter.value),
        xValue: standardXParameter.value,
        x: locCommon.simulationDataValue(standardInstanceTask, xInfo.value).data,
        yValue: standardYParameter.value,
        y: locCommon.simulationDataValue(standardInstanceTask, yInfo.value).data,
        color: colors.DEFAULT_COLOR
      }
    ]
  };
};

// Interactive mode.

interface IExternalDataValues {
  x: math.FloatArray;
  y: math.FloatArray;
}

const interactiveModeEnabled = vue.ref<boolean>(!!props.uiJson);
const interactiveLiveUpdatesEnabled = vue.ref<boolean>(true);
const interactiveSettingsVisible = vue.ref<boolean>(false);
const interactiveFile = props.file;
const interactiveDocument = interactiveFile.document();
const interactiveUniformTimeCourse = interactiveDocument.simulation(0) as locApi.SedUniformTimeCourse;
const interactiveCvode = interactiveUniformTimeCourse.cvode();
let interactiveInstance = interactiveDocument.instantiate();
let interactiveInstanceTask = hasInstanceIssues ? null : interactiveInstance.task(0);
const interactiveAllModelParameters = vue.ref<string[]>([]);
const interactiveEditableModelParameters = vue.ref<string[]>([]);
const interactiveVoiName = vue.ref(interactiveInstanceTask ? interactiveInstanceTask.voiName() : '');
const interactiveVoiId = vue.ref(interactiveInstanceTask ? (interactiveVoiName.value.split('/')[1] ?? '') : '');
const interactiveUiJson = vue.ref<locApi.IUiJson>(
  props.uiJson
    ? JSON.parse(JSON.stringify(props.uiJson))
    : {
        input: [],
        output: {
          data: [
            {
              id: interactiveVoiId.value,
              name: interactiveVoiName.value
            }
          ],
          plots: []
        },
        parameters: []
      }
);
const interactiveUiJsonEmpty = vue.computed<boolean>(() => {
  if (
    interactiveUiJson.value.input.length === 0 &&
    interactiveUiJson.value.parameters.length === 0 &&
    (interactiveUiJson.value.output.externalData?.length ?? 0) === 0 &&
    interactiveUiJson.value.output.plots.length === 0
  ) {
    if (interactiveUiJson.value.output.data.length === 0) {
      return true;
    }

    if (interactiveUiJson.value.output.data.length === 1) {
      const data = interactiveUiJson.value.output.data[0];

      return !!(data && data.id === interactiveVoiId.value && data.name === interactiveVoiName.value);
    }
  }

  return false;
});
const interactiveMath = new math.Float64ArrayMath();
const interactiveModel = interactiveDocument.model(0);
const interactiveLiveData = vue.ref<IGraphPanelData[]>([]);
let interactiveMargins: Record<string, IGraphPanelMargins> = {};
const interactiveCompMargins = vue.ref<IGraphPanelMargins>();
const interactiveUiJsonIssues = vue.ref<locApi.IIssue[]>(
  locApi.validateUiJson(interactiveUiJson.value, {
    allModelParameters: interactiveAllModelParameters.value,
    editableModelParameters: interactiveEditableModelParameters.value
  })
);
const interactiveInstanceIssues = vue.ref<locApi.IIssue[]>([]);
const interactiveInputValues = vue.ref<number[]>([]);
const interactiveShowInput = vue.ref<boolean[]>([]);
const interactiveIdToInfo: Record<string, locCommon.ISimulationDataInfo> = {};
const interactiveRuns = vue.ref<ISimulationRun[]>([
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
let interactiveTrackedRunId = 0;
const interactiveRunColorPopoverIndex = vue.ref<number>(-1);
const interactiveRunColorPopoverRefs = vue.ref<Record<number, InstanceType<typeof Popover> | undefined>>({});
const interactiveGraphPanelRefs = vue.ref<Record<number, InstanceType<typeof GraphPanelWidget> | undefined>>({});
const interactiveCompData = vue.computed<IGraphPanelData[]>(() => {
  // Combine the live data with the data from the tracked runs.

  const liveData = interactiveLiveData.value;
  const runs = interactiveRuns.value;
  const runsCount = runs.length;
  const res: IGraphPanelData[] = [];
  const paletteColors = colors.PALETTE_COLORS;
  const paletteColorsLength = paletteColors.length;

  for (let i = 0; i < liveData.length; ++i) {
    const traces: IGraphPanelPlotTrace[] = [];

    for (let j = 0; j < runsCount; ++j) {
      const interactiveRun = runs[j];

      if (!interactiveRun) {
        continue;
      }

      if (!interactiveRun.isVisible) {
        continue;
      }

      const runColorIndex = paletteColors.indexOf(interactiveRun.color);
      const baseColorIndex = runColorIndex >= 0 ? runColorIndex : 0;
      const data = interactiveRun.isLiveRun ? liveData[i] : interactiveRun.data[i];
      const dataTraces = data?.traces;

      if (!dataTraces?.length) {
        continue;
      }

      const suffix = runsCount === 1 ? '' : interactiveRun.isLiveRun ? ' [Live]' : ` [#${j}]`;

      for (let k = 0; k < dataTraces.length; ++k) {
        const dataTrace = dataTraces[k];

        if (!dataTrace) {
          continue;
        }

        traces.push({
          ...dataTrace,
          traceId: `${interactiveRun.id}::${dataTrace.traceId ?? `${dataTrace.xValue}::${dataTrace.yValue}::${k}`}`,
          name: dataTrace.name + suffix,
          color: paletteColors[(baseColorIndex + k) % paletteColorsLength] ?? colors.DEFAULT_COLOR,
          zorder: interactiveRun.isLiveRun ? 1 : undefined
        });
      }
    }

    res.push({
      xAxisTitle: liveData[i]?.xAxisTitle,
      yAxisTitle: liveData[i]?.yAxisTitle,
      traces
    });
  }

  return res;
});
const interactiveSettings = vue.computed<ISimulationExperimentViewSettings>(() => ({
  simulation: {
    startingPoint: interactiveUniformTimeCourse.outputStartTime(),
    endingPoint: interactiveUniformTimeCourse.outputEndTime(),
    pointInterval:
      (interactiveUniformTimeCourse.outputEndTime() - interactiveUniformTimeCourse.outputStartTime()) /
      interactiveUniformTimeCourse.numberOfSteps()
  },
  solvers: {
    cvodeMaximumStep: interactiveCvode.maximumStep()
  },
  interactive: {
    uiJson: interactiveUiJson.value
  },
  miscellaneous: {
    liveUpdates: interactiveLiveUpdatesEnabled.value
  }
}));
const interactiveOldSettings = vue.ref<string>(JSON.stringify(vue.toRaw(interactiveSettings.value)));

// A helper function to retrieve simulation data for one or more model parameters.

const simulationData = (modelParameters: string[]): Promise<IOpenCORSimulationDataEvent> => {
  const res: IOpenCORSimulationDataEvent = {
    simulationData: common.emptySimulationData(modelParameters),
    issues: []
  };

  if (!interactiveInstanceTask) {
    res.issues.push('No SED-ML instance task available.');

    return Promise.resolve(res);
  }

  const instanceTask = interactiveInstanceTask as locSedApi.SedInstanceTask;

  for (const modelParameter of modelParameters) {
    const info = locCommon.simulationDataInfo(
      instanceTask,
      modelParameter === 'VOI' ? instanceTask.voiName() : modelParameter
    );

    if (isNoSimulationDataInfo(info)) {
      res.issues.push(`No simulation data information was found for model parameter "${modelParameter}".`);

      continue;
    }

    try {
      res.simulationData[modelParameter] = locCommon.simulationDataValue(instanceTask, info);
    } catch (error: unknown) {
      res.issues.push(`Error for model parameter "${modelParameter}": ${common.formatError(error)}`);
    }
  }

  return Promise.resolve(res);
};

defineExpose({
  simulationData
});

// Determine whether to show the toolbar.

const showToolbar = vue.computed<boolean>(() => {
  return (props.simulationOnly && interactiveUiJsonEmpty.value) || !props.simulationOnly;
});

// Populate our model parameters.

if (interactiveInstanceTask) {
  populateParameters(interactiveAllModelParameters, interactiveInstanceTask);
  populateParameters(interactiveEditableModelParameters, interactiveInstanceTask, true);
}

// Update (initialise) our interactive UI..

updateInteractiveUi();

// Watch for changes to our UI JSON and reset the compiled expressions when it changes.

vue.watch(
  () => interactiveUiJson.value,
  () => {
    interactiveMath.resetCompiledExpressions();
  },
  { deep: true }
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

// Function to update our interactive simulation.

const updateInteractiveSimulation = (forceUpdate: boolean = false): void => {
  // Make sure that there are no issues with the UI JSON and that live updates are enabled (unless forced).

  if (interactiveUiJsonIssues.value.length || (!interactiveLiveUpdatesEnabled.value && !forceUpdate)) {
    return;
  }

  // Create a scope for the model using the current input values.

  const modelScope: math.ExpressionScope = {};

  for (let i = 0; i < interactiveUiJson.value.input.length; ++i) {
    const input = interactiveUiJson.value.input[i];

    if (input) {
      modelScope[input.id] = interactiveInputValues.value[i];
    }
  }

  // Show/hide the input widgets.

  for (let i = 0; i < interactiveUiJson.value.input.length; ++i) {
    const input = interactiveUiJson.value.input[i];

    if (input) {
      try {
        interactiveShowInput.value[i] = Boolean(interactiveMath.evaluate(input.visible ?? 'true', modelScope));
      } catch (error: unknown) {
        interactiveShowInput.value[i] = false;

        interactiveInstanceIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating visibility for input '${input.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  // Update the SED-ML document.

  interactiveModel.removeAllChanges();

  for (const parameter of interactiveUiJson.value.parameters) {
    const componentVariableNames = parameter.name.split('/');

    if (componentVariableNames[0] && componentVariableNames[1]) {
      try {
        interactiveModel.addChange(
          componentVariableNames[0],
          componentVariableNames[1],
          String(interactiveMath.evaluate(parameter.value, modelScope))
        );
      } catch (error: unknown) {
        interactiveInstanceIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while applying parameter change for '${parameter.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  // Make sure that we haven't come across any issues so far.

  if (interactiveInstanceIssues.value.length) {
    interactiveInstanceIssues.value.push(informationIssue);

    return;
  }

  // Run the instance.

  interactiveInstance.run();

  if (interactiveInstance.hasIssues()) {
    interactiveInstanceIssues.value = interactiveInstance.issues();

    return;
  }

  // A helper function to evaluate an expression within the given scope.

  const evaluateExpression = (expression: string, scope: math.ExpressionScope): math.FloatArray => {
    const res = interactiveMath.evaluate(expression, scope);

    if (typeof res === 'boolean') {
      return new Float64Array([res ? 1 : 0]);
    }

    if (typeof res === 'number') {
      return new Float64Array([res]);
    }

    return res;
  };

  // Interpolate any external data at the VOI values of our simulation and add the interpolated values to our scope.

  if (interactiveInstanceTask) {
    const simulationVoi = interactiveInstanceTask.voi();

    for (const externalData of interactiveUiJson.value.output.externalData ?? []) {
      try {
        const voiValues = new Float64Array(externalData.voiValues);
        const voiExpression = externalData.voiExpression?.trim();
        const externalDataVoi =
          !voiExpression || voiExpression === 'voi' ? voiValues : evaluateExpression(voiExpression, { voi: voiValues });

        const requiredSeriesNames = new Set<string>();

        for (const data of externalData.data) {
          requiredSeriesNames.add(data.name);
        }

        const externalDataSeries: Record<string, math.FloatArray> = Object.create(null);

        for (const externalDataSerie of externalData.dataSeries) {
          if (requiredSeriesNames.has(externalDataSerie.name)) {
            externalDataSeries[externalDataSerie.name] = new Float64Array(externalDataSerie.values);
          }
        }

        for (const data of externalData.data) {
          const externalDataSerie = externalDataSeries[data.name];

          if (externalDataSerie) {
            modelScope[data.id] = externalDataValues(simulationVoi, {
              x: externalDataVoi,
              y: externalDataSerie
            });
          }
        }
      } catch (error: unknown) {
        interactiveInstanceIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating the VOI expression '${externalData.voiExpression}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  // Make sure that we haven't come across any issues so far.

  if (interactiveInstanceIssues.value.length) {
    interactiveInstanceIssues.value.push(informationIssue);

    return;
  }

  // Update our scope with the latest simulation data.

  if (interactiveInstanceTask) {
    // Latest simulation data.

    for (const data of interactiveUiJson.value.output.data) {
      modelScope[data.id] = locCommon.simulationDataValue(interactiveInstanceTask, interactiveIdToInfo[data.id]).data;
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

  const newInteractiveData: IGraphPanelData[] = [];

  for (let i = 0; i < interactiveUiJson.value.output.plots.length; ++i) {
    const plot = interactiveUiJson.value.output.plots[i];

    if (!plot) {
      newInteractiveData[i] = {
        xAxisTitle: '',
        yAxisTitle: '',
        traces: []
      };

      continue;
    }

    let xMain: math.FloatArray = new Float64Array(0);

    try {
      xMain = evaluateExpression(plot.xValue, modelScope);
    } catch (error: unknown) {
      interactiveInstanceIssues.value.push({
        type: locApi.EIssueType.ERROR,
        description: `An error occurred while evaluating the X value expression for plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
      });
    }

    let yMain: math.FloatArray = new Float64Array(0);

    try {
      yMain = evaluateExpression(plot.yValue, modelScope);
    } catch (error: unknown) {
      interactiveInstanceIssues.value.push({
        type: locApi.EIssueType.ERROR,
        description: `An error occurred while evaluating the Y value expression for plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
      });
    }

    const normalisedMain = normaliseFloat64Arrays(xMain, yMain);

    const traces: IGraphPanelPlotTrace[] = [
      {
        traceId: `plot_${i}::trace_0`,
        name: traceName(plot.name, plot.xValue, plot.yValue),
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

      let xAdditional: math.FloatArray = new Float64Array(0);

      try {
        xAdditional = evaluateExpression(additionalTrace.xValue, modelScope);
      } catch (error: unknown) {
        interactiveInstanceIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating the X value expression for additional trace #${additionalTraceIndex + 1} of plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }

      let yAdditional: math.FloatArray = new Float64Array(0);

      try {
        yAdditional = evaluateExpression(additionalTrace.yValue, modelScope);
      } catch (error: unknown) {
        interactiveInstanceIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while evaluating the Y value expression for additional trace #${additionalTraceIndex + 1} of plot '${plot.name}' (${common.formatMessage(common.formatError(error), false)}).`
        });
      }

      const normalisedAdditional = normaliseFloat64Arrays(xAdditional, yAdditional);

      traces.push({
        traceId: `plot_${i}::trace_${additionalTraceIndex + 1}`,
        name: traceName(additionalTrace.name, additionalTrace.xValue, additionalTrace.yValue),
        xValue: additionalTrace.xValue,
        x: normalisedAdditional.x,
        yValue: additionalTrace.yValue,
        y: normalisedAdditional.y,
        color: colors.DEFAULT_COLOR
      });
    }

    newInteractiveData[i] = {
      xAxisTitle: plot.xAxisTitle,
      yAxisTitle: plot.yAxisTitle,
      traces
    };
  }

  interactiveLiveData.value = newInteractiveData;

  // Make sure that we haven't come across any issues so far.

  if (interactiveInstanceIssues.value.length) {
    interactiveInstanceIssues.value.push(informationIssue);

    return;
  }

  // Let people know that the simulation data has been updated.

  emit('simulationData');
};

// Interactive mode's margins-related event handlers.

const onMarginsUpdated = (plotId: string, newMargins: IGraphPanelMargins): void => {
  interactiveMargins[plotId] = newMargins;

  let marginCount = 0;
  let maxLeft = 0;
  let maxRight = 0;

  for (const key in interactiveMargins) {
    const margin = interactiveMargins[key];

    if (!margin) {
      continue;
    }

    ++marginCount;

    maxLeft = Math.max(maxLeft, margin.left);
    maxRight = Math.max(maxRight, margin.right);
  }

  if (marginCount !== interactiveUiJson.value.output.plots.length) {
    interactiveCompMargins.value = undefined;

    return;
  }

  interactiveCompMargins.value = {
    left: maxLeft,
    right: maxRight
  };
};

const onResetMargins = () => {
  interactiveMargins = {};
  interactiveCompMargins.value = undefined;
};

// Interactive mode's runs-related event handlers

const onTrackRun = (): void => {
  // Create a new run from the live run.

  const inputParameters: Record<string, number> = {};

  for (let i = 0; i < interactiveUiJson.value.input.length; ++i) {
    const input = interactiveUiJson.value.input[i];

    if (!input) {
      continue;
    }

    const interactiveInputValue = interactiveInputValues.value[i];

    if (interactiveInputValue !== undefined) {
      inputParameters[input.id] = interactiveInputValue;
    }
  }

  // Compute the tooltip for this run, keeping in mind that some simulation inputs may not be visible.

  const tooltipRows: string[] = [];

  for (let i = 0; i < interactiveUiJson.value.input.length; ++i) {
    if (!interactiveShowInput.value[i]) {
      continue;
    }

    const input = interactiveUiJson.value.input[i];

    if (!input) {
      continue;
    }

    let inputValue: string | number | undefined = inputParameters[input.id];

    if (locApi.isDiscreteInput(input)) {
      const selectedValue = input.possibleValues.find(
        (possibleValue) => possibleValue.value === inputParameters[input.id]
      );

      if (selectedValue?.name) {
        inputValue = selectedValue.name.charAt(0).toLowerCase() + selectedValue.name.slice(1);
      } else {
        inputValue = inputParameters[input.id];
      }
    }

    tooltipRows.push(`<tr>
      <td>
        <b>${input.name}:</b>
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

  for (const run of interactiveRuns.value) {
    usedColors.add(run.color);
  }

  const lastColor = interactiveRuns.value[interactiveRuns.value.length - 1]?.color ?? colors.DEFAULT_COLOR;
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

  interactiveRuns.value.push({
    id: `run_${++interactiveTrackedRunId}`,
    inputParameters,
    isVisible: true,
    data: interactiveLiveData.value,
    color,
    tooltip,
    isLiveRun: false
  });
};

const onRemoveRun = (index: number): void => {
  // Remove the given run.

  interactiveRuns.value.splice(index, 1);
};

const onRemoveAllRuns = (): void => {
  // Remove all the runs except the live run.

  interactiveRuns.value.splice(1);
};

const onToggleRun = (index: number): void => {
  // Toggle the visibility of the given run.

  const interactiveRun = interactiveRuns.value[index];

  if (interactiveRun) {
    interactiveRun.isVisible = !interactiveRun.isVisible;
  }
};

const onRunColorChange = (index: number, color: string) => {
  const interactiveRun = interactiveRuns.value[index];

  if (interactiveRun) {
    interactiveRun.color = color;
  }
};

const onToggleRunColorPopover = (index: number, event: MouseEvent) => {
  // Note: interactiveRunColorPopoverIndex is only used to ensure that the active popover gets properly hidden when the
  //       window loses focus as a result of switching tabs (see onMounted below).

  interactiveRunColorPopoverIndex.value = index;

  vue.nextTick(() => {
    // Note: we do this in a next tick to ensure that the reference is available.

    interactiveRunColorPopoverRefs.value[index]?.toggle(event);
  });
};

const onInteractiveSettingsOk = (settings: ISimulationExperimentViewSettings): void => {
  const newSettings = JSON.stringify(vue.toRaw(settings));
  const settingsHaveChanges = newSettings !== interactiveOldSettings.value;

  interactiveOldSettings.value = newSettings;

  if (!settingsHaveChanges) {
    interactiveSettingsVisible.value = false;

    return;
  }

  // Clear all our tracked runs.

  onRemoveAllRuns();

  // Clear any issues since they may no longer be relevant with the new settings.

  interactiveInstanceIssues.value = [];

  // Update our settings and hide the dialog.

  const oldNbOfGraphPanelWidgets = interactiveUiJson.value.output.plots.length;
  const oldCvodeMaximumStep = interactiveCvode.maximumStep();

  interactiveUniformTimeCourse.setInitialTime(settings.simulation.startingPoint);
  interactiveUniformTimeCourse.setOutputStartTime(settings.simulation.startingPoint);
  interactiveUniformTimeCourse.setOutputEndTime(settings.simulation.endingPoint);
  interactiveUniformTimeCourse.setNumberOfSteps(
    Math.max(
      1,
      Math.round(
        (settings.simulation.endingPoint - settings.simulation.startingPoint) / settings.simulation.pointInterval
      )
    )
  );

  interactiveCvode.setMaximumStep(settings.solvers.cvodeMaximumStep);

  interactiveUiJson.value = locApi.cleanUiJson(settings.interactive.uiJson);
  interactiveLiveUpdatesEnabled.value = settings.miscellaneous.liveUpdates;
  interactiveSettingsVisible.value = false;

  // Validate the new UI JSON settings.

  interactiveUiJsonIssues.value = locApi.validateUiJson(settings.interactive.uiJson, {
    allModelParameters: interactiveAllModelParameters.value,
    editableModelParameters: interactiveEditableModelParameters.value
  });

  if (interactiveUiJsonIssues.value.length > 0) {
    return;
  }

  // Reinstantiate our instance in case we modified CVODE's maximum step.

  if (interactiveCvode.maximumStep() !== oldCvodeMaximumStep) {
    interactiveInstance = interactiveDocument.instantiate(); // So that we can run the simulation again.
    interactiveInstanceTask = interactiveInstance.task(0); // So that we can retrieve our "new" simulation results.
  }

  // Update our UI.

  updateInteractiveUi();

  // Update the interactive simulation with the new UI JSON settings.

  updateInteractiveSimulation();

  if (interactiveInstanceIssues.value.length) {
    return;
  }

  // Reset the margins of our various plots.
  // Note: this is needed when the number of plots changes or simulation couldn't originally be run and now it can be
  //       run with the new settings. Without this, the plots will start with incorrect margins before they get updated
  //       which results in some flashing.

  onResetMargins();
};

// "Initialise" our standard and/or interactive modes.

vue.onMounted(() => {
  updatePlot();

  updateInteractiveSimulation();
});

// Various things that need to be done once we are mounted.

const windowIsFocused = vueusecore.useWindowFocus();

vue.onMounted(() => {
  // Make sure that our active popover gets hidden when the window loses focus.

  vue.watch(
    () => windowIsFocused.value,
    (isFocused) => {
      if (!isFocused) {
        if (interactiveRunColorPopoverIndex.value !== -1) {
          interactiveRunColorPopoverRefs.value[interactiveRunColorPopoverIndex.value]?.hide();

          interactiveRunColorPopoverIndex.value = -1;
        }
      }
    }
  );
});

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActive || !props.uiEnabled) {
      return;
    }

    if (
      props.isActiveFile &&
      !hasInstanceIssues &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.metaKey &&
      event.code === 'F9' &&
      (!interactiveModeEnabled.value || (interactiveModeEnabled.value && !interactiveLiveUpdatesEnabled.value))
    ) {
      event.preventDefault();

      onRun();
    }
  });
}
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

.console {
  font-family: Helvetica, Arial, sans-serif;
}

.empty-state {
  color: var(--p-text-muted-color);
  border: 1px dashed var(--p-content-border-color);
}

.empty-state-icon {
  font-size: 1.25rem;
}

:deep(.p-button-icon) {
  font-size: 1.5rem;
}

:deep(.p-editor-content) {
  border: none !important;
}

:deep(.p-editor-toolbar) {
  display: none;
}

:deep(.p-togglebutton) {
  background-color: var(--p-primary-color) !important;
  color: var(--p-primary-contrast-color) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
}

:deep(.p-togglebutton:hover) {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  :deep(.p-togglebutton:hover) {
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.15);
  }
}

.p-toolbar {
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--p-content-border-color);
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

.toolbar-button:hover {
  background-color: var(--p-surface-hover) !important;
  transform: scale(1.15);
}
</style>
