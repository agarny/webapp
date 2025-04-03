<template>
  <Fieldset :legend="name">
    <DataTable resizableColumns showGridlines size="small" :value="properties">
      <Column field="property" header="Property" :style="columnWidth" />
      <Column field="value" header="Value" :style="columnWidth" />
      <Column v-if="hasUnits" field="unit" header="Unit" :style="columnWidth" />
    </DataTable>
  </Fieldset>
</template>

<script setup lang="ts">
interface Props {
  name: string
  hasUnits?: boolean
  properties: {
    property: string
    value: number
    unit?: string
  }[]
}

const { hasUnits = true } = defineProps<Props>()
const columnWidth = 'width: calc(100% / ' + (hasUnits ? '3' : '2') + ')'
</script>
