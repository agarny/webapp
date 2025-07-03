<template>
  <BaseDialog header="Reset All...">
    <div class="mt-2 mb-4">You are about to reset all of your settings. Do you want to proceed?</div>
    <template #footer>
      <Button autofocus label="Yes" severity="danger" @click="$emit('resetAll')" />
      <Button label="No" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits(['resetAll', 'close'])
</script>
