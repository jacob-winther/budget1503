# Drag-and-Drop, Frequency Options, and Modal UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop reordering of budget items across categories/sections, weekly/quarterly frequency options, Enter-key submission in dialogs, and a redesigned amount layout in ItemFormDialog.

**Architecture:** Frequency computation is a pure utility function (`src/utils/frequency.ts`) called by the store on save; `months[]` is always derived from frequency fields. Drag-and-drop uses `vue-draggable-plus` per-category with cross-list enabled; the store's `updateItemCategoryId` syncs `categoryId` after a cross-list drop. Modal UX changes are contained within the two dialog components.

**Tech Stack:** Vue 3, TypeScript, Pinia, PrimeVue 4 (SelectButton, Select, InputNumber), vue-draggable-plus (SortableJS wrapper), Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/budget.ts` | Modify | Add `ItemFrequency` type + frequency fields to `BudgetItem` and `SaveItemPayload` |
| `src/utils/frequency.ts` | Create | Pure `computeMonthsFromFrequency` function |
| `src/utils/__tests__/frequency.test.ts` | Create | Unit tests for frequency computation |
| `src/stores/budgetStore.ts` | Modify | Use frequency fields in `addItem`/`editItem`, add `updateItemCategoryId`, update `remapYearIds` |
| `src/stores/__tests__/budgetStore.test.ts` | Modify | Tests for new store behaviour |
| `src/components/BudgetTable.vue` | Modify | Replace `TransitionGroup` with `VueDraggable tag="tbody"`, emit `move-item` |
| `src/App.vue` | Modify | Handle `move-item` event, call `store.updateItemCategoryId` |
| `src/components/CategoryFormDialog.vue` | Modify | Enter key submits dialog |
| `src/components/ItemFormDialog.vue` | Modify | Frequency selector + conditional fields + Enter key + dynamic amount label |

---

## Task 1: Extend Types

**Files:**
- Modify: `src/types/budget.ts`

- [ ] **Step 1: Update `src/types/budget.ts`**

Replace the entire file with:

```ts
export type SectionType = 'expense' | 'income'
export type ItemFrequency = 'monthly' | 'weekly' | 'quarterly'

export interface BudgetItem {
  id: string
  categoryId: string
  name: string
  baseAmount: number
  months: number[]
  frequency: ItemFrequency
  weekday?: number
  quarterStartMonth?: number
  copiedFromYear?: number | null
  copiedBaselineMonths?: number[] | null
}

export interface BudgetCategory {
  id: string
  name: string
  collapsed: boolean
  sectionType?: SectionType
  items: BudgetItem[]
}

export interface BudgetSection {
  id: string
  name: string
  type: SectionType
  collapsed: boolean
  categories: BudgetCategory[]
}

export interface YearData {
  sections: BudgetSection[]
}

export type BudgetData = Record<number, YearData>

export interface Totals {
  monthly: number[]
  yearly: number
  average: number
}

export interface SaveItemPayload {
  itemId?: string
  categoryId: string
  categoryName?: string
  sectionType?: SectionType
  name: string
  baseAmount: number
  months: number[]
  frequency?: ItemFrequency
  weekday?: number
  quarterStartMonth?: number
  changedMonthIndexes?: number[]
  editedMonthIndex?: number | null
}

export interface SaveCategoryPayload {
  categoryId?: string
  name: string
  sectionType?: SectionType
}

export interface FlatCategoryOption {
  id: string
  name: string
  sectionType: SectionType
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npm run build 2>&1 | head -40`

Expected: TypeScript errors about missing `frequency` on `BudgetItem` in budgetStore.ts (seed data, createSeedData). These will be fixed in Task 3. If there are other unexpected errors, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/types/budget.ts
git commit -m "feat: add ItemFrequency type and frequency fields to BudgetItem and SaveItemPayload"
```

---

## Task 2: Frequency Computation Utility

**Files:**
- Create: `src/utils/frequency.ts`
- Create: `src/utils/__tests__/frequency.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/frequency.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeMonthsFromFrequency } from '../frequency'

describe('computeMonthsFromFrequency', () => {
  describe('monthly', () => {
    it('returns baseAmount for all 12 months', () => {
      const result = computeMonthsFromFrequency('monthly', 500, 2026, {})
      expect(result).toHaveLength(12)
      expect(result.every((v) => v === 500)).toBe(true)
    })

    it('returns 0 for all months when baseAmount is 0', () => {
      const result = computeMonthsFromFrequency('monthly', 0, 2026, {})
      expect(result.every((v) => v === 0)).toBe(true)
    })
  })

  describe('quarterly', () => {
    it('sets baseAmount on start month and every 3 months, 0 elsewhere', () => {
      // start=1 (Feb) → active months: 1, 4, 7, 10
      const result = computeMonthsFromFrequency('quarterly', 1200, 2026, { quarterStartMonth: 1 })
      expect(result).toHaveLength(12)
      expect(result[1]).toBe(1200)  // Feb
      expect(result[4]).toBe(1200)  // May
      expect(result[7]).toBe(1200)  // Aug
      expect(result[10]).toBe(1200) // Nov
      const zeroMonths = [0, 2, 3, 5, 6, 8, 9, 11]
      zeroMonths.forEach((m) => expect(result[m]).toBe(0))
    })

    it('wraps correctly when start month is in Q4 (e.g. start=11, Dec)', () => {
      // start=11 (Dec) → active months: 11, 2, 5, 8
      const result = computeMonthsFromFrequency('quarterly', 300, 2026, { quarterStartMonth: 11 })
      expect(result[11]).toBe(300) // Dec
      expect(result[2]).toBe(300)  // Mar
      expect(result[5]).toBe(300)  // Jun
      expect(result[8]).toBe(300)  // Sep
    })

    it('defaults to start=0 (Jan) when quarterStartMonth is undefined', () => {
      const result = computeMonthsFromFrequency('quarterly', 100, 2026, {})
      expect(result[0]).toBe(100)
      expect(result[3]).toBe(100)
      expect(result[6]).toBe(100)
      expect(result[9]).toBe(100)
    })
  })

  describe('weekly', () => {
    it('counts Monday occurrences in each month of 2026', () => {
      // In Jan 2026: Mondays on 5,12,19,26 = 4 Mondays
      // In Mar 2026: Mondays on 2,9,16,23,30 = 5 Mondays
      const result = computeMonthsFromFrequency('weekly', 100, 2026, { weekday: 1 })
      expect(result).toHaveLength(12)
      expect(result[0]).toBe(400) // Jan: 4 Mondays
      expect(result[2]).toBe(500) // Mar: 5 Mondays
    })

    it('multiplies weekday count by baseAmount', () => {
      const result = computeMonthsFromFrequency('weekly', 50, 2026, { weekday: 1 })
      // Jan 2026: 4 Mondays → 4 * 50 = 200
      expect(result[0]).toBe(200)
    })

    it('defaults to Monday (weekday=1) when weekday is undefined', () => {
      const withDefault = computeMonthsFromFrequency('weekly', 100, 2026, {})
      const withMonday = computeMonthsFromFrequency('weekly', 100, 2026, { weekday: 1 })
      expect(withDefault).toEqual(withMonday)
    })

    it('produces different totals for different years due to weekday distribution', () => {
      const result2026 = computeMonthsFromFrequency('weekly', 100, 2026, { weekday: 1 })
      const result2027 = computeMonthsFromFrequency('weekly', 100, 2027, { weekday: 1 })
      // The yearly totals should both be 52*100=5200 (52 Mondays per year, with 1 year having 53)
      const sum2026 = result2026.reduce((a, b) => a + b, 0)
      const sum2027 = result2027.reduce((a, b) => a + b, 0)
      // 2026 has 52 Mondays, 2027 has 52 Mondays (Jan 1 2026 is Thursday)
      expect(sum2026).toBe(5200)
      expect(sum2027).toBe(5200)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/frequency.test.ts 2>&1 | tail -20`

Expected: FAIL — `Cannot find module '../frequency'`

- [ ] **Step 3: Create `src/utils/frequency.ts`**

```ts
import type { ItemFrequency } from '../types/budget'

function countWeekdayOccurrences(year: number, month: number, weekday: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let day = 1; day <= daysInMonth; day++) {
    if (new Date(year, month, day).getDay() === weekday) {
      count++
    }
  }
  return count
}

export function computeMonthsFromFrequency(
  frequency: ItemFrequency,
  baseAmount: number,
  year: number,
  options: { weekday?: number; quarterStartMonth?: number },
): number[] {
  if (frequency === 'weekly') {
    const weekday = options.weekday ?? 1
    return Array.from({ length: 12 }, (_, month) => countWeekdayOccurrences(year, month, weekday) * baseAmount)
  }

  if (frequency === 'quarterly') {
    const start = options.quarterStartMonth ?? 0
    const activeMonths = new Set([start, (start + 3) % 12, (start + 6) % 12, (start + 9) % 12])
    return Array.from({ length: 12 }, (_, month) => (activeMonths.has(month) ? baseAmount : 0))
  }

  return Array.from({ length: 12 }, () => baseAmount)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/frequency.test.ts 2>&1 | tail -20`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/frequency.ts src/utils/__tests__/frequency.test.ts
git commit -m "feat: add computeMonthsFromFrequency utility for weekly/quarterly/monthly computation"
```

---

## Task 3: Store — Frequency Fields + moveItem

**Files:**
- Modify: `src/stores/budgetStore.ts`
- Modify: `src/stores/__tests__/budgetStore.test.ts`

- [ ] **Step 1: Write failing tests for new store behaviour**

Add these tests at the end of the `describe('budgetStore', ...)` block in `src/stores/__tests__/budgetStore.test.ts`:

```ts
  describe('frequency', () => {
    it('stores monthly frequency with all months equal to baseAmount', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [], frequency: 'monthly' })!
      expect(item.frequency).toBe('monthly')
      expect(item.months.every((v) => v === 100)).toBe(true)
    })

    it('stores quarterly frequency with only 4 active months', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      // quarterStartMonth=1 (Feb) → active: 1,4,7,10
      const item = store.addItem({
        categoryId: cat.id,
        name: 'Item',
        baseAmount: 1200,
        months: [],
        frequency: 'quarterly',
        quarterStartMonth: 1,
      })!
      expect(item.frequency).toBe('quarterly')
      expect(item.quarterStartMonth).toBe(1)
      expect(item.months[1]).toBe(1200) // Feb
      expect(item.months[4]).toBe(1200) // May
      expect(item.months[7]).toBe(1200) // Aug
      expect(item.months[10]).toBe(1200) // Nov
      const inactiveCount = item.months.filter((v) => v === 0).length
      expect(inactiveCount).toBe(8)
    })

    it('stores weekly frequency with months computed from weekday count', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      const item = store.addItem({
        categoryId: cat.id,
        name: 'Item',
        baseAmount: 100,
        months: [],
        frequency: 'weekly',
        weekday: 1,
      })!
      expect(item.frequency).toBe('weekly')
      expect(item.weekday).toBe(1)
      // Total for year should be 52 or 53 weeks * 100
      const total = item.months.reduce((a, b) => a + b, 0)
      expect(total).toBeGreaterThanOrEqual(5200)
      expect(total).toBeLessThanOrEqual(5300)
    })

    it('defaults to monthly frequency when frequency field is missing from stored data', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      // Simulate old data: addItem without frequency field
      const item = store.addItem({ categoryId: cat.id, name: 'Legacy', baseAmount: 50, months: [] })!
      expect(item.frequency).toBe('monthly')
    })
  })

  describe('updateItemCategoryId', () => {
    it('updates categoryId on the item', () => {
      const store = useBudgetStore()
      const expCat = store.addCategory({ sectionType: 'expense', name: 'ExpCat' })!
      const incCat = store.addCategory({ sectionType: 'income', name: 'IncCat' })!
      const item = store.addItem({ categoryId: expCat.id, name: 'MyItem', baseAmount: 100, months: [] })!
      store.updateItemCategoryId(item.id, incCat.id)
      const located = store.sections
        .flatMap((s) => s.categories)
        .flatMap((c) => c.items)
        .find((i) => i.id === item.id)
      expect(located?.categoryId).toBe(incCat.id)
    })

    it('returns false for unknown itemId', () => {
      const store = useBudgetStore()
      const result = store.updateItemCategoryId('nonexistent', 'any-id')
      expect(result).toBe(false)
    })
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/stores/__tests__/budgetStore.test.ts 2>&1 | tail -30`

Expected: FAIL — `store.updateItemCategoryId is not a function`, `frequency` assertions fail

- [ ] **Step 3: Update `src/stores/budgetStore.ts`**

At the top of the file, add import:

```ts
import { computeMonthsFromFrequency } from '../utils/frequency'
import type { ItemFrequency } from '../types/budget'
```

(Add these after the existing type imports.)

Update `createSeedData` to add `frequency: 'monthly'` to all seed items. Find the two item objects and add the field:

```ts
// In the Rent item:
{
  id: createId(),
  categoryId: expenseCategoryId,
  name: 'Rent',
  baseAmount: 1200,
  months: Array.from({ length: 12 }, () => 1200),
  frequency: 'monthly' as ItemFrequency,
},
// In the Internet item:
{
  id: createId(),
  categoryId: expenseCategoryId,
  name: 'Internet',
  baseAmount: 60,
  months: Array.from({ length: 12 }, () => 60),
  frequency: 'monthly' as ItemFrequency,
},
// In the Primary Salary item:
{
  id: createId(),
  categoryId: incomeCategoryId,
  name: 'Primary Salary',
  baseAmount: 3200,
  months: Array.from({ length: 12 }, () => 3200),
  frequency: 'monthly' as ItemFrequency,
},
```

Update `remapYearIds` signature to accept `targetYear` and recompute weekly months:

```ts
const remapYearIds = (yearData: YearData, copiedFromYear: number | null = null, targetYear = 0): YearData => {
  const cloned = clone(yearData)

  cloned.sections = cloned.sections.map((section) => ({
    ...section,
    id: createId(),
    categories: section.categories.map((category) => {
      const newCategoryId = createId()

      return {
        ...category,
        id: newCategoryId,
        items: category.items.map((item) => {
          const freq = item.frequency ?? 'monthly'
          const recomputedMonths =
            freq === 'weekly' && targetYear > 0
              ? computeMonthsFromFrequency('weekly', item.baseAmount, targetYear, { weekday: item.weekday })
              : Array.isArray(item.months)
                ? item.months.map((value) => toNumber(value))
                : Array.from({ length: 12 }, () => toNumber(item.baseAmount))

          return {
            ...item,
            id: createId(),
            categoryId: newCategoryId,
            frequency: freq,
            months: recomputedMonths,
            copiedFromYear,
            copiedBaselineMonths: Array.isArray(item.months) ? item.months.map((value) => toNumber(value)) : null,
          }
        }),
      }
    }),
  }))

  return cloned
}
```

Update `copyPreviousYear` and `copyYear` callers to pass the target year:

```ts
const copyPreviousYear = (): boolean => {
  const sourceYear = currentYear.value - 1
  if (!data.value[sourceYear]) return false
  data.value[currentYear.value] = remapYearIds(data.value[sourceYear], sourceYear, currentYear.value)
  return true
}

const copyYear = (fromYear: number, toYear: number): boolean => {
  if (!data.value[fromYear]) return false
  data.value[toYear] = remapYearIds(data.value[fromYear], fromYear, toYear)
  return true
}
```

Update `addItem` to handle frequency:

```ts
const addItem = ({
  categoryId,
  categoryName,
  sectionType,
  name,
  baseAmount,
  months,
  frequency = 'monthly',
  weekday,
  quarterStartMonth,
}: SaveItemPayload): BudgetItem | null => {
  const found = resolveCategoryForItem({ categoryId, categoryName, sectionType })
  if (!found) return null

  const normalizedItemName = normalizeEntryName(name)
  if (!normalizedItemName) return null

  const computedMonths =
    frequency === 'monthly'
      ? normalizeMonths(baseAmount, months)
      : computeMonthsFromFrequency(frequency, toNumber(baseAmount), currentYear.value, { weekday, quarterStartMonth })

  const item: BudgetItem = {
    id: createId(),
    categoryId: found.category.id,
    name: normalizedItemName,
    baseAmount: toNumber(baseAmount),
    months: computedMonths,
    frequency,
    weekday,
    quarterStartMonth,
  }

  found.category.items.push(item)
  return item
}
```

Update `editItem` to handle frequency:

```ts
const editItem = ({
  itemId,
  categoryId,
  categoryName,
  sectionType,
  name,
  baseAmount,
  months,
  frequency = 'monthly',
  weekday,
  quarterStartMonth,
}: SaveItemPayload): boolean => {
  if (!itemId) return false

  const located = findItem(sections.value, itemId)
  if (!located) return false

  const normalizedItemName = normalizeEntryName(name)
  if (!normalizedItemName) return false

  const resolvedCategory = resolveCategoryForItem({ categoryId, categoryName, sectionType })
  if (!resolvedCategory) return false

  const computedMonths =
    frequency === 'monthly'
      ? normalizeMonths(baseAmount, months)
      : computeMonthsFromFrequency(frequency, toNumber(baseAmount), currentYear.value, { weekday, quarterStartMonth })

  located.item.name = normalizedItemName
  located.item.baseAmount = toNumber(baseAmount)
  located.item.months = computedMonths
  located.item.frequency = frequency
  located.item.weekday = weekday
  located.item.quarterStartMonth = quarterStartMonth

  if (resolvedCategory.category.id !== located.category.id) {
    located.category.items = located.category.items.filter((item) => item.id !== itemId)
    const destination = findCategory(sections.value, resolvedCategory.category.id)
    if (destination) {
      located.item.categoryId = destination.category.id
      destination.category.items.push(located.item)
    }
  }

  return true
}
```

Add `updateItemCategoryId` action after `editItem`:

```ts
const updateItemCategoryId = (itemId: string, newCategoryId: string): boolean => {
  const located = findItem(sections.value, itemId)
  if (!located) return false
  located.item.categoryId = newCategoryId
  return true
}
```

Expose `updateItemCategoryId` in the store's return object:

```ts
return {
  // ...existing exports...
  updateItemCategoryId,
}
```

Also update `loadFromStorage` to normalize the `frequency` field for legacy data. In the try block after `data.value = parsed.data`, add nothing — the store's addItem/editItem won't re-run on load, so items with missing `frequency` will have `undefined`. Fix this by normalizing on load: find the `ensureYearExists` call and after it, add a normalization pass. Actually, add a `normalizeLoadedData` helper called after assigning `data.value`:

Add this helper before the store definition:

```ts
const normalizeBudgetData = (budgetData: BudgetData): void => {
  for (const yearData of Object.values(budgetData)) {
    for (const section of yearData.sections) {
      for (const category of section.categories) {
        for (const item of category.items) {
          if (!item.frequency) {
            item.frequency = 'monthly'
          }
        }
      }
    }
  }
}
```

Call it in `loadFromStorage` after `data.value = parsed.data`:

```ts
data.value = parsed.data
normalizeBudgetData(data.value)
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/stores/__tests__/budgetStore.test.ts 2>&1 | tail -30`

Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`

Expected: All tests PASS. Fix any TypeScript errors before proceeding.

- [ ] **Step 6: Commit**

```bash
git add src/stores/budgetStore.ts src/stores/__tests__/budgetStore.test.ts
git commit -m "feat: add frequency fields to store, updateItemCategoryId, recompute weeks on year copy"
```

---

## Task 4: Drag-and-Drop

**Files:**
- Modify: `src/components/BudgetTable.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Install vue-draggable-plus**

Run: `npm install vue-draggable-plus`

Expected: Package added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Update `src/components/BudgetTable.vue`**

Replace the entire file with the following. Key changes:
- Import `VueDraggable`
- Split single `<tbody>` into multiple per-category
- Replace `TransitionGroup` on item rows with `VueDraggable tag="tbody"`
- Add `move-item` emit
- Remove the `TransitionGroup` stagger/highlight helpers (SortableJS handles drag animation)

```vue
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
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
  (event: 'move-item', payload: { itemId: string; newCategoryId: string }): void
}>()

function onItemChange(evt: { added?: { element: BudgetItem; newIndex: number } }, categoryId: string) {
  if (evt.added) {
    emit('move-item', { itemId: evt.added.element.id, newCategoryId: categoryId })
  }
}
</script>

<template>
  <div class="table-wrap">
    <table class="budget-table">
      <BudgetTableHeader :months="months" />

      <template v-for="section in sections" :key="section.id">
        <!-- Section row in its own tbody -->
        <tbody>
          <BudgetSectionRow
            :section="section"
            :totals="getSectionTotals(section)"
            @toggle="emit('toggle-section', $event)"
            @add-category="emit('add-category', $event)"
          />
        </tbody>

        <template v-for="(category, catIndex) in section.categories" :key="category.id">
          <!-- Category row in its own tbody (animates in/out with section collapse) -->
          <Transition name="row">
            <tbody v-if="!section.collapsed" :style="{ transitionDelay: `${catIndex * 30}ms` }">
              <BudgetCategoryRow
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
            </tbody>
          </Transition>

          <!-- Items draggable list — one tbody per category -->
          <VueDraggable
            v-if="!category.collapsed && !section.collapsed"
            v-model="category.items"
            tag="tbody"
            group="budget-items"
            item-key="id"
            @change="(evt) => onItemChange(evt, category.id)"
          >
            <template #item="{ element: item, index: itemIndex }">
              <BudgetItemRow
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
            </template>
          </VueDraggable>
        </template>
      </template>

      <!-- Totals in their own tbody -->
      <tbody>
        <BudgetTotalsRow label="Total Expenses" :totals="expenseTotals" />
        <BudgetTotalsRow label="Total Income" :totals="incomeTotals" />
        <BudgetDifferenceRow :monthly="differenceMonthly" :yearly="differenceYearly" />
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 3: Wire `move-item` in `src/App.vue`**

In `App.vue`, add a handler function after `deleteInlineItem`:

```ts
const onMoveItem = ({ itemId, newCategoryId }: { itemId: string; newCategoryId: string }) => {
  store.updateItemCategoryId(itemId, newCategoryId)
}
```

In the `<BudgetTable>` template tag, add the event listener:

```vue
@move-item="onMoveItem"
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`

Expected: All tests PASS

- [ ] **Step 5: Manual smoke test**

Run `npm run dev` and verify:
- Items can be dragged within a category to reorder
- Items can be dragged from one category to another (within same section)
- Items can be dragged from Expenses to Income and vice versa

- [ ] **Step 6: Commit**

```bash
git add src/components/BudgetTable.vue src/App.vue package.json package-lock.json
git commit -m "feat: add drag-and-drop item reordering across categories and sections"
```

---

## Task 5: CategoryFormDialog — Enter Key

**Files:**
- Modify: `src/components/CategoryFormDialog.vue`

- [ ] **Step 1: Update `src/components/CategoryFormDialog.vue`**

Add an `onDialogKeydown` handler in the `<script setup>` block, after `onSave`:

```ts
const onDialogKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return
  if ((event.target as HTMLElement).closest('button')) return
  if (!name.value.trim()) return
  onSave()
}
```

Add `@keydown="onDialogKeydown"` to the `<Dialog>` component:

```vue
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
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run 2>&1 | tail -10`

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/CategoryFormDialog.vue
git commit -m "feat: submit CategoryFormDialog on Enter key"
```

---

## Task 6: ItemFormDialog — Frequency UI + Enter Key

**Files:**
- Modify: `src/components/ItemFormDialog.vue`

- [ ] **Step 1: Replace `src/components/ItemFormDialog.vue`**

Replace the entire file with:

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import type { BudgetItem, FlatCategoryOption, ItemFrequency, SaveItemPayload, SectionType } from '../types/budget'

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
const weekday = ref(1)
const quarterStartMonth = ref(0)

const labels: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const frequencyOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
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
        <SelectButton v-model="frequency" :options="frequencyOptions" option-label="label" option-value="value" />
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
    </template>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emit('close')" />
      <Button label="Save" :disabled="!canSave" @click="onSave" />
    </template>
  </Dialog>
</template>
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run 2>&1 | tail -20`

Expected: All tests PASS

- [ ] **Step 3: Build check**

Run: `npm run build 2>&1 | tail -20`

Expected: No TypeScript errors, successful build.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev` and verify:
- New item dialog shows Frequency selector (Monthly / Weekly / Quarterly)
- Selecting Weekly shows "Amount per week" label + Payment day dropdown
- Selecting Quarterly shows "Amount per quarter" label + First payment month dropdown
- Monthly overrides toggle only appears when Monthly is selected
- Enter key submits both dialogs
- Saving a quarterly item (e.g. start Feb, 1200) creates an item with 0 in most months and 1200 in Feb/May/Aug/Nov

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemFormDialog.vue
git commit -m "feat: add frequency selector (weekly/quarterly/monthly) and Enter key submission to ItemFormDialog"
```
