import { resolveVerticalProps } from './fieldResolvers'
import { narrowPhase2D } from '@/inventory-smart/utils/collision'
import { correctPrecision } from '@/inventory-smart/utils/precision'
import { PRECISION_CM } from '@/inventory-smart/utils/constants'

// Tolerancias específicas para validación de colocación
export const PLACEMENT_TOLERANCES = {
  // Tolerancia para altura de bodega (muy fina para validaciones críticas)
  WAREHOUSE_HEIGHT: 1e-6,
  // Tolerancia para considerar elementos en la misma capa (0.5cm)
  Z_LAYER: 0.5,
  // Tolerancia para detectar conflictos de apilamiento - ajustada a precision configurada
  Z_STACKING: Math.max(PRECISION_CM * 2, 0.01), // Mínimo 2x la precisión configurada o 1cm
}

/**
 * Compara dos valores con tolerancia específica
 * @param {number} a - Primer valor
 * @param {number} b - Segundo valor
 * @param {number} tolerance - Tolerancia para la comparación
 * @returns {boolean} - True si los valores están dentro de la tolerancia
 */
export function isWithinTolerance(a, b, tolerance) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(tolerance)) {
    return false
  }
  return Math.abs(a - b) <= tolerance
}

/**
 * Verifica si un rango [a0, a1] se solapa con [b0, b1] considerando tolerancia
 * @param {number} a0 - Inicio del primer rango
 * @param {number} a1 - Final del primer rango
 * @param {number} b0 - Inicio del segundo rango
 * @param {number} b1 - Final del segundo rango
 * @param {number} tolerance - Tolerancia para la comparación
 * @returns {boolean} - True si hay solapamiento
 */
export function rangesOverlap(a0, a1, b0, b1, tolerance = 0) {
  if (!Number.isFinite(a0) || !Number.isFinite(a1) ||
      !Number.isFinite(b0) || !Number.isFinite(b1)) {
    return false
  }
  // No hay solapamiento si: a1 <= b0 + tolerance O b1 <= a0 + tolerance
  return !(a1 <= b0 + tolerance || b1 <= a0 + tolerance)
}

export const errorsPlacement = {
  ZBASE_REQUIRED: 'Por favor, ingresa una altura válida desde el suelo (mayor a 0).',
  HEIGHT_EXCEEDS_WAREHOUSE:
    'Su altura total excede la altura máxima de la bodega.',
  Z_STACK_CONFLICT: 'Conflicto de altura detectado con otro elemento.',
}

export function resolveCoplanarNeighbors(element = {}, all = []) {
  const { zBaseCm: zA, ubic: ubicA } = resolveVerticalProps(element, {})
  const out = []

  for (const n of all) {
    if (!n || n.id === element.id) continue
    if (n.plantaId !== element.plantaId) continue

    const { zBaseCm: zB, ubic: ubicB } = resolveVerticalProps(n, {})
    if (ubicA == null || ubicB == null || ubicA !== ubicB) continue
    if (!Number.isFinite(zA) || !Number.isFinite(zB)) continue

    // Corregir precisión y usar tolerancia centralizada para capas coplanares
    const correctedZA = correctPrecision(zA)
    const correctedZB = correctPrecision(zB)

    if (isWithinTolerance(correctedZA, correctedZB, PLACEMENT_TOLERANCES.Z_LAYER)) {
      out.push(n)
    }
  }
  return out
}

export function validateWallZBaseRequired(element = {}, candidate = {}, ctx = {}) {
  const { ubic, zBaseCm } = resolveVerticalProps(element, candidate)
  if (ubic !== 'Pared') return { valid: true }
  if (zBaseCm == null || zBaseCm <= 0) {
    return { valid: false, code: 'ZBASE_REQUIRED' }
  }
  return { valid: true }
}

export function validateHeightWithinWarehouse(element = {}, candidate = {}, ctx = {}) {
  const { zBaseCm, altoCm } = resolveVerticalProps(element, candidate)
  const limit = Number(ctx.alturaBodega)
  // Omitir validación si la planta es infinita
  if (ctx.isInfinite === true) return { valid: true }
  if (!Number.isFinite(limit) || limit <= 0) return { valid: true }
  if (!Number.isFinite(zBaseCm) || !Number.isFinite(altoCm)) return { valid: true }

  // Corregir precisión de los valores antes de la comparación
  const correctedZBase = correctPrecision(zBaseCm)
  const correctedAlto = correctPrecision(altoCm)
  const correctedLimit = correctPrecision(limit)

  // Usar tolerancia centralizada para altura de bodega
  if (correctedZBase + correctedAlto > correctedLimit + PLACEMENT_TOLERANCES.WAREHOUSE_HEIGHT) {
    return { valid: false, code: 'HEIGHT_EXCEEDS_WAREHOUSE' }
  }
  return { valid: true }
}

export function validateZStacking(
  element = {},
  candidate = {},
  neighbors = [],
  options = {},
  ctx = {}
) {
  // Omitir validación si la planta es infinita
  if (ctx.isInfinite === true) return { valid: true }

  // Usar tolerancia relajada si es una transformación
  const Z_EPS = options.isTransforming
    ? PLACEMENT_TOLERANCES.Z_STACKING * 5 // 5x más tolerante durante transformaciones
    : PLACEMENT_TOLERANCES.Z_STACKING

  const { zBaseCm: zBaseA, altoCm: altoA } = resolveVerticalProps(element, candidate)
  if (!Number.isFinite(zBaseA) || !Number.isFinite(altoA)) return { valid: true }
  const moving = { ...element, ...candidate }

  // Corregir precisión de los valores del elemento que se está moviendo
  const correctedZBaseA = correctPrecision(zBaseA)
  const correctedAltoA = correctPrecision(altoA)
  const a0 = correctedZBaseA
  const a1 = correctedZBaseA + correctedAltoA

  for (const n of neighbors) {
    const { zBaseCm: zBaseB, altoCm: altoB } = resolveVerticalProps(n, {})
    if (!Number.isFinite(zBaseB) || !Number.isFinite(altoB)) continue
    const { intersectXY } = narrowPhase2D(moving, n)
    if (!intersectXY) continue

    // Corregir precisión de los valores del vecino
    const correctedZBaseB = correctPrecision(zBaseB)
    const correctedAltoB = correctPrecision(altoB)
    const b0 = correctedZBaseB
    const b1 = correctedZBaseB + correctedAltoB

    // Usar la tolerancia ajustada (más permisiva durante transformaciones)
    if (rangesOverlap(a0, a1, b0, b1, Z_EPS)) {
      return { valid: false, code: 'Z_STACK_CONFLICT', offenderId: n.id }
    }
  }
  return { valid: true }
}

export function validateCoplanarSameTypeNoOverlap() {
  return { valid: true }
}
