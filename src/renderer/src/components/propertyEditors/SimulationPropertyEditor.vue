<template>
  <PropertyEditor name="Simulation" :properties="properties" :disabled="disabled" :isValid="isValid" @propertyUpdated="onPropertyUpdated" />
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as locApi from '../../libopencor/locApi';

const props = defineProps<{
  uniformTimeCourse: locApi.SedUniformTimeCourse;
  instanceTask: locApi.SedInstanceTask;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  updated: [];
}>();

// The index of our properties.

const INITIAL_POINT = 0;
const STARTING_POINT = 1;
const ENDING_POINT = 2;
const POINT_INTERVAL = 3;

const voiUnit = props.instanceTask.voiUnit();

const properties = vue.ref([
  {
    property: 'Initial point',
    value: props.uniformTimeCourse.initialTime(),
    unit: voiUnit
  },
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

// Some helper methods to check the validity of a point interval and to compute the number of steps for the given
// starting point, ending point, and point interval.
// Note #1: our initial point interval comes from the SED-ML file, so it may not be valid (e.g., if the ending point is
//          equal to the starting point).
// Note #2: we round the number of steps since, due to rounding errors, dividing the simulation range by the point
//          interval may not give an integer (e.g., (2.3 - 0) / 0.1 = 22.999999999999996), which would otherwise get
//          truncated (i.e. 22 rather than 23 steps).
// Note #3: the ending point may be smaller than the starting point (e.g., while the user is updating both of them), in
//          which case libOpenCOR will report it when running the simulation, so we just need a number of steps that
//          libOpenCOR considers valid.

const isValidPointInterval = (pointInterval: number): boolean => {
  return Number.isFinite(pointInterval) && pointInterval > 0;
};

const numberOfSteps = (startingPoint: number, endingPoint: number, pointInterval: number): number => {
  return Math.max(1, Math.round((endingPoint - startingPoint) / pointInterval));
};

const isValid = (index: number, newValue: number): boolean => {
  // Make sure that a new value would give a valid point interval and a number of steps that libOpenCOR can handle (it
  // would otherwise get silently wrapped).
  // Note: if our point interval is not valid, then we still allow our starting and ending points to be updated (see
  //       onPropertyUpdated()).

  const values = properties.value.map((property) => property.value);

  values[index] = newValue;

  const [, startingPoint, endingPoint, pointInterval] = values as [number, number, number, number];

  if (!isValidPointInterval(pointInterval)) {
    return index !== POINT_INTERVAL;
  }

  return numberOfSteps(startingPoint, endingPoint, pointInterval) <= locApi.MAXIMUM_NUMBER_OF_STEPS;
};

const onPropertyUpdated = (index: number, newValue: number): void => {
  // Update our simulation and its number of steps, keeping our point interval, if valid (i.e. like when changing the
  // simulation settings in the Interactive Simulation Experiment view).
  // Note: as in the Interactive Simulation Experiment view, our initial and starting points are independent of each
  //       other (the simulation is run from our initial point, but only plotted from our starting point). An initial
  //       point that is greater than our starting point is, like a starting point that is greater than our ending
  //       point, reported by libOpenCOR when running the simulation.

  if (index === INITIAL_POINT) {
    props.uniformTimeCourse.setInitialTime(newValue);
  } else if (index === STARTING_POINT) {
    props.uniformTimeCourse.setOutputStartTime(newValue);
  } else if (index === ENDING_POINT) {
    props.uniformTimeCourse.setOutputEndTime(newValue);
  }

  const [, startingPoint, endingPoint, pointInterval] = properties.value.map((property) => property.value) as [
    number,
    number,
    number,
    number
  ];

  if (isValidPointInterval(pointInterval)) {
    props.uniformTimeCourse.setNumberOfSteps(numberOfSteps(startingPoint, endingPoint, pointInterval));
  }

  emit('updated');
};
</script>
