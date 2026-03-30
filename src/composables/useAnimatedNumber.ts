import { ref, watch, onUnmounted, type Ref } from 'vue'

interface Options {
  duration?: number
}

// Ease-out expo: matches --ease-out-expo CSS curve
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function useAnimatedNumber(source: Ref<number>, options: Options = {}) {
  const { duration = 300 } = options

  const displayed = ref(source.value)
  let rafId: number | null = null
  let startTime: number | null = null
  let from = source.value
  let to = source.value

  function animate(timestamp: number) {
    if (startTime === null) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    displayed.value = from + (to - from) * easeOutExpo(progress)

    if (progress < 1) {
      rafId = requestAnimationFrame(animate)
    } else {
      displayed.value = to
      rafId = null
    }
  }

  function startAnimation(newValue: number) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      from = displayed.value
    } else {
      from = displayed.value
    }
    to = newValue
    startTime = null
    rafId = requestAnimationFrame(animate)
  }

  watch(source, (newValue) => {
    startAnimation(newValue)
  })

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return { displayed }
}
