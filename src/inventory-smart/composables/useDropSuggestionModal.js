import { ref } from 'vue'

export function useDropSuggestionModal() {
  const state = ref({
    open: false,
    suggestions: null,
    apply: null,
    onCancel: null,
  })

  const showSuggestions = ({ suggestions, apply, onCancel }) => {
    state.value = {
      open: true,
      suggestions,
      apply: typeof apply === 'function' ? apply : null,
      onCancel: typeof onCancel === 'function' ? onCancel : null,
    }
  }

  const reset = () => {
    state.value = {
      open: false,
      suggestions: null,
      apply: null,
      onCancel: null,
    }
  }

  const accept = () => {
    const action = state.value.apply
    reset()
    action?.()
  }

  const cancel = () => {
    const handler = state.value.onCancel
    reset()
    handler?.()
  }

  return {
    state,
    showSuggestions,
    accept,
    cancel,
  }
}
