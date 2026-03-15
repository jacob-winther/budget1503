<script setup>
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
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
  category: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['save', 'close'])

const name = ref('')
const sectionType = ref('expense')

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
</script>

<template>
  <Dialog :visible="visible" modal :header="mode === 'edit' ? 'Edit Category' : 'New Category'" :style="{ width: '28rem' }" @update:visible="emit('close')">
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
