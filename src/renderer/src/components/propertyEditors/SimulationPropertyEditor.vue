<template>
  <PropertyEditor name="Simulation" :properties="properties" :disabled="disabled" @propertyUpdated="onPropertyUpdated" />
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type * as locApi from '../../libopencor/locApi';

const props = defineProps<{
  uniformTimeCourse: locApi.SedUniformTimeCourse;
  instanceTask: locApi.SedInstanceTask;
  disabled?: boolean;
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
    // Note: we round the number of steps since, due to rounding errors, dividing the simulation range by the point
    //       interval may not give an integer (e.g., (2.3 - 0) / 0.1 = 22.999999999999996), which would otherwise get
    //       truncated (i.e. 22 rather than 23 steps).

    props.uniformTimeCourse.setNumberOfSteps(
      Math.round((properties.value[1].value - properties.value[0].value) / newValue)
    );
  }
};
</script>
