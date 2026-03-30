<script setup lang="ts">
import BudgetTableHeader from './BudgetTableHeader.vue'
import BudgetSectionRow from './BudgetSectionRow.vue'
import BudgetCategoryRow from './BudgetCategoryRow.vue'
import BudgetItemRow from './BudgetItemRow.vue'
import BudgetTotalsRow from './BudgetTotalsRow.vue'
import BudgetDifferenceRow from './BudgetDifferenceRow.vue'
import type { BudgetCategory, BudgetItem, BudgetSection, Totals } from '../types/budget'

withDefaults(
  defineProps<{
    months: string[]
    sections: BudgetSection[]
    expenseTotals: Totals
    incomeTotals: Totals
    differenceMonthly: number[]
    differenceYearly: number
    editingCategoryId?: string | null
    editingItemId?: string | null
    getSectionTotals: (section: BudgetSection) => Totals
    getCategoryTotals: (category: BudgetCategory) => Totals
    getItemYearTotal: (item: BudgetItem) => number
    getItemMonthlyAverage: (item: BudgetItem) => number
  }>(),
  {
    editingCategoryId: null,
    editingItemId: null,
  },
)

const emit = defineEmits<{
  (event: 'toggle-section', sectionId: string): void
  (event: 'add-category', sectionType: BudgetSection['type']): void
  (event: 'toggle-category', categoryId: string): void
  (event: 'add-item', categoryId: string): void
  (event: 'start-category-edit', categoryId: string): void
  (event: 'save-category-edit', payload: { categoryId: string; name: string }): void
  (event: 'cancel-category-edit'): void
  (event: 'delete-category', categoryId: string): void
  (event: 'start-item-edit', itemId: string): void
  (
    event: 'save-item-edit',
    payload: {
      itemId: string
      categoryId: string
      name: string
      baseAmount: number
      months: number[]
      changedMonthIndexes: number[]
      editedMonthIndex: number | null
    },
  ): void
  (event: 'cancel-item-edit'): void
  (event: 'delete-item', itemId: string): void
}>()

// Stagger helpers for TransitionGroup
function onRowBeforeEnter(el: Element) {
  const index = parseInt((el as HTMLElement).dataset.index ?? '0', 10)
  ;(el as HTMLElement).style.transitionDelay = `${index * 30}ms`
}
function onRowAfterEnter(el: Element) {
  ;(el as HTMLElement).style.transitionDelay = ''
}

// New-row highlight flash
function onItemEnter(el: Element) {
  const row = el as HTMLElement
  row.classList.add('row-new-highlight')
  setTimeout(() => row.classList.remove('row-new-highlight'), 650)
}
</script>

<template>
  <div class="table-wrap">
    <table class="budget-table">
      <BudgetTableHeader :months="months" />
      <tbody>
        <template v-for="section in sections" :key="section.id">
          <BudgetSectionRow
            :section="section"
            :totals="getSectionTotals(section)"
            @toggle="emit('toggle-section', $event)"
            @add-category="emit('add-category', $event)"
          />

          <!-- Categories animate in/out when section collapses/expands -->
          <template v-for="(category, catIndex) in section.categories" :key="category.id">
            <Transition name="row">
              <BudgetCategoryRow
                v-if="!section.collapsed"
                :style="{ transitionDelay: `${catIndex * 30}ms` }"
                :category="category"
                :totals="getCategoryTotals(category)"
                :is-editing="editingCategoryId === category.id"
                @toggle="emit('toggle-category', $event)"
                @add-item="emit('add-item', $event)"
                @start-edit="emit('start-category-edit', $event)"
                @save-edit="emit('save-category-edit', $event)"
                @cancel-edit="emit('cancel-category-edit')"
                @delete="emit('delete-category', $event)"
              />
            </Transition>

            <!-- Items animate in/out when category collapses/expands, and on add/delete -->
            <TransitionGroup
              name="row"
              @before-enter="onRowBeforeEnter"
              @after-enter="onRowAfterEnter"
              @enter="onItemEnter"
            >
              <BudgetItemRow
                v-for="(item, itemIndex) in (category.collapsed || section.collapsed) ? [] : category.items"
                :key="item.id"
                :data-index="itemIndex"
                :item="item"
                :section-type="section.type"
                :year-total="getItemYearTotal(item)"
                :average="getItemMonthlyAverage(item)"
                :is-editing="editingItemId === item.id"
                @start-edit="emit('start-item-edit', $event)"
                @save-edit="emit('save-item-edit', $event)"
                @cancel-edit="emit('cancel-item-edit')"
                @delete="emit('delete-item', $event)"
              />
            </TransitionGroup>
          </template>
        </template>

        <BudgetTotalsRow label="Total Expenses" :totals="expenseTotals" />
        <BudgetTotalsRow label="Total Income" :totals="incomeTotals" />
        <BudgetDifferenceRow :monthly="differenceMonthly" :yearly="differenceYearly" />
      </tbody>
    </table>
  </div>
</template>
