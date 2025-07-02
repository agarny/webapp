<template>
  <BaseDialog header="Downloading Update..." :closable="false" :closeOnEscape="false" style="width: 39rem">
    <ProgressBar class="no-animation" :showValue="false" :value="percent" />
  </BaseDialog>
</template>

<script setup lang="ts">
defineProps<{
  percent: number
}>()
</script>

<style scoped>
.no-animation :deep(.p-progressbar-value) {
  transition: none !important;
}
</style>
