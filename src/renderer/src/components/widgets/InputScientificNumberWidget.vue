<template>
  <FloatLabel variant="on" :class="rootAttrs.class" :style="rootAttrs.style">
    <span :class="rootClass">
      <InputText ref="inputElement" :model-value="internalValue" class="p-inputnumber-input w-full"
        v-bind="inputAttrs"
        role="spinbutton"
        :aria-valuenow="currentNumericValue ?? undefined"
        :aria-valuemin="props.min ?? undefined"
        :aria-valuemax="props.max ?? undefined"
        v-keyfilter="{ pattern: /^[+-]?(\d*(\.\d*)?|\.\d*)([eE][+-]?\d*)?$/ }"
        @update:model-value="onUpdateModelValue"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onInputKeydown"
        @keydown.enter="onKeydownEnter"
        @paste="onPaste"
      />
      <button v-if="defaultValue !== undefined" :class="resetButtonClass"
        type="button"
        :disabled="disabled || readonly || atDefaultValue"
        :tabindex="-1"
        :title="`Reset to ${defaultValue}`"
        @mousedown.prevent
        @click="onResetButtonClick"
      >
        <i class="pi pi-undo" aria-hidden="true"></i>
      </button>
      <span class="p-inputnumber-button-group">
        <button :class="incrementButtonClass"
          type="button"
          :disabled="disabled || readonly || maxBoundary"
          :tabindex="-1"
          @mousedown="onSpinButtonMouseDown($event, 1)"
          @mouseleave="clearSpinTimerAndRemoveEventListeners"
          @mouseup="clearSpinTimerAndRemoveEventListeners"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon"
            aria-hidden="true" data-pc-section="incrementicon">
            <path
              d="M10.4134 9.49931C10.3148 9.49977 10.2172 9.48055 10.1262 9.44278C10.0352 9.405 9.95263 9.34942 9.88338 9.27931L6.88338 6.27931L3.88338 9.27931C3.73811 9.34946 3.57409 9.3709 3.41567 9.34044C3.25724 9.30999 3.11286 9.22926 3.00395 9.11025C2.89504 8.99124 2.82741 8.84028 2.8111 8.67978C2.79478 8.51928 2.83065 8.35781 2.91338 8.21931L6.41338 4.71931C6.55401 4.57886 6.74463 4.49997 6.94338 4.49997C7.14213 4.49997 7.33276 4.57886 7.47338 4.71931L10.9734 8.21931C11.1138 8.35994 11.1927 8.55056 11.1927 8.74931C11.1927 8.94806 11.1138 9.13868 10.9734 9.27931C10.9007 9.35315 10.8132 9.41089 10.7168 9.44879C10.6203 9.48669 10.5169 9.5039 10.4134 9.49931Z"
              fill="currentColor"></path>
          </svg>
        </button>
        <button :class="decrementButtonClass"
          type="button"
          :disabled="disabled || readonly || minBoundary"
          :tabindex="-1"
          @mousedown="onSpinButtonMouseDown($event, -1)"
          @mouseleave="clearSpinTimerAndRemoveEventListeners"
          @mouseup="clearSpinTimerAndRemoveEventListeners"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon"
            aria-hidden="true" data-pc-section="decrementicon">
            <path
              d="M3.58659 4.5007C3.68513 4.50023 3.78277 4.51945 3.87379 4.55723C3.9648 4.59501 4.04735 4.65058 4.11659 4.7207L7.11659 7.7207L10.1166 4.7207C10.2619 4.65055 10.4259 4.62911 10.5843 4.65956C10.7427 4.69002 10.8871 4.77074 10.996 4.88976C11.1049 5.00877 11.1726 5.15973 11.1889 5.32022C11.2052 5.48072 11.1693 5.6422 11.0866 5.7807L7.58659 9.2807C7.44597 9.42115 7.25534 9.50004 7.05659 9.50004C6.85784 9.50004 6.66722 9.42115 6.52659 9.2807L3.02659 5.7807C2.88614 5.64007 2.80725 5.44945 2.80725 5.2507C2.80725 5.05195 2.88614 4.86132 3.02659 4.7207C3.09932 4.64685 3.18675 4.58911 3.28322 4.55121C3.37969 4.51331 3.48305 4.4961 3.58659 4.5007Z"
              fill="currentColor"></path>
          </svg>
        </button>
      </span>
    </span>
    <label>{{ label }}</label>
  </FloatLabel>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as constants from '../../common/constants';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  modelValue: number | undefined;
  label: string;
  allowEmpty?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined];
  atDefaultValueChange: [atDefaultValue: boolean];
}>();

const attrs = vue.useAttrs();
const internalValue = vue.ref<string>('');
const isEditing = vue.ref<boolean>(false);
const isFocused = vue.ref<boolean>(false);
const inputElement = vue.ref<{ $el: HTMLInputElement } | null>(null);
const rootAttrs = vue.computed<{ class: unknown; style: unknown }>(() => ({
  class: attrs.class,
  style: attrs.style
}));
const inputAttrs = vue.computed<Record<string, unknown>>(() => {
  const { class: _class, style: _style, ...rest } = attrs;

  return rest;
});
const disabled = vue.computed<boolean>(() => {
  const value = attrs.disabled;

  if (value === undefined || value === false || value === 'false') {
    return false;
  }

  return true;
});
const readonly = vue.computed<boolean>(() => {
  const value = attrs.readonly;

  if (value === undefined || value === false || value === 'false') {
    return false;
  }

  return true;
});
const invalid = vue.computed<boolean>(() => {
  return attrs.invalid === '' || attrs.invalid === true || attrs.invalid === 'true';
});
const hasValue = vue.computed<boolean>(() => {
  return internalValue.value !== '';
});
const stepValue = vue.computed<number>(() => {
  const rawStep = props.step ?? 1;

  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  return rawStep;
});

const rootClass = vue.computed<Array<string | Record<string, boolean>>>(() => {
  return [
    'p-inputnumber',
    'p-component',
    'p-inputwrapper',
    'p-inputnumber-stacked',
    'p-inputnumber-fluid',
    'w-full',
    {
      'p-inputnumber-resettable': props.defaultValue !== undefined,
      'p-invalid': invalid.value,
      'p-inputwrapper-filled': hasValue.value,
      'p-inputwrapper-focus': isFocused.value
    }
  ];
});
const currentNumericValue = vue.computed<number | undefined>(() => {
  if (internalValue.value === '') {
    return props.modelValue;
  }

  const value = Number(internalValue.value);

  return Number.isFinite(value) ? value : props.modelValue;
});
const inferredNumericValue = vue.computed<number>(() => {
  const source = internalValue.value === '' ? (props.modelValue ?? props.min ?? 0) : parseFloat(internalValue.value);

  return Number.isFinite(source) ? source : (props.modelValue ?? 0);
});
const activeButton = vue.ref<'increment' | 'decrement' | null>(null);
const minBoundary = vue.computed<boolean>(() => {
  return props.min !== undefined && inferredNumericValue.value <= props.min;
});
const maxBoundary = vue.computed<boolean>(() => {
  return props.max !== undefined && inferredNumericValue.value >= props.max;
});
const atDefaultValue = vue.computed<boolean>(() => {
  return inferredNumericValue.value === props.defaultValue;
});
const resetButtonClass = vue.computed<Array<string | Record<string, boolean>>>(() => {
  const isDisabled = disabled.value || readonly.value || atDefaultValue.value;

  return [
    isDisabled ? 'cursor-default' : 'cursor-pointer',
    'p-inputnumber-button',
    'p-inputnumber-reset-button',
    {
      'p-disabled': isDisabled
    }
  ];
});
const incrementButtonClass = vue.computed<Array<string | Record<string, boolean>>>(() => {
  const isDisabled = disabled.value || readonly.value || maxBoundary.value;

  return [
    isDisabled ? 'cursor-default' : 'cursor-pointer',
    'p-inputnumber-button',
    'p-inputnumber-increment-button',
    {
      'p-active': activeButton.value === 'increment',
      'p-disabled': isDisabled
    }
  ];
});
const decrementButtonClass = vue.computed<Array<string | Record<string, boolean>>>(() => {
  const isDisabled = disabled.value || readonly.value || minBoundary.value;

  return [
    isDisabled ? 'cursor-default' : 'cursor-pointer',
    'p-inputnumber-button',
    'p-inputnumber-decrement-button',
    {
      'p-active': activeButton.value === 'decrement',
      'p-disabled': isDisabled
    }
  ];
});

const updateInternalValue = (value: number | undefined) => {
  internalValue.value = value !== undefined ? String(value) : '';
};

vue.watch(
  () => props.modelValue,
  (newValue) => {
    if (!isEditing.value) {
      updateInternalValue(newValue);
    }
  },
  { immediate: true }
);

// Let our owner know whether the value we show is our default value, including while it is being edited, i.e. before it
// is committed.

vue.watch(
  atDefaultValue,
  (newAtDefaultValue) => {
    emit('atDefaultValueChange', newAtDefaultValue);
  },
  { immediate: true }
);

const onUpdateModelValue = (value: string | undefined) => {
  isEditing.value = true;
  internalValue.value = value ?? '';
};

const onPaste = (event: ClipboardEvent) => {
  const clipboardData = event.clipboardData ?? (window as unknown as { clipboardData?: DataTransfer }).clipboardData;

  if (!clipboardData) {
    return;
  }

  event.preventDefault();

  const rawPastedValue = clipboardData.getData('text') || '';

  if (rawPastedValue === '') {
    return;
  }

  // Normalise Unicode minus signs to ASCII hyphen-minus so that negative numbers copied from text sources using
  // typographic minus signs are handled correctly.

  const pastedValue = rawPastedValue.replace(/[\u2212\u2213]/g, '-');

  // Try to extract a valid scientific-number pattern from the pasted text. Failing that, try to sanitise the pasted
  // text first by removing invalid characters, then extracting a scientific-number pattern from it.
  // Note: the pattern used in the keyfilter is suitable for validating a scientific number when typing it in, but here
  //       we want to extract a matching substring from arbitrary pasted text, so we use a slightly different pattern.

  const scientificNumberPattern = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
  let match = pastedValue.match(scientificNumberPattern);
  let toInsert: string | null = match?.[0] ?? null;

  if (!toInsert) {
    const sanitisedValue = pastedValue.replace(/[^0-9eE+\-.]/g, '');

    if (sanitisedValue === '') {
      return;
    }

    match = sanitisedValue.match(scientificNumberPattern);

    if (!match?.[0]) {
      return;
    }

    toInsert = match[0];
  }

  const inputElement = event.target as HTMLInputElement | null;

  if (!inputElement) {
    return;
  }

  const selectionStart = inputElement.selectionStart ?? 0;
  const selectionEnd = inputElement.selectionEnd ?? 0;
  const newValue = internalValue.value.slice(0, selectionStart) + toInsert + internalValue.value.slice(selectionEnd);

  onUpdateModelValue(newValue);
};

const onBlur = () => {
  isEditing.value = false;
  isFocused.value = false;

  if (internalValue.value === '') {
    updateInternalValue(props.modelValue);

    if (props.allowEmpty) {
      emit('update:modelValue', undefined);
    }

    return;
  }

  const parsedValue = parseFloat(internalValue.value);

  if (Number.isNaN(parsedValue)) {
    updateInternalValue(props.modelValue);

    return;
  }

  const clampedValue = validateValue(parsedValue);

  updateInternalValue(clampedValue);

  emit('update:modelValue', clampedValue);
};

const onFocus = () => {
  isFocused.value = true;
};

const onKeydownEnter = (event: KeyboardEvent) => {
  (event.target as HTMLInputElement).blur();
};

const onInputKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowUp':
      if (spin(1)) {
        event.preventDefault();
      }

      break;
    case 'ArrowDown':
      if (spin(-1)) {
        event.preventDefault();
      }

      break;
    case 'Home':
      if (props.min !== undefined) {
        isEditing.value = false;

        updateInternalValue(props.min);

        emit('update:modelValue', props.min);

        event.preventDefault();
      }

      break;
    case 'End':
      if (props.max !== undefined) {
        isEditing.value = false;

        updateInternalValue(props.max);

        emit('update:modelValue', props.max);

        event.preventDefault();
      }

      break;
    default:
      break;
  }
};

const onResetButtonClick = () => {
  if (disabled.value || readonly.value || props.defaultValue === undefined) {
    return;
  }

  isEditing.value = false;

  updateInternalValue(props.defaultValue);

  emit('update:modelValue', props.defaultValue);
};

// Discard the value that is being edited, if any, i.e. show our current value again.

const discardEdit = () => {
  isEditing.value = false;

  updateInternalValue(props.modelValue);
};

defineExpose({
  discardEdit
});

const validateValue = (value: number) => {
  if (props.min !== undefined && value < props.min) {
    return props.min;
  }

  if (props.max !== undefined && value > props.max) {
    return props.max;
  }

  return value;
};

const getFractionDigits = (value: number) => {
  const [coefficient, exponentString] = value.toString().toLowerCase().split('e');
  const exponent = exponentString ? Number(exponentString) : 0;
  const coefficientFractionDigits = coefficient.includes('.') ? (coefficient.split('.')[1]?.length ?? 0) : 0;

  return Math.max(0, coefficientFractionDigits - exponent);
};

const addWithPrecision = (base: number, increment: number) => {
  const precisionDigits = Math.max(getFractionDigits(base), getFractionDigits(increment), 0);
  const maxPrecisionDigits = 15;
  const safePrecisionDigits = Math.min(precisionDigits, maxPrecisionDigits);
  let precision = 10 ** safePrecisionDigits;

  if (!Number.isFinite(precision) || precision === 0) {
    precision = 10 ** maxPrecisionDigits;
  }

  const rawValue = (base + increment) * precision;

  if (!Number.isFinite(rawValue)) {
    return base + increment;
  }

  const rounded = Math.round(rawValue) / precision;

  if (!Number.isFinite(rounded)) {
    return base + increment;
  }

  return rounded;
};

const spinTimer = vue.ref<number | undefined>(undefined);

const spin = (direction: 1 | -1): boolean => {
  const step = stepValue.value;

  if (disabled.value || readonly.value || !Number.isFinite(step) || step <= 0) {
    return false;
  }

  const inferredBaseValue =
    internalValue.value === '' ? (props.modelValue ?? props.min ?? 0) : parseFloat(internalValue.value);
  const safeCurrentValue = Number.isFinite(inferredBaseValue) ? inferredBaseValue : (props.modelValue ?? 0);
  const nextValue = validateValue(addWithPrecision(safeCurrentValue, step * direction));

  if (!Number.isFinite(nextValue) || nextValue === safeCurrentValue) {
    return false;
  }

  isEditing.value = false;

  updateInternalValue(nextValue);

  emit('update:modelValue', nextValue);

  return true;
};

const clearSpinTimer = () => {
  if (spinTimer.value !== undefined) {
    window.clearTimeout(spinTimer.value);

    spinTimer.value = undefined;
  }
};

const repeatSpin = (direction: 1 | -1, interval = constants.SPIN_INITIAL_DELAY) => {
  if (disabled.value || readonly.value) {
    return;
  }

  clearSpinTimer();

  if (!spin(direction)) {
    return;
  }

  spinTimer.value = window.setTimeout(() => {
    repeatSpin(direction, constants.SPIN_REPEAT_DELAY);
  }, interval);
};

const clearSpinTimerAndRemoveEventListeners = () => {
  activeButton.value = null;

  clearSpinTimer();

  window.removeEventListener('mouseup', clearSpinTimerAndRemoveEventListeners);
  window.removeEventListener('pointerup', clearSpinTimerAndRemoveEventListeners);
  window.removeEventListener('blur', clearSpinTimerAndRemoveEventListeners);
};

const onSpinButtonMouseDown = (event: MouseEvent, direction: 1 | -1) => {
  if (disabled.value || readonly.value || event.button !== 0) {
    return;
  }

  activeButton.value = direction === 1 ? 'increment' : 'decrement';

  inputElement.value?.$el.focus();

  window.addEventListener('mouseup', clearSpinTimerAndRemoveEventListeners);
  window.addEventListener('pointerup', clearSpinTimerAndRemoveEventListeners);
  window.addEventListener('blur', clearSpinTimerAndRemoveEventListeners);

  repeatSpin(direction);

  event.preventDefault();
};

vue.onBeforeUnmount(() => {
  clearSpinTimerAndRemoveEventListeners();
});
</script>

<style scoped>
.p-inputnumber {
  display: inline-flex;
  position: relative;
}

.p-inputnumber-button {
  display: flex;
  justify-content: center;
  width: 1.5rem;
  margin: 1px;
  color: var(--p-button-text-secondary-color);
}

.p-inputnumber-button:not(.p-disabled):hover {
  background-color: var(--p-button-text-secondary-hover-background);
  color: var(--p-button-text-secondary-color);
}

.p-inputnumber-button.p-active:not(.p-disabled) {
  background-color: var(--p-button-text-secondary-active-background);
  color: var(--p-button-text-secondary-active-color);
}

.p-inputnumber-button-group > button:first-child {
  border-top-right-radius: 5px;
  border-bottom-right-radius: 0;
}

.p-inputnumber-button-group > button:last-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 5px;
}

.p-inputnumber-input {
  padding-right: 1.5rem;
}

.p-inputnumber-resettable .p-inputnumber-input {
  padding-right: 3rem;
  margin-right: -1.5rem;
}

.p-inputnumber-reset-button {
  position: absolute;
  inset-inline-end: calc(1.5rem + 1px);
  top: 0;
  bottom: 0;
  align-items: center;
  margin-right: 0;
  font-size: 0.75rem;
}

.p-inputnumber-reset-button .pi {
  font-size: inherit;
}

.p-inputnumber-stacked .p-inputnumber-button-group {
  position: absolute;
  inset-inline-end: 0;
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.p-inputnumber-button-group > button {
  min-height: 0;
  margin-left: 0;
}
</style>
