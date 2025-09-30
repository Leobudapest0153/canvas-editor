import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useEditorMode } from '@/inventory-smart/composables/useEditorMode'

const defaultNoop = () => {}

const isTextInputTarget = (target) => {
  if (!target) return false
  const editableRoles = ['textbox', 'searchbox']
  const tag = target.tagName ? target.tagName.toLowerCase() : ''
  if (['input', 'textarea', 'select'].includes(tag)) return true
  if (target.isContentEditable) return true
  const role = target.getAttribute ? target.getAttribute('role') : null
  return role ? editableRoles.includes(role.toLowerCase()) : false
}

const hasTextSelection = () => {
  if (typeof window === 'undefined') return false
  const selection = window.getSelection?.()
  if (!selection) return false
  return Boolean(selection.toString())
}

export const useEditorShortcuts = ({
  onUndo = defaultNoop,
  onRedo = defaultNoop,
  onCopy = defaultNoop,
  onPaste = defaultNoop,
  onDelete = defaultNoop,
  onBlocked,
} = {}) => {
  const { modoEdicion } = useEditorMode()
  const isEditing = computed(() => modoEdicion.value === true)

  const handler = (e) => {
    if (!isEditing.value) return
    if (isTextInputTarget(e.target)) return
    if (hasTextSelection()) return
    if (typeof window !== 'undefined' && window.__dvCanvasDragActive) return

    const meta = e.metaKey || e.ctrlKey
    if (meta) {
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo()
        return
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        onRedo()
        return
      }
      if (key === 'c') {
        e.preventDefault()
        onCopy()
        return
      }
      if (key === 'v') {
        e.preventDefault()
        onPaste()
        return
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onDelete()
      return
    }
  }

  const setup = () => {
    if (typeof window === 'undefined') return
    window.addEventListener('keydown', handler)
  }

  const teardown = () => {
    if (typeof window === 'undefined') return
    window.removeEventListener('keydown', handler)
  }

  onMounted(() => {
    if (isEditing.value) {
      setup()
    }
  })

  onUnmounted(() => {
    teardown()
  })

  watch(
    () => modoEdicion.value,
    (enabled, prev) => {
      if (enabled === prev) return
      if (enabled) {
        setup()
      } else {
        teardown()
        if (prev === true && typeof onBlocked === 'function') {
          onBlocked()
        }
      }
    },
    { immediate: true },
  )
}
