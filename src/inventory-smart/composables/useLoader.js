/**
 * useLoader.js
 *
 * Composable para manejar el estado global de carga con contadores enteros.
 * Permite múltiples operaciones concurrentes y gestión granular del estado.
 *
 * Funcionalidades:
 * - Estado de carga con contador entero (no booleano)
 * - Operaciones identificadas por tipo
 * - Prevención de operaciones duplicadas
 * - Control de concurrencia
 */

import { ref, computed } from 'vue'

// Estado global del loader (singleton)
const loadingOperations = ref(new Map())
const loadingCounter = ref(0)

export function useLoader() {

  /**
   * Computed para saber si está cargando algo
   */
  const isLoading = computed(() => loadingCounter.value > 0)

  /**
   * Computed para obtener el número total de operaciones cargando
   */
  const loadingCount = computed(() => loadingCounter.value)

  /**
   * Computed para obtener todas las operaciones activas
   */
  const activeOperations = computed(() => Array.from(loadingOperations.value.entries()))

  /**
   * Inicia una operación de carga
   * @param {string} operationType - Tipo de operación (ej: 'paste', 'save', 'load')
   * @param {string} operationId - ID único de la operación (opcional)
   * @param {string} description - Descripción de la operación
   * @returns {string} ID de la operación para poder detenerla después
   */
  const startLoading = (operationType, operationId = null, description = '') => {
    // Generar ID único si no se proporciona
    const id = operationId || `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Verificar si ya existe una operación de este tipo (para prevenir duplicados)
    for (const [existingId, operation] of loadingOperations.value) {
      if (operation.type === operationType && operation.preventDuplicates) {
        console.warn(`⚠️ Operación de tipo "${operationType}" ya en progreso. ID: ${existingId}`)
        return null // No iniciar operación duplicada
      }
    }

    const operation = {
      id,
      type: operationType,
      description: description || `Ejecutando ${operationType}...`,
      startTime: Date.now(),
      preventDuplicates: true // Por defecto, prevenir duplicados
    }

    loadingOperations.value.set(id, operation)
    loadingCounter.value++

    console.log(`🟡 Iniciando operación: ${operationType}`)

    return id
  }

  /**
   * Detiene una operación de carga específica
   * @param {string} operationId - ID de la operación a detener
   */
  const stopLoading = (operationId) => {
    if (!operationId) {
      console.warn('⚠️ No se puede detener operación: ID no proporcionado')
      return false
    }

    const operation = loadingOperations.value.get(operationId)
    if (!operation) {
      console.warn(`⚠️ No se encontró operación con ID: ${operationId}`)
      return false
    }

    const duration = Date.now() - operation.startTime

    console.log(`🟢 Finalizando operación: ${operation.type}`, {
      id: operationId,
      duration: `${duration}ms`,
      remainingOperations: loadingCounter.value - 1
    })

    loadingOperations.value.delete(operationId)
    loadingCounter.value = Math.max(0, loadingCounter.value - 1)

    return true
  }

  /**
   * Detiene todas las operaciones de un tipo específico
   * @param {string} operationType - Tipo de operación a detener
   */
  const stopLoadingByType = (operationType) => {
    let stoppedCount = 0

    for (const [id, operation] of loadingOperations.value) {
      if (operation.type === operationType) {
        stopLoading(id)
        stoppedCount++
      }
    }

    console.log(`🟢 Detenidas ${stoppedCount} operaciones de tipo: ${operationType}`)
    return stoppedCount
  }

  /**
   * Detiene todas las operaciones de carga
   */
  const stopAllLoading = () => {
    const operationCount = loadingOperations.value.size
    loadingOperations.value.clear()
    loadingCounter.value = 0

    console.log(`🟢 Detenidas todas las operaciones (${operationCount})`)
    return operationCount
  }

  /**
   * Verifica si una operación específica está en progreso
   * @param {string} operationType - Tipo de operación a verificar
   * @returns {boolean}
   */
  const isOperationInProgress = (operationType) => {
    for (const operation of loadingOperations.value.values()) {
      if (operation.type === operationType) {
        return true
      }
    }
    return false
  }

  /**
   * Obtiene información de una operación específica
   * @param {string} operationId - ID de la operación
   * @returns {Object|null}
   */
  const getOperationInfo = (operationId) => {
    return loadingOperations.value.get(operationId) || null
  }

  /**
   * Obtiene todas las operaciones de un tipo específico
   * @param {string} operationType - Tipo de operación
   * @returns {Array}
   */
  const getOperationsByType = (operationType) => {
    const operations = []
    for (const [id, operation] of loadingOperations.value) {
      if (operation.type === operationType) {
        operations.push({ id, ...operation })
      }
    }
    return operations
  }

  /**
   * Wrapper para ejecutar una función con loading automático
   * @param {string} operationType - Tipo de operación
   * @param {Function} asyncFunction - Función async a ejecutar
   * @param {string} description - Descripción de la operación
   * @returns {Promise} Resultado de la función
   */
  const withLoading = async (operationType, asyncFunction, description = '') => {
    const operationId = startLoading(operationType, null, description)

    if (!operationId) {
      throw new Error(`Operación "${operationType}" ya en progreso`)
    }

    try {
      const result = await asyncFunction()
      return result
    } finally {
      stopLoading(operationId)
    }
  }

  return {
    // Estado
    isLoading,
    loadingCount,
    activeOperations,

    // Métodos principales
    startLoading,
    stopLoading,
    stopLoadingByType,
    stopAllLoading,

    // Métodos de consulta
    isOperationInProgress,
    getOperationInfo,
    getOperationsByType,

    // Utilities
    withLoading
  }
}
