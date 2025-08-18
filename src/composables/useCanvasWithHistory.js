/**
 * useCanvasWithHistory.js
 *
 * Composable que combina useCanvasStore con useCanvasHistory
 * proporcionando una interfaz unificada con funcionalidades de undo/redo.
 */

import { onMounted } from 'vue'
import { useCanvasStore } from './useCanvasStore'
import { useCanvasHistory } from './useCanvasHistory'

export const useCanvasWithHistory = () => {
  const canvasStore = useCanvasStore()
  const history = useCanvasHistory()

  // Variable para controlar si ya se inicializó
  let isInitialized = false

  // Función de inicialización que se puede llamar múltiples veces de forma segura
  const ensureInitialized = () => {
    if (!isInitialized) {
      console.log('🔗 Inicializando integración canvas-historial')
      canvasStore.initializeHistory(history)

      // Guardar estado inicial en el historial
      history.initializeHistory('Estado inicial del canvas')
      isInitialized = true
    }
  }

  // Inicializar inmediatamente
  ensureInitialized()

  // También inicializar al montar para asegurar
  onMounted(() => {
    ensureInitialized()
  })

  // Crear funciones integradas que automáticamente guardan en historial
  const actions = {
    // Elementos
    agregarElemento: (elemento) => {
      const result = canvasStore.agregarElemento(elemento)
      return result
    },

    eliminarElemento: (elementoId) => {
      const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementoId)
      canvasStore.eliminarElemento(elementoId)
      history.pushState(`Elemento eliminado: ${elemento?.nombre || elemento?.tipo || elementoId}`)
    },

    actualizarElemento: (elementoId, propiedades, description) => {
      canvasStore.actualizarElemento(elementoId, propiedades)

      const desc = description || `Propiedades actualizadas: ${Object.keys(propiedades).join(', ')}`
      history.pushState(desc)
    },

    actualizarPosicion: (elementoId, x, y, saveToHistory = false) => {
      canvasStore.actualizarPosicion(elementoId, x, y)

      // Solo guardar en historial cuando se especifica (ej: al terminar arrastre)
      if (saveToHistory) {
        const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementoId)
        history.pushState(`Elemento movido: ${elemento?.nombre || elemento?.tipo || elementoId}`)
      }
    },

    // Plantas
    seleccionarPlanta: (plantaId) => {
      const plantaAnterior = canvasStore.plantaActiva
      canvasStore.seleccionarPlanta(plantaId)

      if (plantaAnterior !== plantaId) {
        const planta = canvasStore.plantas.find((p) => p.id === plantaId)
        history.pushState(`Cambio a planta: ${planta?.nombre || plantaId}`)
      }
    },

    agregarPlanta: (nuevaPlanta) => {
      const id = canvasStore.agregarPlanta(nuevaPlanta)
      history.pushState(`Nueva planta creada: ${nuevaPlanta.nombre || 'Sin nombre'}`)
      return id
    },

    editarPlanta: (plantaId, datosActualizados) => {
      canvasStore.editarPlanta(plantaId, datosActualizados)
      history.pushState(`Planta editada: ${datosActualizados.nombre || plantaId}`)
    },

    eliminarPlanta: (plantaId) => {
      const planta = canvasStore.plantas.find((p) => p.id === plantaId)

      // eslint-disable-next-line no-useless-catch
      try {
        canvasStore.eliminarPlanta(plantaId)
        history.pushState(`Planta eliminada: ${planta?.nombre || plantaId}`)
      } catch (error) {
        throw error // Re-lanzar error sin guardar en historial
      }
    },

    // Canvas/Vista
    cambiarVista: (nuevaVista) => {
      const vistaAnterior = canvasStore.vistaActiva
      canvasStore.cambiarVista(nuevaVista)

      if (vistaAnterior !== nuevaVista) {
        history.pushState(`Vista cambiada: ${vistaAnterior} → ${nuevaVista}`)
      }
    },

    // Selección (sin historial, es estado temporal)
    seleccionarElemento: (elementoId) => {
      canvasStore.seleccionarElemento(elementoId)
    },

    // Zoom/Pan (sin historial, es navegación)
    configurarZoom: (zoom) => {
      canvasStore.configurarZoom(zoom)
    },

    configurarPan: (x, y) => {
      canvasStore.configurarPan(x, y)
    },
  }

  return {
    // Store original (solo lectura de estado)
    store: canvasStore,

    // Historial
    history,

    // Actions con historial integrado
    actions,

    // Shortcuts para undo/redo
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Utilidades del historial
    clearHistory: history.clearHistory,
    getHistoryInfo: history.getHistoryInfo,
    getHistoryList: history.getHistoryList,
    jumpToState: history.jumpToState,
  }
}
