<script setup lang="ts">
import type { BudgetSection, Totals } from '../types/budget'

defineProps<{
  section: BudgetSection
  totals: Totals
}>()

const emit = defineEmits<{
  (event: 'toggle', sectionId: string): void
}>()

const currency = (value: number) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
</script>

<template>
  <tr class="section-row" @click="emit('toggle', section.id)">
    <td class="sticky-left name-col section-name">
      <i class="pi" :class="section.collapsed ? 'pi-chevron-right' : 'pi-chevron-down'" />
      {{ section.name }}
    </td>
    <td v-for="(month, index) in totals.monthly" :key="`${section.id}-${index}`" class="amount">
      {{ currency(month) }}
    </td>
    <td class="amount strong">{{ currency(totals.yearly) }}</td>
    <td class="amount">{{ currency(totals.average) }}</td>
  </tr>
</template>
