import { validateWallPlacement } from '@/utils/placementValidity'
import { narrowPhase2D, zOverlapCheck, computeMTD, projectMTDAgainstBoundary, inflateRectForWall } from '@/utils/collision'
import { finalizeRectClampSnapReclamp } from '@/utils/edgeConstraint'
import { resolveVerticalProps } from './fieldResolvers'

const Z_EPS = 0.001

/**
 * Valida que elementos con ubicacion "pared" tengan zBase definido y > 0
 */
export function validateWallZBaseRequired(element, candidate) {
  const { ubic, zBaseCm, altoCm } = resolveVerticalProps(element, candidate)
  void altoCm
  if (ubic !== 'Pared') return { valid: true }
  if (zBaseCm == null || zBaseCm <= 0) {
    if (globalThis.__DEV__) console.debug('resolveVerticalProps', { ubic, zBaseCm, altoCm })
    return { valid: false, code: 'ZBASE_REQUIRED' }
  }
  return { valid: true }
}

/**
 * Valida que la suma zBase + alto no exceda la altura de la bodega
 */
export function validateHeightWithinWarehouse(element, candidate, alturaBodega) {
  const { ubic, zBaseCm, altoCm } = resolveVerticalProps(element, candidate)
  if (ubic !== 'Pared') return { valid: true }
  if (zBaseCm == null || altoCm == null) return { valid: true }
  const { valido, mensaje } = validateWallPlacement({
    zBase: zBaseCm,
    alto: altoCm,
    alturaBodega,
  })
  if (!valido && mensaje.includes('excede')) {
    if (globalThis.__DEV__) console.debug('resolveVerticalProps', { ubic, zBaseCm, altoCm })
    return { valid: false, code: 'HEIGHT_EXCEEDS_WAREHOUSE' }
  }
  return { valid: true }
}

/**
 * Valida que los intervalos Z de elementos que se traslapan en XY no se solapen
 *
 * @param {Array<Object>} elements - elementos existentes
 * @param {Object} candidate - elemento candidato
 * @param {number} [Z_EPS=0.001] - tolerancia para permitir contacto
 */
export function resolveZStackClamp(candidate, neighbors, areaBounds, Z_EPS = 0.001, axisHint) {
  const candProps = resolveVerticalProps(candidate, {})
  const m = {
    ...candidate,
    elevacion: {
      ...(candidate.elevacion || {}),
      zBase: candProps.zBaseCm ?? candidate.elevacion?.zBase,
      altura: candProps.altoCm ?? candidate.elevacion?.altura,
    },
    tolerancias: { ...(candidate.tolerancias || {}), zEpsilon: Z_EPS },
  }

  let best = null
  for (const other of neighbors) {
    if (other.id === candidate.id) continue
    if (other.plantaId && candidate.plantaId && other.plantaId !== candidate.plantaId) continue
    if (other.padre && candidate.padre && other.padre !== candidate.padre) continue
    // Broad-phase AABB check considering wall thickness
    const aRect =
      (candidate.ubicacion || '').toLowerCase() === 'pared'
        ? inflateRectForWall(candidate)
        : { x: candidate.x, y: candidate.y, w: candidate.width, h: candidate.height }
    const bRect =
      (other.ubicacion || '').toLowerCase() === 'pared'
        ? inflateRectForWall(other)
        : { x: other.x, y: other.y, w: other.width, h: other.height }
    if (
      aRect.x + aRect.w <= bRect.x ||
      bRect.x + bRect.w <= aRect.x ||
      aRect.y + aRect.h <= bRect.y ||
      bRect.y + bRect.h <= aRect.y
    )
      continue

    const { intersectXY, ra, rb } = narrowPhase2D(candidate, other)
    if (!intersectXY) continue
    const otherProps = resolveVerticalProps(other, {})
    const o = {
      ...other,
      elevacion: {
        ...(other.elevacion || {}),
        zBase: otherProps.zBaseCm ?? other.elevacion?.zBase,
        altura: otherProps.altoCm ?? other.elevacion?.altura,
      },
      tolerancias: { ...(other.tolerancias || {}), zEpsilon: Z_EPS },
    }
    const { overlap } = zOverlapCheck(m, o)
    if (!overlap) continue
    let { dx, dy } = computeMTD(ra.x, ra.y, ra.w, ra.h, rb.x, rb.y, rb.w, rb.h)
    if (axisHint) {
      const preferX = Math.abs(axisHint.x) >= Math.abs(axisHint.y)
      if (preferX && dx !== 0) dy = 0
      else if (!preferX && dy !== 0) dx = 0
    }
    const mag = Math.abs(dx) + Math.abs(dy)
    if (!best || mag < best.mag) best = { dx, dy, mag }
  }

  if (best) {
    let { dx, dy } = best
    if (areaBounds) {
      const proj = projectMTDAgainstBoundary(
        candidate.x,
        candidate.y,
        dx,
        dy,
        candidate.width,
        candidate.height,
        areaBounds.maxX - areaBounds.minX,
        areaBounds.maxY - areaBounds.minY,
      )
      dx = proj.dx
      dy = proj.dy
      const clamped = finalizeRectClampSnapReclamp(
        candidate.x + dx,
        candidate.y + dy,
        candidate.width,
        candidate.height,
        areaBounds,
        1,
      )
      return { collided: true, corrected: { x: clamped.x, y: clamped.y } }
    }
    return { collided: true, corrected: { x: candidate.x + dx, y: candidate.y + dy } }
  }
  return { collided: false }
}

export function validateZStacking(elements, candidate, areaBounds, Z_EPS = 0.001) {
  const res = resolveZStackClamp(candidate, elements, areaBounds, Z_EPS)
  if (res.collided) {
    return { valid: false, code: 'Z_STACKING_COLLISION', reason: 'Z_STACK_CONFLICT', corrected: res.corrected }
  }
  return { valid: true }
}

export default {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  resolveZStackClamp,
}
