<script setup>
defineProps({
  section: {
    type: Object,
    required: true,
  },
  totals: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['toggle'])

const currency = (value) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
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
