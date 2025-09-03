import { ref } from 'vue'

export function useCollisionNotifier() {
  const overlapState = ref('none')
  const cooldown = 800
  let lastToast = 0
  const toastId = 'collision-overlap'

  function showToast() {
    if (typeof window === 'undefined' || !window.__toasts?.show) return
    const now = Date.now()
    if (now - lastToast < cooldown) return
    lastToast = now
    try {
      window.__toasts.show('Elementos solapados', { id: toastId, type: 'warning', timeout: cooldown })
    } catch {
      /* ignore */
    }
  }

  function onOverlapChange(overlaps) {
    const next = overlaps ? 'overlapping' : 'none'
    if (next === overlapState.value) return
    overlapState.value = next
    if (next === 'overlapping') showToast()
  }

  function reset() {
    overlapState.value = 'none'
  }

  return { overlapState, onOverlapChange, reset }
}
