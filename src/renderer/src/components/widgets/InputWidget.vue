<template>
  <div v-if="possibleValues">
    <FloatLabel variant="on">
      <Select
        v-model="discreteValue"
        :options="possibleValues"
        optionLabel="name"
        @change="selectChange"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
  </div>
  <div v-else>
    <InputScientificNumber v-model="value"
      :label="name"
      size="small"
      @update:model-value="inputTextValueUpdated"
    />
    <Slider v-model="value" class="w-full mt-3"
      :min="minimumValue" :max="maximumValue" :step="compStepValue"
      size="small"
      @change="sliderChange"
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type * as locApi from '../../libopencor/locApi.ts';

const value = defineModel<number>({ required: true });
const emits = defineEmits<(event: 'change', name: string, newValue: number) => void>();
const props = defineProps<{
  maximumValue?: number;
  minimumValue?: number;
  name: string;
  possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[];
  stepValue?: number;
}>();

let oldValue = value.value;
const discreteValue = vue.ref<locApi.IUiJsonDiscreteInputPossibleValue | undefined>(
  props.possibleValues?.find((possibleValue) => possibleValue.value === value.value)
);
const compStepValue = vue.computed(() => {
  if (props.stepValue !== undefined) {
    return props.stepValue;
  }

  if (props.maximumValue !== undefined && props.minimumValue !== undefined) {
    return 0.01 * (props.maximumValue - props.minimumValue);
  }

  return 1;
});

vue.watch(
  () => value.value,
  (newValue) => {
    oldValue = newValue;

    if (props.possibleValues) {
      discreteValue.value = props.possibleValues.find((pv) => pv.value === newValue);
    }
  },
  { immediate: true }
);

// Some methods to handle a scalar value using an input component and a slider.

const emitChange = (newValue: number) => {
  void vue.nextTick(() => {
    value.value = newValue;

    oldValue = newValue;

    emits('change', props.name, newValue);
  });
};

interface ISelectChangeEvent {
  value: {
    name: string;
    value: number;
  };
}

const selectChange = (event: ISelectChangeEvent) => {
  if (event.value.value !== oldValue) {
    emitChange(event.value.value);
  }
};

const inputTextValueUpdated = (newValue: number) => {
  if (newValue !== oldValue) {
    let constrainedValue = newValue;

    if (props.minimumValue !== undefined && constrainedValue < props.minimumValue) {
      constrainedValue = props.minimumValue;
    }

    if (props.maximumValue !== undefined && constrainedValue > props.maximumValue) {
      constrainedValue = props.maximumValue;
    }

    emitChange(constrainedValue);
  }
};

const sliderChange = (newValue: number | number[]) => {
  const valueToEmit = Array.isArray(newValue) ? newValue[0] : newValue;

  if (valueToEmit !== undefined && valueToEmit !== oldValue) {
    emitChange(valueToEmit);
  }
};
</script>
