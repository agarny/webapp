<template>
  <div class="h-full flex flex-col">
    <Toolbar v-if="toolbarNeeded" :id="toolbarId" class="p-1! shrink-0">
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
      <template #center>
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
                <SimulationPropertyEditor :uniformTimeCourse="standardUniformTimeCourse" :instanceTask="standardInstanceTask" />
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
          <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="standardConsoleContents" />
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
                          <Popover :ref="(element: any) => interactiveRunColorPopovers[index] = element as unknown as IPopover ?? undefined"
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
              :ref="(element: any) => interactiveGraphPanels[index] = element as unknown as InstanceType<typeof GraphPanelWidget> ?? undefined"
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
      :voiUnit="interactiveInstanceTask.voiUnit()"
      :allModelParameters="interactiveAllModelParameters"
      :editableModelParameters="interactiveEditableModelParameters"
      @ok="onInteractiveSettingsOk"
      @close="interactiveSettingsVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import * as mathjs from 'https://cdn.jsdelivr.net/npm/mathjs@15.1.0/+esm';

import * as vueusecore from '@vueuse/core';

import JSZip from 'jszip';
import * as vue from 'vue';

import * as colors from '../../common/colors.ts';
import * as common from '../../common/common.ts';
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
const emit = defineEmits<(event: 'error', message: string) => void>();

const toolbarNeeded = vue.computed(() => {
  return (props.simulationOnly && !interactiveUiJson) || !props.simulationOnly;
});

const toolbarId = vue.ref('simulationExperimentViewToolbar');
const editorId = vue.ref('simulationExperimentViewEditor');
const liveUpdatesCheckboxId = vue.ref('simulationExperimentViewLiveUpdatesCheckbox');

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

    void vue.nextTick(() => {
      const consoleElement = document.getElementById(editorId.value)?.getElementsByClassName('ql-editor')[0];

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

  const zip = new JSZip();
  const baseFileName = common.fileName(interactiveFile.path()).replace(/\.[^/.]+$/, '');
  const modelFile = interactiveModel.file();

  if (!modelFile) {
    emit('error', 'Cannot create COMBINE archive: no model file available.');

    return;
  }

  zip.file(
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
  zip.file('model.cellml', modelFile.contents());
  zip.file('document.sedml', interactiveDocument.serialise().replace(modelFile.path(), 'model.cellml'));
  zip.file('simulation.json', JSON.stringify(interactiveUiJson.value, null, 2));

  zip
    .generateAsync({
      type: 'blob',
      compression: 'DEFLATE'
    })
    .then((content) => {
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
    interactiveIdToInfo[data.id] = locCommon.simulationDataInfo(interactiveInstanceTask, data.name);
  });
};

// Standard mode.

const standardFile = props.file;
const standardDocument = standardFile.document();
const standardUniformTimeCourse = standardDocument.simulation(0) as locApi.SedUniformTimeCourse;
const standardInstance = standardDocument.instantiate();
const standardInstanceTask = standardInstance.task(0);
const standardParameters = vue.ref<string[]>([]);
const standardXParameter = vue.ref(standardInstanceTask.voiName());
const standardYParameter = vue.ref(standardInstanceTask.stateName(0));
const standardData = vue.ref<IGraphPanelData>({
  xAxisTitle: undefined,
  yAxisTitle: undefined,
  traces: []
});
const standardConsoleContents = vue.ref<string>(`<b>${standardFile.path()}</b>`);

populateParameters(standardParameters, standardInstanceTask);

const traceName = (name: string | undefined, xValue: string, yValue: string): string => {
  return name ?? `${yValue} <i>vs.</i> ${xValue}`;
};

const xInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardXParameter.value));
const yInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardYParameter.value));

const updatePlot = () => {
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

interface IPopover {
  toggle: (event: MouseEvent) => void;
  hide: () => void;
}

const interactiveModeEnabled = vue.ref<boolean>(!!props.uiJson);
const interactiveLiveUpdatesEnabled = vue.ref<boolean>(true);
const interactiveSettingsVisible = vue.ref<boolean>(false);
const interactiveFile = props.file;
const interactiveDocument = interactiveFile.document();
const interactiveUniformTimeCourse = interactiveDocument.simulation(0) as locApi.SedUniformTimeCourse;
const interactiveCvode = interactiveUniformTimeCourse.cvode();
let interactiveInstance = interactiveDocument.instantiate();
let interactiveInstanceTask = interactiveInstance.task(0);
const interactiveAllModelParameters = vue.ref<string[]>([]);
const interactiveEditableModelParameters = vue.ref<string[]>([]);
const interactiveVoiName = vue.ref(interactiveInstanceTask.voiName());
const interactiveVoiId = vue.ref(interactiveVoiName.value.split('/')[1]);
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
const interactiveUiJsonEmpty = vue.computed(() => {
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

      return data.id === interactiveVoiId.value && data.name === interactiveVoiName.value;
    }
  }

  return false;
});
const interactiveMath = mathjs.create(mathjs.all ?? {}, {});
const interactiveModel = interactiveDocument.model(0);
const interactiveData = vue.ref<IGraphPanelData[]>([]);
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
const interactiveRunColorPopovers = vue.ref<Record<number, IPopover | undefined>>({});
const interactiveGraphPanels = vue.ref<Record<number, InstanceType<typeof GraphPanelWidget> | undefined>>({});
const interactiveCompData = vue.computed(() => {
  // Combine the live data with the data from the tracked runs.

  const res: IGraphPanelData[] = [];

  for (
    let interactiveDataIndex = 0;
    interactiveDataIndex < (interactiveData.value.length || 0);
    ++interactiveDataIndex
  ) {
    const traces: IGraphPanelPlotTrace[] = [];

    interactiveRuns.value.forEach((interactiveRun: ISimulationRun, runIndex: number) => {
      if (!interactiveRun.isVisible) {
        return;
      }

      const data = interactiveRun.isLiveRun
        ? interactiveData.value[interactiveDataIndex]
        : interactiveRun.data[interactiveDataIndex];
      const runTraces = (data?.traces ?? []).map((trace, traceIndex) => {
        return {
          ...trace,
          name:
            trace.name +
            (interactiveRuns.value.length === 1 ? '' : interactiveRun.isLiveRun ? ' [Live]' : ` [#${runIndex}]`),
          color:
            colors.PALETTE_COLORS[
              (colors.PALETTE_COLORS.indexOf(interactiveRun.color) + traceIndex) % colors.PALETTE_COLORS.length
            ] ?? colors.DEFAULT_COLOR,
          zorder: interactiveRun.isLiveRun ? 1 : undefined
        };
      });

      traces.push(...runTraces);
    });

    res.push({
      xAxisTitle: interactiveData.value[interactiveDataIndex]?.xAxisTitle,
      yAxisTitle: interactiveData.value[interactiveDataIndex]?.yAxisTitle,
      traces: traces
    });
  }

  return res;
});
const interactiveSettings = vue.computed(() => ({
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

// Populate our model parameters.

populateParameters(interactiveAllModelParameters, interactiveInstanceTask);
populateParameters(interactiveEditableModelParameters, interactiveInstanceTask, true);

// Populate our input properties.

populateInputProperties(interactiveUiJson.value);

// Import some element-wise functions to allow sin(array) instead of map(array, sin), for instance.

interactiveMath.import(
  {
    // Arithmetic operators.

    pow: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number) => v ** y),
    sqrt: (x: mathjs.MathType) => x.map((v: number) => Math.sqrt(v)),
    abs: (x: mathjs.MathType) => x.map((v: number) => Math.abs(v)),
    exp: (x: mathjs.MathType) => x.map((v: number) => Math.exp(v)),
    log: (x: mathjs.MathType) => x.map((v: number) => Math.log(v)),
    log10: (x: mathjs.MathType) => x.map((v: number) => Math.log10(v)),
    ceil: (x: mathjs.MathType) => x.map((v: number) => Math.ceil(v)),
    floor: (x: mathjs.MathType) => x.map((v: number) => Math.floor(v)),
    min: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number, index: number) => Math.min(v, y[index])),
    max: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number, index: number) => Math.max(v, y[index])),
    mod: (x: mathjs.MathType, y: mathjs.MathType) => x.map((v: number) => v % y),

    // // Trigonometric operators.

    sin: (x: mathjs.MathType) => x.map((v: number) => Math.sin(v)),
    cos: (x: mathjs.MathType) => x.map((v: number) => Math.cos(v)),
    tan: (x: mathjs.MathType) => x.map((v: number) => Math.tan(v)),
    sinh: (x: mathjs.MathType) => x.map((v: number) => Math.sinh(v)),
    cosh: (x: mathjs.MathType) => x.map((v: number) => Math.cosh(v)),
    tanh: (x: mathjs.MathType) => x.map((v: number) => Math.tanh(v)),
    asin: (x: mathjs.MathType) => x.map((v: number) => Math.asin(v)),
    acos: (x: mathjs.MathType) => x.map((v: number) => Math.acos(v)),
    atan: (x: mathjs.MathType) => x.map((v: number) => Math.atan(v)),
    asinh: (x: mathjs.MathType) => x.map((v: number) => Math.asinh(v)),
    acosh: (x: mathjs.MathType) => x.map((v: number) => Math.acosh(v)),
    atanh: (x: mathjs.MathType) => x.map((v: number) => Math.atanh(v))
  },
  { override: true }
);

const evaluateValue = (value: string): mathjs.MathType => {
  const parser = interactiveMath.parser();
  let index = -1;

  interactiveUiJson.value.input.forEach((input: locApi.IUiJsonInput) => {
    parser.set(input.id, interactiveInputValues.value[++index]);
  });

  return parser.evaluate(value);
};

const updateInteractiveSimulation = (forceUpdate: boolean = false): void => {
  // Make sure that there are no issues with the UI JSON and that live updates are enabled (unless forced).

  if (interactiveUiJsonIssues.value.length || (!interactiveLiveUpdatesEnabled.value && !forceUpdate)) {
    return;
  }

  // Show/hide the input widgets.

  interactiveUiJson.value.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    interactiveShowInput.value[index] = evaluateValue(input.visible ?? 'true');
  });

  // Update the SED-ML document.

  const informationIssue: locApi.IIssue = {
    type: locApi.EIssueType.INFORMATION,
    description:
      'Please check the <em>Interactive mode</em> settings (click on the <i class="pi pi-cog"></i> icon in the top-right corner) and try again.'
  };

  interactiveModel.removeAllChanges();
  interactiveInstanceIssues.value = [];

  interactiveUiJson.value.parameters.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/');

    if (componentVariableNames[0] && componentVariableNames[1]) {
      try {
        interactiveModel.addChange(
          componentVariableNames[0],
          componentVariableNames[1],
          String(evaluateValue(parameter.value))
        );
      } catch (error: unknown) {
        interactiveInstanceIssues.value.push({
          type: locApi.EIssueType.ERROR,
          description: `An error occurred while applying parameter change for ${parameter.name} (${common.formatMessage(common.formatError(error), false)}).`
        });
      }
    }
  });

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

  const parser = interactiveMath.parser();

  interactiveUiJson.value.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    const info = interactiveIdToInfo[data.id];

    if (info) {
      parser.set(data.id, locCommon.simulationData(interactiveInstanceTask, info));
    } else {
      parser.set(data.id, []);
    }
  });

  const parserEvaluate = (value: string): Float64Array => {
    // Note: we replace `*` and `/` (but not `.*` and `./`) with `.*` and `./`, respectively, to ensure element-wise
    //       operations.

    return parser.evaluate(value.replace(/(?<!\.)\*(?!\.)/g, '.*').replace(/(?<!\.)\/(?!\.)/g, './'));
  };

  try {
    interactiveData.value = interactiveUiJson.value.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
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

      plot.additionalTraces?.forEach((additionalTrace: locApi.IUiJsonOutputPlotAdditionalTrace) => {
        traces.push({
          name: traceName(additionalTrace.name, additionalTrace.xValue, additionalTrace.yValue),
          xValue: additionalTrace.xValue,
          x: parserEvaluate(additionalTrace.xValue),
          yValue: additionalTrace.yValue,
          y: parserEvaluate(additionalTrace.yValue),
          color: colors.DEFAULT_COLOR
        });
      });

      return {
        xAxisTitle: plot.xAxisTitle,
        yAxisTitle: plot.yAxisTitle,
        traces
      };
    });
  } catch (error: unknown) {
    interactiveInstanceIssues.value = [
      {
        type: locApi.EIssueType.ERROR,
        description: `An error occurred while evaluating the plot expressions (${common.formatMessage(common.formatError(error), false)}).`
      },
      informationIssue
    ];
  }
};

// Interactive mode's margins-related event handlers.

const onMarginsUpdated = (plotId: string, newMargins: IGraphPanelMargins): void => {
  interactiveMargins[plotId] = newMargins;

  const margins = Object.values(interactiveMargins);

  if (margins.length !== interactiveUiJson.value.output.plots.length) {
    interactiveCompMargins.value = undefined;

    return;
  }

  interactiveCompMargins.value = {
    left: Math.max(...margins.map((margin) => margin.left)),
    right: Math.max(...margins.map((margin) => margin.right))
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

  interactiveUiJson.value.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    const interactiveInputValue = interactiveInputValues.value[index];

    if (interactiveInputValue) {
      inputParameters[input.id] = interactiveInputValue;
    }
  });

  // Compute the tooltip for this run, keeping in mind that some simulation inputs may not be visible.

  const tooltipLines = interactiveUiJson.value.input
    .map((input, index) => ({
      input: input,
      visible: interactiveShowInput.value[index]
    }))
    .filter((input) => input.visible)
    .map(({ input }) => {
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

      return `<tr>
      <td>
        <b>${input.name}:</b>
      </td>
      <td style="padding-left: 8px;">
        ${inputValue}
      </td>
    </tr>`;
    })
    .join('');
  const tooltip = `<table>
  <tbody>
    ${tooltipLines}
  </tbody>
</table>`;

  // Determine the colour (of the first trace) by using the next unused colour in the palette unless all the colours
  // have already been used.

  const usedColors = new Set<string>(interactiveRuns.value.map((run) => run.color));
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
    data: interactiveData.value,
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

    interactiveRunColorPopovers.value[index]?.toggle(event);
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
    interactiveGraphPanels.value = {};

    vue.nextTick().then(() => {
      for (let i = 0; i < settings.interactive.uiJson.output.plots.length; ++i) {
        const graphPanelRef = interactiveGraphPanels.value[i];

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

// Various things that need to be done once we are is mounted.

const crtInstance = vue.getCurrentInstance();
const windowIsFocused = vueusecore.useWindowFocus();

vue.onMounted(() => {
  // Customise our IDs.

  toolbarId.value = `simulationExperimentViewToolbar${String(crtInstance?.uid)}`;
  editorId.value = `simulationExperimentViewEditor${String(crtInstance?.uid)}`;
  liveUpdatesCheckboxId.value = `simulationExperimentViewLiveUpdatesCheckbox${String(crtInstance?.uid)}`;

  // Make sure that our active popover gets hidden when the window loses focus.

  vue.watch(
    () => windowIsFocused.value,
    (isFocused) => {
      if (!isFocused) {
        if (interactiveRunColorPopoverIndex.value !== -1) {
          interactiveRunColorPopovers.value[interactiveRunColorPopoverIndex.value]?.hide();

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

    if (props.isActiveFile && !event.ctrlKey && !event.shiftKey && !event.metaKey && event.code === 'F9') {
      if (!interactiveModeEnabled.value || (interactiveModeEnabled.value && !interactiveLiveUpdatesEnabled.value)) {
        event.preventDefault();

        onRun();
      }
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

:deep(.ql-editor) {
  padding: 0.25rem 0.5rem;
}

:deep(.ql-editor > *) {
  cursor: default;
}

.toolbar-button:hover {
  background-color: var(--p-surface-hover) !important;
  transform: scale(1.15);
}
</style>
