<template>
  <Fieldset :class="`${leftMargin ? 'ml-4!' : ''} ${rightMargin ? 'mr-4!' : ''} issues`"
    legend="Issues"
    :pt="{
      contentContainer: {
        class: 'h-full'
      },
      content: {
        class: 'h-full'
      }
    }"
  >
    <ScrollPanel class="h-full">
      <div v-for="(issue, index) in issues" :key="`issue_${index}`" :class="`select-text ${index ? 'mt-4!' : ''}`">
        <Message v-if="issue.type === locApi.EIssueType.ERROR" severity="error" icon="pi pi-times-circle">
          {{ issue.description }}
        </Message>
        <Message v-else severity="warn" icon="pi pi-exclamation-triangle">
          {{ issue.description }}
        </Message>
      </div>
    </ScrollPanel>
  </Fieldset>
</template>

<script setup lang="ts">
import * as locApi from '../../libopencor/locApi.ts';

withDefaults(
  defineProps<{
    issues: locApi.IIssue[];
    leftMargin?: boolean;
    rightMargin?: boolean;
  }>(),
  {
    leftMargin: true,
    rightMargin: true
  }
);
</script>

<style scoped>
.issues {
  height: calc(100% - 1rem);
}
</style>
