/**
 * useCanvasWithHistory.js
 *
 * Composable que combina useCanvasStore con useCanvasHistory
 * proporcionando una interfaz unificada con funcionalidades de undo/redo.
 */

import { onMounted, nextTick } from 'vue'
import { useCanvasStore } from './useCanvasStore'
import { useCanvasHistory } from './useCanvasHistory'
import { useChangeHistoryStore } from '@/inventory-smart/stores/changeHistory'

export const useCanvasWithHistory = () => {
  const canvasStore = useCanvasStore()
  const history = useCanvasHistory()
  const changeHistory = useChangeHistoryStore?.()

  // Variable para controlar si ya se inicializó
  let isInitialized = false

  // Función de inicialización que se puede llamar múltiples veces de forma segura
  const ensureInitialized = async () => {
    if (!isInitialized) {
      console.log('🔗 Inicializando integración canvas-historial')

      // Esperar a que todas las propiedades reactivas se estabilicen
      await nextTick()

      // Integrar el historial con el store de manera directa
      canvasStore.setHistoryInstance(history)

      // Inicializar baseline del historial de cambios (diff)
      try {
        changeHistory?.setBaseline?.({ plantas: canvasStore.plantas, elementos: canvasStore.elementos })
      } catch (e) {
        // noop
      }

      // Guardar estado inicial en el historial
      history.initializeHistory('Estado inicial del canvas')
      isInitialized = true

      console.log('✅ Integración canvas-historial completada')
    }
  }

  // Inicializar inmediatamente
  ensureInitialized()

  // También inicializar al montar para asegurar
  onMounted(() => {
    ensureInitialized()
  })

  return {
    // Store original (solo lectura de estado)
    store: canvasStore,

    // Historial
    history,

    // Shortcuts para undo/redo
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Utilidades del historial
    clearHistory: history.clearHistory,
    clearHistoryOnContextChange: history.clearHistoryOnContextChange,
    getHistoryInfo: history.getHistoryInfo,
    getHistoryList: history.getHistoryList,
    jumpToState: history.jumpToState,
  }
}
