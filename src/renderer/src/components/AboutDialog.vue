<template>
  <BaseDialog header=" " style="width: 36rem">
    <div class="space-y-7">
      <div class="text-center">
        <div class="text-3xl font-bold">OpenCOR {{ version }}</div>
        <div class="italic">Copyright {{ copyright }}</div>
      </div>
      <div>
        <a href="https://opencor.ws/" target="_blank" rel="noopener">OpenCOR</a> is a Web-based modelling environment,
        which can be used to organise, edit, simulate, and analyse
        <a href="https://cellml.org/" target="_blank" rel="noopener">CellML</a> files. It can be used both as a
        standalone application (on Windows, Linux, and macOS) and on the Web.
      </div>
    </div>
    <template #footer>
      <Button label="OK" autofocus @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineEmits(['close'])

const version = ref(__APP_VERSION__)
const currentYear = new Date().getFullYear()
const copyright = ref(currentYear === 2024 ? '2024' : `2024-${currentYear}`)
</script>
