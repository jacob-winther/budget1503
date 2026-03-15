import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetToolbar from '../BudgetToolbar.vue'

describe('BudgetToolbar', () => {
  it('renders only create actions', () => {
    const wrapper = mount(BudgetToolbar, {
      props: {
        year: 2026,
      },
    })

    const buttons = wrapper.findAll('button')
    const newCategoryButton = buttons.find((button) => button.text().includes('New Category'))
    const newItemButton = buttons.find((button) => button.text().includes('New Entry'))

    expect(newCategoryButton).toBeTruthy()
    expect(newItemButton).toBeTruthy()
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
