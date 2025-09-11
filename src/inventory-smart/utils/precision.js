/**
 * Utilidades para corrección de precisión en valores numéricos
 * Previene errores de punto flotante en operaciones de transformación
 */

import { PRECISION_CM, CM_TO_PX } from './constants'

// Precisión para píxeles basada en la precisión de centímetros
const PRECISION_PIXELS = Math.pow(10, Math.ceil(Math.log10(CM_TO_PX / PRECISION_CM)))

/**
 * Corrige la precisión de un valor numérico para evitar errores de punto flotante
 * @param {number} value - Valor a corregir
 * @param {number} precision - Factor de precisión (por defecto PRECISION_PIXELS)
 * @returns {number} Valor corregido con la precisión especificada
 */
export function correctPrecision(value, precision = PRECISION_PIXELS) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return value
  }
  return Math.round(value * precision) / precision
}

/**
 * Corrige la precisión de las coordenadas (x, y)
 * @param {number} x - Coordenada X
 * @param {number} y - Coordenada Y
 * @param {number} precision - Factor de precisión (por defecto PRECISION_PIXELS)
 * @returns {{x: number, y: number}} Coordenadas corregidas
 */
export function correctCoordinates(x, y, precision = PRECISION_PIXELS) {
  return {
    x: correctPrecision(x, precision),
    y: correctPrecision(y, precision)
  }
}

/**
 * Corrige la precisión de las dimensiones (width, height)
 * @param {number} width - Ancho
 * @param {number} height - Alto
 * @param {number} precision - Factor de precisión (por defecto PRECISION_PIXELS)
 * @returns {{width: number, height: number}} Dimensiones corregidas
 */
export function correctDimensions(width, height, precision = PRECISION_PIXELS) {
  return {
    width: correctPrecision(width, precision),
    height: correctPrecision(height, precision)
  }
}

/**
 * Corrige la precisión de un objeto con propiedades de transformación
 * @param {Object} transform - Objeto con propiedades x, y, width, height, etc.
 * @param {number} precision - Factor de precisión (por defecto PRECISION_PIXELS)
 * @returns {Object} Objeto con valores corregidos
 */
export function correctTransformValues(transform, precision = PRECISION_PIXELS) {
  const corrected = { ...transform }

  // Corregir coordenadas si existen
  if (typeof corrected.x === 'number') {
    corrected.x = correctPrecision(corrected.x, precision)
  }
  if (typeof corrected.y === 'number') {
    corrected.y = correctPrecision(corrected.y, precision)
  }

  // Corregir dimensiones si existen
  if (typeof corrected.width === 'number') {
    corrected.width = correctPrecision(corrected.width, precision)
  }
  if (typeof corrected.height === 'number') {
    corrected.height = correctPrecision(corrected.height, precision)
  }

  // Corregir rotación si existe
  if (typeof corrected.rotation === 'number') {
    corrected.rotation = correctPrecision(corrected.rotation, precision)
  }

  return corrected
}

/**
 * Calcula las diferencias entre valores originales y corregidos para debugging
 * @param {Object} original - Valores originales
 * @param {Object} corrected - Valores corregidos
 * @returns {Object} Objeto con las diferencias calculadas
 */
export function calculatePrecisionDifferences(original, corrected) {
  const differences = {}

  const properties = ['x', 'y', 'width', 'height', 'rotation']

  properties.forEach(prop => {
    if (typeof original[prop] === 'number' && typeof corrected[prop] === 'number') {
      differences[`delta${prop.charAt(0).toUpperCase() + prop.slice(1)}`] =
        Math.abs(corrected[prop] - original[prop])
    }
  })

  return differences
}

// Exportar constantes útiles
export { PRECISION_PIXELS }
