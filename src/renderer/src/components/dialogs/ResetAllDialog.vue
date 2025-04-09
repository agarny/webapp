<template>
  <BaseDialog header="Reset All..." style="width: 37rem">
    <div class="mt-2 mb-4">
      <label>You are about to reset all of your settings. Do you want to proceed?</label>
    </div>
    <template #footer>
      <Button type="button" autofocus label="Yes" severity="danger" @click="$emit('resetAll')" />
      <Button type="button" label="No" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits(['resetAll', 'close'])
</script>
