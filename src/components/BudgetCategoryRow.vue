<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BudgetCategory, Totals } from '../types/budget'
import { formatCurrency } from '../utils/formatting'

const props = withDefaults(
  defineProps<{
    category: BudgetCategory
    totals: Totals
    isEditing?: boolean
  }>(),
  {
    isEditing: false,
  },
)

const emit = defineEmits<{
  (event: 'toggle', categoryId: string): void
  (event: 'add-item', categoryId: string): void
  (event: 'start-edit', categoryId: string): void
  (event: 'save-edit', payload: { categoryId: string; name: string }): void
  (event: 'cancel-edit'): void
  (event: 'delete', categoryId: string): void
}>()

const draftName = ref('')

watch(
  () => props.isEditing,
  (isEditing) => {
    if (isEditing) {
      draftName.value = props.category.name
    }
  },
)

watch(
  () => props.category.name,
  (name) => {
    if (props.isEditing) {
      draftName.value = name
    }
  },
)

const onSaveEdit = () => {
  emit('save-edit', { categoryId: props.category.id, name: draftName.value.trim() })
}

</script>

<template>
  <tr class="category-row">
    <td class="sticky-left name-col category-name">
      <button class="collapse-btn" type="button" @click.stop="emit('toggle', category.id)">
        <i class="pi" :class="category.collapsed ? 'pi-chevron-right' : 'pi-chevron-down'" />
      </button>

      <template v-if="isEditing">
        <input
          v-model="draftName"
          class="inline-category-input"
          type="text"
          @click.stop
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
        {{ category.name }}
        <span class="row-actions">
          <button class="inline-action-btn inline-add-btn" type="button" title="Add entry" @click.stop="emit('add-item', category.id)">
            <i class="pi pi-plus" />
          </button>
          <button class="inline-action-btn" type="button" @click.stop="emit('start-edit', category.id)">
            <i class="pi pi-pencil" />
          </button>
          <button class="inline-action-btn" type="button" @click.stop="emit('delete', category.id)">
            <i class="pi pi-trash" />
          </button>
        </span>
      </template>
    </td>
    <td v-for="(month, index) in totals.monthly" :key="`${category.id}-${index}`" class="amount">
      {{ formatCurrency(month) }}
    </td>
    <td class="amount strong">{{ formatCurrency(totals.yearly) }}</td>
    <td class="amount">{{ formatCurrency(totals.average) }}</td>
  </tr>
</template>
