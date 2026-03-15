<script setup>
defineProps({
  monthly: {
    type: Array,
    required: true,
  },
  yearly: {
    type: Number,
    required: true,
  },
})

const currency = (value) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
</script>

<template>
  <tr class="difference-row" :class="{ negative: yearly < 0 }">
    <td class="sticky-left name-col">Difference (Income - Expenses)</td>
    <td v-for="(value, index) in monthly" :key="index" class="amount">
      {{ currency(value) }}
    </td>
    <td class="amount strong">{{ currency(yearly) }}</td>
    <td class="amount">{{ currency(yearly / 12) }}</td>
  </tr>
</template>
