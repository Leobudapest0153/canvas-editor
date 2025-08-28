/**
 * useToast.js
 * 
 * Composable para mostrar notificaciones toast del sistema
 */

export function useToast() {
  const showToast = (message, type = 'info', options = {}) => {
    if (typeof window !== 'undefined' && window.__toasts) {
      window.__toasts.show(message, { 
        type, 
        timeout: options.timeout || 4000,
        cta: options.cta || null
      })
    } else {
      console.warn('Toast:', message)
    }
  }

  const showSuccess = (message, options = {}) => {
    showToast(message, 'success', options)
  }

  const showWarning = (message, options = {}) => {
    showToast(message, 'warn', options)
  }

  const showError = (message, options = {}) => {
    showToast(message, 'error', options)
  }

  return {
    showToast,
    showSuccess,
    showWarning,
    showError
  }
}
