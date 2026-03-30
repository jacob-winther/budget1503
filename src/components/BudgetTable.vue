<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
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
  (event: 'move-item', payload: { itemId: string; newCategoryId: string }): void
}>()

function onItemAdd(evt: { newDraggableIndex?: number }, category: BudgetCategory) {
  const index = evt.newDraggableIndex ?? 0
  const item = category.items[index]
  if (item) {
    emit('move-item', { itemId: item.id, newCategoryId: category.id })
  }
}
</script>

<template>
  <div class="table-wrap">
    <table class="budget-table">
      <BudgetTableHeader :months="months" />

      <template v-for="section in sections" :key="section.id">
        <!-- Section row in its own tbody -->
        <tbody>
          <BudgetSectionRow
            :section="section"
            :totals="getSectionTotals(section)"
            @toggle="emit('toggle-section', $event)"
            @add-category="emit('add-category', $event)"
          />
        </tbody>

        <template v-for="(category, catIndex) in section.categories" :key="category.id">
          <!-- Category row in its own tbody (animates in/out with section collapse) -->
          <Transition name="row">
            <tbody v-if="!section.collapsed" :style="{ transitionDelay: `${catIndex * 30}ms` }">
              <BudgetCategoryRow
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
            </tbody>
          </Transition>

          <!-- Items draggable list — one tbody per category -->
          <VueDraggable
            v-if="!category.collapsed && !section.collapsed"
            v-model="category.items"
            tag="tbody"
            group="budget-items"
            @add="(evt) => onItemAdd(evt, category)"
          >
            <BudgetItemRow
              v-for="(item, itemIndex) in category.items"
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
          </VueDraggable>
        </template>
      </template>

      <!-- Totals in their own tbody -->
      <tbody>
        <BudgetTotalsRow label="Total Expenses" :totals="expenseTotals" />
        <BudgetTotalsRow label="Total Income" :totals="incomeTotals" />
        <BudgetDifferenceRow :monthly="differenceMonthly" :yearly="differenceYearly" />
      </tbody>
    </table>
  </div>
</template>
