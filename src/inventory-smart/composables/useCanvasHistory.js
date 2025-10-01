/**
 * useCanvasHistory.js
 *
 * Composable para manejar el historial de acciones (undo/redo) del canvas.
 *
 * Funcionalidades:
 * - Mantener historial de estados del canvas con cambios incrementales
 * - Operaciones undo/redo con límite de historial
 * - Integración transparente con useCanvasStore
 * - Estados computados para UI (canUndo, canRedo)
 * - Manejo automático de snapshots del estado
 * - Limpieza automática del historial al alcanzar límites
 * - Sistema de logging para debugging
 */

import { ref, computed, reactive } from 'vue'
import { useCanvasStore } from './useCanvasStore'

// Estado global del historial (singleton)
const historyStack = ref([])
const currentIndex = ref(-1)
const maxHistorySize = ref(10) // Máximo 10 estados en el historial
const isUndoRedoOperation = ref(false)
const historyApiCache = new WeakMap()

// Sistema de logging para debugging
const historyEvents = reactive({
  lastOperation: null,
  operationsCount: 0,
  errors: [],
})

export const useCanvasHistory = () => {
  const canvasStore = useCanvasStore()
  if (historyApiCache.has(canvasStore)) {
    return historyApiCache.get(canvasStore)
  }

  // Computed properties
  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < historyStack.value.length - 1)
  const historySize = computed(() => historyStack.value.length)
  const currentPosition = computed(() => currentIndex.value + 1)

  /**
   * Crear un snapshot optimizado del estado actual del canvas
   * Solo guarda cambios incrementales o snapshot completo según el tipo de operación
   */
  const createSnapshot = (changeType = 'full', changeData = null) => {
    const baseSnapshot = {
      timestamp: Date.now(),
      type: changeType
    }

    if (changeType === 'full' || historyStack.value.length === 0) {
      // Snapshot completo para el estado inicial o cambios complejos
      return {
        ...baseSnapshot,
        type: 'full',
        elementos: JSON.parse(JSON.stringify(canvasStore.elementos)),
        plantas: JSON.parse(JSON.stringify(canvasStore.plantas)),
        plantaActiva: canvasStore.plantaActiva,
        elementoSeleccionado: canvasStore.elementoSeleccionado,
        // vistaActiva omitida porque es computed y depende del contexto
        zoom: canvasStore.zoom,
        panX: canvasStore.panX,
        panY: canvasStore.panY,
      }
    } else {
      // Snapshot incremental para cambios específicos
      return {
        ...baseSnapshot,
        changes: changeData || []
      }
    }
  }

  /**
   * Aplicar cambios incrementales al estado
   */
  const applyIncrementalChanges = (changes) => {
    isUndoRedoOperation.value = true

    try {
      for (const change of changes) {
        switch (change.type) {
          case 'element_position': {
            const element = canvasStore.elementos.find(el => el.id === change.elementId)
            if (element) {
              element.x = change.newValue.x
              element.y = change.newValue.y
            }
            break
          }

          case 'element_properties': {
            const targetElement = canvasStore.elementos.find(el => el.id === change.elementId)
            if (targetElement) {
              Object.assign(targetElement, change.newValue)
            }
            break
          }

          case 'element_add': {
            canvasStore.elementos.push(change.newValue)
            break
          }

          case 'element_remove': {
            const removeIndex = canvasStore.elementos.findIndex(el => el.id === change.elementId)
            if (removeIndex !== -1) {
              canvasStore.elementos.splice(removeIndex, 1)
            }
            break
          }

          case 'planta_active': {
            canvasStore.plantaActiva = change.newValue
            break
          }

          case 'vista_active': {
            canvasStore.vistaActiva = change.newValue
            break
          }
        }
      }
    } catch (error) {
      console.error('Error aplicando cambios incrementales:', error)
      historyEvents.errors.push({
        operation: 'applyIncrementalChanges',
        error: error.message,
        timestamp: new Date().toISOString(),
        changes: changes.length
      })
    } finally {
      try {
        canvasStore?.recomputePasilloAssignments?.()
      } catch (e) {
        console.warn('No se pudieron recalcular asignaciones de pasillo durante applyIncrementalChanges', e)
      }
      isUndoRedoOperation.value = false
    }
  }

  /**
   * Restaurar un snapshot del estado con manejo mejorado de errores
   */
  const restoreSnapshot = (snapshot) => {
    isUndoRedoOperation.value = true

    try {
      // Restaurar elementos
      canvasStore.elementos.splice(0, canvasStore.elementos.length, ...snapshot.elementos)

      // Restaurar plantas
      canvasStore.plantas.splice(0, canvasStore.plantas.length, ...snapshot.plantas)

      // Restaurar estado general (sin vistaActiva porque es computed)
      canvasStore.plantaActiva = snapshot.plantaActiva
      canvasStore.elementoSeleccionado = snapshot.elementoSeleccionado
      // Nota: vistaActiva se omite porque es una computed property que depende del contexto
      canvasStore.zoom = snapshot.zoom
      canvasStore.panX = snapshot.panX
      canvasStore.panY = snapshot.panY

      try {
        canvasStore?.recomputePasilloAssignments?.()
      } catch (e) {
        console.warn('No se pudieron recalcular asignaciones de pasillo al restaurar snapshot', e)
      }
    } catch (error) {
      console.error('Error al restaurar snapshot:', error)
      historyEvents.errors.push({
        operation: 'restoreSnapshot',
        error: error.message,
        timestamp: new Date().toISOString(),
        snapshotTimestamp: snapshot.timestamp
      })
      throw error
    } finally {
      isUndoRedoOperation.value = false
    }
  }

  /**
   * Agregar un nuevo estado al historial con gestión mejorada del tamaño
   */
  const pushState = (description = 'Acción en canvas', changeType = 'full', changeData = null) => {
    // No agregar al historial si estamos en una operación undo/redo
    if (isUndoRedoOperation.value) {
      return
    }

    try {
      const snapshot = createSnapshot(changeType, changeData)
      snapshot.description = description

      // Si no estamos al final del historial, eliminar estados futuros
      if (currentIndex.value < historyStack.value.length - 1) {
        const removedStates = historyStack.value.length - currentIndex.value - 1
        historyStack.value.splice(currentIndex.value + 1)
      }

      // Agregar nuevo estado
      historyStack.value.push(snapshot)
      currentIndex.value = historyStack.value.length - 1

      // Gestión inteligente del tamaño del historial
      if (historyStack.value.length > maxHistorySize.value) {
        // Eliminar estados más antiguos, pero mantener el estado inicial si es posible
        const excessItems = historyStack.value.length - maxHistorySize.value
        const itemsToRemove = Math.min(excessItems, currentIndex.value)

        if (itemsToRemove > 0) {
          historyStack.value.splice(1, itemsToRemove) // Preservar el estado inicial en índice 0
          currentIndex.value = Math.max(0, currentIndex.value - itemsToRemove)
        }
      }

      // Actualizar eventos para debugging
      historyEvents.lastOperation = {
        type: 'push',
        description,
        timestamp: new Date().toISOString(),
        changeType,
        historySize: historyStack.value.length
      }
      historyEvents.operationsCount++
    } catch (error) {
      console.error('Error al guardar estado en historial:', error)
      historyEvents.errors.push({
        operation: 'pushState',
        error: error.message,
        timestamp: new Date().toISOString(),
        description
      })
    }
  }

  /**
   * Deshacer la última acción con manejo mejorado de errores
   */
  const undo = () => {
    if (!canUndo.value) {
      console.warn('No hay acciones para deshacer')
      return false
    }

    try {
      currentIndex.value--
      const snapshot = historyStack.value[currentIndex.value]

      // Aplicar cambios según el tipo de snapshot
      if (snapshot.type === 'full') {
        restoreSnapshot(snapshot)
      } else if (snapshot.changes) {
        // Para cambios incrementales, necesitamos aplicar en reversa
        applyIncrementalChanges(snapshot.changes.map(change => ({
          ...change,
          newValue: change.oldValue,
          oldValue: change.newValue
        })).reverse())
      }

      // Actualizar eventos
      historyEvents.lastOperation = {
        type: 'undo',
        description: snapshot.description,
        timestamp: new Date().toISOString(),
        snapshotType: snapshot.type
      }

      return true
    } catch (error) {
      console.error('Error durante undo:', error)
      historyEvents.errors.push({
        operation: 'undo',
        error: error.message,
        timestamp: new Date().toISOString(),
        currentIndex: currentIndex.value
      })

      // Revertir el índice si hubo error
      currentIndex.value++
      return false
    }
  }

  /**
   * Rehacer la siguiente acción con manejo mejorado de errores
   */
  const redo = () => {
    if (!canRedo.value) {
      console.warn('No hay acciones para rehacer')
      return false
    }

    try {
      currentIndex.value++
      const snapshot = historyStack.value[currentIndex.value]

      // Aplicar cambios según el tipo de snapshot
      if (snapshot.type === 'full') {
        restoreSnapshot(snapshot)
      } else if (snapshot.changes) {
        applyIncrementalChanges(snapshot.changes)
      }

      // Actualizar eventos
      historyEvents.lastOperation = {
        type: 'redo',
        description: snapshot.description,
        timestamp: new Date().toISOString(),
        snapshotType: snapshot.type
      }

      return true
    } catch (error) {
      console.error('Error durante redo:', error)
      historyEvents.errors.push({
        operation: 'redo',
        error: error.message,
        timestamp: new Date().toISOString(),
        currentIndex: currentIndex.value
      })

      // Revertir el índice si hubo error
      currentIndex.value--
      return false
    }
  }

  /**
   * Limpiar historial al cambiar de contexto (navegación jerárquica)
   * Esto evita problemas con computed properties que dependen del contexto
   */
  const clearHistoryOnContextChange = (newContext, description = 'Cambio de contexto') => {
    // Limpiar el historial existente
    clearHistory(false)

    // Crear un nuevo estado inicial con el contexto actual
    initializeHistory(description)
  }

  /**
   * Limpiar todo el historial con opciones de preservación
   */
  const clearHistory = (keepInitial = false) => {
    if (keepInitial && historyStack.value.length > 0) {
      const initialState = historyStack.value[0]
      historyStack.value = [initialState]
      currentIndex.value = 0
    } else {
      historyStack.value = []
      currentIndex.value = -1
    }

    // Resetear contadores de eventos
    historyEvents.operationsCount = 0
    historyEvents.errors = []
  }  /**
   * Inicializar historial con estado inicial mejorado
   */
  const initializeHistory = (description = 'Estado inicial') => {
    try {
      // Limpiar historial existente
      clearHistory(false)

      // Asegurar que el estado esté estabilizado
      const initialSnapshot = createSnapshot('full')
      initialSnapshot.description = description
      initialSnapshot.isInitial = true

      historyStack.value = [initialSnapshot]
      currentIndex.value = 0

      // Actualizar eventos
      historyEvents.lastOperation = {
        type: 'initialize',
        description,
        timestamp: new Date().toISOString(),
        historySize: 1
      }

    } catch (error) {
      console.error('Error al inicializar historial:', error)
      historyEvents.errors.push({
        operation: 'initializeHistory',
        error: error.message,
        timestamp: new Date().toISOString(),
        description
      })
    }
  }

  /**
   * Obtener información del historial para debug con eventos incluidos
   */
  const getHistoryInfo = () => {
    return {
      stack: historyStack.value.map((snapshot, index) => ({
        index,
        description: snapshot.description,
        timestamp: new Date(snapshot.timestamp).toLocaleString(),
        isCurrent: index === currentIndex.value,
        elementos: snapshot.elementos?.length || 0,
        plantaActiva: snapshot.plantaActiva,
        type: snapshot.type || 'full',
        isInitial: snapshot.isInitial || false
      })),
      currentIndex: currentIndex.value,
      canUndo: canUndo.value,
      canRedo: canRedo.value,
      size: historySize.value,
      events: {
        ...historyEvents,
        errors: [...historyEvents.errors] // Copia para evitar mutaciones
      },
      performance: {
        maxSize: maxHistorySize.value,
        memoryUsage: calculateMemoryUsage()
      }
    }
  }

  /**
   * Calcular uso aproximado de memoria del historial
   */
  const calculateMemoryUsage = () => {
    try {
      const totalSize = historyStack.value.reduce((acc, snapshot) => {
        const snapshotStr = JSON.stringify(snapshot)
        return acc + snapshotStr.length
      }, 0)

      return {
        totalChars: totalSize,
        approximateKB: Math.round(totalSize / 1024),
        averagePerSnapshot: Math.round(totalSize / historyStack.value.length) || 0
      }
    } catch (error) {
      return { error: 'No se pudo calcular el uso de memoria' }
    }
  }

  /**
   * Obtener el historial como lista para UI
   */
  const getHistoryList = () => {
    return historyStack.value.map((snapshot, index) => ({
      id: index,
      description: snapshot.description,
      timestamp: snapshot.timestamp,
      isCurrent: index === currentIndex.value,
      canJumpTo: true,
    }))
  }

  /**
   * Saltar a un estado específico del historial
   */
  const jumpToState = (index) => {
    if (index < 0 || index >= historyStack.value.length) {
      console.warn('Índice de historial inválido:', index)
      return false
    }

    currentIndex.value = index
    const snapshot = historyStack.value[index]

    restoreSnapshot(snapshot)
    return true
  }

  const historyApi = {
    // Estado
    isUndoRedoOperation: computed(() => isUndoRedoOperation.value),

    // Computed properties
    canUndo,
    canRedo,
    historySize,
    currentPosition,

    // Métodos principales
    pushState,
    undo,
    redo,

    // Métodos de utilidad
    clearHistory,
    clearHistoryOnContextChange,
    initializeHistory,
    getHistoryInfo,
    getHistoryList,
    jumpToState,

    // Métodos internos (para testing o casos especiales)
    createSnapshot,
    restoreSnapshot,
    applyIncrementalChanges,
  }

  historyApiCache.set(canvasStore, historyApi)
  return historyApi
}
