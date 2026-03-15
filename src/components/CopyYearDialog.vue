<script setup>
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  currentYear: {
    type: Number,
    required: true,
  },
  years: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['confirm', 'close'])

const selectedFromYear = ref(null)

const yearOptions = computed(() => props.years.map((year) => ({ label: String(year), value: year })))

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      return
    }

    selectedFromYear.value = props.years[0] ?? null
  },
)

const onConfirm = () => {
  if (selectedFromYear.value === null) {
    return
  }

  emit('confirm', {
    fromYear: selectedFromYear.value,
    toYear: props.currentYear,
  })
}
</script>

<template>
  <Dialog :visible="visible" modal header="Copy Year" :style="{ width: '24rem' }" @update:visible="emit('close')">
    <p>Select the year to copy into {{ currentYear }}.</p>

    <Select
      v-model="selectedFromYear"
      :options="yearOptions"
      option-label="label"
      option-value="value"
      class="w-full"
      placeholder="Select year"
    />

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emit('close')" />
      <Button label="Copy" :disabled="selectedFromYear === null" @click="onConfirm" />
    </template>
  </Dialog>
</template>
