<template>
  <PropertyEditor name="Simulation" :properties="properties" @propertyUpdated="onPropertyUpdated" />
</template>

<script setup lang="ts">
import * as vue from 'vue'

import * as locApi from '../../../../libopencor/locApi'

const props = defineProps<{
  file: locApi.File
}>()

const uniformTimeCourse = props.file.document().simulation(0) as locApi.SedSimulationUniformTimeCourse
const voiUnit = props.file.instance().task(0).voiUnit()

const properties = vue.ref([
  {
    property: 'Starting point',
    value: uniformTimeCourse.outputStartTime(),
    unit: voiUnit
  },
  {
    property: 'Ending point',
    value: uniformTimeCourse.outputEndTime(),
    unit: voiUnit
  },
  {
    property: 'Point interval',
    value:
      (uniformTimeCourse.outputEndTime() - uniformTimeCourse.outputStartTime()) / uniformTimeCourse.numberOfSteps(),
    unit: voiUnit
  }
])

function onPropertyUpdated(index, value): void {
  if (index === 0) {
    uniformTimeCourse.setOutputStartTime(value)
  } else if (index === 1) {
    uniformTimeCourse.setOutputEndTime(value)
  } else if (index === 2) {
    uniformTimeCourse.setNumberOfSteps((properties.value[1].value - properties.value[0].value) / value)
  }
}
</script>
