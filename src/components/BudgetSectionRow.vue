<script setup lang="ts">
import type { BudgetSection, Totals } from '../types/budget'
import { formatCurrency } from '../utils/formatting'

defineProps<{
  section: BudgetSection
  totals: Totals
}>()

const emit = defineEmits<{
  (event: 'toggle', sectionId: string): void
  (event: 'add-category', sectionType: BudgetSection['type']): void
}>()
</script>

<template>
  <tr class="section-row" @click="emit('toggle', section.id)">
    <td class="sticky-left name-col section-name">
      <i
        class="pi pi-chevron-right chevron-icon"
        :class="{ 'is-collapsed': section.collapsed }"
        style="transform-origin: center"
      />
      {{ section.name }}
      <button class="inline-action-btn inline-add-btn" type="button" title="Add category" @click.stop="emit('add-category', section.type)">
        <i class="pi pi-plus" />
      </button>
    </td>
    <td v-for="(month, index) in totals.monthly" :key="`${section.id}-${index}`" class="amount">
      {{ formatCurrency(month) }}
    </td>
    <td class="amount strong">{{ formatCurrency(totals.yearly) }}</td>
    <td class="amount">{{ formatCurrency(totals.average) }}</td>
  </tr>
</template>
