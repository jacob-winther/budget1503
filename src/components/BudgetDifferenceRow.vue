<script setup lang="ts">
import { computed } from 'vue'
import { useAnimatedNumber } from '../composables/useAnimatedNumber'

const props = defineProps<{
  monthly: number[]
  yearly: number
}>()

const currency = (value: number) =>
  Math.round(value).toLocaleString('en-US', { maximumFractionDigits: 0 })

const yearlyRef = computed(() => props.yearly)
const animatedYearly = useAnimatedNumber(yearlyRef)
const animatedAverage = useAnimatedNumber(computed(() => props.yearly / 12))

const animatedMonthly = props.monthly.map((_, i) => {
  const m = computed(() => props.monthly[i])
  return useAnimatedNumber(m)
})
</script>

<template>
  <tr class="difference-row" :class="{ negative: yearly < 0 }">
    <td class="sticky-left name-col">Difference</td>
    <td v-for="(_, index) in monthly" :key="index" class="amount" :class="{ 'cell-negative': monthly[index] < 0 }">
      {{ currency(animatedMonthly[index].displayed.value) }}
    </td>
    <td class="amount strong" :class="{ 'cell-negative': yearly < 0 }">{{ currency(animatedYearly.displayed.value) }}</td>
    <td class="amount" :class="{ 'cell-negative': yearly < 0 }">{{ currency(animatedAverage.displayed.value) }}</td>
  </tr>
</template>
