import { describe, expect, it } from 'vitest'
import { createBudgetExportJson, parseBudgetImportJson } from '../budgetFile'

describe('budgetFile', () => {
  it('exports and parses budget payload', () => {
    const json = createBudgetExportJson({
      currentYear: 2026,
      data: {
        2026: {
          budgets: [
            {
              id: 'budget-1',
              name: 'Default',
              sections: [
                {
                  id: 'section-1',
                  name: 'Expenses',
                  type: 'expense',
                  collapsed: false,
                  categories: [
                    {
                      id: 'cat-1',
                      name: 'Fixed',
                      collapsed: false,
                      items: [
                        {
                          id: 'item-1',
                          categoryId: 'cat-1',
                          name: 'Rent',
                          baseAmount: 1000,
                          months: Array.from({ length: 12 }, () => 1000),
                          frequency: 'monthly' as const,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    })

    const parsed = parseBudgetImportJson(json)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.payload.currentYear).toBe(2026)
    expect(parsed.payload.data[2026].budgets[0].name).toBe('Default')
    expect(parsed.payload.data[2026].budgets[0].sections).toHaveLength(1)
  })

  it('migrates legacy format (v1) on import', () => {
    const legacyJson = JSON.stringify({
      payload: {
        currentYear: 2025,
        data: {
          2025: {
            sections: [
              { id: 's1', name: 'Expenses', type: 'expense', collapsed: false, categories: [] },
            ],
          },
        },
      },
    })

    const parsed = parseBudgetImportJson(legacyJson)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.payload.data[2025].budgets).toHaveLength(1)
    expect(parsed.payload.data[2025].budgets[0].name).toBe('Default')
    expect(parsed.payload.data[2025].budgets[0].sections).toHaveLength(1)
  })

  it('rejects malformed JSON', () => {
    const parsed = parseBudgetImportJson('{ bad json')

    expect(parsed.ok).toBe(false)
    if (parsed.ok) {
      return
    }

    expect(parsed.error).toContain('valid JSON')
  })

  it('rejects invalid payload shape', () => {
    const parsed = parseBudgetImportJson(JSON.stringify({ hello: 'world' }))

    expect(parsed.ok).toBe(false)
    if (parsed.ok) {
      return
    }

    expect(parsed.error).toContain('expected budget format')
  })
})
