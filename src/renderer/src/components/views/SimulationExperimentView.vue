<template>
  <div class="h-full flex flex-col">
    <Toolbar v-if="toolbarNeeded" :id="toolbarId" class="p-1! shrink-0">
      <template #start>
        <div :class="{ 'invisible': interactiveModeEnabled && interactiveLiveUpdatesEnabled }">
          <Button class="p-1!" icon="pi pi-play-circle" severity="secondary" text @click="onRun()" />
        </div>
      </template>
      <template #center>
        <div v-show="interactiveModeAvailable">
          <ToggleButton size="small" v-model="interactiveModeEnabled" onLabel="Interactive mode" offLabel="Standard mode" />
        </div>
      </template>
      <template #end>
        <div :class="{ 'invisible': !interactiveModeAvailable || !interactiveModeEnabled }" class="flex">
          <Button class="p-1!" icon="pi pi-cog" severity="secondary" text @click="settingsMenu.toggle($event)" />
          <Popover ref="settingsMenu">
            <div class="flex items-center gap-2 px-1 py-1">
              <Checkbox :inputId="liveUpdatesCheckboxId" v-model="interactiveLiveUpdatesEnabled" binary size="small" @change="onLiveUpdatesChange()" />
              <label :for="liveUpdatesCheckboxId" class="text-sm select-none">Live updates</label>
            </div>
          </Popover>
        </div>
      </template>
    </Toolbar>
    <div v-show="!interactiveModeEnabled" class="grow min-h-0">
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
    <div v-if="interactiveModeAvailable" class="grow min-h-0">
      <div v-show="interactiveModeEnabled" class="flex h-full">
        <IssuesView v-if="interactiveUiJsonIssues.length" class="grow h-full" :issues="interactiveUiJsonIssues" />
        <div v-else class="flex grow min-h-0">
          <div class="ml-4 mr-4 mb-4">
            <ScrollPanel class="h-full">
              <Fieldset legend="Input parameters">
                <InputWidget
                  v-for="(input, index) in uiJson.input"
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
                      label="Add run"
                      size="small"
                      @click="onAddRun()"
                    />
                    <Button class="w-9!"
                      icon="pi pi-refresh"
                      size="small"
                      severity="danger"
                      title="Remove all runs"
                      @click="onRemoveAllRuns()"
                      :disabled="interactiveRuns.length === 1"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <div v-for="(run, index) in interactiveRuns"
                      :key="`run_${index}`"
                      class="run border border-dashed rounded pl-2 pr-1.5 py-1"
                    >
                      <div class="flex items-center">
                        <div class="grow text-sm"
                          :class="{ 'cursor-help': !run.isLiveRun }"
                          v-tippy:bottom="!run.isLiveRun ? {
                            allowHTML: true,
                            content: run.tooltip,
                            placement: 'bottom'
                          } : undefined"
                        >
                          {{ run.isLiveRun ? 'Live run' : `Run #${index}` }}
                        </div>
                        <div>
                          <Button class="p-0! w-5! h-5!"
                            icon="pi pi-wave-pulse"
                            :style="{ color: run.color }"
                            text size="small"
                            :title="`Change ${run.isLiveRun ? 'live run' : 'run'} colour`"
                            @click="onToggleRunColorPopover(index, $event)"
                          />
                          <Popover :ref="(element) => interactiveRunColorPopoverRefs[index] = element as unknown as IPopover | undefined"
                            v-if="interactiveRunColorPopoverIndex === index"
                          >
                            <div class="flex gap-2">
                              <button class="cursor-pointer w-6 h-6 rounded"
                                v-for="color in GraphPanelWidgetPalette" :key="color"
                                :style="{ backgroundColor: color }"
                                :class="{ 'selected-color': color === run.color }"
                                @click="onRunColorChange(index, color)"
                              >
                              </button>
                            </div>
                          </Popover>
                        </div>
                        <Button class="p-0! w-5! h-5!"
                          :icon="run.visible ? 'pi pi-eye' : 'pi pi-eye-slash'"
                          :severity="run.visible ? 'info' : 'secondary'"
                          text size="small"
                          :title="`${run.visible ? 'Hide' : 'Show'} ${run.isLiveRun ? 'live run' : 'run'}`"
                          @click="onToggleRun(index)"
                        />
                        <Button v-if="!run.isLiveRun" class="p-0! w-5! h-5!"
                          icon="pi pi-trash"
                          severity="danger"
                          text size="small"
                          title="Remove run"
                          @click="onRemoveRun(index)"
                        />
                        <div v-else class="w-5 h-5"></div>
                      </div>
                    </div>
                    <div v-if="interactiveRuns.length === 1" class="hint text-center text-xs">
                      There are no (additional) runs.<br/>
                      Click "Add run" to add one.
                    </div>
                  </div>
                </div>
              </Fieldset>
            </ScrollPanel>
          </div>
          <div class="flex flex-col grow gap-2 h-full min-h-0">
            <IssuesView v-show="interactiveInstanceIssues.length" class="h-full" :leftMargin="false" :issues="interactiveInstanceIssues" />
            <GraphPanelWidget v-show="!interactiveInstanceIssues.length"
              v-for="(_plot, index) in uiJson.output.plots"
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
  </div>
</template>

<script setup lang="ts">
import * as mathjs from 'https://cdn.jsdelivr.net/npm/mathjs@15.1.0/+esm';

import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../../common/common.ts';
import * as locCommon from '../../common/locCommon.ts';
import * as locApi from '../../libopencor/locApi.ts';
import * as locSedApi from '../../libopencor/locSedApi.ts';

import type { IGraphPanelData, IGraphPanelPlotTrace, IGraphPanelMargins } from '../widgets/GraphPanelWidget.vue';
import { DefaultGraphPanelWidgetColor, GraphPanelWidgetPalette } from '../widgets/GraphPanelWidgetPalette.ts';

interface ISimulationRun {
  inputParameters: Record<string, number>;
  visible: boolean;
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

const toolbarNeeded = vue.computed(() => {
  return (
    !interactiveUiJsonIssues.value.length &&
    !interactiveInstanceIssues.value.length &&
    ((props.simulationOnly && !props.uiJson) || !props.simulationOnly)
  );
});

const toolbarId = vue.ref('simulationExperimentViewToolbar');
const editorId = vue.ref('simulationExperimentViewEditor');
const liveUpdatesCheckboxId = vue.ref('simulationExperimentViewLiveUpdatesCheckbox');
const interactiveModeAvailable = vue.ref<boolean>(!!props.uiJson);
const interactiveModeEnabled = vue.ref<boolean>(!!props.uiJson);
const interactiveLiveUpdatesEnabled = vue.ref<boolean>(true);
const settingsMenu = vue.ref();

function populateParameters(parameters: vue.Ref<string[]>, instanceTask: locSedApi.SedInstanceTask): void {
  function addParameter(param: string): void {
    parameters.value.push(param);
  }

  addParameter(instanceTask.voiName());

  for (let i = 0; i < instanceTask.stateCount(); i++) {
    addParameter(instanceTask.stateName(i));
  }

  for (let i = 0; i < instanceTask.rateCount(); i++) {
    addParameter(instanceTask.rateName(i));
  }

  for (let i = 0; i < instanceTask.constantCount(); i++) {
    addParameter(instanceTask.constantName(i));
  }

  for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
    addParameter(instanceTask.computedConstantName(i));
  }

  for (let i = 0; i < instanceTask.algebraicVariableCount(); i++) {
    addParameter(instanceTask.algebraicVariableName(i));
  }

  // Sort the parameters alphabetically.

  parameters.value.sort((parameter1: string, parameter2: string) => parameter1.localeCompare(parameter2));
}

// Event handlers.

function onRun(): void {
  // Run either the standard or interactive simulation.

  if (!interactiveModeEnabled.value) {
    // Run the standard simulation, i.e. run the instance, output the simulation time to the console, and update the
    // plot.

    const simulationTime = standardInstance.run();

    standardConsoleContents.value += `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`;

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
}

function onLiveUpdatesChange(): void {
  if (interactiveLiveUpdatesEnabled.value) {
    updateInteractiveSimulation();
  }
}

// Standard mode.

const standardDocument = props.file.document();
const standardUniformTimeCourse = standardDocument.simulation(0) as locApi.SedSimulationUniformTimeCourse;
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
const standardConsoleContents = vue.ref<string>(`<b>${props.file.path()}</b>`);

populateParameters(standardParameters, standardInstanceTask);

function traceName(name: string | undefined, xValue: string, yValue: string): string {
  return name ?? `${yValue} <i>vs.</i> ${xValue}`;
}

const xInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardXParameter.value));
const yInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardYParameter.value));

function updatePlot() {
  standardData.value = {
    xAxisTitle: standardXParameter.value,
    yAxisTitle: standardYParameter.value,
    traces: [
      {
        name: traceName(undefined, standardXParameter.value, standardYParameter.value),
        x: locCommon.simulationData(standardInstanceTask, xInfo.value),
        y: locCommon.simulationData(standardInstanceTask, yInfo.value),
        color: DefaultGraphPanelWidgetColor
      }
    ]
  };
}

// Interactive mode.

interface IPopover {
  toggle: (event: MouseEvent) => void;
  hide: () => void;
}

const interactiveDocument = props.file.document();
const interactiveInstance = interactiveDocument.instantiate();
const interactiveInstanceTask = interactiveInstance.task(0);
const interactiveMath = mathjs.create(mathjs.all ?? {}, {});
const interactiveModel = interactiveDocument.model(0);
const interactiveData = vue.ref<IGraphPanelData[]>([]);
let interactiveMargins: Record<string, IGraphPanelMargins> = {};
const interactiveCompMargins = vue.ref<IGraphPanelMargins>();
const interactiveUiJsonIssues = vue.ref<locApi.IIssue[]>(
  interactiveModeAvailable.value ? locApi.uiJsonIssues(props.uiJson) : []
);
const interactiveInstanceIssues = vue.ref<locApi.IIssue[]>([]);
const interactiveInputValues = vue.ref<number[]>(
  interactiveModeAvailable.value ? props.uiJson.input.map((input: locApi.IUiJsonInput) => input.defaultValue) : []
);
const interactiveShowInput = vue.ref<string[]>(
  interactiveModeAvailable.value ? props.uiJson.input.map((input: locApi.IUiJsonInput) => input.visible ?? 'true') : []
);
const interactiveIdToInfo: Record<string, locCommon.ISimulationDataInfo> = {};
const interactiveRuns = vue.ref<ISimulationRun[]>([
  {
    inputParameters: {},
    visible: true,
    data: [],
    color: DefaultGraphPanelWidgetColor,
    tooltip: '',
    isLiveRun: true
  }
]);
const interactiveRunColorPopoverIndex = vue.ref<number>(-1);
const interactiveRunColorPopoverRefs = vue.ref<Record<number, IPopover | undefined>>({});
const interactiveCompData = vue.computed(() => {
  // Combine the live data with the data from the additional runs.

  const res: IGraphPanelData[] = [];

  for (
    let interactiveDataIndex = 0;
    interactiveDataIndex < (interactiveData.value.length || 0);
    ++interactiveDataIndex
  ) {
    const traces: IGraphPanelPlotTrace[] = [];

    interactiveRuns.value.forEach((interactiveRun: ISimulationRun, runIndex: number) => {
      if (!interactiveRun.visible) {
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
            GraphPanelWidgetPalette[
              (GraphPanelWidgetPalette.indexOf(interactiveRun.color) + traceIndex) % GraphPanelWidgetPalette.length
            ] ?? DefaultGraphPanelWidgetColor,
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

// Map data IDs to simulation data info.

if (interactiveModeAvailable.value) {
  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    interactiveIdToInfo[data.id] = locCommon.simulationDataInfo(interactiveInstanceTask, data.name);
  });
}

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

function evaluateValue(value: string): mathjs.MathType {
  const parser = interactiveMath.parser();
  let index = -1;

  props.uiJson.input.forEach((input: locApi.IUiJsonInput) => {
    parser.set(input.id, interactiveInputValues.value[++index]);
  });

  return parser.evaluate(value);
}

function updateInteractiveSimulation(forceUpdate: boolean = false): void {
  // Make sure that there are no issues with the UI JSON and that live updates are enabled (unless forced).

  if (interactiveUiJsonIssues.value.length || (!interactiveLiveUpdatesEnabled.value && !forceUpdate)) {
    return;
  }

  // Show/hide the input widgets.

  props.uiJson.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    interactiveShowInput.value[index] = evaluateValue(input.visible ?? 'true');
  });

  // Update the SED-ML document.

  interactiveModel.removeAllChanges();

  props.uiJson.parameters.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/');

    if (componentVariableNames[0] && componentVariableNames[1]) {
      interactiveModel.addChange(
        componentVariableNames[0],
        componentVariableNames[1],
        String(evaluateValue(parameter.value))
      );
    }
  });

  // Reset our interactive margins.

  onResetMargins();

  // Run the instance and update the plots.

  interactiveInstance.run();

  if (interactiveInstance.hasIssues()) {
    interactiveInstanceIssues.value = interactiveInstance.issues();

    return;
  } else {
    interactiveInstanceIssues.value = [];
  }

  const parser = interactiveMath.parser();

  props.uiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    const info = interactiveIdToInfo[data.id];

    if (info) {
      parser.set(data.id, locCommon.simulationData(interactiveInstanceTask, info));
    } else {
      parser.set(data.id, []);
    }
  });

  interactiveData.value = props.uiJson.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
    const traces: IGraphPanelPlotTrace[] = [
      {
        name: traceName(plot.name, plot.xValue, plot.yValue),
        x: parser.evaluate(plot.xValue),
        y: parser.evaluate(plot.yValue),
        color: DefaultGraphPanelWidgetColor
      }
    ];

    plot.additionalTraces?.forEach((additionalTrace: locApi.IUiJsonOutputPlotAdditionalTrace) => {
      traces.push({
        name: traceName(additionalTrace.name, additionalTrace.xValue, additionalTrace.yValue),
        x: parser.evaluate(additionalTrace.xValue),
        y: parser.evaluate(additionalTrace.yValue),
        color: DefaultGraphPanelWidgetColor
      });
    });

    return {
      xAxisTitle: plot.xAxisTitle,
      yAxisTitle: plot.yAxisTitle,
      traces
    };
  });
}

// Interactive mode's margins-related event handlers.

function onMarginsUpdated(plotId: string, newMargins: IGraphPanelMargins): void {
  interactiveMargins[plotId] = newMargins;

  const margins = Object.values(interactiveMargins);

  if (margins.length !== props.uiJson.output.plots.length) {
    interactiveCompMargins.value = undefined;

    return;
  }

  interactiveCompMargins.value = {
    left: Math.max(...margins.map((margin) => margin.left)),
    right: Math.max(...margins.map((margin) => margin.right))
  };
}

function onResetMargins() {
  interactiveMargins = {};
  interactiveCompMargins.value = undefined;
}

// Interactive mode's runs-related event handlers

function onAddRun(): void {
  // Create a new run from the live run.

  const inputParameters: Record<string, number> = {};

  props.uiJson.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    const interactiveInputValue = interactiveInputValues.value[index];

    if (interactiveInputValue) {
      inputParameters[input.id] = interactiveInputValue;
    }
  });

  // Compute the tooltip for this run, keeping in mind that some input parameters may not be visible.

  const rows = props.uiJson.input
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

      return `
<tr>
  <td>
    <b>${input.name}:</b>
  </td>
  <td style="padding-left: 8px;">
    ${inputValue}
  </td>
</tr>
`;
    })
    .join('');
  const tooltip = `
<table>
  <tbody>
    ${rows}
  </tbody>
</table>
`;

  // Determine the colour (of the first trace) by using the next unused colour in the palette unless all the colours
  // have already been used.

  const usedColors = new Set<string>(interactiveRuns.value.map((run) => run.color));
  const lastColor = interactiveRuns.value[interactiveRuns.value.length - 1]?.color ?? DefaultGraphPanelWidgetColor;
  const lastColorIndex = GraphPanelWidgetPalette.indexOf(lastColor);
  let color: string = DefaultGraphPanelWidgetColor;

  for (let i = 1; i <= GraphPanelWidgetPalette.length; ++i) {
    const newColor = GraphPanelWidgetPalette[(lastColorIndex + i) % GraphPanelWidgetPalette.length];

    if (newColor && (!usedColors.has(newColor) || usedColors.size === GraphPanelWidgetPalette.length)) {
      color = newColor;

      break;
    }
  }

  // Add the new run.

  interactiveRuns.value.push({
    inputParameters,
    visible: true,
    data: interactiveData.value,
    color,
    tooltip,
    isLiveRun: false
  });
}

function onRemoveRun(index: number): void {
  // Remove the given run.

  interactiveRuns.value.splice(index, 1);
}

function onRemoveAllRuns(): void {
  // Remove all the runs except the live run.

  interactiveRuns.value.splice(1);
}

function onToggleRun(index: number): void {
  // Toggle the visibility of the given run.

  const interactiveRun = interactiveRuns.value[index];

  if (interactiveRun) {
    interactiveRun.visible = !interactiveRun.visible;
  }
}

function onRunColorChange(index: number, color: string) {
  const interactiveRun = interactiveRuns.value[index];

  if (interactiveRun) {
    interactiveRun.color = color;
  }
}

function onToggleRunColorPopover(index: number, event: MouseEvent) {
  // Note: interactiveRunColorPopoverIndex is only used to ensure that the active popover gets properly hidden when the
  //       window loses focus as a result of switching tabs (see onMounted below).

  interactiveRunColorPopoverIndex.value = index;

  vue.nextTick(() => {
    // Note: we do this in a next tick to ensure that the reference is available.

    interactiveRunColorPopoverRefs.value[index]?.toggle(event);
  });
}

// "Initialise" our standard and/or interactive modes.

vue.onMounted(() => {
  updatePlot();

  if (interactiveModeAvailable.value) {
    updateInteractiveSimulation();
  }
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
.hint {
  color: var(--p-text-muted-color);
}

.invisible {
  visibility: hidden;
}

:deep(.p-button-icon) {
  font-size: 1.5rem;
}

:deep(.p-button-icon-only) {
  width: 2rem;
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

.p-toolbar {
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--p-content-border-color);
}

:deep(.ql-editor) {
  padding: 0.25rem 0.5rem;
}

:deep(.ql-editor > *) {
  cursor: default;
}

.run {
  border-color: var(--p-content-border-color);
}

.selected-color {
  outline: 3px solid var(--p-text-color);
}
</style>
