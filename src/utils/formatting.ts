export const formatCurrency = (value: number): string =>
  Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
