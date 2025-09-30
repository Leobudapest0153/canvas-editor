import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditingCapabilities } from './useEditingCapabilities'

const isTextInput = (target) =>
  target && target.matches && target.matches('input, textarea, select, [contenteditable]')

export const useEditingShortcuts = ({
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  hasSelection,
}) => {
  const { editingCapabilities } = useEditingCapabilities()
  const registered = ref(false)

  const handler = (e) => {
    if (!editingCapabilities.value.canUseShortcuts) return
    if (isTextInput(e.target)) return
    if (window.getSelection && window.getSelection().toString()) return
    if (typeof window !== 'undefined' && window.__dvCanvasDragActive) return

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        if (typeof onUndo === 'function') {
          e.preventDefault()
          onUndo()
        }
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        if (typeof onRedo === 'function') {
          e.preventDefault()
          onRedo()
        }
      } else if (e.key === 'c') {
        if (typeof onCopy === 'function') {
          e.preventDefault()
          onCopy()
        }
      } else if (e.key === 'v') {
        if (typeof onPaste === 'function') {
          e.preventDefault()
          onPaste()
        }
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (typeof hasSelection === 'function' && !hasSelection()) return
      if (typeof onDelete === 'function') {
        e.preventDefault()
        onDelete()
      }
    }
  }

  const register = () => {
    if (registered.value) return
    window.addEventListener('keydown', handler)
    registered.value = true
  }

  const unregister = () => {
    if (!registered.value) return
    window.removeEventListener('keydown', handler)
    registered.value = false
  }

  watch(
    () => editingCapabilities.value.canUseShortcuts,
    (canUse) => {
      if (typeof window === 'undefined') return
      if (canUse) {
        register()
      } else {
        unregister()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => unregister())

  return {
    register,
    unregister,
  }
}

export default useEditingShortcuts
