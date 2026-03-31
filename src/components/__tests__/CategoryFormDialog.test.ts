import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import CategoryFormDialog from '../CategoryFormDialog.vue'

// Mock matchMedia for PrimeVue Select component
beforeEach(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // deprecated
        removeListener: () => {}, // deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    })
  }
})

// PrimeVue Dialog teleports to body — disable teleport for tests.
// Must await $nextTick so PrimeVue completes its async rendering.
const mountDialog = async (props = {}) => {
  const wrapper = mount(CategoryFormDialog, {
    props: {
      visible: true,
      mode: 'create',
      ...props,
    },
    global: {
      plugins: [
        [
          PrimeVue,
          {
            theme: {
              preset: Aura,
            },
          },
        ],
      ],
      stubs: {
        teleport: true,
      },
    },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('CategoryFormDialog — Enter key submission', () => {
  it('emits save when Enter is pressed with a non-empty name', async () => {
    const wrapper = await mountDialog()
    // Set the input value via DOM to properly update the v-model binding
    await wrapper.find('input').setValue('My Category')
    // Trigger keydown on the input — it bubbles up to the Dialog's @keydown handler
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('does not emit save when Enter is pressed with an empty name', async () => {
    const wrapper = await mountDialog()
    // name is empty by default, trigger Enter key
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('does not emit save when Enter is pressed with a whitespace-only name', async () => {
    const wrapper = await mountDialog()
    // Set whitespace-only value via DOM to properly update the v-model binding
    await wrapper.find('input').setValue('   ')
    // Trigger keydown with whitespace-only name
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('does not emit save on non-Enter keydown', async () => {
    const wrapper = await mountDialog()
    // Set the input value via DOM to properly update the v-model binding
    await wrapper.find('input').setValue('My Category')
    // Trigger Tab key instead of Enter
    await wrapper.find('input').trigger('keydown', { key: 'Tab' })
    expect(wrapper.emitted('save')).toBeFalsy()
  })
})
