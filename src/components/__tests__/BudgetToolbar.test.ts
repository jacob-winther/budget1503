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

    expect(copyButton).toBeTruthy()
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
})
