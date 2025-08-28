import { resolveVerticalProps } from './fieldResolvers'

export const errorsPlacement = {
  ZBASE_REQUIRED: 'La altura respecto al suelo es obligatoria y debe ser mayor a 0.',
  HEIGHT_EXCEEDS_WAREHOUSE:
    'Supera la altura de la bodega (zBase + alto > altura de bodega).',
}

export function validateWallZBaseRequired(element = {}, candidate = {}, ctx = {}) {
  const { location: ubic, zBase } = resolveVerticalProps(element, candidate)
  if ((ubic || '').toLowerCase() !== 'pared') return { valid: true }
  if (zBase == null || zBase <= 0) {
    return { valid: false, code: 'ZBASE_REQUIRED' }
  }
  return { valid: true }
}

export function validateHeightWithinWarehouse(element = {}, candidate = {}, ctx = {}) {
  const { zBase, height } = resolveVerticalProps(element, candidate)
  if (zBase == null || height == null) return { valid: true }
  const limit = Number(ctx.alturaBodega)
  if (Number.isFinite(limit) && zBase + height > limit + 1e-6) {
    return { valid: false, code: 'HEIGHT_EXCEEDS_WAREHOUSE' }
  }
  return { valid: true }
}

export function validateZStacking() {
  return { valid: true }
}

export function validateCoplanarSameTypeNoOverlap() {
  return { valid: true }
}
