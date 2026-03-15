<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  category: {
    type: Object,
    required: true,
  },
  totals: {
    type: Object,
    required: true,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle', 'start-edit', 'save-edit', 'cancel-edit', 'delete'])

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

const currency = (value) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
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
      {{ currency(month) }}
    </td>
    <td class="amount strong">{{ currency(totals.yearly) }}</td>
    <td class="amount">{{ currency(totals.average) }}</td>
  </tr>
</template>
