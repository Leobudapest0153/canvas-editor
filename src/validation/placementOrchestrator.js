import { resolveVerticalProps } from './fieldResolvers'
import { narrowPhase2D } from '@/utils/collision'

export const errorsPlacement = {
  ZBASE_REQUIRED: 'La altura respecto al suelo es obligatoria y debe ser mayor a 0.',
  HEIGHT_EXCEEDS_WAREHOUSE:
    'Supera la altura de la bodega (zBase + alto > altura de bodega).',
  Z_STACK_CONFLICT: 'Colisión vertical: las alturas se solapan',
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
  if (!Number.isFinite(limit) || limit <= 0) return { valid: true }
  if (!Number.isFinite(zBaseCm) || !Number.isFinite(altoCm)) return { valid: true }
  if (zBaseCm + altoCm > limit + 1e-6) {
    return { valid: false, code: 'HEIGHT_EXCEEDS_WAREHOUSE' }
  }
  return { valid: true }
}

export function validateZStacking(
  element = {},
  candidate = {},
  neighbors = [],
  Z_EPS = 0.001,
) {
  const { zBaseCm: zBaseA, altoCm: altoA } = resolveVerticalProps(element, candidate)
  if (!Number.isFinite(zBaseA) || !Number.isFinite(altoA)) return { valid: true }
  const moving = { ...element, ...candidate }
  const a0 = zBaseA
  const a1 = zBaseA + altoA
  for (const n of neighbors) {
    const { zBaseCm: zBaseB, altoCm: altoB } = resolveVerticalProps(n, {})
    if (!Number.isFinite(zBaseB) || !Number.isFinite(altoB)) continue
    const { intersectXY } = narrowPhase2D(moving, n)
    if (!intersectXY) continue
    const b0 = zBaseB
    const b1 = zBaseB + altoB
    if (!(a1 <= b0 + Z_EPS || b1 <= a0 + Z_EPS)) {
      return { valid: false, code: 'Z_STACK_CONFLICT', offenderId: n.id }
    }
  }
  return { valid: true }
}

export function validateCoplanarSameTypeNoOverlap() {
  return { valid: true }
}
