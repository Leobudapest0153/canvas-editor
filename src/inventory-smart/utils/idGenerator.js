/**
 * idGenerator.js
 *
 * Utilidades para generar identificadores únicos para elementos del canvas.
 *
 * Responsabilidades:
 * - Generar IDs únicos para elementos, plantas, operaciones
 * - Mantener registros de IDs utilizados para evitar duplicados
 * - Diferentes estrategias de generación (UUID, incremental, hash)
 * - Validar unicidad de IDs en el contexto actual
 * - Generar IDs legibles para debugging
 * - Manejar prefijos por tipo de elemento
 * - Recuperación y reutilización de IDs en casos específicos
 */

/**
 * Genera un ID único usando UUID v4
 * @returns {string} ID único en formato UUID
 */
export function generateUUID() {
  // TODO: Implementar generación UUID v4 nativa o con librería
  // Implementación básica para desarrollo
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Genera un ID único con prefijo para un tipo específico
 * @param {string} prefix - Prefijo del tipo de elemento
 * @param {Set} existingIds - Conjunto de IDs existentes para validar unicidad
 * @returns {string} ID único con prefijo
 */
export function generatePrefixedId(prefix, existingIds = new Set()) {
  // TODO: Implementar generación con prefijo y validación de unicidad

  let attempts = 0
  const maxAttempts = 1000

  while (attempts < maxAttempts) {
    const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    if (!existingIds.has(id)) {
      return id
    }

    attempts++
  }

  throw new Error(`No se pudo generar ID único después de ${maxAttempts} intentos`)
}

/**
 * Genera ID específico para elementos del canvas
 * @param {string} elementType - Tipo de elemento ('anaquel', 'estante', etc.)
 * @param {Set} existingIds - IDs existentes en el canvas
 * @returns {string} ID único para el elemento
 */
export function generateElementId(elementType, existingIds = new Set()) {
  // TODO: Implementar generación específica para elementos
  return generatePrefixedId(`elem_${elementType}`, existingIds)
}

/**
 * Genera ID específico para plantas
 * @param {string} plantName - Nombre de la planta
 * @param {Set} existingIds - IDs existentes de plantas
 * @returns {string} ID único para la planta
 */
export function generatePlantId(plantName, existingIds = new Set()) {
  // TODO: Implementar generación específica para plantas
  const sanitizedName = plantName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  return generatePrefixedId(`plant_${sanitizedName}`, existingIds)
}

/**
 * Genera ID específico para operaciones del historial
 * @param {string} operationType - Tipo de operación
 * @returns {string} ID único para la operación
 */
export function generateOperationId(operationType) {
  // TODO: Implementar generación específica para operaciones
  return `op_${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
}

/**
 * Valida si un ID tiene el formato correcto
 * @param {string} id - ID a validar
 * @param {string} expectedPrefix - Prefijo esperado (opcional)
 * @returns {boolean} True si el ID es válido
 */
export function validateId(id, expectedPrefix = null) {
  // TODO: Implementar validación de formato de ID

  if (!id || typeof id !== 'string') {
    return false
  }

  if (expectedPrefix && !id.startsWith(expectedPrefix)) {
    return false
  }

  // Validar formato básico
  return /^[a-z0-9_-]+$/i.test(id)
}

/**
 * Extrae información de un ID con prefijo
 * @param {string} id - ID a analizar
 * @returns {Object} Información extraída del ID
 */
export function parseId(id) {
  // TODO: Implementar parsing de IDs

  const parts = id.split('_')

  return {
    full: id,
    prefix: parts[0] || '',
    type: parts[1] || '',
    timestamp: parts[2] || '',
    random: parts[3] || '',
  }
}

/**
 * Genera un conjunto de IDs únicos
 * @param {number} count - Cantidad de IDs a generar
 * @param {string} prefix - Prefijo común
 * @returns {string[]} Array de IDs únicos
 */
export function generateBatchIds(count, prefix = 'item') {
  // TODO: Implementar generación en lote

  const ids = new Set()
  const result = []

  while (result.length < count) {
    const id = generatePrefixedId(prefix, ids)
    ids.add(id)
    result.push(id)
  }

  return result
}
