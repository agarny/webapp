<template>
  <div>
    <FloatLabel variant="on">
      <InputText
        v-model="valueString"
        v-keyfilter="{ pattern: /^[+-]?(\d*(\.\d*)?|\.d*)([eE][+-]?\d*)?$/, validateOnly: true }"
        v-on:focusout="inputTextFocusOut"
        v-on:keypress="inputTextKeyPress"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
    <Slider
      v-model="value"
      :min="minimumValue"
      :max="maximumValue"
      :step="stepValue"
      @change="sliderChange"
      class="w-full mt-4"
      size="small"
    />
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import * as locApi from '../../../../libopencor/locApi'

const emits = defineEmits(['change'])
const props = defineProps<{
  defaultValue: number
  maximumValue?: number
  minimumValue?: number
  name: string
  possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[]
  stepValue?: number
}>()

let oldValue = props.defaultValue
const value = vue.ref<number>(props.defaultValue)
const valueString = vue.ref<string>(String(props.defaultValue))

// Some methods to handle a scalar value using an input text and a slider.

function emitChange(newValue: number) {
  void vue.nextTick().then(() => {
    value.value = newValue
    valueString.value = String(newValue) // This will properly format the input text.

    oldValue = newValue

    emits('change', props.name, newValue)
  })
}

function inputTextChange(newValueString: string) {
  if (newValueString === '') {
    newValueString = String(props.minimumValue)
  }

  if (props.minimumValue !== undefined && Number(newValueString) < props.minimumValue) {
    newValueString = String(props.minimumValue)
  }

  if (props.maximumValue !== undefined && Number(newValueString) > props.maximumValue) {
    newValueString = String(props.maximumValue)
  }

  const newValue = Number(newValueString)

  if (newValue !== oldValue) {
    emitChange(newValue)
  }
}

function inputTextFocusOut(event: Event) {
  inputTextChange((event.target as HTMLInputElement).value)
}

function inputTextKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    inputTextChange((event.target as HTMLInputElement).value)
  }
}

function sliderChange(newValue: number) {
  if (newValue !== oldValue) {
    emitChange(newValue)
  }
}
</script>
