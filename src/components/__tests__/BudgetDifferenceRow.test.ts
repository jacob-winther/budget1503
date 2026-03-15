import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetDifferenceRow from '../BudgetDifferenceRow.vue'

describe('BudgetDifferenceRow', () => {
  it('applies negative class for negative yearly difference', () => {
    const wrapper = mount(BudgetDifferenceRow, {
      props: {
        monthly: Array.from({ length: 12 }, () => -100),
        yearly: -1200,
      },
    })

    expect(wrapper.classes()).toContain('negative')
  })

  it('does not apply negative class for positive difference', () => {
    const wrapper = mount(BudgetDifferenceRow, {
      props: {
        monthly: Array.from({ length: 12 }, () => 100),
        yearly: 1200,
      },
    })

    expect(wrapper.classes()).not.toContain('negative')
  })
})
