<template>
  <BaseDialog header="Open Remote..." style="width: 39rem">
    <div class="items-center mt-2 mb-4">
      <FloatLabel variant="on">
        <InputText autofocus fluid v-model="url" @keyup.enter="emitOpenRemote()" />
        <label>URL</label>
      </FloatLabel>
    </div>
    <template #footer>
      <Button label="Open" :disabled="url === ''" @click="emitOpenRemote()" />
      <Button label="Cancel" severity="secondary" @click="emitClose()" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as vue from 'vue'

const emit = defineEmits(['openRemote', 'close'])
const url = vue.ref<string>('')

function emitOpenRemote(): void {
  if (url.value === '') {
    return
  }

  emit('openRemote', url.value)

  emitClose()
}

function emitClose(): void {
  url.value = ''

  emit('close')
}
</script>
