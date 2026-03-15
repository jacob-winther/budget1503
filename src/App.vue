<script setup lang="ts">
import { computed, ref } from 'vue'
import BudgetToolbar from './components/BudgetToolbar.vue'
import BudgetTable from './components/BudgetTable.vue'
import ItemFormDialog from './components/ItemFormDialog.vue'
import CategoryFormDialog from './components/CategoryFormDialog.vue'
import CopyYearDialog from './components/CopyYearDialog.vue'
import { useBudgetStore } from './stores/budgetStore'
import type { BudgetItem, FlatCategoryOption, SaveCategoryPayload, SaveItemPayload } from './types/budget'

const store = useBudgetStore()

const showItemDialog = ref(false)
const itemDialogMode = ref<'create' | 'edit'>('create')
const editingItem = ref<BudgetItem | null>(null)

const showCategoryDialog = ref(false)
const categoryDialogMode = ref<'create' | 'edit'>('create')
const editingCategory = ref(null)
const editingCategoryId = ref<string | null>(null)
const editingItemId = ref<string | null>(null)

const showCopyYearDialog = ref(false)

const flatCategories = computed<FlatCategoryOption[]>(() => {
  return store.sections.flatMap((section) =>
    section.categories.map((category) => ({
      id: category.id,
      name: `${section.name} / ${category.name}`,
      sectionType: section.type,
    })),
  )
})

const availableCopyYears = computed(() => {
  return Object.keys(store.data)
    .map((value) => Number(value))
    .filter((year) => Number.isFinite(year) && year !== store.currentYear)
    .sort((a, b) => b - a)
})

const openNewItemDialog = () => {
  itemDialogMode.value = 'create'
  editingItem.value = null
  editingCategoryId.value = null
  editingItemId.value = null
  showItemDialog.value = true
}

const openNewCategoryDialog = () => {
  categoryDialogMode.value = 'create'
  editingCategory.value = null
  showCategoryDialog.value = true
}

const onSaveItem = (payload: SaveItemPayload) => {
  if (itemDialogMode.value === 'edit') {
    store.editItem(payload)
  } else {
    store.addItem(payload)
  }

  showItemDialog.value = false
}

const startInlineCategoryEdit = (categoryId: string) => {
  editingCategoryId.value = categoryId
  editingItemId.value = null
}

const cancelInlineCategoryEdit = () => {
  editingCategoryId.value = null
}

const saveInlineCategoryEdit = ({ categoryId, name }: { categoryId: string; name: string }) => {
  const trimmedName = String(name ?? '').trim()

  if (!trimmedName) {
    return
  }

  const updated = store.editCategory({
    categoryId,
    name: trimmedName,
  })

  if (updated) {
    editingCategoryId.value = null
  }
}

const deleteInlineCategory = (categoryId: string) => {
  const confirmation = window.confirm('Delete selected entry?')

  if (!confirmation) {
    return
  }

  store.deleteCategory(categoryId)

  if (editingCategoryId.value === categoryId) {
    editingCategoryId.value = null
  }
}

const startInlineItemEdit = (itemId: string) => {
  editingItemId.value = itemId
  editingCategoryId.value = null
}

const cancelInlineItemEdit = () => {
  editingItemId.value = null
}

const saveInlineItemEdit = (payload: SaveItemPayload) => {
  const updated = store.editItem(payload)

  if (updated) {
    editingItemId.value = null
  }
}

const deleteInlineItem = (itemId: string) => {
  const confirmation = window.confirm('Delete selected entry?')

  if (!confirmation) {
    return
  }

  store.deleteItem(itemId)

  if (editingItemId.value === itemId) {
    editingItemId.value = null
  }
}

const onSaveCategory = (payload: SaveCategoryPayload) => {
  if (categoryDialogMode.value === 'edit') {
    store.editCategory(payload)
  } else {
    store.addCategory({
      sectionType: payload.sectionType ?? 'expense',
      name: payload.name,
    })
  }

  showCategoryDialog.value = false
}

const onCopyPreviousYear = () => {
  const copied = store.copyPreviousYear()

  if (!copied && availableCopyYears.value.length > 0) {
    showCopyYearDialog.value = true
  }
}

const onConfirmCopyYear = ({ fromYear, toYear }: { fromYear: number; toYear: number }) => {
  store.copyYear(fromYear, toYear)
  showCopyYearDialog.value = false
}
</script>

<template>
  <main class="page">
    <h1>Budget Planner</h1>

    <BudgetToolbar
      :year="store.currentYear"
      @prev-year="store.goToPreviousYear"
      @next-year="store.goToNextYear"
      @copy-prev-year="onCopyPreviousYear"
      @new-category="openNewCategoryDialog"
      @new-item="openNewItemDialog"
    />

    <BudgetTable
      :months="store.MONTHS"
      :sections="store.sections"
      :expense-totals="store.expenseTotals"
      :income-totals="store.incomeTotals"
      :difference-monthly="store.monthlyDifference"
      :difference-yearly="store.differenceYearly"
      :editing-category-id="editingCategoryId"
      :editing-item-id="editingItemId"
      :get-section-totals="store.getSectionTotals"
      :get-category-totals="store.getCategoryTotals"
      :get-item-year-total="store.getItemYearTotal"
      :get-item-monthly-average="store.getItemMonthlyAverage"
      @toggle-section="store.toggleSectionCollapse"
      @toggle-category="store.toggleCategoryCollapse"
      @start-category-edit="startInlineCategoryEdit"
      @save-category-edit="saveInlineCategoryEdit"
      @cancel-category-edit="cancelInlineCategoryEdit"
      @delete-category="deleteInlineCategory"
      @start-item-edit="startInlineItemEdit"
      @save-item-edit="saveInlineItemEdit"
      @cancel-item-edit="cancelInlineItemEdit"
      @delete-item="deleteInlineItem"
    />

    <ItemFormDialog
      :visible="showItemDialog"
      :mode="itemDialogMode"
      :item="editingItem"
      :categories="flatCategories"
      @save="onSaveItem"
      @close="showItemDialog = false"
    />

    <CategoryFormDialog
      :visible="showCategoryDialog"
      :mode="categoryDialogMode"
      :category="editingCategory"
      @save="onSaveCategory"
      @close="showCategoryDialog = false"
    />

    <CopyYearDialog
      :visible="showCopyYearDialog"
      :current-year="store.currentYear"
      :years="availableCopyYears"
      @confirm="onConfirmCopyYear"
      @close="showCopyYearDialog = false"
    />
  </main>
</template>
