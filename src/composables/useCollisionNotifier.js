import { ref } from 'vue'
import { useToast } from '@/composables/useToast'

export function useCollisionNotifier() {
  const { showWarning } = useToast()
  const overlapState = ref('none')
  let lastTime = 0
  let toastId = null

  const onOverlapChange = (hasOverlap) => {
    overlapState.value = hasOverlap ? 'overlapping' : 'none'
    if (!hasOverlap) return
    const now = Date.now()
    if (now - lastTime < 800) return
    lastTime = now
    if (typeof window !== 'undefined' && window.__toasts) {
      toastId = window.__toasts.show('Los elementos se superponen', { id: toastId, type: 'warn' })
    } else {
      showWarning('Los elementos se superponen')
    }
  }

  const reset = () => {
    overlapState.value = 'none'
    lastTime = 0
    if (toastId && typeof window !== 'undefined' && window.__toasts) {
      window.__toasts.dismiss(toastId)
      toastId = null
    }
  }

  return { overlapState, onOverlapChange, reset }
}

export default useCollisionNotifier
