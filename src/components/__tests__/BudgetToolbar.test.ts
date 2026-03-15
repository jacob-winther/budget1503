import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetToolbar from '../BudgetToolbar.vue'

describe('BudgetToolbar', () => {
  it('renders copy previous year action', () => {
    const wrapper = mount(BudgetToolbar, {
      props: {
        year: 2026,
      },
    })

    const copyButton = wrapper.findAll('button').find((button) => button.text().includes('Copy Previous Year'))
    const importButton = wrapper.findAll('button').find((button) => button.text().includes('Import'))
    const exportButton = wrapper.findAll('button').find((button) => button.text().includes('Export'))

    expect(copyButton).toBeTruthy()
    expect(importButton).toBeTruthy()
    expect(exportButton).toBeTruthy()
  })

  it('emits year navigation', async () => {
    const wrapper = mount(BudgetToolbar, {
      props: {
        year: 2026,
      },
    })

    const iconButtons = wrapper.findAll('button').filter((button) => button.text().trim() === '')
    await iconButtons[0].trigger('click')
    await iconButtons[1].trigger('click')

    expect(wrapper.emitted('prev-year')).toBeTruthy()
    expect(wrapper.emitted('next-year')).toBeTruthy()
  })

  it('emits import and export actions', async () => {
    const wrapper = mount(BudgetToolbar, {
      props: {
        year: 2026,
      },
    })

    const importButton = wrapper.findAll('button').find((button) => button.text().includes('Import'))
    const exportButton = wrapper.findAll('button').find((button) => button.text().includes('Export'))

    await importButton!.trigger('click')
    await exportButton!.trigger('click')

    expect(wrapper.emitted('import-budget')).toBeTruthy()
    expect(wrapper.emitted('export-budget')).toBeTruthy()
  })
})
