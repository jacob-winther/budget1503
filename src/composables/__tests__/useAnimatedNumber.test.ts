import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useAnimatedNumber } from '../useAnimatedNumber'

let rafCallbacks: FrameRequestCallback[] = []

beforeEach(() => {
  vi.useFakeTimers()
  rafCallbacks = []

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb)
    return rafCallbacks.length
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  rafCallbacks = []
})

// Helper to flush all pending RAF callbacks with the current performance.now()
function flushRaf() {
  const cbs = rafCallbacks.splice(0)
  cbs.forEach((cb) => cb(performance.now()))
}

describe('useAnimatedNumber', () => {
  it('starts displaying the initial value immediately', async () => {
    const TestComponent = defineComponent({
      setup() {
        const source = ref(100)
        const { displayed } = useAnimatedNumber(source)
        return { displayed }
      },
      render() {
        return h('div', String(this.displayed))
      },
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    expect(wrapper.vm.displayed).toBe(100)
  })

  it('begins tweening when source changes', async () => {
    const TestComponent = defineComponent({
      setup() {
        const source = ref(0)
        const { displayed } = useAnimatedNumber(source, { duration: 300 })
        return { source, displayed }
      },
      render() {
        return h('div', String(this.displayed))
      },
    })

    const wrapper = mount(TestComponent)
    await nextTick()
    expect(wrapper.vm.displayed).toBe(0)

    wrapper.vm.source = 100
    await nextTick()

    // RAF callback should have been registered
    expect(rafCallbacks.length).toBeGreaterThan(0)

    // First flush to initialize startTime
    flushRaf()
    await nextTick()

    // Now advance time and flush again to see animation progress
    vi.advanceTimersByTime(50)
    flushRaf()
    await nextTick()

    expect(wrapper.vm.displayed).toBeGreaterThan(0)
    expect(wrapper.vm.displayed).toBeLessThan(100)
  })

  it('reaches the target value after the duration elapses', async () => {
    const TestComponent = defineComponent({
      setup() {
        const source = ref(0)
        const { displayed } = useAnimatedNumber(source, { duration: 300 })
        return { source, displayed }
      },
      render() {
        return h('div', String(this.displayed))
      },
    })

    const wrapper = mount(TestComponent)
    await nextTick()

    wrapper.vm.source = 500
    await nextTick()

    // Flush the first RAF call to kick off the animation
    expect(rafCallbacks.length).toBeGreaterThan(0)
    flushRaf()
    await nextTick()

    // Advance time past the duration
    vi.advanceTimersByTime(400)
    // Flush any pending RAF
    flushRaf()
    await nextTick()

    expect(wrapper.vm.displayed).toBe(500)
  })
})
