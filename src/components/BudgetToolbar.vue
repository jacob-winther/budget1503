<script setup lang="ts">
import Button from 'primevue/button'

defineProps<{
  year: number
}>()

const emit = defineEmits<{
  (event: 'prev-year'): void
  (event: 'next-year'): void
  (event: 'copy-prev-year'): void
}>()
</script>

<template>
  <div class="toolbar">
    <div class="year-controls">
      <Button icon="pi pi-angle-left" severity="secondary" text @click="emit('prev-year')" />
      <span class="year-label">{{ year }}</span>
      <Button icon="pi pi-angle-right" severity="secondary" text @click="emit('next-year')" />
      <Button label="Copy Previous Year" icon="pi pi-copy" @click="emit('copy-prev-year')" />
    </div>
  </div>
</template>
