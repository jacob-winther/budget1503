<script setup lang="ts">
import { computed, ref } from 'vue'
import BudgetToolbar from './components/BudgetToolbar.vue'
import BudgetTable from './components/BudgetTable.vue'
import ItemFormDialog from './components/ItemFormDialog.vue'
import CategoryFormDialog from './components/CategoryFormDialog.vue'
import CopyYearDialog from './components/CopyYearDialog.vue'
import { useBudgetStore } from './stores/budgetStore'
import type { BudgetItem, FlatCategoryOption, SaveCategoryPayload, SaveItemPayload, SectionType } from './types/budget'
import { createBudgetExportJson, parseBudgetImportJson } from './utils/budgetFile'

const store = useBudgetStore()

const showItemDialog = ref(false)
const itemDialogMode = ref<'create' | 'edit'>('create')
const editingItem = ref<BudgetItem | null>(null)
const creatingItemCategoryId = ref<string | null>(null)

const showCategoryDialog = ref(false)
const categoryDialogMode = ref<'create' | 'edit'>('create')
const editingCategory = ref<{ id: string; name: string; sectionType?: SectionType } | null>(null)
const editingCategoryId = ref<string | null>(null)
const editingItemId = ref<string | null>(null)

const showCopyYearDialog = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)

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

const currentYearHasEntries = computed(() => {
  return store.sections.some((section) => section.categories.some((category) => category.items.length > 0))
})

const confirmOverwriteCopy = (): boolean => {
  if (!currentYearHasEntries.value) {
    return true
  }

  return window.confirm('Current year already has budget entries. Copying will overwrite them. Continue?')
}

const openNewItemDialog = (categoryId: string | null = null) => {
  itemDialogMode.value = 'create'
  editingItem.value = null
  creatingItemCategoryId.value = categoryId
  editingCategoryId.value = null
  editingItemId.value = null
  showItemDialog.value = true
}

const openNewCategoryDialog = (sectionType: SaveCategoryPayload['sectionType'] = 'expense') => {
  categoryDialogMode.value = 'create'
  editingCategory.value = {
    id: '',
    name: '',
    sectionType,
  }
  showCategoryDialog.value = true
}

const onSaveItem = (payload: SaveItemPayload) => {
  if (itemDialogMode.value === 'edit') {
    store.editItem(payload)
  } else {
    store.addItem(payload)
  }

  creatingItemCategoryId.value = null
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
  const previousYear = store.currentYear - 1
  const hasPreviousYearData = availableCopyYears.value.includes(previousYear)

  if (hasPreviousYearData && !confirmOverwriteCopy()) {
    return
  }

  const copied = store.copyPreviousYear()

  if (!copied && availableCopyYears.value.length > 0) {
    showCopyYearDialog.value = true
  }
}

const onConfirmCopyYear = ({ fromYear, toYear }: { fromYear: number; toYear: number }) => {
  if (!confirmOverwriteCopy()) {
    return
  }

  store.copyYear(fromYear, toYear)
  showCopyYearDialog.value = false
}

const onExportBudget = () => {
  const exportJson = createBudgetExportJson({
    currentYear: store.currentYear,
    data: store.data,
  })

  const blob = new Blob([exportJson], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(blob)
  const dateStamp = new Date().toISOString().slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = `budget-${store.currentYear}-${dateStamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(downloadUrl)
}

const onImportBudgetClick = () => {
  importFileInput.value?.click()
}

const onImportBudgetSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const text = await file.text()
  const parsed = parseBudgetImportJson(text)

  if (!parsed.ok) {
    window.alert(parsed.error)
    input.value = ''
    return
  }

  const shouldOverwrite = window.confirm('Importing will replace the current budget data. Continue?')

  if (!shouldOverwrite) {
    input.value = ''
    return
  }

  store.data = parsed.payload.data
  store.setYear(parsed.payload.currentYear)
  store.saveToStorage()
  input.value = ''
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
      @import-budget="onImportBudgetClick"
      @export-budget="onExportBudget"
    />

    <input
      ref="importFileInput"
      type="file"
      accept="application/json,.json"
      style="display: none"
      @change="onImportBudgetSelected"
    />

    <div style="overflow: hidden;">
      <Transition :name="store.yearSlideDirection">
        <BudgetTable
          :key="store.currentYear"
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
          @add-category="openNewCategoryDialog"
          @toggle-category="store.toggleCategoryCollapse"
          @add-item="openNewItemDialog"
          @start-category-edit="startInlineCategoryEdit"
          @save-category-edit="saveInlineCategoryEdit"
          @cancel-category-edit="cancelInlineCategoryEdit"
          @delete-category="deleteInlineCategory"
          @start-item-edit="startInlineItemEdit"
          @save-item-edit="saveInlineItemEdit"
          @cancel-item-edit="cancelInlineItemEdit"
          @delete-item="deleteInlineItem"
        />
      </Transition>
    </div>

    <ItemFormDialog
      :visible="showItemDialog"
      :mode="itemDialogMode"
      :item="editingItem"
      :categories="flatCategories"
      :initial-category-id="creatingItemCategoryId"
      @save="onSaveItem"
      @close="showItemDialog = false; creatingItemCategoryId = null"
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
