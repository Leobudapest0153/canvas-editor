import { resolveVerticalProps } from './fieldResolvers'
import { aabbIntersect } from '@/utils/collision'

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
  const { zBaseCm, altoCm } = resolveVerticalProps(element, candidate)
  if (!Number.isFinite(zBaseCm) || !Number.isFinite(altoCm)) return { valid: true }

  const zA0 = zBaseCm
  const zA1 = zBaseCm + altoCm

  const aabbA = {
    x: Number(candidate.x ?? element.x ?? 0),
    y: Number(candidate.y ?? element.y ?? 0),
    w: Number(candidate.width ?? element.width ?? 0),
    h: Number(candidate.height ?? element.height ?? 0),
  }

  const plantaId = candidate.plantaId ?? element.plantaId

  for (const n of neighbors) {
    if (plantaId && n.plantaId && n.plantaId !== plantaId) continue

    const aabbB = {
      x: Number(n.x ?? 0),
      y: Number(n.y ?? 0),
      w: Number(n.width ?? 0),
      h: Number(n.height ?? 0),
    }

    if (!aabbIntersect(aabbA, aabbB)) continue

    const { zBaseCm: zBaseB, altoCm: altoB } = resolveVerticalProps(n, {})
    if (!Number.isFinite(zBaseB) || !Number.isFinite(altoB)) continue
    const zB0 = zBaseB
    const zB1 = zBaseB + altoB

    const overlap = Math.min(zA1, zB1) - Math.max(zA0, zB0)
    if (overlap > Z_EPS) {
      return { valid: false, code: 'Z_STACK_CONFLICT', offenderId: n.id }
    }
  }

  return { valid: true }
}

export function validateCoplanarSameTypeNoOverlap() {
  return { valid: true }
}
