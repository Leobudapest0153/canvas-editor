// filepath: c:\xampp\htdocs\proyectos-inventario\dv-canvas-editor\src\composables\useConfirmDialog.js
import { ref, computed } from 'vue'

// Estado único (singleton)
const isOpen = ref(false)
const isMounted = ref(false)
const title = ref('Confirmación')
const message = ref('')
const confirmLabel = ref('Confirmar')
const cancelLabel = ref('Cancelar')
let resolver = null

export const useConfirmDialog = () => {
  const open = (opts = {}) => {
    title.value = opts.title || 'Confirmación'
    message.value = opts.message || ''
    confirmLabel.value = opts.confirmLabel || 'Confirmar'
    cancelLabel.value = opts.cancelLabel || 'Cancelar'
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    resolver = null
  }

  const confirm = (opts = {}) => {
    // Si el modal no está montado (tests, SSR), fallback a window.confirm
    if (!isMounted.value) {
      const msg = opts && opts.message ? opts.message : ''
      const ok = typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(msg) : true
      return Promise.resolve(!!ok)
    }

    open(opts)
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  const onConfirm = () => {
    if (resolver) resolver(true)
    close()
  }

  const onCancel = () => {
    if (resolver) resolver(false)
    close()
  }

  const markMounted = () => {
    isMounted.value = true
  }

  return {
    // estado
    isOpen: computed(() => isOpen.value),
    isMounted: computed(() => isMounted.value),
    title,
    message,
    confirmLabel,
    cancelLabel,

    // acciones
    open,
    close,
    confirm,
    onConfirm,
    onCancel,
    markMounted,
  }
}

