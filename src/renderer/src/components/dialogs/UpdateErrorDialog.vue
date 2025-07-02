<template>
  <BaseDialog :header="title">
    <div class="mt-2 mb-4">
      {{ issue }}
    </div>
    <template #footer>
      <Button autofocus label="OK" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits(['close'])
defineProps<{
  title: string
  issue: string
}>()
</script>
