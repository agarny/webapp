<template>
  <Toolbar :id="toolbarId" class="p-1!">
    <template #start>
      <Button :class="{ 'invisible': interactiveModeEnabled }" class="p-1!" icon="pi pi-play-circle" severity="secondary" text @click="onRun()" />
      <Button :class="{ 'invisible': interactiveModeEnabled }" class="p-1!" disabled icon="pi pi-stop-circle" severity="secondary" text />
    </template>
    <template #center>
      <div v-show="interactiveModeAvailable">
        <ToggleButton size="small" v-model="interactiveModeEnabled" onLabel="Interactive mode" offLabel="Standard mode" />
      </div>
    </template>
    <template #end>
      <Button class="p-1!" icon="pi pi-cog" severity="secondary" text @click="simulationSettingsVisible = true" />
    </template>
  </Toolbar>
  <div v-show="!interactiveModeEnabled"  :style="{ width: width + 'px', height: heightMinusToolbar + 'px' }">
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
            <GraphPanelWidget :plots="standardPlots" />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel v-if="!simulationOnly" :size="11">
        <Editor :id="editorId" class="border-none h-full" :readonly="true" v-model="standardConsoleContents" />
      </SplitterPanel>
    </Splitter>
  </div>
  <div v-if="interactiveModeAvailable">
    <div v-show="interactiveModeEnabled" class="flex" :style="{ width: width + 'px', height: heightMinusToolbar + 'px' }">
      <IssuesView v-if="interactiveUiJsonIssues.length !== 0" class="grow" :width="width" :height="heightMinusToolbar" :issues="interactiveUiJsonIssues" />
      <div v-else class="flex grow">
        <div class="ml-4 mr-4 mb-4">
          <ScrollPanel class="h-full">
            <Fieldset legend="Input parameters">
              <InputWidget
                v-for="(input, index) in uiJson.input"
                v-model="interactiveInputValues[index]!"
                v-show="interactiveShowInput[index]"
                :key="`input_${index}`"
                :name="input.name"
                :maximumValue="input.maximumValue"
                :minimumValue="input.minimumValue"
                :possibleValues="input.possibleValues"
                :stepValue="input.stepValue"
                :class="index !== 0 ? 'mt-6' : ''"
                @change="updateInteractiveSimulation"
              />
            </Fieldset>
          </ScrollPanel>
        </div>
        <div class="grow">
          <IssuesView v-show="interactiveInstanceIssues.length !== 0" :leftMargin="false" :width="width" :height="heightMinusToolbar" :issues="interactiveInstanceIssues" />
          <GraphPanelWidget v-show="interactiveInstanceIssues.length === 0"
            v-for="(_plot, index) in uiJson.output.plots"
            :key="`plot_${index}`"
            :style="{ height: `calc(100% / ${uiJson.output.plots.length})` }"
            :plots="interactivePlots[index] || []"
          />
        </div>
      </div>
    </div>
  </div>
  <SimulationSettingsDialog
    v-model:visible="simulationSettingsVisible"
    :uiJson="uiJson"
    :allParameters="interactiveAllParameters"
    :editableParameters="interactiveEditableParameters"
    @ok="onSimulationSettingsOk"
    @close="simulationSettingsVisible = false"
  />
</template>

<script setup lang="ts">
import * as mathjs from 'https://cdn.jsdelivr.net/npm/mathjs@15.1.0/+esm';

import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import * as common from '../../common/common';
import { SHORT_DELAY } from '../../common/constants';
import * as locCommon from '../../common/locCommon';
import * as vueCommon from '../../common/vueCommon';
import * as locApi from '../../libopencor/locApi';
import * as locSedApi from '../../libopencor/locSedApi';

import type { IGraphPanelPlot } from '../widgets/GraphPanelWidget.vue';

const props = defineProps<{
  file: locApi.File;
  height: number;
  isActive: boolean;
  isActiveFile: boolean;
  simulationOnly?: boolean;
  interactiveEnabled: boolean;
  uiJson: locApi.IUiJson;
  width: number;
}>();

const toolbarId = vue.ref('simulationExperimentViewToolbar');
const editorId = vue.ref('simulationExperimentViewEditor');
const heightMinusToolbar = vue.ref<number>(0);
const interactiveModeAvailable = vue.ref<boolean>(props.uiJson !== undefined);
const interactiveModeEnabled = vue.ref<boolean>(props.uiJson !== undefined);
const simulationSettingsVisible = vue.ref<boolean>(false);
const uiJson = vue.ref<locApi.IUiJson>(JSON.parse(JSON.stringify(props.uiJson)));

function populateParameters(
  parameters: vue.Ref<string[]>,
  instanceTask: locSedApi.SedInstanceTask,
  onlyEditableParameters: boolean = false
): void {
  function addParameter(param: string): void {
    parameters.value.push(param);
  }

  if (!onlyEditableParameters) {
    addParameter(instanceTask.voiName());
  }

  for (let i = 0; i < instanceTask.stateCount(); i++) {
    addParameter(instanceTask.stateName(i));
  }

  if (!onlyEditableParameters) {
    for (let i = 0; i < instanceTask.rateCount(); i++) {
      addParameter(instanceTask.rateName(i));
    }
  }

  for (let i = 0; i < instanceTask.constantCount(); i++) {
    addParameter(instanceTask.constantName(i));
  }

  if (!onlyEditableParameters) {
    for (let i = 0; i < instanceTask.computedConstantCount(); i++) {
      addParameter(instanceTask.computedConstantName(i));
    }

    for (let i = 0; i < instanceTask.algebraicCount(); i++) {
      addParameter(instanceTask.algebraicName(i));
    }
  }

  // Sort the parameters alphabetically.

  parameters.value.sort((parameter1: string, parameter2: string) => parameter1.localeCompare(parameter2));
}

function populateInputProperties(currentUiJson: locApi.IUiJson) {
  if (!interactiveModeAvailable.value) {
    interactiveInputValues.value = [];
    interactiveShowInput.value = [];

    Object.keys(interactiveIdToInfo).forEach((key) => {
      delete interactiveIdToInfo[key];
    });

    return;
  }

  interactiveInputValues.value = currentUiJson.input.map((input: locApi.IUiJsonInput) => input.defaultValue);
  interactiveShowInput.value = currentUiJson.input.map((input: locApi.IUiJsonInput) => input.visible ?? 'true');

  Object.keys(interactiveIdToInfo).forEach((key) => {
    delete interactiveIdToInfo[key];
  });

  currentUiJson.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    interactiveIdToInfo[data.id] = locCommon.simulationDataInfo(interactiveInstanceTask, data.name);
  });
}

// Standard mode.

const standardDocument = props.file.document();
const standardUniformTimeCourse = standardDocument.simulation(0) as locApi.SedSimulationUniformTimeCourse;
const standardInstance = standardDocument.instantiate();
const standardInstanceTask = standardInstance.task(0);
const standardParameters = vue.ref<string[]>([]);
const standardXParameter = vue.ref(standardInstanceTask.voiName());
const standardYParameter = vue.ref(standardInstanceTask.stateName(0));
const standardPlots = vue.ref<IGraphPanelPlot[]>([]);
const standardConsoleContents = vue.ref<string>(`<b>${props.file.path()}</b>`);

populateParameters(standardParameters, standardInstanceTask);

function onRun(): void {
  // Run the instance, output the simulation time to the console, and update the plot.

  const simulationTime = standardInstance.run();

  standardConsoleContents.value += `<br/>&nbsp;&nbsp;<b>Simulation time:</b> ${common.formatTime(simulationTime)}`;

  void vue.nextTick().then(() => {
    const consoleElement = document.getElementById(editorId.value)?.getElementsByClassName('ql-editor')[0];

    if (consoleElement !== undefined) {
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }
  });

  updatePlot();
}

const xInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardXParameter.value));
const yInfo = vue.computed(() => locCommon.simulationDataInfo(standardInstanceTask, standardYParameter.value));

function updatePlot() {
  standardPlots.value = [
    {
      x: {
        data: locCommon.simulationData(standardInstanceTask, xInfo.value)
      },
      y: {
        data: locCommon.simulationData(standardInstanceTask, yInfo.value)
      }
    }
  ];
}

// Interactive mode.

const interactiveDocument = props.file.document();
const interactiveInstance = interactiveDocument.instantiate();
const interactiveInstanceTask = interactiveInstance.task(0);
const interactiveAllParameters = vue.ref<string[]>([]);
const interactiveEditableParameters = vue.ref<string[]>([]);
const interactiveMath = mathjs.create(mathjs.all ?? {}, {});
const interactiveModel = interactiveDocument.model(0);
const interactivePlots = vue.ref<IGraphPanelPlot[][]>([]);
const interactiveUiJsonIssues = vue.ref<locApi.IIssue[]>(
  interactiveModeAvailable.value ? locApi.uiJsonIssues(props.uiJson) : []
);
const interactiveInstanceIssues = vue.ref<locApi.IIssue[]>([]);
const interactiveInputValues = vue.ref<number[]>([]);
const interactiveShowInput = vue.ref<string[]>([]);
const interactiveIdToInfo: Record<string, locCommon.ISimulationDataInfo> = {};

populateParameters(interactiveAllParameters, interactiveInstanceTask);
populateParameters(interactiveEditableParameters, interactiveInstanceTask, true);

populateInputProperties(props.uiJson);

interactiveMath.import(
  {
    // Import some element-wise functions to allow sin(array) instead of map(array, sin), for instance.

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

  uiJson.value.input.forEach((input: locApi.IUiJsonInput) => {
    parser.set(input.id, interactiveInputValues.value[++index]);
  });

  return parser.evaluate(value);
}

function updateInteractiveSimulation() {
  // Make sure that there are no issues.

  if (interactiveUiJsonIssues.value.length > 0) {
    return;
  }

  // Show/hide the input widgets.

  uiJson.value.input.forEach((input: locApi.IUiJsonInput, index: number) => {
    interactiveShowInput.value[index] = evaluateValue(input.visible ?? 'true');
  });

  // Update the SED-ML document.

  interactiveModel.removeAllChanges();

  uiJson.value.parameters.forEach((parameter: locApi.IUiJsonParameter) => {
    const componentVariableNames = parameter.name.split('/');

    interactiveModel.addChange(
      // @ts-expect-error (we trust that we have a valid component and variable name)
      componentVariableNames[0],
      componentVariableNames[1],
      String(evaluateValue(parameter.value))
    );
  });

  // Run the instance and update the plots.

  interactiveInstance.run();

  if (interactiveInstance.hasIssues()) {
    interactiveInstanceIssues.value = interactiveInstance.issues();

    return;
  } else {
    interactiveInstanceIssues.value = [];
  }

  const parser = interactiveMath.parser();

  uiJson.value.output.data.forEach((data: locApi.IUiJsonOutputData) => {
    // @ts-expect-error (we trust that we have some valid information)
    parser.set(data.id, locCommon.simulationData(interactiveInstanceTask, interactiveIdToInfo[data.id]));
  });

  interactivePlots.value = uiJson.value.output.plots.map((plot: locApi.IUiJsonOutputPlot) => {
    // Note: we replace `*` and `/` (but not `.*` and `./`) with `.*` and `./`, respectively, to ensure element-wise
    //       operations.

    return [
      {
        x: { data: parser.evaluate(plot.xValue.replace(/(?<!\.)\*(?!\.)/g, '.*').replace(/(?<!\.)\/(?!\.)/g, './')) },
        y: { data: parser.evaluate(plot.yValue.replace(/(?<!\.)\*(?!\.)/g, '.*').replace(/(?<!\.)\/(?!\.)/g, './')) }
      }
    ];
  });
}

function onSimulationSettingsOk(newUiJson: locApi.IUiJson) {
  // Update our UI JSON settings and hide the dialog.

  uiJson.value = newUiJson;
  simulationSettingsVisible.value = false;

  // Validate the new UI JSON settings.

  interactiveUiJsonIssues.value = locApi.uiJsonIssues(newUiJson);

  if (interactiveUiJsonIssues.value.length > 0) {
    return;
  }

  // Update our input properties.

  populateInputProperties(newUiJson);

  // Update the interactive simulation with the new UI JSON settings.

  void vue.nextTick().then(() => {
    updateInteractiveSimulation();
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

vue.onMounted(() => {
  // Customise our IDs.

  toolbarId.value = `simulationExperimentViewToolbar${String(crtInstance?.uid)}`;
  editorId.value = `simulationExperimentViewEditor${String(crtInstance?.uid)}`;

  // Track the height of our toolbar.

  let toolbarResizeObserver: ResizeObserver | undefined;

  setTimeout(() => {
    toolbarResizeObserver = vueCommon.trackElementHeight(toolbarId.value);
  }, SHORT_DELAY);

  // Monitor "our" contents size.

  function resizeOurselves() {
    heightMinusToolbar.value = props.height - vueCommon.trackedCssVariableValue(toolbarId.value);
  }

  vue.watch(
    () => props.height,
    () => {
      resizeOurselves();
    }
  );

  let oldToolbarHeight = vueCommon.trackedCssVariableValue(toolbarId.value);

  const mutationObserver = new MutationObserver(() => {
    const newToolbarHeight = vueCommon.trackedCssVariableValue(toolbarId.value);

    if (newToolbarHeight !== oldToolbarHeight) {
      oldToolbarHeight = newToolbarHeight;

      resizeOurselves();
    }
  });

  mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  vue.onUnmounted(() => {
    mutationObserver.disconnect();

    toolbarResizeObserver?.disconnect();
  });
});

// Keyboard shortcuts.

if (common.isDesktop()) {
  vueusecore.onKeyStroke((event: KeyboardEvent) => {
    if (!props.isActive || !props.interactiveEnabled) {
      return;
    }

    if (props.isActiveFile && !event.ctrlKey && !event.shiftKey && !event.metaKey && event.code === 'F9') {
      if (!interactiveModeEnabled.value) {
        event.preventDefault();

        onRun();
      }
    }
  });
}
</script>

<style scoped>
:deep(.p-button-icon) {
  font-size: 1.5rem;
}

:deep(.p-button-icon-only) {
  width: 2rem;
}

:deep(.p-button-label) {
  height: 0;
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

.invisible {
  visibility: hidden;
}
</style>
