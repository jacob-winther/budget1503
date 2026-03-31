<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'

defineProps<{
  year: number
  budgets: { id: string; name: string }[]
  currentBudgetId: string | null
}>()

const emit = defineEmits<{
  (event: 'prev-year'): void
  (event: 'next-year'): void
  (event: 'create-budget'): void
  (event: 'select-budget', id: string): void
  (event: 'rename-budget', id: string): void
  (event: 'delete-budget', id: string): void
  (event: 'copy-budget'): void
  (event: 'import-budget'): void
  (event: 'export-budget'): void
}>()

const yearHovered = ref(false)
const hoveredBudgetId = ref<string | null>(null)
</script>

<template>
  <div class="toolbar">
    <div class="year-controls">
      <Button icon="pi pi-angle-left" severity="secondary" text @click="emit('prev-year')" />
      <div
        class="year-label-wrap"
        @mouseenter="yearHovered = true"
        @mouseleave="yearHovered = false"
      >
        <span class="year-label">{{ year }}</span>
        <button
          v-show="yearHovered"
          class="year-add-btn"
          type="button"
          title="Create budget for this year"
          @click="emit('create-budget')"
        >
          <i class="pi pi-plus" />
        </button>
      </div>
      <Button icon="pi pi-angle-right" severity="secondary" text @click="emit('next-year')" />
      <Button label="Copy Budget" icon="pi pi-copy" @click="emit('copy-budget')" />
      <Button label="Import" severity="secondary" @click="emit('import-budget')" />
      <Button label="Export" severity="secondary" @click="emit('export-budget')" />
    </div>

    <div class="budget-tabs">
      <div
        v-for="budget in budgets"
        :key="budget.id"
        class="budget-tab-wrap"
        @mouseenter="hoveredBudgetId = budget.id"
        @mouseleave="hoveredBudgetId = null"
      >
        <button
          class="budget-tab"
          :class="{ active: budget.id === currentBudgetId || (!currentBudgetId && budget === budgets[0]) }"
          type="button"
          :title="`${year} · ${budget.name}`"
          @click="emit('select-budget', budget.id)"
        >
          {{ budget.name }}
        </button>
        <span v-show="hoveredBudgetId === budget.id" class="budget-tab-actions">
          <button
            class="budget-tab-action"
            type="button"
            title="Rename budget"
            @click.stop="emit('rename-budget', budget.id)"
          >
            <i class="pi pi-pencil" />
          </button>
          <button
            class="budget-tab-action budget-tab-action--delete"
            type="button"
            title="Delete budget"
            @click.stop="emit('delete-budget', budget.id)"
          >
            <i class="pi pi-trash" />
          </button>
        </span>
      </div>
    </div>
  </div>
</template>
