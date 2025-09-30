import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCanvasStore } from './useCanvasStore'

const VIEW_ONLY_TOOLTIP = 'No disponible en modo visualización'

export const useEditingCapabilities = () => {
  const canvasStore = useCanvasStore()
  const { modoEdicion, editingCapabilities } = storeToRefs(canvasStore)

  const tooltip = computed(() =>
    editingCapabilities.value.isViewOnly ? VIEW_ONLY_TOOLTIP : '',
  )

  const buildDisabledProps = (forcedDisabled = false) => {
    const shouldDisable = Boolean(forcedDisabled) || editingCapabilities.value.isViewOnly
    return {
      disabled: shouldDisable,
      title: shouldDisable && editingCapabilities.value.isViewOnly ? tooltip.value : undefined,
    }
  }

  return {
    modoEdicion,
    editingCapabilities,
    viewOnlyTooltip: tooltip,
    buildDisabledProps,
  }
}

export default useEditingCapabilities
