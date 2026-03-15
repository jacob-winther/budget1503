<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BudgetItem, SectionType } from '../types/budget'
import { formatCurrency } from '../utils/formatting'
import {
  calculateMonthsAverage,
  calculateMonthsYearTotal,
  fillAllMonthsFromIndex,
  getChangedMonthIndexes,
} from '../utils/budgetItemEditing'

const props = withDefaults(
  defineProps<{
    item: BudgetItem
    sectionType?: SectionType
    yearTotal: number
    average: number
    isEditing?: boolean
  }>(),
  {
    sectionType: 'expense',
    isEditing: false,
  },
)

const emit = defineEmits<{
  (event: 'start-edit', itemId: string): void
  (
    event: 'save-edit',
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
  (event: 'cancel-edit'): void
  (event: 'delete', itemId: string): void
}>()

const draftName = ref('')
const draftMonths = ref(Array.from({ length: 12 }, () => 0))
const inlineNudge = ref<{ monthIndex: number; remainingCount: number } | null>(null)

watch(
  () => props.isEditing,
  (isEditing) => {
    if (isEditing) {
      draftName.value = props.item.name
      draftMonths.value = props.item.months.map((value) => Number(value ?? 0))
      inlineNudge.value = null
    }
  },
  { immediate: true },
)

watch(
  () => props.item,
  (item: BudgetItem) => {
    if (props.isEditing) {
      draftName.value = item.name
      draftMonths.value = item.months.map((value) => Number(value ?? 0))
      inlineNudge.value = null
    }
  },
  { deep: true },
)

const draftYearTotal = computed(() => calculateMonthsYearTotal(draftMonths.value))
const draftAverage = computed(() => calculateMonthsAverage(draftMonths.value))

const originalMonths = computed(() => props.item.months.map((value) => Number(value ?? 0)))

const onMonthFocus = (index: number) => {
  if (!props.isEditing) {
    return
  }

  inlineNudge.value = {
    monthIndex: index,
    remainingCount: 11,
  }
}

const onMonthBlur = (index: number) => {
  if (inlineNudge.value?.monthIndex === index) {
    inlineNudge.value = null
  }
}

const applyInlineNudgeFill = () => {
  if (!inlineNudge.value) {
    return
  }

  draftMonths.value = fillAllMonthsFromIndex(draftMonths.value, inlineNudge.value.monthIndex)
}

const onSaveEdit = () => {
  const nextMonths = draftMonths.value.map((value) => Number(value ?? 0))
  const changedMonthIndexes = getChangedMonthIndexes(nextMonths, originalMonths.value)

  emit('save-edit', {
    itemId: props.item.id,
    categoryId: props.item.categoryId,
    name: draftName.value.trim(),
    baseAmount: draftAverage.value,
    months: nextMonths,
    changedMonthIndexes,
    editedMonthIndex: changedMonthIndexes.length === 1 ? changedMonthIndexes[0] : null,
  })
}

</script>

<template>
  <tr class="item-row" :class="{ 'expense-item-row': sectionType === 'expense' }">
    <td class="sticky-left name-col item-name" :class="{ 'expense-item-name': sectionType === 'expense' }">
      <div class="item-row-content">
        <div class="item-main-line">
          <template v-if="isEditing">
            <input
              v-model="draftName"
              class="inline-category-input"
              type="text"
              maxlength="28"
              @keydown.enter.prevent="onSaveEdit"
              @keydown.esc.prevent="emit('cancel-edit')"
            />
            <button class="inline-action-btn" type="button" @click.stop="onSaveEdit">
              <i class="pi pi-check" />
            </button>
            <button class="inline-action-btn" type="button" @click.stop="emit('cancel-edit')">
              <i class="pi pi-times" />
            </button>
          </template>
          <template v-else>
            {{ item.name }}
            <span class="row-actions">
              <button class="inline-action-btn" type="button" @click.stop="emit('start-edit', item.id)">
                <i class="pi pi-pencil" />
              </button>
              <button class="inline-action-btn" type="button" @click.stop="emit('delete', item.id)">
                <i class="pi pi-trash" />
              </button>
            </span>
          </template>
        </div>

      </div>
    </td>
    <td v-for="(month, index) in item.months" :key="`${item.id}-${index}`" class="amount">
      <template v-if="isEditing">
        <div class="amount-input-wrap">
          <div v-if="inlineNudge && inlineNudge.monthIndex === index" class="item-inline-nudge-popover">
            <button
              class="inline-action-btn item-inline-nudge-btn"
              type="button"
              @mousedown="applyInlineNudgeFill"
            >
              Copy to all months
            </button>
          </div>
          <input
            v-model.number="draftMonths[index]"
            class="inline-amount-input"
            type="number"
            step="0.01"
            @focus="onMonthFocus(index)"
            @blur="onMonthBlur(index)"
          />
        </div>
      </template>
      <template v-else>
        {{ formatCurrency(month) }}
      </template>
    </td>
    <td class="amount strong">{{ formatCurrency(isEditing ? draftYearTotal : yearTotal) }}</td>
    <td class="amount">{{ formatCurrency(isEditing ? draftAverage : average) }}</td>
  </tr>
</template>
