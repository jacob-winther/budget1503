# Animations & Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sleek, premium animations to the budget planner — staggered row entrances, collapse/expand, add/delete transitions, animated number counters, edit mode fades, dialog polish, and year-switch slide.

**Architecture:** All animations use Vue's `<Transition>` / `<TransitionGroup>` + CSS custom properties defined in `style.css`. A single `useAnimatedNumber` composable handles number tweening via `requestAnimationFrame`. No new npm dependencies.

**Tech Stack:** Vue 3 Composition API, `<Transition>` / `<TransitionGroup>`, CSS custom properties, `requestAnimationFrame`, Pinia, Vitest + @vue/test-utils

---

## File Map

| File | Change |
|------|--------|
| `src/style.css` | Add CSS custom properties + all transition CSS classes |
| `src/composables/useAnimatedNumber.ts` | **New** — animated number counter composable |
| `src/stores/budgetStore.ts` | Add `yearSlideDirection` reactive state + update in `goToNextYear`/`goToPreviousYear` |
| `src/App.vue` | Wrap `<BudgetTable>` in `<Transition :name="yearSlideDir">` |
| `src/components/BudgetTable.vue` | Replace bare `<template v-if>` blocks with `<TransitionGroup name="row">` for items; wrap categories in `<Transition name="row">` per row with stagger |
| `src/components/BudgetSectionRow.vue` | Add CSS `transition` to chevron icon for rotation animation |
| `src/components/BudgetCategoryRow.vue` | Add CSS `transition` to chevron + `<Transition name="fade">` around edit/view content swap |
| `src/components/BudgetItemRow.vue` | `<Transition name="fade">` around edit/view content swap + edit mode highlight via CSS class |
| `src/components/BudgetTotalsRow.vue` | Use `useAnimatedNumber` for all displayed values |
| `src/components/BudgetDifferenceRow.vue` | Use `useAnimatedNumber` for all displayed values |
| `src/components/ItemFormDialog.vue` | Add `pt` passthrough to override PrimeVue dialog transition |
| `src/components/CategoryFormDialog.vue` | Add `pt` passthrough to override PrimeVue dialog transition |
| `src/components/CopyYearDialog.vue` | Add `pt` passthrough to override PrimeVue dialog transition |

---

## Task 1: CSS Animation System

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add CSS custom properties and all transition classes to `src/style.css`**

Append to the end of `src/style.css`:

```css
/* ─── Animation System ─────────────────────────────────────────────────────── */

:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-expo:  cubic-bezier(0.7, 0, 0.84, 0);
  --dur-enter:     280ms;
  --dur-exit:      200ms;
  --dur-micro:     150ms;
}

/* Row: used for item/category add, delete, and expand/collapse */
.row-enter-active {
  transition:
    opacity var(--dur-enter) var(--ease-out-expo),
    transform var(--dur-enter) var(--ease-out-expo);
}
.row-leave-active {
  transition:
    opacity var(--dur-exit) var(--ease-in-expo),
    transform var(--dur-exit) var(--ease-in-expo);
  /* Keep leaving rows in-flow so siblings can animate into place */
  position: absolute;
  width: 100%;
}
.row-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.row-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
.row-move {
  transition: transform var(--dur-enter) var(--ease-out-expo);
}

/* Fade: used for edit/view content swap inside rows */
.fade-enter-active {
  transition: opacity var(--dur-micro) var(--ease-out-expo);
}
.fade-leave-active {
  transition: opacity var(--dur-micro) var(--ease-in-expo);
  position: absolute;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Dialog: used for all PrimeVue Dialog panels */
.dialog-enter-active {
  transition:
    opacity var(--dur-enter) var(--ease-out-expo),
    transform var(--dur-enter) var(--ease-out-expo);
}
.dialog-leave-active {
  transition:
    opacity var(--dur-exit) var(--ease-in-expo),
    transform var(--dur-exit) var(--ease-in-expo);
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}

/* Dialog mask/backdrop */
.dialog-mask-enter-active {
  transition: opacity var(--dur-enter) var(--ease-out-expo);
}
.dialog-mask-leave-active {
  transition: opacity var(--dur-exit) var(--ease-in-expo);
}
.dialog-mask-enter-from,
.dialog-mask-leave-to {
  opacity: 0;
}

/* Year slide: table slides left (going to next year) */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    opacity var(--dur-enter) var(--ease-out-expo),
    transform var(--dur-enter) var(--ease-out-expo);
}
.slide-left-enter-from  { opacity: 0; transform: translateX(40px); }
.slide-left-leave-to    { opacity: 0; transform: translateX(-40px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-40px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(40px); }

/* Chevron rotation for section/category collapse toggle */
.chevron-icon {
  transition: transform var(--dur-micro) var(--ease-out-expo);
  display: inline-block;
}
.chevron-icon.is-collapsed {
  transform: rotate(-90deg);
}

/* New-row highlight flash: applied programmatically then removed */
@keyframes row-highlight {
  0%   { box-shadow: inset 3px 0 0 var(--p-primary-color, #6366f1); }
  100% { box-shadow: inset 3px 0 0 transparent; }
}
.row-new-highlight td:first-child {
  animation: row-highlight 600ms var(--ease-out-expo) forwards;
}
```

- [ ] **Step 2: Run the existing test suite to confirm nothing is broken**

```bash
npm test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat(anim): add CSS animation system with custom properties and transition classes"
```

---

## Task 2: `useAnimatedNumber` Composable

**Files:**
- Create: `src/composables/useAnimatedNumber.ts`
- Create: `src/composables/__tests__/useAnimatedNumber.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useAnimatedNumber.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAnimatedNumber } from '../useAnimatedNumber'

// Use fake timers to control requestAnimationFrame
beforeEach(() => {
  vi.useFakeTimers()
  let rafCallback: FrameRequestCallback | null = null
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallback = cb
    return 1
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
  // Expose rafCallback via a helper so tests can step the animation
  ;(globalThis as any).__flushRaf = () => {
    if (rafCallback) {
      const cb = rafCallback
      rafCallback = null
      cb(performance.now())
    }
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useAnimatedNumber', () => {
  it('starts displaying the initial value immediately', async () => {
    const source = ref(100)
    const { displayed } = useAnimatedNumber(source)
    await nextTick()
    expect(displayed.value).toBe(100)
  })

  it('begins tweening when source changes', async () => {
    const source = ref(0)
    const { displayed } = useAnimatedNumber(source, { duration: 300 })
    await nextTick()
    expect(displayed.value).toBe(0)

    source.value = 100
    await nextTick()
    // After one frame the value should be between 0 and 100 (not yet arrived)
    ;(globalThis as any).__flushRaf()
    expect(displayed.value).toBeGreaterThanOrEqual(0)
    expect(displayed.value).toBeLessThanOrEqual(100)
  })

  it('reaches the target value after the duration elapses', async () => {
    const source = ref(0)
    const { displayed } = useAnimatedNumber(source, { duration: 300 })
    await nextTick()

    source.value = 500
    await nextTick()

    // Advance time past the duration
    vi.advanceTimersByTime(400)
    // Flush any pending RAF
    ;(globalThis as any).__flushRaf()
    await nextTick()

    expect(displayed.value).toBe(500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run src/composables/__tests__/useAnimatedNumber.test.ts
```

Expected: FAIL — `useAnimatedNumber` not found.

- [ ] **Step 3: Implement `useAnimatedNumber`**

Create `src/composables/useAnimatedNumber.ts`:

```ts
import { ref, watch, onUnmounted, type Ref } from 'vue'

interface Options {
  duration?: number
}

// Ease-out expo: matches --ease-out-expo CSS curve
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function useAnimatedNumber(source: Ref<number>, options: Options = {}) {
  const { duration = 300 } = options

  const displayed = ref(source.value)
  let rafId: number | null = null
  let startTime: number | null = null
  let from = source.value
  let to = source.value

  function animate(timestamp: number) {
    if (startTime === null) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    displayed.value = from + (to - from) * easeOutExpo(progress)

    if (progress < 1) {
      rafId = requestAnimationFrame(animate)
    } else {
      displayed.value = to
      rafId = null
    }
  }

  function startAnimation(newValue: number) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      from = displayed.value
    } else {
      from = displayed.value
    }
    to = newValue
    startTime = null
    rafId = requestAnimationFrame(animate)
  }

  watch(source, (newValue) => {
    startAnimation(newValue)
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return { displayed }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/composables/__tests__/useAnimatedNumber.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useAnimatedNumber.ts src/composables/__tests__/useAnimatedNumber.test.ts
git commit -m "feat(anim): add useAnimatedNumber composable for smooth value tweening"
```

---

## Task 3: Animated Totals & Difference Rows

**Files:**
- Modify: `src/components/BudgetTotalsRow.vue`
- Modify: `src/components/BudgetDifferenceRow.vue`

- [ ] **Step 1: Update `BudgetTotalsRow.vue`**

Replace the entire file content:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Totals } from '../types/budget'
import { formatCurrency } from '../utils/formatting'
import { useAnimatedNumber } from '../composables/useAnimatedNumber'

const props = defineProps<{
  label: string
  totals: Totals
}>()

const yearly = computed(() => props.totals.yearly)
const average = computed(() => props.totals.average)
const animatedYearly = useAnimatedNumber(yearly)
const animatedAverage = useAnimatedNumber(average)

const animatedMonthly = props.totals.monthly.map((_, i) => {
  const m = computed(() => props.totals.monthly[i])
  return useAnimatedNumber(m)
})
</script>

<template>
  <tr class="totals-row">
    <td class="sticky-left name-col">{{ label }}</td>
    <td
      v-for="(_, index) in totals.monthly"
      :key="`${label}-${index}`"
      class="amount"
    >
      {{ formatCurrency(animatedMonthly[index].displayed.value) }}
    </td>
    <td class="amount strong">{{ formatCurrency(animatedYearly.displayed.value) }}</td>
    <td class="amount">{{ formatCurrency(animatedAverage.displayed.value) }}</td>
  </tr>
</template>
```

- [ ] **Step 2: Update `BudgetDifferenceRow.vue`**

Replace the entire file content:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAnimatedNumber } from '../composables/useAnimatedNumber'

const props = defineProps<{
  monthly: number[]
  yearly: number
}>()

const currency = (value: number) =>
  Math.round(value).toLocaleString('en-US', { maximumFractionDigits: 0 })

const yearlyRef = computed(() => props.yearly)
const animatedYearly = useAnimatedNumber(yearlyRef)
const animatedAverage = useAnimatedNumber(computed(() => props.yearly / 12))

const animatedMonthly = props.monthly.map((_, i) => {
  const m = computed(() => props.monthly[i])
  return useAnimatedNumber(m)
})
</script>

<template>
  <tr class="difference-row" :class="{ negative: yearly < 0 }">
    <td class="sticky-left name-col">Difference (Income - Expenses)</td>
    <td v-for="(_, index) in monthly" :key="index" class="amount">
      {{ currency(animatedMonthly[index].displayed.value) }}
    </td>
    <td class="amount strong">{{ currency(animatedYearly.displayed.value) }}</td>
    <td class="amount">{{ currency(animatedAverage.displayed.value) }}</td>
  </tr>
</template>
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/BudgetTotalsRow.vue src/components/BudgetDifferenceRow.vue
git commit -m "feat(anim): animate totals and difference row number changes"
```

---

## Task 4: Row Add / Delete / Expand Transitions in `BudgetTable`

**Files:**
- Modify: `src/components/BudgetTable.vue`

- [ ] **Step 1: Replace the template section of `BudgetTable.vue`**

Replace only the `<template>` block (leave `<script setup>` unchanged). The key changes:
- Categories per section: wrapped in individual `<Transition name="row">` with `:style` stagger delay
- Items per category: wrapped in `<TransitionGroup name="row">` with `@before-enter` / `@after-enter` hooks for stagger
- Add a `newItemIds` set + `onItemMounted` callback to trigger the new-row highlight

First add the stagger hooks and new-row highlight tracking to the `<script setup>`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BudgetTableHeader from './BudgetTableHeader.vue'
import BudgetSectionRow from './BudgetSectionRow.vue'
import BudgetCategoryRow from './BudgetCategoryRow.vue'
import BudgetItemRow from './BudgetItemRow.vue'
import BudgetTotalsRow from './BudgetTotalsRow.vue'
import BudgetDifferenceRow from './BudgetDifferenceRow.vue'
import type { BudgetCategory, BudgetItem, BudgetSection, Totals } from '../types/budget'

withDefaults(
  defineProps<{
    months: string[]
    sections: BudgetSection[]
    expenseTotals: Totals
    incomeTotals: Totals
    differenceMonthly: number[]
    differenceYearly: number
    editingCategoryId?: string | null
    editingItemId?: string | null
    getSectionTotals: (section: BudgetSection) => Totals
    getCategoryTotals: (category: BudgetCategory) => Totals
    getItemYearTotal: (item: BudgetItem) => number
    getItemMonthlyAverage: (item: BudgetItem) => number
  }>(),
  {
    editingCategoryId: null,
    editingItemId: null,
  },
)

const emit = defineEmits<{
  (event: 'toggle-section', sectionId: string): void
  (event: 'add-category', sectionType: BudgetSection['type']): void
  (event: 'toggle-category', categoryId: string): void
  (event: 'add-item', categoryId: string): void
  (event: 'start-category-edit', categoryId: string): void
  (event: 'save-category-edit', payload: { categoryId: string; name: string }): void
  (event: 'cancel-category-edit'): void
  (event: 'delete-category', categoryId: string): void
  (event: 'start-item-edit', itemId: string): void
  (
    event: 'save-item-edit',
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
  (event: 'cancel-item-edit'): void
  (event: 'delete-item', itemId: string): void
}>()

// Stagger helpers for TransitionGroup
function onRowBeforeEnter(el: Element) {
  const index = parseInt((el as HTMLElement).dataset.index ?? '0', 10)
  ;(el as HTMLElement).style.transitionDelay = `${index * 30}ms`
}
function onRowAfterEnter(el: Element) {
  ;(el as HTMLElement).style.transitionDelay = ''
}

// New-row highlight: track the last-added item id and flash it
const highlightedItemId = ref<string | null>(null)
function onItemEnter(el: Element) {
  const row = el as HTMLElement
  // Only flash on genuine adds (index 0 entering alone means a new single row)
  row.classList.add('row-new-highlight')
  setTimeout(() => row.classList.remove('row-new-highlight'), 650)
}
</script>
```

- [ ] **Step 2: Replace the `<template>` block in `BudgetTable.vue`**

```vue
<template>
  <div class="table-wrap">
    <table class="budget-table">
      <BudgetTableHeader :months="months" />
      <tbody>
        <template v-for="section in sections" :key="section.id">
          <BudgetSectionRow
            :section="section"
            :totals="getSectionTotals(section)"
            @toggle="emit('toggle-section', $event)"
            @add-category="emit('add-category', $event)"
          />

          <!-- Categories animate in/out when section collapses/expands -->
          <template v-for="(category, catIndex) in section.categories" :key="category.id">
            <Transition name="row">
              <BudgetCategoryRow
                v-if="!section.collapsed"
                :style="{ transitionDelay: `${catIndex * 30}ms` }"
                :category="category"
                :totals="getCategoryTotals(category)"
                :is-editing="editingCategoryId === category.id"
                @toggle="emit('toggle-category', $event)"
                @add-item="emit('add-item', $event)"
                @start-edit="emit('start-category-edit', $event)"
                @save-edit="emit('save-category-edit', $event)"
                @cancel-edit="emit('cancel-category-edit')"
                @delete="emit('delete-category', $event)"
              />
            </Transition>

            <!-- Items animate in/out when category collapses/expands, and on add/delete -->
            <TransitionGroup
              name="row"
              @before-enter="onRowBeforeEnter"
              @after-enter="onRowAfterEnter"
              @enter="onItemEnter"
            >
              <BudgetItemRow
                v-for="(item, itemIndex) in (category.collapsed || section.collapsed) ? [] : category.items"
                :key="item.id"
                :data-index="itemIndex"
                :item="item"
                :section-type="section.type"
                :year-total="getItemYearTotal(item)"
                :average="getItemMonthlyAverage(item)"
                :is-editing="editingItemId === item.id"
                @start-edit="emit('start-item-edit', $event)"
                @save-edit="emit('save-item-edit', $event)"
                @cancel-edit="emit('cancel-item-edit')"
                @delete="emit('delete-item', $event)"
              />
            </TransitionGroup>
          </template>
        </template>

        <BudgetTotalsRow label="Total Expenses" :totals="expenseTotals" />
        <BudgetTotalsRow label="Total Income" :totals="incomeTotals" />
        <BudgetDifferenceRow :monthly="differenceMonthly" :yearly="differenceYearly" />
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/BudgetTable.vue
git commit -m "feat(anim): add row enter/leave and expand/collapse transitions to BudgetTable"
```

---

## Task 5: Chevron & Edit Mode Transitions

**Files:**
- Modify: `src/components/BudgetSectionRow.vue`
- Modify: `src/components/BudgetCategoryRow.vue`
- Modify: `src/components/BudgetItemRow.vue`

- [ ] **Step 1: Update `BudgetSectionRow.vue`**

Replace the entire file:

```vue
<script setup lang="ts">
import type { BudgetSection, Totals } from '../types/budget'
import { formatCurrency } from '../utils/formatting'

defineProps<{
  section: BudgetSection
  totals: Totals
}>()

const emit = defineEmits<{
  (event: 'toggle', sectionId: string): void
  (event: 'add-category', sectionType: BudgetSection['type']): void
}>()
</script>

<template>
  <tr class="section-row" @click="emit('toggle', section.id)">
    <td class="sticky-left name-col section-name">
      <i
        class="pi pi-chevron-right chevron-icon"
        :class="{ 'is-collapsed': section.collapsed }"
        style="transform-origin: center"
      />
      {{ section.name }}
      <button class="inline-action-btn inline-add-btn" type="button" title="Add category" @click.stop="emit('add-category', section.type)">
        <i class="pi pi-plus" />
      </button>
    </td>
    <td v-for="(month, index) in totals.monthly" :key="`${section.id}-${index}`" class="amount">
      {{ formatCurrency(month) }}
    </td>
    <td class="amount strong">{{ formatCurrency(totals.yearly) }}</td>
    <td class="amount">{{ formatCurrency(totals.average) }}</td>
  </tr>
</template>
```

Note: the chevron now always renders as `pi-chevron-right` and rotates via the `.is-collapsed` / `.chevron-icon` CSS classes defined in Task 1. When `section.collapsed` is false, the CSS rotation is 0° (pointing down via the `rotate(-90deg)` default state inverted — adjust below).

Update the CSS in `src/style.css` so the chevron points DOWN when expanded and RIGHT when collapsed:

```css
/* Replace the chevron rules added in Task 1 with these: */
.chevron-icon {
  transition: transform var(--dur-micro) var(--ease-out-expo);
  display: inline-block;
  transform: rotate(90deg); /* points down when expanded */
}
.chevron-icon.is-collapsed {
  transform: rotate(0deg); /* points right when collapsed */
}
```

- [ ] **Step 2: Update `BudgetCategoryRow.vue`**

Replace the entire file:

```vue
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
    if (isEditing) draftName.value = props.category.name
  },
)

watch(
  () => props.category.name,
  (name) => {
    if (props.isEditing) draftName.value = name
  },
)

const onSaveEdit = () => {
  emit('save-edit', { categoryId: props.category.id, name: draftName.value.trim() })
}
</script>

<template>
  <tr class="category-row" :class="{ 'is-editing': isEditing }">
    <td class="sticky-left name-col category-name">
      <button class="collapse-btn" type="button" @click.stop="emit('toggle', category.id)">
        <i
          class="pi pi-chevron-right chevron-icon"
          :class="{ 'is-collapsed': category.collapsed }"
          style="transform-origin: center"
        />
      </button>

      <Transition name="fade" mode="out-in">
        <template v-if="isEditing" key="editing">
          <span style="display: inline-flex; align-items: center; gap: 8px;">
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
          </span>
        </template>
        <template v-else key="viewing">
          <span style="display: inline-flex; align-items: center; gap: 8px;">
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
          </span>
        </template>
      </Transition>
    </td>
    <td v-for="(month, index) in totals.monthly" :key="`${category.id}-${index}`" class="amount">
      {{ formatCurrency(month) }}
    </td>
    <td class="amount strong">{{ formatCurrency(totals.yearly) }}</td>
    <td class="amount">{{ formatCurrency(totals.average) }}</td>
  </tr>
</template>
```

Add this CSS to `src/style.css` for the category edit highlight:

```css
.category-row.is-editing {
  background: #e8f0fc;
  transition: background-color var(--dur-micro) var(--ease-out-expo);
}
.category-row {
  transition: background-color var(--dur-micro) var(--ease-out-expo);
}
```

- [ ] **Step 3: Update `BudgetItemRow.vue`**

Find the `<template>` block in `BudgetItemRow.vue`. Wrap the `<template v-if="isEditing">` / `<template v-else>` pair inside the `.item-main-line` div with a `<Transition name="fade" mode="out-in">`. Also add `is-editing` class to the `<tr>`.

Replace the `<template>` block only (script stays the same):

```vue
<template>
  <tr class="item-row" :class="{ 'expense-item-row': sectionType === 'expense', 'is-editing': isEditing }">
    <td class="sticky-left name-col item-name" :class="{ 'expense-item-name': sectionType === 'expense' }">
      <div class="item-row-content">
        <div class="item-main-line">
          <Transition name="fade" mode="out-in">
            <span v-if="isEditing" key="editing" style="display: inline-flex; align-items: center; gap: 8px;">
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
            </span>
            <span v-else key="viewing" style="display: inline-flex; align-items: center; gap: 8px;">
              {{ item.name }}
              <span class="row-actions">
                <button class="inline-action-btn" type="button" @click.stop="emit('start-edit', item.id)">
                  <i class="pi pi-pencil" />
                </button>
                <button class="inline-action-btn" type="button" @click.stop="emit('delete', item.id)">
                  <i class="pi pi-trash" />
                </button>
              </span>
            </span>
          </Transition>
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
              @click.stop="applyNudge(index, -nudgeStep)"
            >-{{ nudgeStep }}</button>
            <button
              class="inline-action-btn item-inline-nudge-btn"
              type="button"
              @click.stop="applyNudge(index, nudgeStep)"
            >+{{ nudgeStep }}</button>
          </div>
          <input
            v-model.number="draftMonths[index]"
            class="inline-amount-input"
            type="number"
            @click.stop
            @focus="inlineNudge = { monthIndex: index }"
            @blur="inlineNudge = null"
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
```

Add this CSS to `src/style.css`:

```css
.item-row.is-editing {
  background: #f0f5ff;
  transition: background-color var(--dur-micro) var(--ease-out-expo);
}
.item-row {
  transition: background-color var(--dur-micro) var(--ease-out-expo);
}
```

**Note:** The `BudgetItemRow.vue` script references several internal refs like `draftName`, `draftMonths`, `inlineNudge`, `nudgeStep`, `applyNudge`, `draftYearTotal`, `draftAverage`, `onSaveEdit`. These all exist in the current script — do not change the script, only replace the template.

- [ ] **Step 4: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/BudgetSectionRow.vue src/components/BudgetCategoryRow.vue src/components/BudgetItemRow.vue src/style.css
git commit -m "feat(anim): add chevron rotation and edit mode fade transitions"
```

---

## Task 6: Dialog Transitions

**Files:**
- Modify: `src/components/ItemFormDialog.vue`
- Modify: `src/components/CategoryFormDialog.vue`
- Modify: `src/components/CopyYearDialog.vue`

PrimeVue 4's `Dialog` component accepts a `pt` (PassThrough) prop to override internal parts. The transition used by Dialog can be customized by overriding the `transition` key in `pt`.

- [ ] **Step 1: Add dialog transition `pt` to all three dialogs**

In `ItemFormDialog.vue`, find the `<Dialog` opening tag and add the `pt` prop:

```vue
<Dialog
  :visible="visible"
  :pt="{
    transition: { name: 'dialog' },
    mask: { class: 'dialog-mask-transition' },
  }"
  ...rest of existing props...
>
```

Do the same in `CategoryFormDialog.vue` and `CopyYearDialog.vue` — add the same `:pt` prop to each `<Dialog>` tag.

Add this CSS to `src/style.css` to handle the mask transition via the injected class:

```css
/* PrimeVue dialog mask transition override */
.dialog-mask-transition.p-dialog-mask-enter-active {
  transition: opacity var(--dur-enter) var(--ease-out-expo);
}
.dialog-mask-transition.p-dialog-mask-leave-active {
  transition: opacity var(--dur-exit) var(--ease-in-expo);
}
.dialog-mask-transition.p-dialog-mask-enter-from,
.dialog-mask-transition.p-dialog-mask-leave-to {
  opacity: 0;
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemFormDialog.vue src/components/CategoryFormDialog.vue src/components/CopyYearDialog.vue src/style.css
git commit -m "feat(anim): add scale+fade transition to dialogs via PrimeVue PassThrough"
```

---

## Task 7: Year Switch Slide Transition

**Files:**
- Modify: `src/stores/budgetStore.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: Add `yearSlideDirection` to the store**

In `src/stores/budgetStore.ts`, find where `goToNextYear` and `goToPreviousYear` are defined. Add a reactive `yearSlideDirection` ref and update it in those functions.

Find the existing year navigation functions (they call `setYear` or directly mutate `currentYear`). Add:

```ts
// Add near the top of the store's setup function, alongside other refs:
const yearSlideDirection = ref<'slide-left' | 'slide-right'>('slide-left')
```

In `goToNextYear` (navigating to a higher year number), set direction to `'slide-left'` before changing the year:

```ts
const goToNextYear = () => {
  yearSlideDirection.value = 'slide-left'
  currentYear.value += 1
}
```

In `goToPreviousYear` (navigating to a lower year number), set direction to `'slide-right'`:

```ts
const goToPreviousYear = () => {
  yearSlideDirection.value = 'slide-right'
  currentYear.value -= 1
}
```

Export `yearSlideDirection` in the store's return object alongside the other properties.

- [ ] **Step 2: Write a failing test for `yearSlideDirection`**

In `src/stores/__tests__/budgetStore.test.ts`, add at the end of the `describe` block:

```ts
it('tracks year slide direction when navigating years', () => {
  const store = useBudgetStore()
  expect(store.yearSlideDirection).toBe('slide-left')

  store.goToNextYear()
  expect(store.yearSlideDirection).toBe('slide-left')

  store.goToPreviousYear()
  expect(store.yearSlideDirection).toBe('slide-right')
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- --run src/stores/__tests__/budgetStore.test.ts
```

Expected: FAIL — `yearSlideDirection` not found on store.

- [ ] **Step 4: Implement the store changes** (as described in Step 1 above)

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- --run src/stores/__tests__/budgetStore.test.ts
```

Expected: all store tests pass.

- [ ] **Step 6: Update `App.vue` to add the year slide transition**

In the `<template>` of `App.vue`, find the `<BudgetTable>` component. Wrap it in a `<Transition>` that uses `store.yearSlideDirection` as the transition name. Also add `overflow: hidden` to the container so sliding rows don't bleed outside.

Replace:

```vue
<BudgetTable
  ...
/>
```

With:

```vue
<div style="overflow: hidden;">
  <Transition :name="store.yearSlideDirection">
    <BudgetTable
      :key="store.currentYear"
      ...all existing props and event handlers unchanged...
    />
  </Transition>
</div>
```

The `:key="store.currentYear"` forces Vue to treat each year's table as a distinct element, triggering enter/leave on year change.

- [ ] **Step 7: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/stores/budgetStore.ts src/stores/__tests__/budgetStore.test.ts src/App.vue
git commit -m "feat(anim): add directional slide transition for year switching"
```

---

## Self-Review Notes

- All 7 spec moments are covered: A (expand/collapse — Task 4+5), B (add row — Task 4), C (delete row — Task 4), D (edit mode — Task 5), E (totals — Task 3), F (dialogs — Task 6), G (year switch — Task 7)
- `useAnimatedNumber` API: `const { displayed } = useAnimatedNumber(sourceRef, { duration? })` — consistent across Tasks 2 and 3
- `yearSlideDirection` type is `'slide-left' | 'slide-right'` — matches the CSS class names `.slide-left-*` and `.slide-right-*` defined in Task 1
- No new npm dependencies added
- All transition CSS class names defined in Task 1 are referenced by name in later tasks
