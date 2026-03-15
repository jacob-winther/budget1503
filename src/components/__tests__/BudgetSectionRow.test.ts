import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetSectionRow from '../BudgetSectionRow.vue'

describe('BudgetSectionRow', () => {
  it('emits toggle on row click', async () => {
    const wrapper = mount(BudgetSectionRow, {
      props: {
        section: {
          id: 'sec-1',
          name: 'Expenses',
          type: 'expense',
          collapsed: false,
          categories: [],
        },
        totals: {
          monthly: Array.from({ length: 12 }, () => 100),
          yearly: 1200,
          average: 100,
        },
      },
    })

    await wrapper.find('tr').trigger('click')

    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')?.[0]).toEqual(['sec-1'])
  })

  it('emits add-category from plus action', async () => {
    const wrapper = mount(BudgetSectionRow, {
      props: {
        section: {
          id: 'sec-2',
          name: 'Income',
          type: 'income',
          collapsed: false,
          categories: [],
        },
        totals: {
          monthly: Array.from({ length: 12 }, () => 100),
          yearly: 1200,
          average: 100,
        },
      },
    })

    await wrapper.find('.inline-add-btn').trigger('click')

    expect(wrapper.emitted('add-category')).toBeTruthy()
    expect(wrapper.emitted('add-category')?.[0]).toEqual(['income'])
    expect(wrapper.emitted('toggle')).toBeFalsy()
  })
})
