// /inventory-smart/utils/isPlacementValid.js
// Predicado unificado de validez de placement en MODELO PURO (sin stroke/shadow/clientRect).
// Criterios:
//  - Debe estar completamente dentro del área (bounds del modelo) con tolerancia epsPx.
//  - Debe haber AUSENCIA de conflictos bloqueantes según detectConflictsFor.

import { detectConflictsFor } from '@/inventory-smart/utils/collision'

/**
 * Verifica si un rectángulo del modelo (top-left + ancho/alto) está completamente dentro del área.
 * Modelo puro: no considera stroke/shadow/selection.
 * @param {Object} pos - { x, y } top-left
 * @param {Object} movingEl - elemento con { width, height, forma }
 * @param {Object} areaBounds - { minX, minY, maxX, maxY }
 * @param {number} epsPx - tolerancia numérica en píxeles
 * @returns {boolean}
 */
export function insideAreaModel(pos, movingEl, areaBounds, epsPx = 0.5) {
  // Usar las dimensiones de Konva directamente (ya están en píxeles)
  const w = movingEl?.width || 0
  const h = movingEl?.height || 0

  // Para circulares, usar su AABB del modelo (diámetro mínimo)
  const isCirc = movingEl?.forma === 'circular'
  const ww = isCirc ? Math.min(w, h) : w
  const hh = isCirc ? Math.min(w, h) : h

  const { minX, minY, maxX, maxY } = areaBounds || { minX: 0, minY: 0, maxX: 0, maxY: 0 }

  // Verificar que la posición esté dentro del área con tolerancia
  const leftOk = pos.x >= (minX - epsPx)
  const topOk = pos.y >= (minY - epsPx)
  const rightOk = pos.x + ww <= (maxX + epsPx)
  const bottomOk = pos.y + hh <= (maxY + epsPx)

  return leftOk && topOk && rightOk && bottomOk
}

/**
 * Predicado unificado de validez del placement.
 * Reglas:
 *  - Dentro de área (modelo puro) con epsPx.
 *  - Sin conflictos BLOQUEANTES (detectConflictsFor filtrado a bloqueantes).
 *  - CM_TO_PX solo para compatibilidad (no se usa aquí).
 * @param {Object} params
 * @param {{x:number,y:number}} params.pos
 * @param {Object} params.movingEl - elemento con { id,width,height,forma,ubicacion }
 * @param {Array} params.neighbors - elementos vecinos potenciales
 * @param {{minX:number,minY:number,maxX:number,maxY:number}} params.areaBounds
 * @param {number} params.CM_TO_PX
 * @param {number} params.epsPx
 */
export function isPlacementValid({ pos, movingEl, neighbors = [], areaBounds, CM_TO_PX, epsPx = 0.5 }) {
  void CM_TO_PX
  if (!pos || !movingEl || !areaBounds) return false

  // 1) Dentro de área (modelo puro)
  if (!insideAreaModel(pos, movingEl, areaBounds, epsPx)) return false

  // 2) Ausencia de conflictos BLOQUEANTES
  const testEl = { ...movingEl, x: pos.x, y: pos.y }
  const conflicts = detectConflictsFor(testEl, neighbors)
  const blocking = conflicts.filter((c) => c && c.bloqueante)
  return blocking.length === 0
}

export default {
  isPlacementValid,
  insideAreaModel,
}

