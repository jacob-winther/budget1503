export type SectionType = 'expense' | 'income'
export type ItemFrequency = 'monthly' | 'weekly' | 'quarterly'
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export interface BudgetItem {
  id: string
  categoryId: string
  name: string
  baseAmount: number
  months: number[]
  frequency: ItemFrequency
  weekday?: Weekday
  quarterStartMonth?: MonthIndex
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
  weekday?: Weekday
  quarterStartMonth?: MonthIndex
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
