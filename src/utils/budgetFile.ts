import type { BudgetData } from '../types/budget'

export const BUDGET_FILE_VERSION = 1

export interface BudgetFilePayload {
  currentYear: number
  data: BudgetData
}

interface BudgetFileEnvelope {
  version: number
  exportedAt: string
  app: string
  payload: BudgetFilePayload
}

type ImportParseResult =
  | { ok: true; payload: BudgetFilePayload }
  | { ok: false; error: string }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isBudgetData = (value: unknown): value is BudgetData => {
  if (!isRecord(value)) {
    return false
  }

  return Object.values(value).every((yearData) => isRecord(yearData) && Array.isArray(yearData.sections))
}

const isBudgetFilePayload = (value: unknown): value is BudgetFilePayload => {
  if (!isRecord(value)) {
    return false
  }

  if (!Number.isFinite(Number(value.currentYear))) {
    return false
  }

  return isBudgetData(value.data)
}

export const createBudgetExportJson = (payload: BudgetFilePayload): string => {
  const envelope: BudgetFileEnvelope = {
    version: BUDGET_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'budget-planner',
    payload,
  }

  return JSON.stringify(envelope, null, 2)
}

export const parseBudgetImportJson = (raw: string): ImportParseResult => {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      ok: false,
      error: 'Selected file is not valid JSON.',
    }
  }

  const payloadCandidate = isRecord(parsed) && 'payload' in parsed ? parsed.payload : parsed

  if (!isBudgetFilePayload(payloadCandidate)) {
    return {
      ok: false,
      error: 'Selected file does not match the expected budget format.',
    }
  }

  return {
    ok: true,
    payload: {
      currentYear: Number(payloadCandidate.currentYear),
      data: payloadCandidate.data,
    },
  }
}
