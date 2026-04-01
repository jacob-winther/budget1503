<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import type { BudgetItem, FlatCategoryOption, ItemFrequency, MonthIndex, SaveItemPayload, SectionType, Weekday } from '../types/budget'

const props = withDefaults(
  defineProps<{
    visible: boolean
    mode?: 'create' | 'edit'
    item?: BudgetItem | null
    categories: FlatCategoryOption[]
    initialCategoryId?: string | null
  }>(),
  {
    mode: 'create',
    item: null,
    initialCategoryId: null,
  },
)

const emit = defineEmits<{
  (event: 'save', payload: SaveItemPayload): void
  (event: 'close'): void
}>()

const NEW_CATEGORY_VALUE = '__new_category__'

const selectedCategoryId = ref('')
const newCategoryName = ref('')
const newCategorySectionType = ref<SectionType>('expense')
const name = ref('')
const baseAmount = ref(0)
const useOverrides = ref(false)
const months = ref(Array.from({ length: 12 }, () => 0))
const frequency = ref<ItemFrequency>('monthly')
const weekday = ref<Weekday>(1)
const quarterStartMonth = ref<MonthIndex>(0)

const labels: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const frequencyOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

const weekdayOptions = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
]

const monthOptions = labels.map((label, index) => ({ label, value: index }))

const amountLabel = computed(() => {
  if (frequency.value === 'weekly') return 'Amount per week'
  if (frequency.value === 'quarterly') return 'Amount per quarter'
  return 'Amount per month'
})

const categoryOptions = computed(() => [
  ...props.categories.map((category) => ({ label: category.name, value: category.id })),
  { label: '+ Create category', value: NEW_CATEGORY_VALUE },
])

const isCreatingCategory = computed(() => selectedCategoryId.value === NEW_CATEGORY_VALUE)

const resetState = () => {
  selectedCategoryId.value = props.initialCategoryId ?? props.categories[0]?.id ?? ''
  newCategoryName.value = ''
  newCategorySectionType.value = 'expense'
  name.value = ''
  baseAmount.value = 0
  useOverrides.value = false
  months.value = Array.from({ length: 12 }, () => 0)
  frequency.value = 'monthly'
  weekday.value = 1
  quarterStartMonth.value = 0

  if (props.item) {
    const item = props.item
    selectedCategoryId.value = item.categoryId
    name.value = item.name
    baseAmount.value = item.baseAmount
    months.value = [...item.months]
    frequency.value = item.frequency ?? 'monthly'
    weekday.value = item.weekday ?? 1
    quarterStartMonth.value = item.quarterStartMonth ?? 0
    useOverrides.value =
      item.frequency === 'monthly' && item.months.some((value) => Number(value) !== Number(item.baseAmount))
  }
}

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      resetState()
    }
  },
)

watch(baseAmount, (value) => {
  if (!useOverrides.value && frequency.value === 'monthly') {
    months.value = Array.from({ length: 12 }, () => Number(value ?? 0))
  }
})

watch(frequency, (value) => {
  if (value !== 'monthly') {
    useOverrides.value = false
    months.value = Array.from({ length: 12 }, () => Number(baseAmount.value ?? 0))
  }
})

const onToggleOverrides = () => {
  useOverrides.value = !useOverrides.value
  if (!useOverrides.value) {
    months.value = Array.from({ length: 12 }, () => Number(baseAmount.value ?? 0))
  }
}

const onSave = () => {
  const categoryId = isCreatingCategory.value ? '' : selectedCategoryId.value

  emit('save', {
    itemId: props.item?.id,
    categoryId,
    categoryName: isCreatingCategory.value ? newCategoryName.value.trim() : '',
    sectionType: isCreatingCategory.value ? newCategorySectionType.value : undefined,
    name: name.value.trim(),
    baseAmount: Number(baseAmount.value ?? 0),
    months: months.value.map((value) => Number(value ?? 0)),
    frequency: frequency.value,
    weekday: frequency.value === 'weekly' ? weekday.value : undefined,
    quarterStartMonth: frequency.value === 'quarterly' ? quarterStartMonth.value : undefined,
  })
}

const canSave = computed(() => {
  if (!name.value.trim()) return false
  if (isCreatingCategory.value) {
    return Boolean(newCategoryName.value.trim() && newCategorySectionType.value)
  }
  return Boolean(selectedCategoryId.value)
})

const onDialogKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return
  if ((event.target as HTMLElement).closest('button')) return
  if (!canSave.value) return
  onSave()
}
</script>

<template>
  <Dialog
    :visible="visible"
    :pt="{
      transition: { name: 'dialog' },
      mask: { class: 'dialog-mask-transition' },
    }"
    modal
    :header="mode === 'edit' ? 'Edit Item' : 'New Item'"
    :style="{ width: '44rem' }"
    @update:visible="emit('close')"
    @keydown="onDialogKeydown"
  >
    <div class="dialog-grid">
      <label>
        <span>Name</span>
        <InputText v-model="name" class="w-full" :maxlength="28" />
      </label>

      <label>
        <span>Category</span>
        <Select v-model="selectedCategoryId" :options="categoryOptions" option-label="label" option-value="value" class="w-full" />
      </label>

      <template v-if="isCreatingCategory">
        <label>
          <span>New Category Name</span>
          <InputText v-model="newCategoryName" class="w-full" />
        </label>

        <label>
          <span>Category Type</span>
          <Select
            v-model="newCategorySectionType"
            :options="[
              { label: 'Expenses', value: 'expense' },
              { label: 'Income', value: 'income' },
            ]"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </label>
      </template>

      <label>
        <span>Frequency</span>
        <SelectButton v-model="frequency" :options="frequencyOptions" option-label="label" option-value="value" :allow-empty="false" />
      </label>

      <label>
        <span>{{ amountLabel }}</span>
        <InputNumber v-model="baseAmount" mode="decimal" :min="0" class="w-full" />
      </label>

      <label v-if="frequency === 'weekly'">
        <span>Payment day</span>
        <Select v-model="weekday" :options="weekdayOptions" option-label="label" option-value="value" class="w-full" />
      </label>

      <label v-if="frequency === 'quarterly'">
        <span>First payment month</span>
        <Select v-model="quarterStartMonth" :options="monthOptions" option-label="label" option-value="value" class="w-full" />
      </label>
    </div>

    <template v-if="frequency === 'monthly'">
      <div class="override-section">
        <button type="button" class="override-section-title" @click="onToggleOverrides">
          <i class="pi" :class="useOverrides ? 'pi-chevron-down' : 'pi-chevron-right'" />
          Monthly overrides
        </button>

        <div v-if="useOverrides" class="month-grid">
          <label v-for="(monthLabel, index) in labels" :key="monthLabel" class="month-grid-label">
            <span>{{ monthLabel }}</span>
            <InputNumber v-model="months[index]" mode="decimal" :min="0" class="w-full"/>
          </label>
        </div>
      </div>
    </template>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emit('close')" />
      <Button label="Save" :disabled="!canSave" @click="onSave" />
    </template>
  </Dialog>
</template>
