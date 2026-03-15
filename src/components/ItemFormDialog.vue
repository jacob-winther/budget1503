<script setup>
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  mode: {
    type: String,
    default: 'create',
  },
  item: {
    type: Object,
    default: null,
  },
  categories: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['save', 'close'])

const NEW_CATEGORY_VALUE = '__new_category__'

const selectedCategoryId = ref('')
const newCategoryName = ref('')
const newCategorySectionType = ref('expense')
const name = ref('')
const baseAmount = ref(0)
const useOverrides = ref(false)
const months = ref(Array.from({ length: 12 }, () => 0))

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const categoryOptions = computed(() => [
  ...props.categories.map((category) => ({ label: category.name, value: category.id })),
  { label: '+ Create category', value: NEW_CATEGORY_VALUE },
])

const isCreatingCategory = computed(() => selectedCategoryId.value === NEW_CATEGORY_VALUE)

const resetState = () => {
  selectedCategoryId.value = props.categories[0]?.id ?? ''
  newCategoryName.value = ''
  newCategorySectionType.value = 'expense'
  name.value = ''
  baseAmount.value = 0
  useOverrides.value = false
  months.value = Array.from({ length: 12 }, () => 0)

  if (props.item) {
    selectedCategoryId.value = props.item.categoryId
    name.value = props.item.name
    baseAmount.value = props.item.baseAmount
    months.value = [...props.item.months]
    useOverrides.value = props.item.months.some((value) => Number(value) !== Number(props.item.baseAmount))
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
  if (!useOverrides.value) {
    months.value = Array.from({ length: 12 }, () => Number(value ?? 0))
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
  })
}

const canSave = computed(() => {
  if (!name.value.trim()) {
    return false
  }

  if (isCreatingCategory.value) {
    return Boolean(newCategoryName.value.trim() && newCategorySectionType.value)
  }

  return Boolean(selectedCategoryId.value)
})
</script>

<template>
  <Dialog :visible="visible" modal :header="mode === 'edit' ? 'Edit Item' : 'New Item'" :style="{ width: '44rem' }" @update:visible="emit('close')">
    <div class="dialog-grid">
      <label>
        <span>Name</span>
        <InputText v-model="name" class="w-full" />
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
        <span>Base Monthly Amount</span>
        <InputNumber v-model="baseAmount" mode="decimal" :min="0" class="w-full" />
      </label>
    </div>

    <div class="override-toggle">
      <Button
        :label="useOverrides ? 'Disable Monthly Overrides' : 'Enable Monthly Overrides'"
        severity="secondary"
        text
        @click="onToggleOverrides"
      />
    </div>

    <div v-if="useOverrides" class="month-grid">
      <label v-for="(monthLabel, index) in labels" :key="monthLabel">
        <span>{{ monthLabel }}</span>
        <InputNumber v-model="months[index]" mode="decimal" :min="0" class="w-full" />
      </label>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emit('close')" />
      <Button label="Save" :disabled="!canSave" @click="onSave" />
    </template>
  </Dialog>
</template>
