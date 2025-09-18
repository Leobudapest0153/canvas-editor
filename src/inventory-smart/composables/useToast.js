/**
 * useToast.js
 * Composable para consumir el servicio global de toasts.
 */

import { getToastApi } from '@/inventory-smart/plugins/toast'

export function useToast() {
  let toastApi = getToastApi()

  const showToast = (message, type = 'error', options = {}) => {
    if (!toastApi || typeof toastApi.show !== 'function') {
      console.warn('[toast] servicio no disponible:', message)
      return null
    }
    const opts = {
      type,
      timeout: options.timeout ?? 4000,
      cta: options.cta ?? null,
      id: options.id,
      onDismiss: options.onDismiss,
    }
    return toastApi.show(message, opts)
  }

  const showSuccess = (message, options = {}) => showToast(message, 'success', options)
  const showWarning = (message, options = {}) => showToast(message, 'warn', options)
  const showError = (message, options = {}) => showToast(message, 'error', options)
  const showInfo = (message, options = {}) => showToast(message, 'info', options)

  const clearAllToasts = () => toastApi?.clearAll?.()
  const removeToast = (id) => toastApi?.remove?.(id)
  const getQueueInfo = () => ({
    queueCount: toastApi?.toasts?.value?.length ?? 0,
    domCount: toastApi?.toasts?.value?.length ?? 0,
    maxToasts: toastApi?.maxToasts ?? 5,
    toasts: (toastApi?.toasts?.value ?? []).map((t) => ({
      id: t.id,
      age: Date.now() - (t.timestamp || Date.now()),
      message: String(t.message).substring(0, 20),
    })),
  })

  return {
    showToast,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    clearAllToasts,
    removeToast,
    getQueueInfo,
  }
}
