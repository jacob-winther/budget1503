<script setup>
import BudgetTableHeader from './BudgetTableHeader.vue'
import BudgetSectionRow from './BudgetSectionRow.vue'
import BudgetCategoryRow from './BudgetCategoryRow.vue'
import BudgetItemRow from './BudgetItemRow.vue'
import BudgetTotalsRow from './BudgetTotalsRow.vue'
import BudgetDifferenceRow from './BudgetDifferenceRow.vue'

defineProps({
  months: {
    type: Array,
    required: true,
  },
  sections: {
    type: Array,
    required: true,
  },
  expenseTotals: {
    type: Object,
    required: true,
  },
  incomeTotals: {
    type: Object,
    required: true,
  },
  differenceMonthly: {
    type: Array,
    required: true,
  },
  differenceYearly: {
    type: Number,
    required: true,
  },
  editingCategoryId: {
    type: String,
    default: null,
  },
  editingItemId: {
    type: String,
    default: null,
  },
  getSectionTotals: {
    type: Function,
    required: true,
  },
  getCategoryTotals: {
    type: Function,
    required: true,
  },
  getItemYearTotal: {
    type: Function,
    required: true,
  },
  getItemMonthlyAverage: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'toggle-section',
  'toggle-category',
  'start-category-edit',
  'save-category-edit',
  'cancel-category-edit',
  'delete-category',
  'start-item-edit',
  'save-item-edit',
  'cancel-item-edit',
  'delete-item',
])
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
          />

          <template v-if="!section.collapsed">
            <template v-for="category in section.categories" :key="category.id">
              <BudgetCategoryRow
                :category="category"
                :totals="getCategoryTotals(category)"
                :is-editing="editingCategoryId === category.id"
                @toggle="emit('toggle-category', $event)"
                @start-edit="emit('start-category-edit', $event)"
                @save-edit="emit('save-category-edit', $event)"
                @cancel-edit="emit('cancel-category-edit')"
                @delete="emit('delete-category', $event)"
              />

              <template v-if="!category.collapsed">
                <BudgetItemRow
                  v-for="item in category.items"
                  :key="item.id"
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
              </template>
            </template>
          </template>
        </template>

        <BudgetTotalsRow label="Total Expenses" :totals="expenseTotals" />
        <BudgetTotalsRow label="Total Income" :totals="incomeTotals" />
        <BudgetDifferenceRow :monthly="differenceMonthly" :yearly="differenceYearly" />
      </tbody>
    </table>
  </div>
</template>
