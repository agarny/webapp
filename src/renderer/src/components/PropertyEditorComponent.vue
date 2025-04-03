<template>
  <Fieldset :legend="name">
    <DataTable
      editMode="cell"
      :pt="{
        column: {
          bodycell: ({ state }) => ({
            class: [{ '!py-0': state['d_editing'] }]
          })
        }
      }"
      resizableColumns
      showGridlines
      size="small"
      :value="properties"
      @cell-edit-complete="onCellEditComplete"
    >
      <Column field="property" header="Property" :style="columnWidth" />
      <Column field="value" header="Value" :style="columnWidth">
        <template #body="{ data, field }">
          {{ data[field as string] }}
        </template>
        <template #editor="{ data, field }">
          <InputNumber fluid :maxFractionDigits="15" v-model="data[field]" size="small" />
        </template>
      </Column>
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

function onCellEditComplete(event) {
  const { data, newValue, field } = event

  data[field] = newValue
}
</script>
