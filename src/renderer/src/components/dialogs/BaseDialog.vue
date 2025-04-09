<template>
  <Dialog :modal="true" @show="enableDisableMainMenu(false)" @hide="enableDisableMainMenu(true)">
    <template v-for="(_event, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { enableDisableMainMenu } from '../../common'
</script>
