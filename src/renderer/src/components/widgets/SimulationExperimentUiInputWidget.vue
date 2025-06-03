<template>
  <div>
    {{ name }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  defaultValue: number,
  maximumValue?: number,
  minimumValue?: number,
  name: string,
  possibleValues?: number[],
  stepValue?: number
}>()
</script>
