// utils/placementValidity.js
// Validación de posición para evitar soltar elementos en estado inválido

import { detectConflictsFor } from '@/utils/collision'

/**
 * Verifica si un elemento está dentro del área de manera stroke-safe
 * @param {Object} pos - Posición del elemento {x, y}
 * @param {Object} element - Elemento con width, height, forma
 * @param {Object} areaBounds - Límites del área {minX, minY, maxX, maxY}
 * @param {number} strokePx - Ancho del stroke en píxeles
 * @returns {boolean} true si está completamente dentro del área stroke-safe
 */
function insideAreaStrokeSafe(pos, element, areaBounds, strokePx = 0) {
  const strokeHalf = strokePx / 2
  const minX = areaBounds.minX + strokeHalf
  const minY = areaBounds.minY + strokeHalf
  const maxX = areaBounds.maxX - strokeHalf
  const maxY = areaBounds.maxY - strokeHalf

  const w = element.width || 0
  const h = element.height || 0

  // Para elementos circulares, usar el diámetro como dimensión
  if (element.forma === 'circular') {
    const diameter = Math.min(w, h)
    return pos.x >= minX &&
           pos.y >= minY &&
           pos.x + diameter <= maxX &&
           pos.y + diameter <= maxY
  }

  // Para elementos rectangulares
  return pos.x >= minX &&
         pos.y >= minY &&
         pos.x + w <= maxX &&
         pos.y + h <= maxY
}

/**
 * Verifica si una posición es válida para un elemento
 * @param {Object} params - Parámetros de validación
 * @param {Object} params.pos - Posición a validar {x, y}
 * @param {Object} params.movingEl - Elemento que se está moviendo
 * @param {Array} params.neighbors - Otros elementos en el canvas
 * @param {Object} params.areaBounds - Límites del área
 * @param {number} params.CM_TO_PX - Factor de conversión (no usado directamente)
 * @param {number} params.strokePx - Ancho del stroke en píxeles
 * @returns {boolean} true si la posición es válida
 */
export function isValidPlacement({ pos, movingEl, neighbors = [], areaBounds, CM_TO_PX, strokePx = 0 }) {
  // Evitar warning de parámetro no usado
  void CM_TO_PX

  // 1. Verificar que está dentro del área stroke-safe
  if (!insideAreaStrokeSafe(pos, movingEl, areaBounds, strokePx)) {
    return false
  }

  // 2. Crear elemento temporal en la nueva posición para detectar conflictos
  const tempElement = {
    ...movingEl,
    x: pos.x,
    y: pos.y
  }

  // 3. Detectar conflictos bloqueantes
  const conflicts = detectConflictsFor(tempElement, neighbors)

  // 4. Filtrar solo conflictos bloqueantes
  const blockingConflicts = conflicts.filter(conflict => conflict.bloqueante === true)

  // 5. La posición es válida si no hay conflictos bloqueantes
  return blockingConflicts.length === 0
}

export default {
  isValidPlacement,
  insideAreaStrokeSafe
}
