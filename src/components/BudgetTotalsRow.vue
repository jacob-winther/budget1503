<script setup lang="ts">
import { computed } from 'vue'
import type { Totals } from '../types/budget'
import { formatCurrency } from '../utils/formatting'
import { useAnimatedNumber } from '../composables/useAnimatedNumber'

const props = defineProps<{
  label: string
  totals: Totals
}>()

const yearly = computed(() => props.totals.yearly)
const average = computed(() => props.totals.average)
const animatedYearly = useAnimatedNumber(yearly)
const animatedAverage = useAnimatedNumber(average)

const animatedMonthly = props.totals.monthly.map((_, i) => {
  const m = computed(() => props.totals.monthly[i])
  return useAnimatedNumber(m)
})
</script>

<template>
  <tr class="totals-row">
    <td class="sticky-left name-col">{{ label }}</td>
    <td
      v-for="(_, index) in totals.monthly"
      :key="`${label}-${index}`"
      class="amount"
    >
      {{ formatCurrency(animatedMonthly[index].displayed.value) }}
    </td>
    <td class="amount strong">{{ formatCurrency(animatedYearly.displayed.value) }}</td>
    <td class="amount">{{ formatCurrency(animatedAverage.displayed.value) }}</td>
  </tr>
</template>
