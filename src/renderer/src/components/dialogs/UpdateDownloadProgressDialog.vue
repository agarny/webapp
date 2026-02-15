<template>
  <BaseDialog header="Downloading Update..." :closable="false" :closeOnEscape="false" style="width: 39rem;">
    <ProgressBar class="h-3! mb-5"
      :showValue="false"
      :value="percent"
      :pt="{
        value: {
          style: 'transition: none'
        }
      }"
    />
  </BaseDialog>
</template>

<script setup lang="ts">
defineProps<{
  percent: number;
}>();
</script>
