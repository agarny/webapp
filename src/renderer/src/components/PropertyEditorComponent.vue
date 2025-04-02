<template>
  <Fieldset :legend="name">
    <DataTable showGridlines size="small" :value="properties">
      <Column field="property" header="Property"></Column>
      <Column field="value" header="Value"></Column>
      <Column v-if="hasUnits" field="unit" header="Unit"></Column>
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
</script>
