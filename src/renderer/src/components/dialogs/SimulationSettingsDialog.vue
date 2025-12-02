<template>
  <BaseDialog header="Simulation Settings..." class="w-169">
    <div class="flex flex-col gap-4">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="input">Input</Tab>
          <Tab value="output">Output</Tab>
          <Tab value="parameters">Parameters</Tab>
        </TabList>
        <TabPanels>
          <!-- Input -->

          <TabPanel value="input">
            <ScrollPanel style="height: 400px">
              <div class="flex flex-col gap-4">
                <div v-for="(input, inputIndex) in localUiJson.input" :key="`input_${inputIndex}`">
                  <Fieldset :legend="`Input ${inputIndex + 1}`">
                    <div class="flex flex-col gap-4">
                      <!-- Common fields -->

                      <div class="flex gap-2">
                        <FloatLabel variant="on" class="flex! flex-1">
                          <InputText v-model="input.id" class="grow" size="small" />
                          <label>ID</label>
                        </FloatLabel>
                        <FloatLabel variant="on" class="flex! flex-1">
                          <InputText v-model="input.name" class="grow" size="small" />
                          <label>Name</label>
                        </FloatLabel>
                      </div>
                      <div class="flex gap-2">
                        <FloatLabel variant="on" class="flex! flex-1">
                          <InputNumber v-model="input.defaultValue" class="grow" size="small" :maxFractionDigits="15" />
                          <label>Default Value</label>
                        </FloatLabel>
                        <FloatLabel variant="on" class="flex! flex-1">
                          <InputText v-model="input.visible" class="grow" size="small" />
                          <label>Visible (optional)</label>
                        </FloatLabel>
                      </div>

                      <!-- Type selector -->

                      <div class="flex gap-2">
                        <FloatLabel variant="on" class="flex! flex-1">
                          <Select
                            :modelValue="isDiscreteInput(input) ? 'discrete' : 'scalar'"
                            @update:modelValue="(val: string) => toggleInputType(inputIndex, val)"
                            :options="[{label: 'Discrete', value: 'discrete'}, {label: 'Scalar', value: 'scalar'}]"
                            optionLabel="label"
                            optionValue="value"
                            class="grow"
                            size="small"
                          />
                          <label>Type</label>
                        </FloatLabel>
                      </div>

                      <!-- Scalar input fields -->

                      <div v-if="isScalarInput(input)" class="flex gap-2">
                        <FloatLabel variant="on" class="flex! flex-1">
                          <InputNumber v-model="input.minimumValue" class="grow" size="small" :maxFractionDigits="15" />
                          <label>Minimum Value</label>
                        </FloatLabel>
                        <FloatLabel variant="on" class="flex! flex-1">
                          <InputNumber v-model="input.maximumValue" class="grow" size="small" :maxFractionDigits="15" />
                          <label>Maximum Value</label>
                        </FloatLabel>
                        <FloatLabel variant="on" class="flex! flex-1">
                          <InputNumber v-model="input.stepValue" class="grow" size="small" :maxFractionDigits="15" />
                          <label>Step Value (optional)</label>
                        </FloatLabel>
                      </div>

                      <!-- Discrete input fields -->

                      <div v-if="isDiscreteInput(input)" class="flex flex-col gap-2">
                        <label class="font-semibold">Possible Values:</label>

                        <div v-for="(possibleValue, possibleValueIndex) in input.possibleValues" :key="`possibleValue${possibleValueIndex}`" class="flex gap-2 ml-2">
                          <FloatLabel variant="on" class="flex! flex-1">
                            <InputText v-model="possibleValue.name" class="grow" size="small" />
                            <label>Name</label>
                          </FloatLabel>
                          <FloatLabel variant="on" class="flex! flex-1">
                          <InputNumber v-model="possibleValue.value" class="grow" size="small" :maxFractionDigits="15" />
                            <label>Value</label>
                          </FloatLabel>

                          <Button icon="pi pi-trash" severity="danger" text @click="removePossibleValue(inputIndex, possibleValueIndex)" size="small" />
                        </div>

                        <Button label="Add Possible Value" icon="pi pi-plus" size="small" @click="addPossibleValue(inputIndex)" class="ml-2 w-fit" />
                      </div>

                      <Button label="Remove Input" icon="pi pi-trash" severity="danger" size="small" @click="removeInput(inputIndex)" class="w-fit" />
                    </div>
                  </Fieldset>
                </div>

                <Button label="Add Input" icon="pi pi-plus" size="small" @click="addInput" class="w-fit" />
              </div>
            </ScrollPanel>
          </TabPanel>

          <!-- Output -->

          <TabPanel value="output">
            <ScrollPanel style="height: 400px">
              <div class="flex flex-col gap-4">
                <!-- Output Data -->

                <Fieldset legend="Output Data">
                  <div class="flex flex-col gap-2">
                    <div v-for="(outputData, outputDataIndex) in localUiJson.output.data" :key="`data_${outputDataIndex}`" class="flex gap-2">
                      <FloatLabel variant="on" class="flex! flex-1">
                        <InputText v-model="outputData.id" class="grow" size="small" />
                        <label>ID</label>
                      </FloatLabel>
                      <FloatLabel variant="on" class="flex! flex-1">
                        <Select v-model="outputData.name" class="grow" size="small" editable filter filterMode="lenient" :options="allParameters" />
                        <label>Name</label>
                      </FloatLabel>

                      <Button icon="pi pi-trash" severity="danger" text @click="removeOutputData(outputDataIndex)" size="small" />
                    </div>

                    <Button label="Add Output Data" icon="pi pi-plus" size="small" @click="addOutputData" class="w-fit" />
                  </div>
                </Fieldset>

                <!-- Output Plots -->

                <Fieldset legend="Output Plots">
                  <div class="flex flex-col gap-4">
                    <div v-for="(outputPlot, outputPlotIndex) in localUiJson.output.plots" :key="`plot_${outputPlotIndex}`">
                      <div class="flex flex-col gap-2 p-3 border rounded">
                        <div class="flex justify-between items-center">
                          <label class="font-semibold">Output Plot {{ outputPlotIndex + 1 }}</label>

                          <Button icon="pi pi-trash" severity="danger" text @click="removeOutputPlot(outputPlotIndex)" size="small" />
                        </div>
                        <div class="flex gap-2">
                          <FloatLabel variant="on" class="flex! flex-1">
                            <InputText v-model="outputPlot.xAxisTitle" class="grow" size="small" />
                            <label>X Axis Title</label>
                          </FloatLabel>
                          <FloatLabel variant="on" class="flex! flex-1">
                            <InputText v-model="outputPlot.xValue" class="grow" size="small" />
                            <label>X Value</label>
                          </FloatLabel>
                        </div>
                        <div class="flex gap-2">
                          <FloatLabel variant="on" class="flex! flex-1">
                            <InputText v-model="outputPlot.yAxisTitle" class="grow" size="small" />
                            <label>Y Axis Title</label>
                          </FloatLabel>
                          <FloatLabel variant="on" class="flex! flex-1">
                            <InputText v-model="outputPlot.yValue" class="grow" size="small" />
                            <label>Y Value</label>
                          </FloatLabel>
                        </div>
                      </div>
                    </div>
                    <Button
                      label="Add Output Plot"
                      icon="pi pi-plus"
                      size="small"
                      @click="addOutputPlot"
                      class="w-fit"
                      :disabled="localUiJson.output.plots.length >= 9"
                    />
                    <small v-if="localUiJson.output.plots.length >= 9" class="text-orange-600">Maximum of 9 plots reached</small>
                  </div>
                </Fieldset>
              </div>
            </ScrollPanel>
          </TabPanel>

          <!-- Parameters -->

          <TabPanel value="parameters">
            <ScrollPanel style="height: 400px">
              <div class="flex flex-col gap-4">
                <Fieldset legend="Parameters">
                  <div class="flex flex-col gap-2">
                    <div v-for="(parameter, parameterIndex) in localUiJson.parameters" :key="`param_${parameterIndex}`" class="flex gap-2">
                      <FloatLabel variant="on" class="flex! flex-1">
                        <Select v-model="parameter.name" class="grow" size="small" editable filter filterMode="lenient" :options="editableParameters" />
                        <label>Name</label>
                      </FloatLabel>
                      <FloatLabel variant="on" class="flex! flex-1">
                        <InputText v-model="parameter.value" class="grow" size="small" />
                        <label>Value</label>
                      </FloatLabel>
                      <Button icon="pi pi-trash" severity="danger" text @click="removeParameter(parameterIndex)" size="small" />
                    </div>
                    <Button label="Add Parameter" icon="pi pi-plus" size="small" @click="addParameter" class="w-fit" />
                  </div>
                </Fieldset>
              </div>
            </ScrollPanel>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <!-- Issues -->

      <div ref="issuesContainer">
        <IssuesView
          v-show="validationIssues.length !== 0"
          :leftMargin="false"
          :rightMargin="false"
          :issues="validationIssues"
        />
      </div>
    </div>

    <!-- Footer -->

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div>
          <Button label="Download" icon="pi pi-download" @click="onDownload(localUiJson)" />
        </div>
        <div class="flex gap-2">
          <Button autofocus label="OK" @click="onOk" />
          <Button label="Cancel" severity="secondary" @click="$emit('close')" />
        </div>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as locApi from '../../libopencor/locApi';
import { downloadFile } from '../../common/common';
import type * as locUiJsonApi from '../../libopencor/locUiJsonApi';
import { uiJsonIssues } from '../../libopencor/locUiJsonApi';

const props = defineProps<{
  uiJson: locUiJsonApi.IUiJson;
  allParameters: string[];
  editableParameters?: string[];
}>();

const emit = defineEmits(['close', 'download', 'ok']);

const activeTab = vue.ref('input');
const localUiJson = vue.ref<locUiJsonApi.IUiJson>(JSON.parse(JSON.stringify(props.uiJson)));
const validationIssues = vue.computed(() => {
  // Delete optional fields if they are empty.

  localUiJson.value.input.forEach((input) => {
    if ('stepValue' in input && input.stepValue === null) {
      delete input.stepValue;
    } else if ('visible' in input && input.visible === '') {
      delete input.visible;
    }
  });

  // Validate our local UI JSON and return any issues.

  return uiJsonIssues(localUiJson.value);
});

// Type guards
function isDiscreteInput(
  input: locUiJsonApi.IUiJsonInput
): input is locUiJsonApi.IUiJsonInput & { possibleValues: locUiJsonApi.IUiJsonDiscreteInputPossibleValue[] } {
  return 'possibleValues' in input;
}

function isScalarInput(
  input: locUiJsonApi.IUiJsonInput
): input is locUiJsonApi.IUiJsonInput & { minimumValue: number; maximumValue: number } {
  return 'minimumValue' in input && 'maximumValue' in input;
}

// Input management
function addInput() {
  localUiJson.value.input.push({
    name: 'New Input',
    defaultValue: 0,
    minimumValue: 0,
    maximumValue: 1,
    stepValue: 0.1
  });
}

function removeInput(index: number) {
  if (localUiJson.value.input.length > 1) {
    localUiJson.value.input.splice(index, 1);
  }
}

function toggleInputType(index: number, type: string) {
  const input = localUiJson.value.input[index];
  if (!input) return;

  const baseInput = {
    name: input.name,
    defaultValue: input.defaultValue,
    id: input.id,
    visible: input.visible
  };

  if (type === 'discrete') {
    localUiJson.value.input[index] = {
      ...baseInput,
      possibleValues: [
        { name: 'Option 1', value: 0 },
        { name: 'Option 2', value: 1 }
      ]
    };
  } else {
    localUiJson.value.input[index] = {
      ...baseInput,
      minimumValue: 0,
      maximumValue: 1,
      stepValue: 0.1
    };
  }
}

function addPossibleValue(inputIndex: number) {
  const input = localUiJson.value.input[inputIndex];
  if (input && isDiscreteInput(input)) {
    const maxValue = Math.max(...input.possibleValues.map((possibleValue) => possibleValue.value), -1);
    input.possibleValues.push({
      name: `Option ${input.possibleValues.length + 1}`,
      value: maxValue + 1
    });
  }
}

function removePossibleValue(inputIndex: number, possibleValueIndex: number) {
  const input = localUiJson.value.input[inputIndex];
  if (input && isDiscreteInput(input) && input.possibleValues.length > 1) {
    input.possibleValues.splice(possibleValueIndex, 1);
  }
}

// Output management
function addOutputData() {
  localUiJson.value.output.data.push({
    id: `data_${localUiJson.value.output.data.length}`,
    name: 'New Data'
  });
}

function removeOutputData(index: number) {
  if (localUiJson.value.output.data.length > 1) {
    localUiJson.value.output.data.splice(index, 1);
  }
}

function addOutputPlot() {
  if (localUiJson.value.output.plots.length < 9) {
    localUiJson.value.output.plots.push({
      xAxisTitle: 'X Axis',
      xValue: '',
      yAxisTitle: 'Y Axis',
      yValue: ''
    });
  }
}

function removeOutputPlot(index: number) {
  if (localUiJson.value.output.plots.length > 1) {
    localUiJson.value.output.plots.splice(index, 1);
  }
}

// Parameter management
function addParameter() {
  localUiJson.value.parameters.push({
    name: 'New Parameter',
    value: ''
  });
}

function removeParameter(index: number) {
  if (localUiJson.value.parameters.length > 1) {
    localUiJson.value.parameters.splice(index, 1);
  }
}

function onDownload(uiJson: locApi.IUiJson) {
  const uiJsonString = JSON.stringify(uiJson, null, 2);

  downloadFile('simulation_settings.json', uiJsonString, 'application/json');
}

function onOk() {
  emit('ok', localUiJson.value);
}

// Watch for external changes to uiJson prop
vue.watch(
  () => props.uiJson,
  (newVal) => {
    localUiJson.value = JSON.parse(JSON.stringify(newVal));
  },
  { deep: true }
);
</script>

<style scoped>
:deep(.p-fieldset) {
  padding: 0 0.5rem 0.5rem 0.5rem;
}

:deep(.p-tabpanels) {
  padding: 0;
}

div.flex.flex-col.gap-4 {
  gap: 0.5rem;
}

div.flex.flex-col.gap-2.p-3.border.rounded {
  border-color: var(--p-fieldset-border-color);
}
</style>
