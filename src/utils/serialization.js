/**
 * serialization.js
 *
 * Utilidades para serialización y deserialización del estado del editor.
 */

import { CM_TO_PX } from './constants'
import { ensureWallCm } from './units'

const fixWallUnits = (el, bodegaHcm) => {
  const { ubic, zBase, alto } = ensureWallCm(el, { CM_TO_PX, bodegaHcm })
  if (ubic !== 'pared') return
  el.alturaRespectoAlSuelo = zBase
  el.alturaRespectoSuelo = zBase
  el.elevacion = { ...(el.elevacion || {}), zBase }
  el.dimensiones = { ...(el.dimensiones || {}), alto }
  el.altura = alto
}

/**
 * Serializa el estado completo del canvas a JSON
 * @param {Object} canvasState - Estado del canvas desde el store
 * @returns {string} JSON serializado del estado
 */
export function serializeCanvas(canvasState) {
  const plantasHeights = {}
  canvasState?.plantas?.forEach((p) => {
    plantasHeights[p.id] = Number(p?.dimensiones?.alto ?? p?.altura ?? 0)
  })
  canvasState?.elementos?.forEach((el) => {
    const bH = plantasHeights[el.plantaId]
    fixWallUnits(el, bH)
  })
  return JSON.stringify({
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data: canvasState,
  })
}

/**
 * Deserializa JSON y restaura el estado del canvas
 * @param {string} jsonData - Datos JSON serializados
 * @returns {Object} Estado deserializado del canvas
 */
export function deserializeCanvas(jsonData) {
  try {
    const parsed = JSON.parse(jsonData)
    const plantasHeights = {}
    parsed.data?.plantas?.forEach((p) => {
      plantasHeights[p.id] = Number(p?.dimensiones?.alto ?? p?.altura ?? 0)
    })
    parsed.data?.elementos?.forEach((el) => {
      const bH = plantasHeights[el.plantaId]
      fixWallUnits(el, bH)
    })
    return parsed.data
  } catch (error) {
    console.error('Error deserializando canvas:', error)
    throw new Error('Formato de archivo inválido')
  }
}

/**
 * Valida la integridad de un estado deserializado
 * @param {Object} state - Estado a validar
 * @returns {boolean} True si el estado es válido
 */
export function validateCanvasState() {
  // TODO: Implementar validación de estado
  // - Verificar estructura requerida
  // - Validar tipos de datos
  // - Verificar consistencia de referencias
  // - Validar jerarquías padre-hijo

  return true
}

/**
 * Migra un estado de una versión anterior al formato actual
 * @param {Object} oldState - Estado en formato anterior
 * @param {string} fromVersion - Versión origen
 * @returns {Object} Estado migrado al formato actual
 */
export function migrateCanvasState(oldState) {
  // TODO: Implementar migración entre versiones
  // - Detectar versión origen
  // - Aplicar transformaciones necesarias
  // - Mantener compatibilidad hacia atrás

  return oldState
}

/**
 * Exporta el canvas en diferentes formatos
 * @param {Object} canvasState - Estado del canvas
 * @param {string} format - Formato de exportación ('json', 'xml', 'csv')
 * @returns {string} Datos exportados en el formato especificado
 */
export function exportCanvas(canvasState, format = 'json') {
  // TODO: Implementar exportación en múltiples formatos

  switch (format) {
    case 'json':
      return serializeCanvas(canvasState)
    case 'xml':
      // TODO: Implementar exportación XML
      return ''
    case 'csv':
      // TODO: Implementar exportación CSV
      return ''
    default:
      throw new Error(`Formato de exportación no soportado: ${format}`)
  }
}
