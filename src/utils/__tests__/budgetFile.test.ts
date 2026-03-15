import { describe, expect, it } from 'vitest'
import { createBudgetExportJson, parseBudgetImportJson } from '../budgetFile'

describe('budgetFile', () => {
  it('exports and parses budget payload', () => {
    const json = createBudgetExportJson({
      currentYear: 2026,
      data: {
        2026: {
          sections: [],
        },
      },
    })

    const parsed = parseBudgetImportJson(json)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.payload.currentYear).toBe(2026)
    expect(parsed.payload.data[2026].sections).toEqual([])
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
