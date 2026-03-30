import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  BudgetCategory,
  BudgetData,
  BudgetItem,
  BudgetSection,
  ItemFrequency,
  SaveCategoryPayload,
  SaveItemPayload,
  SectionType,
  Totals,
  YearData,
} from '../types/budget'
import { computeMonthsFromFrequency } from '../utils/frequency'

const STORAGE_KEY = 'budget-app-data-v1'
const ENTRY_TITLE_MAX_LENGTH = 28

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const createId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const toNumber = (value: unknown): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const normalizeMonths = (baseAmount = 0, months: unknown[] = []): number[] => {
  if (!Array.isArray(months) || months.length !== 12) {
    return Array.from({ length: 12 }, () => toNumber(baseAmount))
  }

  return months.map((monthValue) => toNumber(monthValue))
}

const itemYearTotal = (item: BudgetItem): number => item.months.reduce((sum, value) => sum + toNumber(value), 0)

const itemMonthlyAverage = (item: BudgetItem): number => itemYearTotal(item) / 12

const categoryTotals = (category: BudgetCategory): Totals => {
  const monthly = Array.from({ length: 12 }, () => 0)

  for (const item of category.items) {
    item.months.forEach((value, index) => {
      monthly[index] += toNumber(value)
    })
  }

  const yearly = monthly.reduce((sum, value) => sum + value, 0)

  return {
    monthly,
    yearly,
    average: yearly / 12,
  }
}

const sectionTotals = (section: Pick<BudgetSection, 'categories'>): Totals => {
  const monthly = Array.from({ length: 12 }, () => 0)

  for (const category of section.categories) {
    const totals = categoryTotals(category)
    totals.monthly.forEach((value, index) => {
      monthly[index] += value
    })
  }

  const yearly = monthly.reduce((sum, value) => sum + value, 0)

  return {
    monthly,
    yearly,
    average: yearly / 12,
  }
}

const createEmptyYear = (): YearData => ({
  sections: [
    {
      id: createId(),
      name: 'Expenses',
      type: 'expense',
      collapsed: false,
      categories: [],
    },
    {
      id: createId(),
      name: 'Income',
      type: 'income',
      collapsed: false,
      categories: [],
    },
  ],
})

const createSeedData = (year: number): BudgetData => {
  const expenseCategoryId = createId()
  const incomeCategoryId = createId()

  return {
    [year]: {
      sections: [
        {
          id: createId(),
          name: 'Expenses',
          type: 'expense',
          collapsed: false,
          categories: [
            {
              id: expenseCategoryId,
              name: 'Fixed Costs',
              collapsed: false,
              items: [
                {
                  id: createId(),
                  categoryId: expenseCategoryId,
                  name: 'Rent',
                  baseAmount: 1200,
                  months: Array.from({ length: 12 }, () => 1200),
                  frequency: 'monthly' as ItemFrequency,
                },
                {
                  id: createId(),
                  categoryId: expenseCategoryId,
                  name: 'Internet',
                  baseAmount: 60,
                  months: Array.from({ length: 12 }, () => 60),
                  frequency: 'monthly' as ItemFrequency,
                },
              ],
            },
          ],
        },
        {
          id: createId(),
          name: 'Income',
          type: 'income',
          collapsed: false,
          categories: [
            {
              id: incomeCategoryId,
              name: 'Salary',
              collapsed: false,
              items: [
                {
                  id: createId(),
                  categoryId: incomeCategoryId,
                  name: 'Primary Salary',
                  baseAmount: 3200,
                  months: Array.from({ length: 12 }, () => 3200),
                  frequency: 'monthly' as ItemFrequency,
                },
              ],
            },
          ],
        },
      ],
    },
  }
}

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

const ensureYearExists = (state: BudgetData, year: number): void => {
  if (!state[year]) {
    state[year] = createEmptyYear()
  }
}

const remapYearIds = (yearData: YearData, copiedFromYear: number | null = null): YearData => {
  const cloned = clone(yearData)

  cloned.sections = cloned.sections.map((section) => ({
    ...section,
    id: createId(),
    categories: section.categories.map((category) => {
      const newCategoryId = createId()

      return {
        ...category,
        id: newCategoryId,
        items: category.items.map((item) => ({
          ...item,
          id: createId(),
          categoryId: newCategoryId,
          copiedFromYear,
          copiedBaselineMonths: Array.isArray(item.months) ? item.months.map((value) => toNumber(value)) : null,
        })),
      }
    }),
  }))

  return cloned
}

const findCategory = (
  sections: BudgetSection[],
  categoryId: string,
): { section: BudgetSection; category: BudgetCategory } | null => {
  for (const section of sections) {
    for (const category of section.categories) {
      if (category.id === categoryId) {
        return { section, category }
      }
    }
  }

  return null
}

const findItem = (
  sections: BudgetSection[],
  itemId: string,
): { section: BudgetSection; category: BudgetCategory; item: BudgetItem } | null => {
  for (const section of sections) {
    for (const category of section.categories) {
      for (const item of category.items) {
        if (item.id === itemId) {
          return { section, category, item }
        }
      }
    }
  }

  return null
}

const normalizeName = (value: unknown): string => String(value ?? '').trim()
const normalizeEntryName = (value: unknown): string => normalizeName(value).slice(0, ENTRY_TITLE_MAX_LENGTH)

interface SerializedBudgetStore {
  currentYear: number
  data: BudgetData
}

export const useBudgetStore = defineStore('budget', () => {
  const currentYear = ref(new Date().getFullYear())
  const yearSlideDirection = ref<'slide-left' | 'slide-right'>('slide-left')
  const data = ref(createSeedData(currentYear.value))

  const currentYearData = computed(() => {
    ensureYearExists(data.value, currentYear.value)
    return data.value[currentYear.value]
  })

  const sections = computed(() => currentYearData.value.sections)
  const expenseSection = computed(() => sections.value.find((section) => section.type === 'expense'))
  const incomeSection = computed(() => sections.value.find((section) => section.type === 'income'))

  const expenseTotals = computed(() => sectionTotals(expenseSection.value ?? { categories: [] }))
  const incomeTotals = computed(() => sectionTotals(incomeSection.value ?? { categories: [] }))

  const monthlyDifference = computed(() => {
    return incomeTotals.value.monthly.map((income, index) => income - expenseTotals.value.monthly[index])
  })

  const differenceYearly = computed(() => monthlyDifference.value.reduce((sum, value) => sum + value, 0))

  const serialize = (): SerializedBudgetStore => {
    return {
      currentYear: currentYear.value,
      data: data.value,
    }
  }

  const saveToStorage = (): void => {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()))
  }

  const loadFromStorage = (): void => {
    if (typeof localStorage === 'undefined') {
      return
    }

    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SerializedBudgetStore>

      if (parsed && typeof parsed === 'object' && parsed.data) {
        data.value = parsed.data
      }

      if (parsed && Number.isFinite(Number(parsed.currentYear))) {
        currentYear.value = Number(parsed.currentYear)
      }

      normalizeBudgetData(data.value)
      ensureYearExists(data.value, currentYear.value)
    } catch {
      data.value = createSeedData(currentYear.value)
    }
  }

  loadFromStorage()

  watch(
    [data, currentYear],
    () => {
      saveToStorage()
    },
    { deep: true },
  )

  const setYear = (year: number): void => {
    currentYear.value = Number(year)
    ensureYearExists(data.value, currentYear.value)
  }

  const goToPreviousYear = (): void => {
    yearSlideDirection.value = 'slide-right'
    currentYear.value -= 1
  }
  const goToNextYear = (): void => {
    yearSlideDirection.value = 'slide-left'
    currentYear.value += 1
  }

  const copyPreviousYear = (): boolean => {
    const sourceYear = currentYear.value - 1

    if (!data.value[sourceYear]) {
      return false
    }

    data.value[currentYear.value] = remapYearIds(data.value[sourceYear], sourceYear)
    return true
  }

  const copyYear = (fromYear: number, toYear: number): boolean => {
    if (!data.value[fromYear]) {
      return false
    }

    data.value[toYear] = remapYearIds(data.value[fromYear], fromYear)
    return true
  }

  const isItemCopiedFromYear = (itemId: string): boolean => {
    const located = findItem(sections.value, itemId)

    if (!located) {
      return false
    }

    return Number.isFinite(Number(located.item.copiedFromYear))
  }

  const getRemainingCopiedMonthCount = (itemId: string, excludedMonthIndex = -1): number => {
    const located = findItem(sections.value, itemId)

    if (!located) {
      return 0
    }

    const baseline = Array.isArray(located.item.copiedBaselineMonths) ? located.item.copiedBaselineMonths : null

    if (!baseline || baseline.length !== 12) {
      return 0
    }

    return located.item.months.reduce((count, value, index) => {
      if (index === excludedMonthIndex) {
        return count
      }

      return toNumber(value) === toNumber(baseline[index]) ? count + 1 : count
    }, 0)
  }

  const fillRemainingCopiedMonthsFrom = (itemId: string, sourceMonthIndex: number): number => {
    const located = findItem(sections.value, itemId)

    if (!located) {
      return 0
    }

    if (!Number.isInteger(sourceMonthIndex) || sourceMonthIndex < 0 || sourceMonthIndex > 11) {
      return 0
    }

    const replacementValue = toNumber(located.item.months[sourceMonthIndex])
    let updatedCount = 0

    located.item.months = located.item.months.map((monthValue, index) => {
      if (index === sourceMonthIndex) {
        return toNumber(monthValue)
      }

      if (toNumber(monthValue) !== replacementValue) {
        updatedCount += 1
      }

      return replacementValue
    })

    located.item.baseAmount = itemMonthlyAverage(located.item)
    return updatedCount
  }

  const addCategory = ({ sectionType, name }: { sectionType: SectionType; name: string }): BudgetCategory | null => {
    const section = sections.value.find((candidate) => candidate.type === sectionType)

    if (!section) {
      return null
    }

    const normalizedName = normalizeName(name)

    if (!normalizedName) {
      return null
    }

    const category: BudgetCategory = {
      id: createId(),
      name: normalizedName,
      collapsed: false,
      items: [],
    }

    section.categories.push(category)
    return category
  }

  const editCategory = ({ categoryId, name, sectionType }: SaveCategoryPayload): boolean => {
    if (!categoryId) {
      return false
    }

    const found = findCategory(sections.value, categoryId)

    if (!found) {
      return false
    }

    const normalizedName = normalizeName(name)

    if (!normalizedName) {
      return false
    }

    found.category.name = normalizedName

    if (sectionType && found.section.type !== sectionType) {
      found.section.categories = found.section.categories.filter((category) => category.id !== categoryId)

      const targetSection = sections.value.find((section) => section.type === sectionType)

      if (targetSection) {
        targetSection.categories.push(found.category)
      }
    }

    return true
  }

  const deleteCategory = (categoryId: string): boolean => {
    for (const section of sections.value) {
      const existingIndex = section.categories.findIndex((category) => category.id === categoryId)

      if (existingIndex !== -1) {
        section.categories.splice(existingIndex, 1)

        return true
      }
    }

    return false
  }

  const resolveCategoryForItem = ({
    categoryId,
    categoryName,
    sectionType,
  }: {
    categoryId?: string
    categoryName?: string
    sectionType?: SectionType
  }): { section: BudgetSection; category: BudgetCategory } | null => {
    if (categoryId) {
      return findCategory(sections.value, categoryId)
    }

    if (!sectionType) {
      return null
    }

    const createdCategory = addCategory({ sectionType, name: categoryName ?? '' })

    if (!createdCategory) {
      return null
    }

    return findCategory(sections.value, createdCategory.id)
  }

  const addItem = ({ categoryId, categoryName, sectionType, name, baseAmount, months, frequency, weekday, quarterStartMonth }: SaveItemPayload): BudgetItem | null => {
    const found = resolveCategoryForItem({ categoryId, categoryName, sectionType })

    if (!found) {
      return null
    }

    const normalizedItemName = normalizeEntryName(name)

    if (!normalizedItemName) {
      return null
    }

    const resolvedFrequency: ItemFrequency = frequency ?? 'monthly'
    const computedMonths = resolvedFrequency !== 'monthly'
      ? computeMonthsFromFrequency(resolvedFrequency, toNumber(baseAmount), currentYear.value, { weekday, quarterStartMonth })
      : normalizeMonths(baseAmount, months)

    const item: BudgetItem = {
      id: createId(),
      categoryId: found.category.id,
      name: normalizedItemName,
      baseAmount: toNumber(baseAmount),
      months: computedMonths,
      frequency: resolvedFrequency,
      ...(weekday !== undefined ? { weekday } : {}),
      ...(quarterStartMonth !== undefined ? { quarterStartMonth } : {}),
    }

    found.category.items.push(item)
    return item
  }

  const editItem = ({ itemId, categoryId, categoryName, sectionType, name, baseAmount, months, frequency, weekday, quarterStartMonth }: SaveItemPayload): boolean => {
    if (!itemId) {
      return false
    }

    const located = findItem(sections.value, itemId)

    if (!located) {
      return false
    }

    const normalizedItemName = normalizeEntryName(name)

    if (!normalizedItemName) {
      return false
    }

    const resolvedCategory = resolveCategoryForItem({ categoryId, categoryName, sectionType })

    if (!resolvedCategory) {
      return false
    }

    const resolvedFrequency: ItemFrequency = frequency ?? located.item.frequency ?? 'monthly'
    const computedMonths = resolvedFrequency !== 'monthly'
      ? computeMonthsFromFrequency(resolvedFrequency, toNumber(baseAmount), currentYear.value, { weekday, quarterStartMonth })
      : normalizeMonths(baseAmount, months)

    located.item.name = normalizedItemName
    located.item.baseAmount = toNumber(baseAmount)
    located.item.months = computedMonths
    located.item.frequency = resolvedFrequency
    if (weekday !== undefined) located.item.weekday = weekday
    if (quarterStartMonth !== undefined) located.item.quarterStartMonth = quarterStartMonth

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

  const deleteItem = (itemId: string): boolean => {
    for (const section of sections.value) {
      for (const category of section.categories) {
        const itemIndex = category.items.findIndex((item) => item.id === itemId)

        if (itemIndex !== -1) {
          category.items.splice(itemIndex, 1)

          return true
        }
      }
    }

    return false
  }

  const updateItemCategoryId = (itemId: string, newCategoryId: string): boolean => {
    const located = findItem(sections.value, itemId)

    if (!located) {
      return false
    }

    located.item.categoryId = newCategoryId
    return true
  }

  const toggleSectionCollapse = (sectionId: string): void => {
    const section = sections.value.find((candidate) => candidate.id === sectionId)

    if (section) {
      section.collapsed = !section.collapsed
    }
  }

  const toggleCategoryCollapse = (categoryId: string): void => {
    const found = findCategory(sections.value, categoryId)

    if (found) {
      found.category.collapsed = !found.category.collapsed
    }
  }

  const getCategoryTotals = (category: BudgetCategory): Totals => categoryTotals(category)
  const getSectionTotals = (section: BudgetSection): Totals => sectionTotals(section)
  const getItemYearTotal = (item: BudgetItem): number => itemYearTotal(item)
  const getItemMonthlyAverage = (item: BudgetItem): number => itemMonthlyAverage(item)

  return {
    MONTHS,
    currentYear,
    yearSlideDirection,
    data,
    sections,
    expenseSection,
    incomeSection,
    expenseTotals,
    incomeTotals,
    monthlyDifference,
    differenceYearly,
    setYear,
    goToPreviousYear,
    goToNextYear,
    copyPreviousYear,
    copyYear,
    isItemCopiedFromYear,
    getRemainingCopiedMonthCount,
    fillRemainingCopiedMonthsFrom,
    saveToStorage,
    loadFromStorage,
    addCategory,
    editCategory,
    deleteCategory,
    addItem,
    editItem,
    deleteItem,
    updateItemCategoryId,
    toggleSectionCollapse,
    toggleCategoryCollapse,
    getCategoryTotals,
    getSectionTotals,
    getItemYearTotal,
    getItemMonthlyAverage,
  }
})
