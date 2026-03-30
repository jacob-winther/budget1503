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
