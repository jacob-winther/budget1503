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
