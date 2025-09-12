/**
 * useToast.js
 * 
 * Composable para mostrar notificaciones toast del sistema con límite de 5 toasts simultáneos
 */

// Cola global para gestionar los toasts activos (máximo 5)
const toastQueue = []
const MAX_TOASTS = 5

export function useToast() {
  const manageToastQueue = () => {
    // Contar toasts reales en el DOM para sincronizar
    const realToasts = document.querySelectorAll('.vue-notification, .notification, .toast, [role="alert"]')
    
    // Si hay más de 5 toasts reales, eliminar los más antiguos del DOM directamente
    if (realToasts.length >= MAX_TOASTS) {
      const toastsToRemove = Math.max(0, realToasts.length - MAX_TOASTS + 1)
      
      for (let i = 0; i < toastsToRemove; i++) {
        const oldestToast = realToasts[i]
        if (oldestToast) {
          try {
            // Intentar cerrar con animación si es posible
            const closeButton = oldestToast.querySelector('button[type="button"], .close, [aria-label*="close"], [aria-label*="cerrar"]')
            if (closeButton) {
              closeButton.click()
            } else {
              // Remover directamente del DOM
              oldestToast.remove()
            }
            
            // Remover de nuestra cola también
            const toastId = oldestToast.getAttribute('data-toast-id') || 
                           oldestToast.getAttribute('id') || 
                           oldestToast.textContent?.substring(0, 20)
            
            if (toastId) {
              const index = toastQueue.findIndex(toast => 
                toast.id === toastId || toast.element === oldestToast
              )
              if (index > -1) {
                toastQueue.splice(index, 1)
              }
            }
          } catch (e) {
            void e
          }
        }
      }
    }
  }

  const removeFromQueue = (toastId) => {
    const index = toastQueue.findIndex(toast => toast.id === toastId)
    if (index > -1) {
      toastQueue.splice(index, 1)
    }
  }

  const showToast = (message, type = 'error', options = {}) => {
    if (typeof window !== 'undefined' && window.__toasts) {
      // Generar ID único para este toast
      const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Gestionar la cola ANTES de crear el nuevo toast
      manageToastQueue()
      
      // Configurar opciones con callbacks para gestionar la cola
      const toastOptions = { 
        type, 
        timeout: options.timeout || 4000,
        cta: options.cta || null,
        id: toastId,
        onDismiss: () => {
          removeFromQueue(toastId)
          if (options.onDismiss) {
            options.onDismiss()
          }
        }
      }
      
      // Mostrar el toast
      const result = window.__toasts.show(message, toastOptions)
      
      // Agregar a nuestra cola después de crearlo
      setTimeout(() => {
        const toastElements = document.querySelectorAll('.vue-notification, .notification, .toast, [role="alert"]')
        const newestToast = toastElements[toastElements.length - 1]
        
        toastQueue.push({
          id: toastId,
          timestamp: Date.now(),
          element: newestToast,
          message: message.substring(0, 20) // Para identificación
        })
      }, 100)
      
      return result || toastId
    } else {
      console.warn('Toast:', message)
      return null
    }
  }

  const showSuccess = (message, options = {}) => {
    return showToast(message, 'success', options)
  }

  const showWarning = (message, options = {}) => {
    return showToast(message, 'warn', options)
  }

  const showError = (message, options = {}) => {
    return showToast(message, 'error', options)
  }

  const showInfo = (message, options = {}) => {
    return showToast(message, 'info', options)
  }

  // Función para obtener información de la cola (útil para debugging)
  const getQueueInfo = () => {
    const realToasts = document.querySelectorAll('.vue-notification, .notification, .toast, [role="alert"]')
    
    return {
      queueCount: toastQueue.length,
      domCount: realToasts.length,
      maxToasts: MAX_TOASTS,
      toasts: toastQueue.map(t => ({ 
        id: t.id, 
        age: Date.now() - t.timestamp,
        message: t.message 
      }))
    }
  }

  // Función para limpiar manualmente todos los toasts
  const clearAllToasts = () => {
    const toastsToRemove = [...toastQueue]
    toastQueue.length = 0
    
    toastsToRemove.forEach(toast => {
      try {
        if (typeof window !== 'undefined' && window.__toasts && window.__toasts.remove) {
          window.__toasts.remove(toast.id)
        }
      } catch (e) {
        void e
      }
    })
  }

  return {
    showToast,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    getQueueInfo,
    clearAllToasts
  }
}
