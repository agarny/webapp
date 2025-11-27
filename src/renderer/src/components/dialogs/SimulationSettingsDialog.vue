<template>
  <BaseDialog header="Simulation Settings...">
    <SimulationConfiguration v-model="simulationData" />
    <template #footer>
      <Button autofocus label="OK" @click="$emit('ok')" />
      <Button label="Cancel" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { SimulationConfiguration } from 'simpropertyeditor';
import 'simpropertyeditor/simpropertyeditor.css'
import * as vue from 'vue';

defineEmits(['close', 'ok']);

const simulationData = vue.ref({
  input: [],
  output: {
    data: [],
    plots: []
  },
  parameters: []
});
</script>
