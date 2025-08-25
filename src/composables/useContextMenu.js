// filepath: src/composables/useContextMenu.js
import { reactive, toRefs, watch } from 'vue'
import { useCanvasStore } from './useCanvasStore'

export function useContextMenu() {
  const store = useCanvasStore()

  const state = reactive({
    visible: false,
    x: 0,
    y: 0,
    elementId: null,
    isLocked: false,
  })

  const updateLocked = () => {
    try {
      const getById = store.elementoPorId
      const el = state.elementId ? (typeof getById === 'function' ? getById(state.elementId) : store.elementos?.find?.((e) => e.id === state.elementId)) : null
      state.isLocked = !!(el && (el.bloqueado === true || el.locked === true))
    } catch {
      state.isLocked = false
    }
  }

  const openAt = ({ x, y, elementId }) => {
    state.x = Number.isFinite(x) ? x : 0
    state.y = Number.isFinite(y) ? y : 0
    state.elementId = elementId || null
    updateLocked()
    state.visible = true
  }

  const close = () => {
    state.visible = false
  }

  // Mantener isLocked actualizado cuando cambie el elemento o su estado
  watch(() => state.elementId, () => updateLocked())
  watch(() => (state.elementId ? store.elementoPorId?.(state.elementId)?.bloqueado : null), () => updateLocked())

  return { ...toRefs(state), openAt, close }
}

