export const calculateMonthsYearTotal = (months: number[]): number =>
  months.reduce((sum, value) => sum + Number(value ?? 0), 0)

export const calculateMonthsAverage = (months: number[]): number => calculateMonthsYearTotal(months) / 12

export const getChangedMonthIndexes = (nextMonths: number[], originalMonths: number[]): number[] =>
  nextMonths.map((value, index) => (value !== originalMonths[index] ? index : -1)).filter((index) => index !== -1)

export const fillAllMonthsFromIndex = (months: number[], sourceMonthIndex: number): number[] => {
  const replacementValue = Number(months[sourceMonthIndex] ?? 0)

  return months.map((value, index) => {
    if (index === sourceMonthIndex) {
      return Number(value ?? 0)
    }

    return replacementValue
  })
}
