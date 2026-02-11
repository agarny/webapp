<template>
  <div class="issues-container flex flex-col border rounded-lg">
    <!-- Header -->

    <div class="issues-header flex items-center justify-between px-3.5 py-2.5 border-b">
      <div class="header-title flex items-center gap-2 text-sm font-semibold">
        <i class="pi pi-exclamation-circle"></i>
        <span>Issues</span>
        <span v-if="issues.length" class="issue-count inline-flex items-center justify-center min-w-5 h-5 px-1.5 py-0 text-xs font-semibold rounded-full text-white" :class="severityClass">{{ issues.length }}</span>
      </div>
      <div v-if="issues.length" class="flex items-center gap-3">
        <span v-if="errorCount" class="summary-item error">
          <i class="pi pi-times-circle"></i>{{ errorCount }}
        </span>
        <span v-if="warningCount" class="summary-item warning">
          <i class="pi pi-exclamation-triangle"></i>{{ warningCount }}
        </span>
        <span v-if="informationCount" class="summary-item information">
          <i class="pi pi-info-circle"></i>{{ informationCount }}
        </span>
      </div>
    </div>

    <!-- Content -->

    <div class="min-h-0">
      <!-- Empty state -->

      <div v-if="!issues.length" class="empty-state flex flex-col items-center justify-center h-full gap-1 text-sm">
        <i class="pi pi-check-circle text-2xl!"></i>
        <span>No issues found!</span>
      </div>

      <!-- Issues -->

      <ScrollPanel v-else class="h-full">
        <div class="flex flex-col gap-2 p-3">
          <div
            v-for="(issue, index) in issues"
            :key="`issue_${index}`"
            class="issue-item flex items-start gap-2 px-3 py-2 border-l-3 rounded-md"
            :class="issueSeverityClass(issue.type)"
          >
            <div class="flex shrink-0 items-center justify-center w-5 h-5 mt-0.5">
              <i :class="issueIcon(issue.type)"></i>
            </div>
            <div class="issue-content flex-1 min-w-0">
              <span v-html="issue.description" class="issue-description text-[0.8125rem] select-text"></span>
            </div>
          </div>
          <div v-if="extraSpace" class="h-2"></div>
        </div>
      </ScrollPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import * as locApi from '../../libopencor/locApi.ts';

const props = withDefaults(
  defineProps<{
    issues: locApi.IIssue[];
    extraSpace?: boolean;
  }>(),
  {
    extraSpace: true
  }
);

const errorCount = vue.computed(() => {
  return props.issues.filter((i) => i.type === locApi.EIssueType.ERROR).length;
});
const warningCount = vue.computed(() => {
  return props.issues.filter((i) => i.type === locApi.EIssueType.WARNING).length;
});
const informationCount = vue.computed(() => {
  return props.issues.filter((i) => i.type === locApi.EIssueType.INFORMATION).length;
});

const severityClass = vue.computed(() => {
  if (errorCount.value > 0) {
    return 'error';
  }

  if (warningCount.value > 0) {
    return 'warning';
  }

  return 'information';
});

const issueSeverityClass = (type: locApi.EIssueType): string => {
  switch (type) {
    case locApi.EIssueType.ERROR:
      return 'severity-error';
    case locApi.EIssueType.WARNING:
      return 'severity-warning';
    default: // locApi.EIssueType.INFORMATION.
      return 'severity-information';
  }
};

const issueIcon = (type: locApi.EIssueType): string => {
  switch (type) {
    case locApi.EIssueType.ERROR:
      return 'pi pi-times-circle';
    case locApi.EIssueType.WARNING:
      return 'pi pi-exclamation-triangle';
    default: // locApi.EIssueType.INFORMATION.
      return 'pi pi-info-circle';
  }
};
</script>

<style scoped>
.empty-state {
  color: var(--p-message-success-color);
}

.header-title {
  color: var(--p-text-color);
}

.header-title > i {
  color: var(--p-text-muted-color);
}

.issues-container {
  border-color: var(--p-content-border-color);
}

.issue-count.error {
  background-color: var(--p-message-error-color);
}

.issue-count.information {
  background-color: var(--p-message-info-color);
}

.issue-count.warning {
  background-color: var(--p-message-warn-color);
}

.issue-description {
  color: var(--p-text-color);
}

.issue-item.severity-error {
  border-color: var(--p-message-error-color);
}

.issue-item.severity-information {
  border-color: var(--p-message-info-color);
}

.issue-item.severity-warning {
  border-color: var(--p-message-warn-color);
}

.issues-header {
  border-color: var(--p-content-border-color);
}

:deep(.p-scrollpanel-content) {
  padding: 0;
}

.severity-error {
  color: var(--p-message-error-color);
}

.severity-information {
  color: var(--p-message-info-color);
}

.severity-warning {
  color: var(--p-message-warn-color);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.summary-item.error {
  color: var(--p-message-error-color);
}

.summary-item.information {
  color: var(--p-message-info-color);
}

.summary-item.warning {
  color: var(--p-message-warn-color);
}

.summary-item i {
  font-size: 0.75rem;
}
</style>
