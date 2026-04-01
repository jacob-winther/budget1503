import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetToolbar from '../BudgetToolbar.vue'

const defaultProps = {
  year: 2026,
  budgets: [{ id: 'budget-1', name: 'Default' }],
  currentBudgetId: 'budget-1',
}

describe('BudgetToolbar', () => {
  it('renders copy budget action', () => {
    const wrapper = mount(BudgetToolbar, {
      props: defaultProps,
    })

    const copyButton = wrapper.findAll('button').find((button) => button.text().includes('Copy Budget'))
    const importButton = wrapper.findAll('button').find((button) => button.text().includes('Import'))
    const exportButton = wrapper.findAll('button').find((button) => button.text().includes('Export'))

    expect(copyButton).toBeTruthy()
    expect(importButton).toBeTruthy()
    expect(exportButton).toBeTruthy()
  })

  it('emits year navigation', async () => {
    const wrapper = mount(BudgetToolbar, {
      props: defaultProps,
    })

    const iconButtons = wrapper.findAll('button').filter((button) => button.text().trim() === '')
    await iconButtons[0].trigger('click') // prev-year (angle-left)
    await iconButtons[2].trigger('click') // next-year (angle-right, after year-add-btn)

    expect(wrapper.emitted('prev-year')).toBeTruthy()
    expect(wrapper.emitted('next-year')).toBeTruthy()
  })

  it('emits import and export actions', async () => {
    const wrapper = mount(BudgetToolbar, {
      props: defaultProps,
    })

    const importButton = wrapper.findAll('button').find((button) => button.text().includes('Import'))
    const exportButton = wrapper.findAll('button').find((button) => button.text().includes('Export'))

    await importButton!.trigger('click')
    await exportButton!.trigger('click')

    expect(wrapper.emitted('import-budget')).toBeTruthy()
    expect(wrapper.emitted('export-budget')).toBeTruthy()
  })
})
