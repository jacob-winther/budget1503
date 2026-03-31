<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'

const props = defineProps<{
  visible: boolean
  currentYear: number
  options: { year: number; budgetId: string; budgetName: string }[]
}>()

const emit = defineEmits<{
  (event: 'confirm', payload: { fromYear: number; fromBudgetId: string; newName: string }): void
  (event: 'close'): void
}>()

const selectedOption = ref<{ year: number; budgetId: string; budgetName: string } | null>(null)
const newName = ref('')

const selectOptions = computed(() =>
  props.options.map((opt) => ({
    label: `${opt.year} · ${opt.budgetName}`,
    value: opt,
  }))
)

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return
    selectedOption.value = props.options[0] ?? null
    newName.value = selectedOption.value?.budgetName ?? ''
  },
)

watch(selectedOption, (opt) => {
  if (opt) newName.value = opt.budgetName
})

const onConfirm = () => {
  if (!selectedOption.value) return

  emit('confirm', {
    fromYear: selectedOption.value.year,
    fromBudgetId: selectedOption.value.budgetId,
    newName: newName.value.trim() || selectedOption.value.budgetName,
  })
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
    header="Copy Budget"
    :style="{ width: '26rem' }"
    @update:visible="emit('close')"
  >
    <p>Select a budget to copy into {{ currentYear }}.</p>

    <div class="copy-budget-fields">
      <Select
        v-model="selectedOption"
        :options="selectOptions"
        option-label="label"
        option-value="value"
        class="w-full"
        placeholder="Select budget"
      />

      <div class="copy-budget-name-row">
        <label class="copy-budget-name-label">Name in {{ currentYear }}</label>
        <InputText
          v-model="newName"
          class="w-full"
          placeholder="Budget name"
          maxlength="40"
        />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emit('close')" />
      <Button label="Copy" :disabled="!selectedOption" @click="onConfirm" />
    </template>
  </Dialog>
</template>
