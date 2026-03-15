<script setup lang="ts">
import type { Totals } from '../types/budget'

defineProps<{
  label: string
  totals: Totals
}>()

const currency = (value: number) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
</script>

<template>
  <tr class="totals-row">
    <td class="sticky-left name-col">{{ label }}</td>
    <td v-for="(month, index) in totals.monthly" :key="`${label}-${index}`" class="amount">
      {{ currency(month) }}
    </td>
    <td class="amount strong">{{ currency(totals.yearly) }}</td>
    <td class="amount">{{ currency(totals.average) }}</td>
  </tr>
</template>
