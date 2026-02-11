<template>
  <PropertyEditor name="Simulation" :properties="properties" @propertyUpdated="onPropertyUpdated" />
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type * as locApi from '../../libopencor/locApi.ts';

const props = defineProps<{
  uniformTimeCourse: locApi.SedUniformTimeCourse;
  instanceTask: locApi.SedInstanceTask;
}>();

const voiUnit = props.instanceTask.voiUnit();

const properties = vue.ref([
  {
    property: 'Starting point',
    value: props.uniformTimeCourse.outputStartTime(),
    unit: voiUnit
  },
  {
    property: 'Ending point',
    value: props.uniformTimeCourse.outputEndTime(),
    unit: voiUnit
  },
  {
    property: 'Point interval',
    value:
      (props.uniformTimeCourse.outputEndTime() - props.uniformTimeCourse.outputStartTime()) /
      props.uniformTimeCourse.numberOfSteps(),
    unit: voiUnit
  }
]);

const onPropertyUpdated = (index: number, newValue: number): void => {
  if (index === 0) {
    props.uniformTimeCourse.setInitialTime(newValue);
    props.uniformTimeCourse.setOutputStartTime(newValue);
  } else if (index === 1) {
    props.uniformTimeCourse.setOutputEndTime(newValue);
  } else if (index === 2) {
    // @ts-expect-error (we trust that we have valid properties)
    props.uniformTimeCourse.setNumberOfSteps((properties.value[1].value - properties.value[0].value) / newValue);
  }
};
</script>
