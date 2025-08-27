/**
 * useCanvasWithHistory.js
 *
 * Composable que combina useCanvasStore con useCanvasHistory
 * proporcionando una interfaz unificada con funcionalidades de undo/redo.
 */

import { onMounted, nextTick } from 'vue'
import { useCanvasStore } from './useCanvasStore'
import { useCanvasHistory } from './useCanvasHistory'

export const useCanvasWithHistory = () => {
  const canvasStore = useCanvasStore()
  const history = useCanvasHistory()

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
        // Limpiar historial al cambiar de planta (cambio de contexto)
        history.clearHistoryOnContextChange(
          { tipo: 'planta', id: plantaId },
          `Navegación a planta: ${planta?.nombre || plantaId}`
        )
      }
    },

    // Navegación jerárquica - limpiar historial en cambios de contexto
    navegarAElemento: (elementoId) => {
      const resultado = canvasStore.navegarAElemento(elementoId)
      if (resultado) {
        const elemento = canvasStore.elementoPorId(elementoId)
        history.clearHistoryOnContextChange(
          { tipo: 'elemento', id: elementoId },
          `Navegación a elemento: ${elemento?.nombre || elemento?.tipo || elementoId}`
        )
      }
      return resultado
    },

    navegarAlPadre: () => {
      const resultado = canvasStore.navegarAlPadre()
      if (resultado) {
        const contexto = canvasStore.contextoActual
        history.clearHistoryOnContextChange(
          contexto,
          `Navegación al padre: ${contexto?.tipo || 'contexto padre'}`
        )
      }
      return resultado
    },

    navegarAContexto: (contexto) => {
      const resultado = canvasStore.navegarAContexto(contexto)
      if (resultado) {
        history.clearHistoryOnContextChange(
          contexto,
          `Navegación a contexto: ${contexto?.tipo || 'contexto personalizado'}`
        )
      }
      return resultado
    },

    navegarAPlanta: (plantaId) => {
      const resultado = canvasStore.navegarAPlanta(plantaId)
      if (resultado) {
        const planta = canvasStore.plantas.find(p => p.id === plantaId)
        history.clearHistoryOnContextChange(
          { tipo: 'planta', id: plantaId },
          `Navegación a planta: ${planta?.nombre || plantaId}`
        )
      }
      return resultado
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

    // Canvas/Vista - limpiar historial si cambia contexto significativamente
    cambiarVista: (nuevaVista) => {
      const vistaAnterior = canvasStore.vistaActiva
      canvasStore.cambiarVista(nuevaVista)

      if (vistaAnterior !== nuevaVista) {
        // Para cambios de vista, solo agregar al historial normal (no limpiar)
        // porque la vista no cambia fundamentalmente el contexto de navegación
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
    clearHistoryOnContextChange: history.clearHistoryOnContextChange,
    getHistoryInfo: history.getHistoryInfo,
    getHistoryList: history.getHistoryList,
    jumpToState: history.jumpToState,
  }
}
