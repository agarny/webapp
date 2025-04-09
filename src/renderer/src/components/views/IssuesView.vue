<template>
  <Fieldset class="ml-4! mr-4! mb-4!" legend="Issues">
    <ScrollPanel class="issues-scroll-panel">
      <div
        v-for="(issue, index) in issues"
        :key="'issue_' + issue.type + '_' + issue.description"
        :class="index > 0 ? 'mt-4!' : ''"
      >
        <Message v-if="issue.type === locAPI.IssueType.Error" severity="error" icon="pi pi-times-circle">
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
import * as locAPI from '../../../../libopencor/locAPI'

defineProps<{
  issues: locAPI.IIssue[]
}>()
</script>

<style scoped>
.issues-scroll-panel {
  height: calc(100vh - var(--main-menu-height) - var(--file-tablist-height) - 4.75rem);
}
</style>
