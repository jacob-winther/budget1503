<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import type { SaveCategoryPayload, SectionType } from '../types/budget'

const props = withDefaults(
  defineProps<{
    visible: boolean
    mode?: 'create' | 'edit'
    category?: { id: string; name: string; sectionType?: SectionType } | null
  }>(),
  {
    mode: 'create',
    category: null,
  },
)

const emit = defineEmits<{
  (event: 'save', payload: SaveCategoryPayload): void
  (event: 'close'): void
}>()

const name = ref('')
const sectionType = ref<SectionType>('expense')

const sectionOptions = computed(() => [
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
])

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      return
    }

    name.value = props.category?.name ?? ''
    sectionType.value = props.category?.sectionType ?? 'expense'
  },
)

const onSave = () => {
  emit('save', {
    categoryId: props.category?.id,
    name: name.value.trim(),
    sectionType: sectionType.value,
  })
}

const onDialogKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return
  if ((event.target as HTMLElement).closest('button')) return
  if (!name.value.trim()) return
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
    :header="mode === 'edit' ? 'Edit Category' : 'New Category'"
    :style="{ width: '28rem' }"
    @update:visible="emit('close')"
    @keydown="onDialogKeydown"
  >
    <div class="dialog-grid">
      <label>
        <span>Name</span>
        <InputText v-model="name" class="w-full" />
      </label>

      <label>
        <span>Section</span>
        <Select v-model="sectionType" :options="sectionOptions" option-label="label" option-value="value" class="w-full" />
      </label>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emit('close')" />
      <Button label="Save" :disabled="!name.trim()" @click="onSave" />
    </template>
  </Dialog>
</template>
