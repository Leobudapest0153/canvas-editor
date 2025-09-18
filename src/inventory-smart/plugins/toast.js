// src/inventory-smart/plugins/toast.js
// Plugin de toasts global, sin usar window. Expone API reactiva via provide/inject y $toast

import { ref } from 'vue'

export const ToastSymbol = Symbol('toast')

// Singleton para acceso fuera del árbol (p. ej., pruebas o utilidades)
let _toastApiSingleton = null
export const getToastApi = () => _toastApiSingleton
// Solo para pruebas: permitir inyectar manualmente un API
export const __setToastApiForTests = (api) => {
  _toastApiSingleton = api
}

function createToastApi(maxToasts = 5) {
  const toasts = ref([])
  let idSeq = 0

  const remove = (id) => {
    const i = toasts.value.findIndex((t) => t.id === id)
    if (i !== -1) {
      const [t] = toasts.value.splice(i, 1)
      try { t?.onDismiss?.() } catch (_) { /* no-op */ }
    }
  }

  const removeOldest = (count = 1) => {
    for (let i = 0; i < count; i++) {
      const t = toasts.value.shift()
      if (t) {
        try { t?.onDismiss?.() } catch (_) { /* no-op */ }
      }
    }
  }

  const show = (message, options = {}) => {
    const id = options.id ?? `t_${++idSeq}`
    const toast = {
      id,
      message,
      type: options.type || 'info',
      cta: options.cta || null,
      timeout: options.timeout ?? 5000,
      onDismiss: options.onDismiss || null,
      timestamp: Date.now(),
    }

    // Asegurar límite de toasts simultáneos
    if (toasts.value.length >= maxToasts) {
      // Dejar espacio para el nuevo toast removiendo los más antiguos necesarios
      const toRemove = toasts.value.length - maxToasts + 1
      if (toRemove > 0) removeOldest(toRemove)
    }

    toasts.value.push(toast)

    if (toast.timeout > 0) {
      setTimeout(() => remove(id), toast.timeout)
    }

    return id
  }

  const clearAll = () => {
    const all = toasts.value.splice(0, toasts.value.length)
    for (const t of all) {
      try { t?.onDismiss?.() } catch (_) { /* no-op */ }
    }
  }

  return {
    // estado
    toasts,
    maxToasts,
    // API
    show,
    remove,
    clearAll,
  }
}

export default {
  install(app, options = {}) {
    const api = createToastApi(options.maxToasts ?? 5)
    app.provide(ToastSymbol, api)
    // Opcional: propiedad global para uso en Options API o this.$toast
    app.config.globalProperties.$toast = api
    // Registrar como singleton
    _toastApiSingleton = api
  },
}
