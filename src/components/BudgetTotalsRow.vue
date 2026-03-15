<script setup lang="ts">
import type { Totals } from '../types/budget'
import { formatCurrency } from '../utils/formatting'

defineProps<{
  label: string
  totals: Totals
}>()
</script>

<template>
  <tr class="totals-row">
    <td class="sticky-left name-col">{{ label }}</td>
    <td v-for="(month, index) in totals.monthly" :key="`${label}-${index}`" class="amount">
      {{ formatCurrency(month) }}
    </td>
    <td class="amount strong">{{ formatCurrency(totals.yearly) }}</td>
    <td class="amount">{{ formatCurrency(totals.average) }}</td>
  </tr>
</template>
