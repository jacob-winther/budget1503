import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetItemRow from '../BudgetItemRow.vue'

describe('BudgetItemRow', () => {
  it('renders monthly values and emits row actions', async () => {
    const wrapper = mount(BudgetItemRow, {
      props: {
        item: {
          id: 'item-1',
          categoryId: 'cat-1',
          name: 'Internet',
          baseAmount: 50,
          months: Array.from({ length: 12 }, () => 50),
        },
        yearTotal: 600,
        average: 50,
      },
    })

    expect(wrapper.text()).toContain('Internet')
    expect(wrapper.findAll('td')).toHaveLength(15)

    await wrapper.find('.row-actions .inline-action-btn').trigger('click')
    expect(wrapper.emitted('start-edit')).toBeTruthy()

    await wrapper.findAll('.row-actions .inline-action-btn')[1].trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')?.[0]).toEqual(['item-1'])
  })

  it('emits save-edit in editing mode', async () => {
    const wrapper = mount(BudgetItemRow, {
      props: {
        item: {
          id: 'item-1',
          categoryId: 'cat-1',
          name: 'Internet',
          baseAmount: 50,
          months: Array.from({ length: 12 }, () => 50),
        },
        yearTotal: 600,
        average: 50,
        isEditing: true,
      },
    })

    await wrapper.find('.inline-category-input').setValue('Updated Internet')
    const monthInputs = wrapper.findAll('.inline-amount-input')
    await monthInputs[2].setValue('75')
    await wrapper.find('.inline-action-btn').trigger('click')

    expect(wrapper.emitted('save-edit')).toBeTruthy()
    const savePayload = wrapper.emitted('save-edit')?.[0]?.[0] as {
      itemId: string
      name: string
      editedMonthIndex: number | null
      changedMonthIndexes: number[]
    }

    expect(savePayload.itemId).toBe('item-1')
    expect(savePayload.name).toBe('Updated Internet')
    expect(savePayload.editedMonthIndex).toBe(2)
    expect(savePayload.changedMonthIndexes).toEqual([2])
  })

  it('shows nudge while editing and fills draft months', async () => {
    const wrapper = mount(BudgetItemRow, {
      props: {
        item: {
          id: 'item-1',
          categoryId: 'cat-1',
          name: 'Internet',
          baseAmount: 50,
          months: Array.from({ length: 12 }, () => 50),
        },
        yearTotal: 600,
        average: 50,
        isEditing: true,
      },
    })

    const firstInput = wrapper.findAll('.inline-amount-input')[0]
    await firstInput.trigger('focus')
    await firstInput.setValue('120')

    const nudgeButtons = wrapper.findAll('.item-inline-nudge-popover .item-inline-nudge-btn')
    await nudgeButtons[0].trigger('mousedown')

    const monthInputs = wrapper.findAll('.inline-amount-input')
    const allValues = monthInputs.map((input) => Number((input.element as HTMLInputElement).value))
    expect(allValues.every((value) => value === 120)).toBe(true)

    expect(wrapper.find('.item-inline-nudge-popover').exists()).toBe(true)

    await firstInput.trigger('blur')
    expect(wrapper.find('.item-inline-nudge-popover').exists()).toBe(false)
  })
})
