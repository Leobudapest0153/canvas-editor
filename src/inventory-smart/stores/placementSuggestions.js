import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePlacementSuggestionStore = defineStore('placementSuggestions', () => {
  const open = ref(false)
  const payload = ref(null)
  const processing = ref(false)
  const errorMessage = ref('')

  const hasSuggestions = computed(() => Array.isArray(payload.value?.suggestions) && payload.value.suggestions.length > 0)

  const reset = () => {
    open.value = false
    payload.value = null
    processing.value = false
    errorMessage.value = ''
  }

  const show = (data) => {
    payload.value = data
    errorMessage.value = data?.errorMessage || ''
    open.value = true
  }

  const close = () => {
    reset()
  }

  const updateState = (nextState = {}) => {
    payload.value = { ...payload.value, ...nextState }
    if (typeof nextState.errorMessage === 'string') {
      errorMessage.value = nextState.errorMessage
    } else {
      errorMessage.value = ''
    }
  }

  const accept = async () => {
    if (!payload.value?.onApply || typeof payload.value.onApply !== 'function') {
      reset()
      return { success: false }
    }
    processing.value = true
    errorMessage.value = ''
    try {
      const result = await payload.value.onApply({ ...payload.value })
      if (result?.success) {
        reset()
        return { success: true }
      }
      if (result?.nextState) {
        updateState(result.nextState)
        processing.value = false
        return { success: false }
      }
      if (result?.errorMessage) {
        errorMessage.value = result.errorMessage
      }
    } catch (err) {
      errorMessage.value = err?.message || 'No se pudo aplicar los ajustes.'
    }
    processing.value = false
    return { success: false }
  }

  return {
    open,
    payload,
    processing,
    errorMessage,
    hasSuggestions,
    show,
    close,
    accept,
  }
})
