<template>
  <BaseDialog header="Settings...">
    <div v-if="electronApi !== undefined" class="flex gap-2 items-center">
      <Checkbox inputId="checkForUpdatesAtStartup" :binary="true" :modelValue="checkForUpdatesAtStartup" />
      <label for="checkForUpdatesAtStartup">Check for updates at startup</label>
    </div>
    <div v-else>
      There are currently no settings.
    </div>
    <template #footer>
      <Button autofocus label="OK" @click="onOk" />
      <Button label="Cancel" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { electronApi } from '../../../../electronApi'

const emit = defineEmits(['close'])

const checkForUpdatesAtStartup = vue.ref(true)

function onOk() {
  emit('close')
}
</script>
