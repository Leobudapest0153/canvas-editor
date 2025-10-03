import { ref, computed } from 'vue'
import { fastClone } from '@/inventory-smart/utils/fastClone'
import { applyPlacementAdjustments } from '@/inventory-smart/utils/placementSuggestions'

export function usePlacementSuggestionModal() {
  const open = ref(false)
  const payload = ref(null)

  const elementLabel = computed(() => {
    const nombre = payload.value?.element?.nombre || payload.value?.element?.codigo
    return nombre || payload.value?.element?.tipo || 'Elemento'
  })

  const show = ({ element, suggestions, message, dropMeta }) => {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return false
    payload.value = {
      element: fastClone(element || {}),
      suggestions,
      message: message || '',
      dropMeta: dropMeta
        ? {
            ...dropMeta,
            data: dropMeta.data ? fastClone(dropMeta.data) : dropMeta.data,
          }
        : null,
    }
    open.value = true
    return true
  }

  const close = () => {
    open.value = false
    payload.value = null
  }

  const buildAdjustedElement = () => {
    if (!payload.value) return null
    return applyPlacementAdjustments(fastClone(payload.value.element || {}), payload.value.suggestions || [])
  }

  return {
    open,
    payload,
    elementLabel,
    show,
    close,
    buildAdjustedElement,
  }
}

export default usePlacementSuggestionModal
