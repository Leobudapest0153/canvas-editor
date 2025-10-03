import { computed, reactive } from 'vue'

const suggestionState = reactive({
  open: false,
  suggestion: null,
})

export function usePlacementSuggestionState() {
  const isOpen = computed(() => suggestionState.open)
  const currentSuggestion = computed(() => suggestionState.suggestion)

  const openSuggestion = (suggestion) => {
    suggestionState.open = true
    suggestionState.suggestion = suggestion || null
  }

  const closeSuggestion = () => {
    suggestionState.open = false
    suggestionState.suggestion = null
  }

  return {
    isOpen,
    currentSuggestion,
    openSuggestion,
    closeSuggestion,
  }
}

