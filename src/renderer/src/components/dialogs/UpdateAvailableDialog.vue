<template>
  <BaseDialog header="Check For Updates...">
    <div class="mt-2 mb-4">Version {{ version }} is available. Do you want to download it and install it?</div>
    <template #footer>
      <Button autofocus label="Yes" @click="$emit('downloadAndInstall')" />
      <Button label="No" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits(['downloadAndInstall', 'close'])
defineProps<{
  version: string
}>()
</script>
