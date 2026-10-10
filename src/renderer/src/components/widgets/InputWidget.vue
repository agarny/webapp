<template>
  <div ref="rootRef" v-if="possibleValues">
    <FloatLabel variant="on">
      <Select
        v-model="discreteValue"
        :options="possibleValues"
        optionLabel="name"
        @change="selectChange"
        :appendTo="appendTarget"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
  </div>
  <div ref="rootRef" v-else>
    <InputScientificNumberWidget v-model="value"
      :label="name"
      :min="minimumValue"
      :max="maximumValue"
      :step="compStepValue"
      size="small"
      @update:model-value="inputTextValueUpdated"
    />
    <Slider v-model="value" class="w-full mt-3"
      :min="minimumValue" :max="maximumValue" :step="compStepValue"
      size="small"
      @change="sliderChange"
      @slideend="sliderChangeEnd"
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon';
import type * as locApi from '../../libopencor/locApi';

const value = defineModel<number>({ required: true });

const props = defineProps<{
  maximumValue?: number;
  minimumValue?: number;
  name: string;
  possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[];
  stepValue?: number;
}>();

const emits = defineEmits<{
  change: [name: string, newValue: number];
  changeEnd: [name: string];
}>();

let oldValue = value.value;
const discreteValue = vue.ref<locApi.IUiJsonDiscreteInputPossibleValue | undefined>(
  props.possibleValues?.find((possibleValue) => possibleValue.value === value.value)
);
const rootRef = vue.shallowRef<HTMLElement | null>(null);
const appendTarget = vueCommon.useAppendTarget(rootRef);

const compStepValue = vue.computed<number>(() => {
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
  vue.nextTick(() => {
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

const inputTextValueUpdated = (newValue: number | undefined) => {
  if (newValue !== undefined && newValue !== oldValue) {
    emitChange(newValue);
  }
};

const sliderChange = (newValue: number | number[]) => {
  const valueToEmit = Array.isArray(newValue) ? newValue[0] : newValue;

  if (valueToEmit !== undefined && valueToEmit !== oldValue) {
    emitChange(valueToEmit);
  }
};

const sliderChangeEnd = () => {
  // Note: we emit our changeEnd event in the next tick so that it gets emitted after any pending change event (see
  //       emitChange()).

  vue.nextTick(() => {
    emits('changeEnd', props.name);
  });
};
</script>
