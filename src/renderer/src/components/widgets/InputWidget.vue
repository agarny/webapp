<template>
  <div ref="rootRef" v-if="possibleValues" @pointerdown.capture="onInteractionStart" @keydown.capture="onInteractionStart">
    <FloatLabel variant="on">
      <Select
        v-model="discreteValue"
        :options="possibleValues"
        optionLabel="name"
        @change="selectChange"
        :appendTo="appendTarget"
        class="w-full"
        :class="{ 'resettable-select': defaultPossibleValue }"
        size="small"
      />
      <label>{{ name }}</label>
      <button v-if="defaultPossibleValue" class="select-reset-button"
        :class="atDefaultValue ? 'cursor-default p-disabled' : 'cursor-pointer'"
        type="button"
        :disabled="atDefaultValue"
        :tabindex="-1"
        :title="`Reset to ${defaultPossibleValue.name}`"
        @mousedown.prevent
        @click="selectReset"
      >
        <i class="pi pi-undo" aria-hidden="true"></i>
      </button>
    </FloatLabel>
  </div>
  <div ref="rootRef" v-else @pointerdown.capture="onInteractionStart" @keydown.capture="onInteractionStart">
    <InputScientificNumberWidget v-model="value"
      :label="name"
      :defaultValue="defaultValue"
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
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon';
import type * as locApi from '../../libopencor/locApi';

const value = defineModel<number>({ required: true });

const props = defineProps<{
  defaultValue?: number;
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
const defaultPossibleValue = vue.computed<locApi.IUiJsonDiscreteInputPossibleValue | undefined>(() => {
  return props.possibleValues?.find((possibleValue) => possibleValue.value === props.defaultValue);
});
const atDefaultValue = vue.computed<boolean>(() => {
  return discreteValue.value?.value === props.defaultValue;
});

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

// Keep track of whether the user is interacting with us (e.g., dragging our slider, holding one of our spin buttons, or
// holding an arrow key), so that we can let our owner know when a change is final, i.e. when it is not made during an
// interaction (e.g., selecting a value, entering a value, or clicking on our slider bar) or when the interaction during
// which it was made has ended (see emitChange()).
// Note #1: an interaction may end outside of us (e.g., our slider being released outside of us or the Enter key moving
//          the focus away from our input), hence we listen to the window for the end of an interaction.
// Note #2: an interaction started using a pointer only ends when that pointer is released (or cancelled, e.g., when the
//          browser takes over a touch gesture), so that, for instance, releasing a modifier key while dragging our
//          slider doesn't end it. An interaction started using the keyboard ends when any key is released since a key
//          may not get reported as released. Either way, an interaction ends when the window loses the focus.
// Note #3: a pointer interaction takes over an interaction started using the keyboard (e.g., pressing a modifier key in
//          our input and then dragging our slider), so that the latter doesn't end when that key gets released, i.e.
//          while our slider is still being dragged.

let interacting = false;
let interactionPointerId: number | null = null;
let changedWhileInteracting = false;

const removeInteractionListeners = (): void => {
  window.removeEventListener('pointerup', onPointerInteractionEnd);
  window.removeEventListener('pointercancel', onPointerInteractionEnd);
  window.removeEventListener('keyup', onInteractionEnd);
  window.removeEventListener('blur', onInteractionEnd);
};

const onInteractionStart = (event: PointerEvent | KeyboardEvent): void => {
  const isPointerEvent = event instanceof PointerEvent;

  if (interacting) {
    if (!isPointerEvent || interactionPointerId !== null) {
      return;
    }

    onInteractionEnd();
  }

  interacting = true;

  if (isPointerEvent) {
    interactionPointerId = event.pointerId;

    window.addEventListener('pointerup', onPointerInteractionEnd);
    window.addEventListener('pointercancel', onPointerInteractionEnd);
  } else {
    interactionPointerId = null;

    window.addEventListener('keyup', onInteractionEnd);
  }

  window.addEventListener('blur', onInteractionEnd);
};

const onPointerInteractionEnd = (event: PointerEvent): void => {
  if (event.pointerId === interactionPointerId) {
    onInteractionEnd();
  }
};

const onInteractionEnd = (): void => {
  removeInteractionListeners();

  interacting = false;
  interactionPointerId = null;

  if (changedWhileInteracting) {
    changedWhileInteracting = false;

    // Note: we emit our changeEnd event in the next tick so that it gets emitted after any pending change event (see
    //       emitChange()).

    void vue.nextTick().then(() => {
      emits('changeEnd', props.name);
    });
  }
};

vue.onBeforeUnmount(() => {
  removeInteractionListeners();
});

// Some methods to handle a scalar value using an input component and a slider.

const emitChange = (newValue: number) => {
  const changeIsFinal = !interacting;

  if (!changeIsFinal) {
    changedWhileInteracting = true;
  }

  void vue.nextTick().then(() => {
    value.value = newValue;

    oldValue = newValue;

    emits('change', props.name, newValue);

    if (changeIsFinal) {
      emits('changeEnd', props.name);
    }
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

const selectReset = () => {
  if (defaultPossibleValue.value && defaultPossibleValue.value.value !== oldValue) {
    discreteValue.value = defaultPossibleValue.value;

    emitChange(defaultPossibleValue.value.value);
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
</script>

<style scoped>
.resettable-select :deep(.p-select-dropdown) {
  width: 1.5rem;
}

.resettable-select :deep(.p-select-label) {
  padding-inline-end: 1.5rem;
}

.select-reset-button {
  position: absolute;
  inset-inline-end: calc(1.5rem + 1px);
  top: 1px;
  bottom: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  color: var(--p-button-text-secondary-color);
  font-size: 0.75rem;
}

.select-reset-button:not(.p-disabled):hover {
  background-color: var(--p-button-text-secondary-hover-background);
}

.select-reset-button .pi {
  font-size: inherit;
}
</style>
