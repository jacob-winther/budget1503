<script setup lang="ts">
defineProps<{
  months: string[]
}>()
</script>

<template>
  <thead>
    <tr>
      <th class="sticky-left name-col">Budget Item</th>
      <th v-for="month in months" :key="month">{{ month }}</th>
      <th>Total / Year</th>
      <th>Avg / Month</th>
    </tr>
  </thead>
</template>
