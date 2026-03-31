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
    }

    expect(store.expenseTotals.monthly[0]).toBe(1000)
    expect(store.incomeTotals.monthly[0]).toBe(3000)
    expect(store.monthlyDifference[0]).toBe(2000)
    expect(store.differenceYearly).toBe(24000)
  })

  it('copies previous year with new ids', () => {
    const store = useBudgetStore()

    const fromYear = store.currentYear
    const toYear = fromYear + 1

    const copied = store.copyYear(fromYear, toYear)
    expect(copied).toBe(true)

    const sourceExpenseSection = store.data[fromYear].sections.find((section) => section.type === 'expense')!
    const copiedExpenseSection = store.data[toYear].sections.find((section) => section.type === 'expense')!
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
    const copied = store.copyYear(fromYear, toYear)
    expect(copied).toBe(true)

    store.setYear(toYear)

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

  it('returns false for copy operations when source year does not exist', () => {
    const store = useBudgetStore()

    const copiedPrevious = store.copyPreviousYear()
    const copiedSpecific = store.copyYear(1900, store.currentYear + 5)

    expect(copiedPrevious).toBe(false)
    expect(copiedSpecific).toBe(false)
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
})
