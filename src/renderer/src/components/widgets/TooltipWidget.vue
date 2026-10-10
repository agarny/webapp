<template>
  <div ref="rootRef" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <slot />
    <Popover ref="popoverRef" class="tooltip" :appendTo="appendTarget" :closeOnEscape="false">
      <div class="tooltip-content" v-html="content" />
    </Popover>
  </div>
</template>

<script setup lang="ts">
import Popover from 'primevue/popover';
import * as vue from 'vue';

import * as vueCommon from '../../common/vueCommon';

const props = defineProps<{
  content: string;
}>();

const rootRef = vue.shallowRef<HTMLElement | null>(null);
const popoverRef = vue.ref<InstanceType<typeof Popover> | undefined>();
const appendTarget = vueCommon.useAppendTarget(rootRef);

const onMouseEnter = (event: MouseEvent) => {
  if (!props.content) {
    return;
  }

  popoverRef.value?.show(event, rootRef.value);
};

const onMouseLeave = () => {
  popoverRef.value?.hide();
};

vue.onBeforeUnmount(() => {
  popoverRef.value?.hide();
});
</script>

<style>
.p-popover-content {
  padding: 0 !important;
}

.tooltip-content {
  padding: 0.375rem 0.625rem !important;
  width: max-content !important;
  max-width: 20rem !important;
  font-size: 0.8rem !important;
}

.tooltip-content table {
  border-collapse: collapse !important;
  border: none !important;
  font-size: inherit !important;
}

.tooltip-content th,
.tooltip-content td {
  padding: 0.125rem 0 !important;
  vertical-align: top !important;
  border: none !important;
}

.tooltip-content td + td {
  padding-left: 0.25rem !important;
}
</style>
