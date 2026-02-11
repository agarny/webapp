<template>
  <FloatLabel variant="on">
    <InputText :model-value="internalValue" class="w-full"
      v-bind="$attrs"
      v-keyfilter="{ pattern: /^[+-]?(\d*(\.\d*)?|\.\d*)([eE][+-]?\d*)?$/, validateOnly: true }"
      @update:model-value="onUpdateModelValue"
      @blur="onBlur"
      @keydown.enter="onKeydownEnter"
      @paste="onPaste"
    />
    <label>{{ label }}</label>
  </FloatLabel>
</template>

<script setup lang="ts">
import * as vue from 'vue';

const props = defineProps<{
  modelValue: number | undefined;
  label: string;
  allowEmpty?: boolean;
}>();
const emit = defineEmits<(event: 'update:modelValue', value: number | undefined) => void>();

const internalValue = vue.ref<string>('');
const isEditing = vue.ref<boolean>(false);

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

const onUpdateModelValue = (value: string) => {
  isEditing.value = true;
  internalValue.value = value;
};

const onPaste = (event: ClipboardEvent) => {
  const clipboardData = event.clipboardData ?? (window as unknown as { clipboardData?: DataTransfer }).clipboardData;

  if (!clipboardData) {
    return;
  }

  event.preventDefault();

  const pastedValue = clipboardData.getData('text') || '';

  if (pastedValue === '') {
    return;
  }

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

    if (!match || !match[0]) {
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

const parseAndEmit = () => {
  isEditing.value = false;

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

  updateInternalValue(parsedValue);

  emit('update:modelValue', parsedValue);
};

const onBlur = () => {
  parseAndEmit();
};

const onKeydownEnter = (event: KeyboardEvent) => {
  (event.target as HTMLInputElement).blur();
};
</script>
