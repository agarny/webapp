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
                      :key="run.isLiveRun ? 'live' : `run_${index}`"
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
          <div class="flex flex-col grow gap-2 h-full min-h-0">
            <IssuesView v-show="interactiveInstanceIssues.length" class="mt-4 mr-4" style="height: calc(100% - 2rem);" :issues="interactiveInstanceIssues" />
            <GraphPanelWidget v-show="!interactiveInstanceIssues.length"
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

import Popover from '@primevue-ce/primevue/popover';
import * as vue from 'vue';

import type { IOpenCORSimulationDataEvent } from '../../../index.ts';

import * as colors from '../../common/colors.ts';
import * as common from '../../common/common.ts';
import * as dependencies from '../../common/dependencies.ts';
import * as locCommon from '../../common/locCommon.ts';
import * as locApi from '../../libopencor/locApi.ts';
import * as locSedApi from '../../libopencor/locSedApi.ts';

import type { ISimulationExperimentViewSettings } from '../dialogs/SimulationExperimentViewSettingsDialog.vue';
import GraphPanelWidget from '../widgets/GraphPanelWidget.vue';
import type { IGraphPanelData, IGraphPanelPlotTrace, IGraphPanelMargins } from '../widgets/GraphPanelWidget.vue';

interface ISimulationRun {
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
      console.error('Failed to generate COMBINE archive:', common.formatError(error));
    });
};

const populateInputProperties = (currentUiJson: locApi.IUiJson) => {
  interactiveInputValues.value = currentUiJson.input.map((input: locApi.IUiJsonInput) => input.defaultValue);
  interactiveShowInput.value = currentUiJson.input.map((input: locApi.IUiJsonInput) => input.visible ?? 'true');

  Object.keys(interactiveIdToInfo).forEach((key) => {
    delete interactiveIdToInfo[key];
  });

  currentUiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
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
        x: locCommon.simulationData(standardInstanceTask, xInfo.value),
        yValue: standardYParameter.value,
        y: locCommon.simulationData(standardInstanceTask, yInfo.value),
        color: colors.DEFAULT_COLOR
      }
    ]
  };
};

// Interactive mode.

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
    interactiveUiJson.value.output.plots.length === 0 &&
    interactiveUiJson.value.parameters.length === 0
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
const interactiveMath = dependencies._mathJs.create(dependencies._mathJs.all, {});
const interactiveModel = interactiveDocument.model(0);
const interactiveLiveData = vue.ref<IGraphPanelData[]>([]);
let interactiveMargins: Record<string, IGraphPanelMargins> = {};
const interactiveCompMargins = vue.ref<IGraphPanelMargins>();
const interactiveUiJsonIssues = vue.ref<locApi.IIssue[]>(locApi.validateUiJson(interactiveUiJson.value));
const interactiveInstanceIssues = vue.ref<locApi.IIssue[]>([]);
const interactiveInputValues = vue.ref<number[]>([]);
const interactiveShowInput = vue.ref<string[]>([]);
const interactiveIdToInfo: Record<string, locCommon.ISimulationDataInfo> = {};
const interactiveRuns = vue.ref<ISimulationRun[]>([
  {
    inputParameters: {},
    isVisible: true,
    data: [],
    color: colors.DEFAULT_COLOR,
    tooltip: '',
    isLiveRun: true
  }
]);
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

  for (let liveDataIndex = 0; liveDataIndex < liveData.length; ++liveDataIndex) {
    const traces: IGraphPanelPlotTrace[] = [];

    for (let runIndex = 0; runIndex < runsCount; ++runIndex) {
      const interactiveRun = runs[runIndex];

      if (!interactiveRun) {
        continue;
      }

      if (!interactiveRun.isVisible) {
        continue;
      }

      const runColorIndex = paletteColors.indexOf(interactiveRun.color);
      const baseColorIndex = runColorIndex >= 0 ? runColorIndex : 0;
      const data = interactiveRun.isLiveRun ? liveData[liveDataIndex] : interactiveRun.data[liveDataIndex];
      const dataTraces = data?.traces;

      if (!dataTraces?.length) {
        continue;
      }

      const suffix = runsCount === 1 ? '' : interactiveRun.isLiveRun ? ' [Live]' : ` [#${runIndex}]`;

      for (let dataTraceIndex = 0; dataTraceIndex < dataTraces.length; ++dataTraceIndex) {
        const dataTrace = dataTraces[dataTraceIndex];

        if (!dataTrace) {
          continue;
        }

        traces.push({
          ...dataTrace,
          name: dataTrace.name + suffix,
          color: paletteColors[(baseColorIndex + dataTraceIndex) % paletteColorsLength] ?? colors.DEFAULT_COLOR,
          zorder: interactiveRun.isLiveRun ? 1 : undefined
        });
      }
    }

    res.push({
      xAxisTitle: liveData[liveDataIndex]?.xAxisTitle,
      yAxisTitle: liveData[liveDataIndex]?.yAxisTitle,
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
    simulationData: common.undefinedSimulationData(modelParameters),
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
      res.simulationData[modelParameter] = undefined;
      res.issues.push(`No simulation data information was found for model parameter "${modelParameter}".`);

      continue;
    }

    try {
      res.simulationData[modelParameter] = locCommon.simulationData(instanceTask, info);
    } catch (error: unknown) {
      res.simulationData[modelParameter] = undefined;
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

// Populate our input properties.

populateInputProperties(interactiveUiJson.value);

// Import some element-wise functions to allow sin(array) instead of map(array, sin), for instance.

const value = (v: unknown, i: number): number => {
  return Array.isArray(v) ? v[i] : Number(v);
};

interactiveMath.import(
  {
    // Arithmetic operators.

    pow: (x: number[], y: unknown) => x.map((v: number, i: number) => v ** value(y, i)),
    sqrt: (x: number[]) => x.map((v: number) => Math.sqrt(v)),
    abs: (x: number[]) => x.map((v: number) => Math.abs(v)),
    exp: (x: number[]) => x.map((v: number) => Math.exp(v)),
    log: (x: number[]) => x.map((v: number) => Math.log(v)),
    log10: (x: number[]) => x.map((v: number) => Math.log10(v)),
    ceil: (x: number[]) => x.map((v: number) => Math.ceil(v)),
    floor: (x: number[]) => x.map((v: number) => Math.floor(v)),
    min: (x: number[], y: unknown) => x.map((v: number, i: number) => Math.min(v, value(y, i))),
    max: (x: number[], y: unknown) => x.map((v: number, i: number) => Math.max(v, value(y, i))),
    mod: (x: number[], y: unknown) => x.map((v: number, i: number) => v % value(y, i)),

    // // Trigonometric operators.

    sin: (x: number[]) => x.map((v: number) => Math.sin(v)),
    cos: (x: number[]) => x.map((v: number) => Math.cos(v)),
    tan: (x: number[]) => x.map((v: number) => Math.tan(v)),
    sinh: (x: number[]) => x.map((v: number) => Math.sinh(v)),
    cosh: (x: number[]) => x.map((v: number) => Math.cosh(v)),
    tanh: (x: number[]) => x.map((v: number) => Math.tanh(v)),
    asin: (x: number[]) => x.map((v: number) => Math.asin(v)),
    acos: (x: number[]) => x.map((v: number) => Math.acos(v)),
    atan: (x: number[]) => x.map((v: number) => Math.atan(v)),
    asinh: (x: number[]) => x.map((v: number) => Math.asinh(v)),
    acosh: (x: number[]) => x.map((v: number) => Math.acosh(v)),
    atanh: (x: number[]) => x.map((v: number) => Math.atanh(v))
  },
  { override: true }
);

const NON_ELEMENTWISE_MULTIPLY_REGEX = /(?<!\.)\*(?!\.)/g;
const NON_ELEMENTWISE_DIVIDE_REGEX = /(?<!\.)\/(?!\.)/g;

// Check whether our plot expressions contain multiplications and/or divisions.
// Note: libOpenCOR now returns `Float64Array`s which is very efficient, but Math.js dot multiplications and divisions
//       don't support them. So, we need to convert our data to `number[]`s whenever one of our expressions has
//       multiplications and/or divisions. This is not ideal, but we have no choice if we want to plot things like
//       `t*sin(t)*x`. Still, most of the time, people will likely just plot `x` and that will be as fast as it can be.

const containsMultiplicationsOrDivisions = vue.computed<boolean>(() => {
  const plots = interactiveUiJson.value.output.plots;

  for (let i = 0; i < plots.length; ++i) {
    const plot = plots[i];

    if (plot) {
      if (
        plot.xValue.includes('*') ||
        plot.xValue.includes('/') ||
        plot.yValue.includes('*') ||
        plot.yValue.includes('/')
      ) {
        return true;
      }

      const additionalTraces = plot.additionalTraces;

      if (additionalTraces) {
        for (let j = 0; j < additionalTraces.length; ++j) {
          const additionalTrace = additionalTraces[j];

          if (
            additionalTrace &&
            (additionalTrace.xValue.includes('*') ||
              additionalTrace.xValue.includes('/') ||
              additionalTrace.yValue.includes('*') ||
              additionalTrace.yValue.includes('/'))
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
});

// Cache for normalised plot expressions.

const normalisedExpressionCache = new Map<string, string>();

vue.watch(
  () => interactiveUiJson.value,
  () => {
    normalisedExpressionCache.clear();
  },
  { deep: true }
);

// Function to update our interactive simulation.

const updateInteractiveSimulation = (forceUpdate: boolean = false): void => {
  // Make sure that there are no issues with the UI JSON and that live updates are enabled (unless forced).

  if (interactiveUiJsonIssues.value.length || (!interactiveLiveUpdatesEnabled.value && !forceUpdate)) {
    return;
  }

  // Create a parser with the current input values as variables.

  const parser = interactiveMath.parser();

  for (let index = 0; index < interactiveUiJson.value.input.length; ++index) {
    const input = interactiveUiJson.value.input[index];

    if (input) {
      parser.set(input.id, interactiveInputValues.value[index]);
    }
  }

  // Show/hide the input widgets.

  for (let index = 0; index < interactiveUiJson.value.input.length; ++index) {
    const input = interactiveUiJson.value.input[index];

    if (input) {
      interactiveShowInput.value[index] = parser.evaluate(input.visible ?? 'true') as string;
    }
  }

  // Update the SED-ML document.

  const informationIssue: locApi.IIssue = {
    type: locApi.EIssueType.INFORMATION,
    description:
      'Please check the <em>Interactive mode</em> settings (click on the <i class="pi pi-cog"></i> icon in the top-right corner) and try again.'
  };

  interactiveModel.removeAllChanges();
  interactiveInstanceIssues.value = [];

  for (const parameter of interactiveUiJson.value.parameters) {
    const componentVariableNames = parameter.name.split('/');

    if (componentVariableNames[0] && componentVariableNames[1]) {
      try {
        interactiveModel.addChange(
          componentVariableNames[0],
          componentVariableNames[1],
          String(parser.evaluate(parameter.value))
        );
      } catch (error: unknown) {
        interactiveInstanceIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while applying parameter change for ${parameter.name} (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  }

  if (interactiveInstanceIssues.value.length) {
    interactiveInstanceIssues.value.push(informationIssue);

    return;
  }

  // Reset our interactive margins.

  onResetMargins();

  // Run the instance and update the plots.

  interactiveInstance.run();

  if (interactiveInstance.hasIssues()) {
    interactiveInstanceIssues.value = interactiveInstance.issues();

    return;
  }

  // Configure our parser to have the simulation data as variables, so that the plot expressions can refer to them.

  for (const data of interactiveUiJson.value.output.data) {
    const info = interactiveIdToInfo[data.id];

    if (info && interactiveInstanceTask) {
      parser.set(
        data.id,
        containsMultiplicationsOrDivisions.value
          ? Array.from(locCommon.simulationData(interactiveInstanceTask, info))
          : locCommon.simulationData(interactiveInstanceTask, info)
      );
    } else {
      parser.set(data.id, []);
    }
  }

  // Evaluate the plot expressions to get the data to display.

  const parserEvaluate = containsMultiplicationsOrDivisions.value
    ? (expression: string): Float64Array => {
        let normalisedExpression = normalisedExpressionCache.get(expression);

        if (!normalisedExpression) {
          normalisedExpression = expression
            .replace(NON_ELEMENTWISE_MULTIPLY_REGEX, '.*')
            .replace(NON_ELEMENTWISE_DIVIDE_REGEX, './');
          // Note: we replace `*` and `/` (but not `.*` and `./`) with `.*` and `./`, respectively, to ensure
          //       element-wise operations.

          normalisedExpressionCache.set(expression, normalisedExpression);
        }

        return Float64Array.from(parser.evaluate(normalisedExpression));
      }
    : (expression: string): Float64Array => {
        return parser.evaluate(expression);
      };

  try {
    const newInteractiveData: IGraphPanelData[] = [];

    for (const plot of interactiveUiJson.value.output.plots) {
      const traces: IGraphPanelPlotTrace[] = [
        {
          name: traceName(plot.name, plot.xValue, plot.yValue),
          xValue: plot.xValue,
          x: parserEvaluate(plot.xValue),
          yValue: plot.yValue,
          y: parserEvaluate(plot.yValue),
          color: colors.DEFAULT_COLOR
        }
      ];

      for (const additionalTrace of plot.additionalTraces ?? []) {
        traces.push({
          name: traceName(additionalTrace.name, additionalTrace.xValue, additionalTrace.yValue),
          xValue: additionalTrace.xValue,
          x: parserEvaluate(additionalTrace.xValue),
          yValue: additionalTrace.yValue,
          y: parserEvaluate(additionalTrace.yValue),
          color: colors.DEFAULT_COLOR
        });
      }

      newInteractiveData.push({
        xAxisTitle: plot.xAxisTitle,
        yAxisTitle: plot.yAxisTitle,
        traces
      });
    }

    interactiveLiveData.value = newInteractiveData;
  } catch (error: unknown) {
    interactiveInstanceIssues.value = [
      {
        type: locApi.EIssueType.ERROR,
        description: `An error occurred while evaluating the plot expressions (${common.formatMessage(common.formatError(error), false)}).`
      },
      informationIssue
    ];
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

  for (let index = 0; index < interactiveUiJson.value.input.length; ++index) {
    const input = interactiveUiJson.value.input[index];

    if (!input) {
      continue;
    }

    const interactiveInputValue = interactiveInputValues.value[index];

    if (interactiveInputValue !== undefined) {
      inputParameters[input.id] = interactiveInputValue;
    }
  }

  // Compute the tooltip for this run, keeping in mind that some simulation inputs may not be visible.

  const tooltipRows: string[] = [];

  for (let index = 0; index < interactiveUiJson.value.input.length; ++index) {
    if (!interactiveShowInput.value[index]) {
      continue;
    }

    const input = interactiveUiJson.value.input[index];

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

  interactiveUiJsonIssues.value = locApi.validateUiJson(settings.interactive.uiJson);

  if (interactiveUiJsonIssues.value.length > 0) {
    return;
  }

  // Reinstantiate our instance in case we modified CVODE's maximum step.

  if (interactiveCvode.maximumStep() !== oldCvodeMaximumStep) {
    interactiveInstance = interactiveDocument.instantiate(); // So that we can run the simulation again.
    interactiveInstanceTask = interactiveInstance.task(0); // So that we can retrieve our "new" simulation results.
  }

  // Update our input properties.

  populateInputProperties(settings.interactive.uiJson);

  // Update the interactive simulation with the new UI JSON settings.

  updateInteractiveSimulation();

  // Resize our graph panels if the number of plots has changed.

  if (interactiveUiJson.value.output.plots.length !== oldNbOfGraphPanelWidgets) {
    interactiveGraphPanelRefs.value = {};

    vue.nextTick().then(() => {
      for (let i = 0; i < settings.interactive.uiJson.output.plots.length; ++i) {
        const graphPanelRef = interactiveGraphPanelRefs.value[i];

        if (graphPanelRef) {
          graphPanelRef.resize();
        }
      }
    });
  }
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
