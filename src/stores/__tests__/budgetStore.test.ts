import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBudgetStore } from '../budgetStore'

type BudgetStore = ReturnType<typeof useBudgetStore>

const getExpenseSection = (store: BudgetStore) => store.sections.find((section) => section.type === 'expense')!
const getIncomeSection = (store: BudgetStore) => store.sections.find((section) => section.type === 'income')!

const createStorageMock = (): Storage => {
  const state = new Map<string, string>()

  return {
    get length() {
      return state.size
    },
    clear: () => {
      state.clear()
    },
    getItem: (key: string) => state.get(key) ?? null,
    key: (index: number) => Array.from(state.keys())[index] ?? null,
    removeItem: (key: string) => {
      state.delete(key)
    },
    setItem: (key: string, value: string) => {
      state.set(key, String(value))
    },
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createStorageMock(),
    configurable: true,
    writable: true,
  })
  setActivePinia(createPinia())
})

describe('budgetStore', () => {
  it('adds categories and items with monthly defaults', () => {
    const store = useBudgetStore()

    const expenseCategory = store.addCategory({ sectionType: 'expense', name: 'Utilities' })
    expect(expenseCategory).toBeTruthy()

    const createdItem = store.addItem({
      categoryId: expenseCategory!.id,
      name: 'Electricity',
      baseAmount: 125,
      months: [],
    })

    expect(createdItem).toBeTruthy()
    expect(createdItem!.months).toHaveLength(12)
    expect(createdItem!.months.every((value) => value === 125)).toBe(true)
  })

  it('caps entry titles at 28 characters on add and edit', () => {
    const store = useBudgetStore()

    const expenseCategory = store.addCategory({ sectionType: 'expense', name: 'Utilities' })
    const longName = 'abcdefghijklmnopqrstuvwxyz123456789'

    const createdItem = store.addItem({
      categoryId: expenseCategory!.id,
      name: longName,
      baseAmount: 100,
      months: Array.from({ length: 12 }, () => 100),
    })

    expect(createdItem).toBeTruthy()
    expect(createdItem!.name).toBe('abcdefghijklmnopqrstuvwxyz12')

    const updated = store.editItem({
      itemId: createdItem!.id,
      categoryId: expenseCategory!.id,
      name: '012345678901234567890123456789',
      baseAmount: 100,
      months: Array.from({ length: 12 }, () => 100),
    })

    expect(updated).toBe(true)

    const refreshed = getExpenseSection(store).categories
      .find((category) => category.id === expenseCategory!.id)!
      .items.find((candidate) => candidate.id === createdItem!.id)

    expect(refreshed).toBeTruthy()
    expect(refreshed!.name).toBe('0123456789012345678901234567')
  })

  it('edits an item with monthly overrides', () => {
    const store = useBudgetStore()

    const expenseCategory = store.addCategory({ sectionType: 'expense', name: 'Car' })
    const item = store.addItem({
      categoryId: expenseCategory!.id,
      name: 'Fuel',
      baseAmount: 100,
      months: Array.from({ length: 12 }, () => 100),
    })

    const months = Array.from({ length: 12 }, () => 100)
    months[2] = 250

    const updated = store.editItem({
      itemId: item!.id,
      categoryId: expenseCategory!.id,
      name: 'Fuel',
      baseAmount: 100,
      months,
    })

    expect(updated).toBe(true)
    const refreshed = getExpenseSection(store).categories
      .find((category) => category.id === expenseCategory!.id)!
      .items.find((candidate) => candidate.id === item!.id)

    expect(refreshed).toBeTruthy()
    expect(refreshed!.months[2]).toBe(250)
    expect(refreshed!.months[1]).toBe(100)
  })

  it('calculates expense, income, and difference totals', () => {
    const store = useBudgetStore()

    store.data[store.currentYear] = {
      budgets: [
        {
          id: 'budget-1',
          name: 'Default',
          sections: [
            {
              id: 'expense-section',
              name: 'Expenses',
              type: 'expense',
              collapsed: false,
              categories: [
                {
                  id: 'expense-category',
                  name: 'Fixed',
                  collapsed: false,
                  items: [
                    {
                      id: 'expense-item',
                      categoryId: 'expense-category',
                      name: 'Rent',
                      baseAmount: 1000,
                      months: Array.from({ length: 12 }, () => 1000),
                      frequency: 'monthly' as const,
                    },
                  ],
                },
              ],
            },
            {
              id: 'income-section',
              name: 'Income',
              type: 'income',
              collapsed: false,
              categories: [
                {
                  id: 'income-category',
                  name: 'Salary',
                  collapsed: false,
                  items: [
                    {
                      id: 'income-item',
                      categoryId: 'income-category',
                      name: 'Salary',
                      baseAmount: 3000,
                      months: Array.from({ length: 12 }, () => 3000),
                      frequency: 'monthly' as const,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    expect(store.expenseTotals.monthly[0]).toBe(1000)
    expect(store.incomeTotals.monthly[0]).toBe(3000)
    expect(store.monthlyDifference[0]).toBe(2000)
    expect(store.differenceYearly).toBe(24000)
  })

  it('copies budget to next year with new ids', () => {
    const store = useBudgetStore()

    const fromYear = store.currentYear
    const toYear = fromYear + 1
    const sourceBudgetId = store.data[fromYear].budgets[0].id

    const copied = store.copyBudget(fromYear, sourceBudgetId, toYear, 'Default')
    expect(copied).toBe(true)

    const sourceExpenseSection = store.data[fromYear].budgets[0].sections.find((section) => section.type === 'expense')!
    const copiedExpenseSection = store.data[toYear].budgets.at(-1)!.sections.find((section) => section.type === 'expense')!
    const copiedItem = copiedExpenseSection.categories[0].items[0]

    expect(copiedExpenseSection).toBeTruthy()
    expect(copiedExpenseSection.id).not.toBe(sourceExpenseSection.id)
    expect(copiedItem.copiedFromYear).toBe(fromYear)
    expect(copiedItem.copiedBaselineMonths).toEqual(sourceExpenseSection.categories[0].items[0].months)
  })

  it('fills remaining copied months from a changed month', () => {
    const store = useBudgetStore()

    const fromYear = store.currentYear
    const toYear = fromYear + 1
    const sourceBudgetId = store.data[fromYear].budgets[0].id
    const copied = store.copyBudget(fromYear, sourceBudgetId, toYear, 'Default')
    expect(copied).toBe(true)

    store.setYear(toYear)
    const copiedBudgetId = store.data[toYear].budgets.at(-1)!.id
    store.setCurrentBudget(copiedBudgetId)

    const expenseCategory = getExpenseSection(store).categories[0]
    const copiedItem = expenseCategory.items[0]
    const updatedMonths = [...copiedItem.months]
    updatedMonths[1] = 1600

    const updated = store.editItem({
      itemId: copiedItem.id,
      categoryId: expenseCategory.id,
      name: copiedItem.name,
      baseAmount: copiedItem.baseAmount,
      months: updatedMonths,
    })

    expect(updated).toBe(true)
    expect(store.isItemCopiedFromYear(copiedItem.id)).toBe(true)
    expect(store.getRemainingCopiedMonthCount(copiedItem.id, 1)).toBe(11)

    const secondUpdatedMonths = [...updatedMonths]
    secondUpdatedMonths[4] = 1450
    store.editItem({
      itemId: copiedItem.id,
      categoryId: expenseCategory.id,
      name: copiedItem.name,
      baseAmount: copiedItem.baseAmount,
      months: secondUpdatedMonths,
    })

    const changedCount = store.fillRemainingCopiedMonthsFrom(copiedItem.id, 1)
    expect(changedCount).toBe(11)

    const refreshed = getExpenseSection(store).categories[0].items.find((item) => item.id === copiedItem.id)!
    expect(refreshed.months.every((value) => value === 1600)).toBe(true)
  })

  it('fills remaining months for non-copied item from source month', () => {
    const store = useBudgetStore()

    const expenseCategory = store.addCategory({ sectionType: 'expense', name: 'Utilities' })
    const item = store.addItem({
      categoryId: expenseCategory!.id,
      name: 'Water',
      baseAmount: 100,
      months: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 110],
    })

    const changedCount = store.fillRemainingCopiedMonthsFrom(item!.id, 0)
    expect(changedCount).toBe(11)

    const refreshed = getExpenseSection(store).categories
      .find((category) => category.id === expenseCategory!.id)!
      .items.find((candidate) => candidate.id === item!.id)

    expect(refreshed!.months).toEqual([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100])
  })

  it('deletes item and category', () => {
    const store = useBudgetStore()

    const expenseSection = getExpenseSection(store)
    const firstCategory = expenseSection.categories[0]
    const firstItem = firstCategory.items[0]

    expect(store.deleteItem(firstItem.id)).toBe(true)

    const deletedItemStillExists = firstCategory.items.some((item) => item.id === firstItem.id)
    expect(deletedItemStillExists).toBe(false)

    const categoryId = firstCategory.id
    expect(store.deleteCategory(categoryId)).toBe(true)

    const existsAfterDelete = expenseSection.categories.some((category) => category.id === categoryId)
    expect(existsAfterDelete).toBe(false)
  })

  it('persists data to localStorage', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem')
    const store = useBudgetStore()

    store.goToNextYear()
    store.addCategory({ sectionType: 'income', name: 'Bonus' })
    store.saveToStorage()

    expect(setItemSpy).toHaveBeenCalled()
    setItemSpy.mockRestore()
  })

  it('moves item to another category on edit', () => {
    const store = useBudgetStore()

    const expenseCategory = store.addCategory({ sectionType: 'expense', name: 'Home' })
    const incomeCategory = store.addCategory({ sectionType: 'income', name: 'Consulting' })

    const item = store.addItem({
      categoryId: expenseCategory!.id,
      name: 'Transfer Me',
      baseAmount: 100,
      months: Array.from({ length: 12 }, () => 100),
    })

    const moved = store.editItem({
      itemId: item!.id,
      categoryId: incomeCategory!.id,
      name: 'Transfer Me',
      baseAmount: 100,
      months: Array.from({ length: 12 }, () => 100),
    })

    expect(moved).toBe(true)

    const sourceHasItem = getExpenseSection(store).categories
      .find((category) => category.id === expenseCategory!.id)!
      .items.some((candidate) => candidate.id === item!.id)

    const destinationHasItem = getIncomeSection(store).categories
      .find((category) => category.id === incomeCategory!.id)!
      .items.some((candidate) => candidate.id === item!.id)

    expect(sourceHasItem).toBe(false)
    expect(destinationHasItem).toBe(true)
  })

  it('creates a new category while adding an item', () => {
    const store = useBudgetStore()

    const item = store.addItem({
      categoryId: '',
      categoryName: 'Freelance',
      sectionType: 'income',
      name: 'Client Work',
      baseAmount: 500,
      months: Array.from({ length: 12 }, () => 500),
    })

    expect(item).toBeTruthy()

    const incomeSection = getIncomeSection(store)
    const createdCategory = incomeSection.categories.find((category) => category.name === 'Freelance')

    expect(createdCategory).toBeTruthy()
    expect(item!.categoryId).toBe(createdCategory!.id)
    expect(createdCategory!.items.some((candidate) => candidate.id === item!.id)).toBe(true)
  })

  it('creates and moves to a new category while editing an item', () => {
    const store = useBudgetStore()
    const expenseCategory = store.addCategory({ sectionType: 'expense', name: 'Household' })

    const item = store.addItem({
      categoryId: expenseCategory!.id,
      name: 'Supplies',
      baseAmount: 40,
      months: Array.from({ length: 12 }, () => 40),
    })

    const updated = store.editItem({
      itemId: item!.id,
      categoryId: '',
      categoryName: 'Side Hustle',
      sectionType: 'income',
      name: 'Supplies Reimbursed',
      baseAmount: 40,
      months: Array.from({ length: 12 }, () => 40),
    })

    expect(updated).toBe(true)

    const sourceHasItem = getExpenseSection(store).categories
      .find((category) => category.id === expenseCategory!.id)!
      .items.some((candidate) => candidate.id === item!.id)

    const incomeSection = getIncomeSection(store)
    const newCategory = incomeSection.categories.find((category) => category.name === 'Side Hustle')

    expect(sourceHasItem).toBe(false)
    expect(newCategory).toBeTruthy()
    expect(newCategory!.items.some((candidate) => candidate.id === item!.id)).toBe(true)
  })

  it('returns false for copy when source year does not exist', () => {
    const store = useBudgetStore()

    const copied = store.copyBudget(1900, 'nonexistent-id', store.currentYear + 5, 'Copy')

    expect(copied).toBe(false)
  })

  it('handles invalid category/item operations with guard returns', () => {
    const store = useBudgetStore()

    expect(store.addCategory({ sectionType: 'unknown' as never, name: 'X' })).toBeNull()
    expect(store.addCategory({ sectionType: 'expense', name: '   ' })).toBeNull()
    expect(store.editCategory({ categoryId: 'missing', name: 'Updated' })).toBe(false)
    expect(store.deleteCategory('missing')).toBe(false)
    expect(store.deleteItem('missing')).toBe(false)
  })

  it('handles invalid item edit and fill helper guard paths', () => {
    const store = useBudgetStore()

    expect(
      store.editItem({
        itemId: 'missing',
        categoryId: 'missing',
        name: 'Nope',
        baseAmount: 10,
        months: Array.from({ length: 12 }, () => 10),
      }),
    ).toBe(false)

    expect(store.isItemCopiedFromYear('missing')).toBe(false)
    expect(store.getRemainingCopiedMonthCount('missing', 0)).toBe(0)
    expect(store.fillRemainingCopiedMonthsFrom('missing', 0)).toBe(0)
  })

  it('falls back to seed data when localStorage payload is malformed JSON', () => {
    localStorage.setItem('budget-app-data-v1', '{ not-valid-json')

    const store = useBudgetStore()
    const expenseSection = getExpenseSection(store)
    const incomeSection = getIncomeSection(store)

    expect(expenseSection).toBeTruthy()
    expect(incomeSection).toBeTruthy()
    expect(expenseSection.categories.length).toBeGreaterThan(0)
    expect(incomeSection.categories.length).toBeGreaterThan(0)
  })

  it('tracks year slide direction when navigating years', () => {
    const store = useBudgetStore()
    expect(store.yearSlideDirection).toBe('slide-left')

    store.goToNextYear()
    expect(store.yearSlideDirection).toBe('slide-left')

    store.goToPreviousYear()
    expect(store.yearSlideDirection).toBe('slide-right')
  })

  it('toggles section and category collapse flags and ignores unknown ids', () => {
    const store = useBudgetStore()
    const section = getExpenseSection(store)
    const category = section.categories[0]

    const sectionInitial = section.collapsed
    const categoryInitial = category.collapsed

    store.toggleSectionCollapse(section.id)
    store.toggleCategoryCollapse(category.id)

    expect(section.collapsed).toBe(!sectionInitial)
    expect(category.collapsed).toBe(!categoryInitial)

    store.toggleSectionCollapse('unknown-section-id')
    store.toggleCategoryCollapse('unknown-category-id')

    expect(section.collapsed).toBe(!sectionInitial)
    expect(category.collapsed).toBe(!categoryInitial)
  })

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
      const total = item.months.reduce((a, b) => a + b, 0)
      expect(total).toBeGreaterThanOrEqual(5200)
      expect(total).toBeLessThanOrEqual(5300)
    })

    it('defaults to monthly frequency when frequency field is missing from stored data', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
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

  it('uses timestamp-based id fallback when crypto.randomUUID is unavailable', () => {
    const original = (globalThis as any).crypto
    Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: undefined }, configurable: true, writable: true })
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'NoCrypto' })
    expect(cat).toBeTruthy()
    expect(typeof cat!.id).toBe('string')
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true, writable: true })
  })

  it('normalizes NaN/null/Infinity month values to 0', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
    const item = store.addItem({
      categoryId: cat.id,
      name: 'Broken',
      baseAmount: 100,
      months: [null, undefined, NaN, Infinity, -Infinity, 100, 100, 100, 100, 100, 100, 100] as any,
    })!
    expect(item.months[0]).toBe(0)
    expect(item.months[1]).toBe(0)
    expect(item.months[2]).toBe(0)
    expect(item.months[3]).toBe(0)
    expect(item.months[4]).toBe(0)
    expect(item.months[5]).toBe(100)
  })

  it('normalizes null name to empty via normalizeName', () => {
    const store = useBudgetStore()
    expect(store.addCategory({ sectionType: 'expense', name: null as any })).toBeNull()
  })

  it('normalizes missing item frequency to monthly when loading from storage', () => {
    const year = new Date().getFullYear()
    localStorage.setItem(
      'budget-app-data-v1',
      JSON.stringify({
        currentYear: year,
        data: {
          [year]: {
            budgets: [{
              id: 'b1', name: 'Default',
              sections: [
                {
                  id: 's1', name: 'Expenses', type: 'expense', collapsed: false,
                  categories: [{
                    id: 'c1', name: 'Fixed', collapsed: false,
                    items: [{ id: 'i1', categoryId: 'c1', name: 'Rent', baseAmount: 1000, months: Array(12).fill(1000) }],
                  }],
                },
                { id: 's2', name: 'Income', type: 'income', collapsed: false, categories: [] },
              ],
            }],
          },
        },
      }),
    )
    const store = useBudgetStore()
    const item = getExpenseSection(store).categories[0].items[0]
    expect(item.frequency).toBe('monthly')
  })

  it('migrates old year-level sections format to budgets array', () => {
    const year = new Date().getFullYear()
    localStorage.setItem(
      'budget-app-data-v1',
      JSON.stringify({
        currentYear: year,
        data: {
          [year]: {
            sections: [
              { id: 's1', name: 'Expenses', type: 'expense', collapsed: false, categories: [] },
              { id: 's2', name: 'Income', type: 'income', collapsed: false, categories: [] },
            ],
          },
        },
      }),
    )
    const store = useBudgetStore()
    expect(store.currentYearData.budgets).toHaveLength(1)
    expect(store.currentYearData.budgets[0].name).toBe('Default')
    expect(store.currentYearData.budgets[0].sections).toHaveLength(2)
  })

  it('restores currentYear from storage', () => {
    const savedYear = new Date().getFullYear() - 2
    localStorage.setItem('budget-app-data-v1', JSON.stringify({ currentYear: savedYear, data: {} }))
    const store = useBudgetStore()
    expect(store.currentYear).toBe(savedYear)
  })

  it('skips loadFromStorage silently when localStorage is undefined', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true })
    expect(() => useBudgetStore()).not.toThrow()
  })

  it('skips saveToStorage silently when localStorage is undefined', () => {
    const store = useBudgetStore()
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true })
    expect(() => store.saveToStorage()).not.toThrow()
  })

  it('returns zero totals when expense or income section is absent', () => {
    const store = useBudgetStore()
    store.data[store.currentYear].budgets[0].sections = []
    expect(store.expenseTotals.yearly).toBe(0)
    expect(store.incomeTotals.yearly).toBe(0)
    expect(store.monthlyDifference.every((v) => v === 0)).toBe(true)
  })

  it('getCategoryTotals, getSectionTotals, getItemYearTotal, getItemMonthlyAverage return correct values', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
    const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 120, months: Array(12).fill(120) })!

    const catTotals = store.getCategoryTotals(cat)
    expect(catTotals.yearly).toBe(1440)
    expect(catTotals.average).toBe(120)

    const section = getExpenseSection(store)
    const sectionTotals = store.getSectionTotals(section)
    expect(sectionTotals.yearly).toBeGreaterThanOrEqual(1440)

    expect(store.getItemYearTotal(item)).toBe(1440)
    expect(store.getItemMonthlyAverage(item)).toBe(120)
  })

  it('sets copiedBaselineMonths to null when source item months is not an array', () => {
    const store = useBudgetStore()
    const expSection = store.currentYearData.budgets[0].sections.find((s) => s.type === 'expense')!
    expSection.categories[0].items[0].months = undefined as any

    const fromYear = store.currentYear
    const toYear = fromYear + 1
    expect(store.copyBudget(fromYear, store.currentYearData.budgets[0].id, toYear, 'Copied')).toBe(true)

    const copiedItem = store.data[toYear].budgets.at(-1)!.sections.flatMap((s) => s.categories).flatMap((c) => c.items)[0]
    expect(copiedItem.copiedBaselineMonths).toBeNull()
  })

  it('recomputes months for weekly and quarterly items when copying to a new year', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Recurring' })!
    store.addItem({ categoryId: cat.id, name: 'Weekly', baseAmount: 100, months: [], frequency: 'weekly', weekday: 1 })
    store.addItem({ categoryId: cat.id, name: 'Quarterly', baseAmount: 300, months: [], frequency: 'quarterly', quarterStartMonth: 0 })

    const fromYear = store.currentYear
    const toYear = fromYear + 1
    expect(store.copyBudget(fromYear, store.currentYearData.budgets[0].id, toYear, 'Copied')).toBe(true)

    const allItems = store.data[toYear].budgets.at(-1)!.sections.flatMap((s) => s.categories).flatMap((c) => c.items)
    expect(allItems.find((i) => i.name === 'Weekly')!.frequency).toBe('weekly')
    expect(allItems.find((i) => i.name === 'Quarterly')!.frequency).toBe('quarterly')
  })

  it('returns 0 from getRemainingCopiedMonthCount when item has no baseline months', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
    const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
    expect(store.getRemainingCopiedMonthCount(item.id, 0)).toBe(0)
  })

  it('falls back to source budget name when copy name is blank', () => {
    const store = useBudgetStore()
    const fromYear = store.currentYear
    const toYear = fromYear + 1
    const sourceName = store.currentYearData.budgets[0].name
    store.copyBudget(fromYear, store.currentYearData.budgets[0].id, toYear, '   ')
    expect(store.data[toYear].budgets.at(-1)!.name).toBe(sourceName)
  })

  it('isItemCopiedFromYear returns false for a non-copied item that exists', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
    const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
    expect(store.isItemCopiedFromYear(item.id)).toBe(false)
  })

  it('getRemainingCopiedMonthCount counts only months still matching baseline', () => {
    const store = useBudgetStore()
    const fromYear = store.currentYear
    const toYear = fromYear + 1
    store.copyBudget(fromYear, store.currentYearData.budgets[0].id, toYear, 'Copy')
    store.setYear(toYear)
    store.setCurrentBudget(store.data[toYear].budgets.at(-1)!.id)

    const cat = getExpenseSection(store).categories[0]
    const item = cat.items[0]
    const months = item.months.map((v, i) => (i < 2 ? v + 999 : v))
    store.editItem({ itemId: item.id, categoryId: cat.id, name: item.name, baseAmount: item.baseAmount, months })

    // month 0 excluded, month 1 differs from baseline → only months 2–11 match (10)
    expect(store.getRemainingCopiedMonthCount(item.id, 0)).toBe(10)
  })

  it('returns 0 from getRemainingCopiedMonthCount when copiedBaselineMonths is null', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
    const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
    item.copiedBaselineMonths = null
    expect(store.getRemainingCopiedMonthCount(item.id, 0)).toBe(0)
  })

  it('uses empty string for categoryName when omitted (triggers ?? fallback)', () => {
    const store = useBudgetStore()
    // categoryName not provided → undefined ?? '' → '' → addCategory fails → null
    expect(store.addItem({ categoryId: '', sectionType: 'expense', name: 'Test', baseAmount: 100, months: [] })).toBeNull()
  })

  it('defaults to monthly when both frequency arg and item frequency are absent', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
    const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
    delete (item as any).frequency
    store.editItem({ itemId: item.id, categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })
    const refreshed = getExpenseSection(store).categories.flatMap((c) => c.items).find((i) => i.id === item.id)!
    expect(refreshed.frequency).toBe('monthly')
  })

  it('returns 0 from fillRemainingCopiedMonthsFrom when sourceMonthIndex is out of range', () => {
    const store = useBudgetStore()
    const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
    const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
    expect(store.fillRemainingCopiedMonthsFrom(item.id, -1)).toBe(0)
    expect(store.fillRemainingCopiedMonthsFrom(item.id, 12)).toBe(0)
  })

  describe('addBudgetForYear', () => {
    it('creates a named budget for the given year', () => {
      const store = useBudgetStore()
      const budget = store.addBudgetForYear(store.currentYear, 'Work')
      expect(budget.name).toBe('Work')
      expect(store.currentYearData.budgets.find((b) => b.id === budget.id)).toBeTruthy()
    })

    it('falls back to "New Budget" when name is empty', () => {
      const store = useBudgetStore()
      const budget = store.addBudgetForYear(store.currentYear, '')
      expect(budget.name).toBe('New Budget')
    })

    it('initialises the year if it does not yet exist', () => {
      const store = useBudgetStore()
      const futureYear = store.currentYear + 10
      const budget = store.addBudgetForYear(futureYear, 'Future')
      expect(store.data[futureYear]).toBeTruthy()
      expect(store.data[futureYear].budgets.find((b) => b.id === budget.id)).toBeTruthy()
    })
  })

  describe('deleteBudget', () => {
    it('returns false when year does not exist', () => {
      const store = useBudgetStore()
      expect(store.deleteBudget(1800, 'any')).toBe(false)
    })

    it('returns false when budget id is not found', () => {
      const store = useBudgetStore()
      expect(store.deleteBudget(store.currentYear, 'nonexistent')).toBe(false)
    })

    it('resets the last budget to an empty default instead of removing it', () => {
      const store = useBudgetStore()
      const budgetId = store.currentYearData.budgets[0].id
      expect(store.deleteBudget(store.currentYear, budgetId)).toBe(true)
      expect(store.currentYearData.budgets).toHaveLength(1)
      expect(store.currentYearData.budgets[0].name).toBe('Default')
    })

    it('removes a non-last budget and clears currentBudgetId when it matched', () => {
      const store = useBudgetStore()
      const second = store.addBudgetForYear(store.currentYear, 'Second')
      store.setCurrentBudget(second.id)

      expect(store.deleteBudget(store.currentYear, second.id)).toBe(true)
      expect(store.currentBudgetId).toBeNull()
      expect(store.currentYearData.budgets.find((b) => b.id === second.id)).toBeUndefined()
    })
  })

  describe('renameBudget', () => {
    it('returns false when year does not exist', () => {
      const store = useBudgetStore()
      expect(store.renameBudget(1800, 'any', 'Name')).toBe(false)
    })

    it('returns false when budget id is not found', () => {
      const store = useBudgetStore()
      expect(store.renameBudget(store.currentYear, 'nonexistent', 'Name')).toBe(false)
    })

    it('returns false when new name is blank', () => {
      const store = useBudgetStore()
      const id = store.currentYearData.budgets[0].id
      expect(store.renameBudget(store.currentYear, id, '  ')).toBe(false)
    })

    it('renames budget successfully', () => {
      const store = useBudgetStore()
      const id = store.currentYearData.budgets[0].id
      expect(store.renameBudget(store.currentYear, id, 'Renamed')).toBe(true)
      expect(store.currentYearData.budgets[0].name).toBe('Renamed')
    })
  })

  describe('editCategory guard paths', () => {
    it('returns false when categoryId is empty', () => {
      const store = useBudgetStore()
      expect(store.editCategory({ categoryId: '', name: 'Test' })).toBe(false)
    })

    it('returns false when new name is blank', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      expect(store.editCategory({ categoryId: cat.id, name: '  ' })).toBe(false)
    })

    it('moves category to a different section type', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Moving' })!
      expect(store.editCategory({ categoryId: cat.id, name: 'Moving', sectionType: 'income' })).toBe(true)
      expect(getExpenseSection(store).categories.find((c) => c.id === cat.id)).toBeUndefined()
      expect(getIncomeSection(store).categories.find((c) => c.id === cat.id)).toBeTruthy()
    })
  })

  describe('addItem guard paths', () => {
    it('returns null when no category info is provided', () => {
      const store = useBudgetStore()
      expect(store.addItem({ categoryId: '', name: 'Test', baseAmount: 100, months: [] })).toBeNull()
    })

    it('returns null when categoryName is empty and new category creation fails', () => {
      const store = useBudgetStore()
      expect(store.addItem({ categoryId: '', categoryName: '', sectionType: 'expense', name: 'Test', baseAmount: 100, months: [] })).toBeNull()
    })

    it('returns null when item name is blank', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      expect(store.addItem({ categoryId: cat.id, name: '  ', baseAmount: 100, months: [] })).toBeNull()
    })
  })

  describe('editItem guard paths', () => {
    it('returns false when itemId is empty', () => {
      const store = useBudgetStore()
      expect(store.editItem({ itemId: '', categoryId: '', name: 'Test', baseAmount: 100, months: [] })).toBe(false)
    })

    it('returns false when name is blank', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
      expect(store.editItem({ itemId: item.id, categoryId: cat.id, name: '  ', baseAmount: 100, months: [] })).toBe(false)
    })

    it('returns false when no target category is resolvable', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
      expect(store.editItem({ itemId: item.id, categoryId: '', name: 'Item', baseAmount: 100, months: [] })).toBe(false)
    })

    it('sets weekday when editing to weekly frequency', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [] })!
      store.editItem({ itemId: item.id, categoryId: cat.id, name: 'Item', baseAmount: 100, months: [], frequency: 'weekly', weekday: 3 })
      const refreshed = getExpenseSection(store).categories.flatMap((c) => c.items).find((i) => i.id === item.id)!
      expect(refreshed.frequency).toBe('weekly')
      expect(refreshed.weekday).toBe(3)
    })

    it('sets quarterStartMonth when editing to quarterly frequency', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 300, months: [] })!
      store.editItem({ itemId: item.id, categoryId: cat.id, name: 'Item', baseAmount: 300, months: [], frequency: 'quarterly', quarterStartMonth: 2 })
      const refreshed = getExpenseSection(store).categories.flatMap((c) => c.items).find((i) => i.id === item.id)!
      expect(refreshed.frequency).toBe('quarterly')
      expect(refreshed.quarterStartMonth).toBe(2)
    })

    it('clears weekday and quarterStartMonth when changing back to monthly', () => {
      const store = useBudgetStore()
      const cat = store.addCategory({ sectionType: 'expense', name: 'Test' })!
      const item = store.addItem({ categoryId: cat.id, name: 'Item', baseAmount: 100, months: [], frequency: 'weekly', weekday: 1 })!
      store.editItem({ itemId: item.id, categoryId: cat.id, name: 'Item', baseAmount: 100, months: [], frequency: 'monthly' })
      const refreshed = getExpenseSection(store).categories.flatMap((c) => c.items).find((i) => i.id === item.id)!
      expect(refreshed.weekday).toBeUndefined()
      expect(refreshed.quarterStartMonth).toBeUndefined()
    })
  })
})
