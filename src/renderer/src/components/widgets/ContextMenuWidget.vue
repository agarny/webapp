<template>
  <ContextMenu ref="contextMenuRef" :model="model" :appendTo="appendTo" :pt="CONTEXT_MENU_PT">
    <template #item="{ item, props: itemProps, hasSubmenu }">
      <a v-bind="itemProps.action">
        <i v-if="itemsWithCheckColumn.has(item)" :class="{ 'pi pi-check': item.checked }" class="context-menu-item-check" />
        <i :class="item.icon" class="context-menu-item-icon" />
        <span class="context-menu-item-label">{{ item.label }}</span>
        <i v-if="hasSubmenu" class="context-menu-item-chevron pi pi-angle-right" />
      </a>
    </template>
  </ContextMenu>
</template>

<script setup lang="ts">
import ContextMenu from 'primevue/contextmenu';
import type { MenuItem } from 'primevue/menuitem';
import * as vue from 'vue';

// A context menu, which looks like the menus of our main menu (see MainMenu.vue) and, like them, is shown without any
// animation (see .opencor-context-menu and the anchored overlays in app.css).
// Note: only one context menu should be shown at any given time, but PrimeVue only hides a context menu when the user
//       clicks outside of it, so we let our other context menus know when we are about to be shown, and we hide
//       ourselves when another context menu is about to be shown.

const props = defineProps<{
  model: MenuItem[];
  appendTo?: HTMLElement | string;
}>();

// Note: an item with a (boolean) checked property is a checkable item (e.g., to make an axis logarithmic), in which
//       case it has a check mark to the left of its icon when it is checked, and it is described as such to assistive
//       technologies (PrimeVue would otherwise describe it as a plain menu item). All the items of a menu (or submenu)
//       that has a checked item have room for a check mark, so that their icons and labels remain aligned, while the
//       items of a menu that has no checked item don't (so that no space is wasted).

interface IContextMenuItemPtOptions {
  context: {
    item?: MenuItem & { item?: MenuItem };
  };
}

// The items that have room for a check mark, i.e. the items of a menu (or submenu) that has a checked item.

const itemsWithCheckColumn = vue.computed<WeakSet<MenuItem>>(() => {
  const res = new WeakSet<MenuItem>();
  const addItems = (items: MenuItem[]): void => {
    const hasCheckedItem = items.some((item: MenuItem) => item.checked === true);

    for (const item of items) {
      if (hasCheckedItem) {
        res.add(item);
      }

      if (item.items) {
        addItems(item.items as MenuItem[]);
      }
    }
  };

  addItems(props.model);

  return res;
});

const CONTEXT_MENU_PT = {
  root: {
    class: 'opencor-context-menu'
  },
  item: ({ context }: IContextMenuItemPtOptions) => {
    const item = context.item?.item ?? context.item;

    return item?.checked === undefined
      ? {}
      : {
          role: 'menuitemcheckbox',
          'aria-checked': !!item.checked
        };
  }
};

const CONTEXT_MENU_SHOW_EVENT = 'opencor-context-menu-show';

const contextMenuId = Symbol('ContextMenuWidget');
const contextMenuRef = vue.ref<InstanceType<typeof ContextMenu> | null>(null);

const show = (event: MouseEvent): void => {
  window.dispatchEvent(
    new CustomEvent(CONTEXT_MENU_SHOW_EVENT, {
      detail: {
        sourceId: contextMenuId
      }
    })
  );

  contextMenuRef.value?.show(event);
};

const hide = (): void => {
  contextMenuRef.value?.hide();
};

const onContextMenuShow = (event: Event): void => {
  if ((event as CustomEvent<{ sourceId?: symbol }>).detail?.sourceId !== contextMenuId) {
    hide();
  }
};

vue.onMounted(() => {
  window.addEventListener(CONTEXT_MENU_SHOW_EVENT, onContextMenuShow);
});

vue.onUnmounted(() => {
  window.removeEventListener(CONTEXT_MENU_SHOW_EVENT, onContextMenuShow);
});

defineExpose({ hide, show });
</script>
