import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetCategoryRow from '../BudgetCategoryRow.vue'

describe('BudgetCategoryRow', () => {
  it('emits toggle event', async () => {
    const wrapper = mount(BudgetCategoryRow, {
      props: {
        category: {
          id: 'cat-1',
          name: 'Fixed Costs',
          collapsed: false,
          items: [],
        },
        totals: {
          monthly: Array.from({ length: 12 }, () => 100),
          yearly: 1200,
          average: 100,
        },
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')?.[0]).toEqual(['cat-1'])
  })

  it('supports inline editing events', async () => {
    const wrapper = mount(BudgetCategoryRow, {
      props: {
        category: {
          id: 'cat-1',
          name: 'Fixed Costs',
          collapsed: false,
          items: [],
        },
        totals: {
          monthly: Array.from({ length: 12 }, () => 100),
          yearly: 1200,
          average: 100,
        },
        isEditing: false,
      },
    })

    await wrapper.findAll('.row-actions .inline-action-btn')[1].trigger('click')
    expect(wrapper.emitted('start-edit')).toBeTruthy()

    await wrapper.setProps({ isEditing: true })
    await wrapper.find('.inline-category-input').setValue('Renamed Category')
    await wrapper.findAll('.inline-action-btn')[0].trigger('click')

    expect(wrapper.emitted('save-edit')).toBeTruthy()
    expect(wrapper.emitted('save-edit')?.[0]).toEqual([{ categoryId: 'cat-1', name: 'Renamed Category' }])
  })

  it('emits delete from row action', async () => {
    const wrapper = mount(BudgetCategoryRow, {
      props: {
        category: {
          id: 'cat-1',
          name: 'Fixed Costs',
          collapsed: false,
          items: [],
        },
        totals: {
          monthly: Array.from({ length: 12 }, () => 100),
          yearly: 1200,
          average: 100,
        },
      },
    })

    await wrapper.findAll('.row-actions .inline-action-btn')[2].trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')?.[0]).toEqual(['cat-1'])
  })

  it('emits add-item from inline plus action', async () => {
    const wrapper = mount(BudgetCategoryRow, {
      props: {
        category: {
          id: 'cat-1',
          name: 'Fixed Costs',
          collapsed: false,
          items: [],
        },
        totals: {
          monthly: Array.from({ length: 12 }, () => 100),
          yearly: 1200,
          average: 100,
        },
      },
    })

    await wrapper.find('.inline-add-btn').trigger('click')

    expect(wrapper.emitted('add-item')).toBeTruthy()
    expect(wrapper.emitted('add-item')?.[0]).toEqual(['cat-1'])
  })
})
