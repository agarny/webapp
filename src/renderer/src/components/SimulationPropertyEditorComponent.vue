<template>
  <PropertyEditorComponent name="Simulation" :properties="properties" />
</template>

<script setup lang="ts">
import * as vue from 'vue'

import * as locAPI from '../../../libopencor/locAPI'

const props = defineProps<{
  file: locAPI.File
}>()

const simulation = props.file.sedDocument().simulation(0)
const simulationUniformTimeCourse = simulation as locAPI.SEDSimulationUniformTimeCourse

const properties = vue.ref([
  {
    property: 'Starting point',
    value: simulationUniformTimeCourse.outputStartTime()
  },
  {
    property: 'Ending point',
    value: simulationUniformTimeCourse.outputEndTime()
  },
  {
    property: 'Point interval',
    value:
      (simulationUniformTimeCourse.outputEndTime() - simulationUniformTimeCourse.outputStartTime()) /
      simulationUniformTimeCourse.numberOfSteps()
  }
])
</script>
