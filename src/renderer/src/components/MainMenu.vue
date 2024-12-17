<template>
  <Menubar id="mainMenu" :model="items" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const emit = defineEmits(['about'])

const items = ref([
  {
    label: 'File',
    items: [
      { label: 'New', icon: 'pi pi-fw pi-plus' },
      { label: 'Open', icon: 'pi pi-fw pi-folder-open' },
      { label: 'Quit', icon: 'pi pi-fw pi-times' },
      { label: 'Some rather super extra long menu item...', icon: 'pi pi-fw pi-times' },
      { separator: true },
      {
        label: 'File',
        items: [
          { label: 'New', icon: 'pi pi-fw pi-plus' },
          { label: 'Open', icon: 'pi pi-fw pi-folder-open' },
          {
            label: 'File',
            items: [
              { label: 'New', icon: 'pi pi-fw pi-plus' },
              { label: 'Open', icon: 'pi pi-fw pi-folder-open' },
              { label: 'Quit', icon: 'pi pi-fw pi-times' }
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', icon: 'pi pi-fw pi-rotate-left' },
      { label: 'Redo', icon: 'pi pi-fw pi-rotate-right' }
    ]
  },
  {
    label: 'View'
  },
  {
    label: 'Help',
    items: [
      {
        label: 'Home Page',
        icon: 'pi pi-fw pi-home',
        command: () => {
          window.open('https://opencor.ws/')
        }
      },
      { separator: true },
      {
        label: 'About OpenCOR',
        icon: 'pi pi-fw pi-info',
        command: () => {
          emit('about')
        }
      }
    ]
  }
])

// Never display our menu as a hamburger menu.

onMounted(() => {
  const mainMenu = document.getElementById('mainMenu')

  if (mainMenu) {
    const observer = new MutationObserver(() => {
      if (mainMenu.className.includes('p-menubar-mobile')) {
        mainMenu.classList.remove('p-menubar-mobile')
      }
    })

    observer.observe(mainMenu, { attributes: true })
  }
})
</script>
