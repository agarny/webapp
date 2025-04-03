<template>
  <PropertyEditorComponent name="Simulation" :properties="properties" />
</template>

<script setup lang="ts">
import * as vue from 'vue'

import * as locAPI from '../../../libopencor/locAPI'

const props = defineProps<{
  file: locAPI.File
}>()

const sedDocument = props.file.sedDocument()
const sedSimulationUniformTimeCourse = sedDocument.simulation(0) as locAPI.SEDSimulationUniformTimeCourse

const properties = vue.ref([
  {
    property: 'Starting point',
    value: sedSimulationUniformTimeCourse.outputStartTime()
  },
  {
    property: 'Ending point',
    value: sedSimulationUniformTimeCourse.outputEndTime()
  },
  {
    property: 'Point interval',
    value:
      (sedSimulationUniformTimeCourse.outputEndTime() - sedSimulationUniformTimeCourse.outputStartTime()) /
      sedSimulationUniformTimeCourse.numberOfSteps()
  }
])
</script>
