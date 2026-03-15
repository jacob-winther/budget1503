<script setup lang="ts">
import Button from 'primevue/button'

defineProps<{
  year: number
}>()

const emit = defineEmits<{
  (event: 'prev-year'): void
  (event: 'next-year'): void
  (event: 'copy-prev-year'): void
  (event: 'new-category'): void
  (event: 'new-item'): void
}>()
</script>

<template>
  <div class="toolbar">
    <div class="year-controls">
      <Button icon="pi pi-angle-left" severity="secondary" text @click="emit('prev-year')" />
      <span class="year-label">{{ year }}</span>
      <Button icon="pi pi-angle-right" severity="secondary" text @click="emit('next-year')" />
      <Button label="Copy Previous Year" severity="secondary" outlined @click="emit('copy-prev-year')" />
    </div>

    <div class="action-controls">
      <Button label="New Category" icon="pi pi-folder-plus" severity="secondary" @click="emit('new-category')" />
      <Button label="New Entry" icon="pi pi-plus" @click="emit('new-item')" />
    </div>
  </div>
</template>
