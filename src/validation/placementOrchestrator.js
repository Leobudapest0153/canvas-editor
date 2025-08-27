import { validateWallPlacement } from '@/utils/placementValidity'
import { narrowPhase2D, zOverlapCheck } from '@/utils/collision'

const Z_EPS = 0.001

/**
 * Valida que elementos con ubicacion "pared" tengan zBase definido y > 0
 */
export function validateWallZBaseRequired(element, candidate) {
  const ubic = candidate.ubicacion ?? element.ubicacion
  if (ubic !== 'pared') return { valid: true }
  const zEff = candidate.zBase ?? candidate.elevacion?.zBase ?? element.zBase ?? element.elevacion?.zBase
  const altoEff = candidate.alto ?? candidate.elevacion?.altura ?? element.alto ?? element.elevacion?.altura
  void altoEff
  if (zEff == null || zEff <= 0) {
    return { valid: false, code: 'ZBASE_REQUIRED' }
  }
  return { valid: true }
}

/**
 * Valida que la suma zBase + alto no exceda la altura de la bodega
 */
export function validateHeightWithinWarehouse(candidate, alturaBodega) {
  if (candidate.ubicacion !== 'pared') return { valid: true }
  const { valido, mensaje } = validateWallPlacement({
    zBase: candidate.zBase ?? candidate.elevacion?.zBase ?? 1,
    alto: candidate.alto ?? candidate.elevacion?.altura,
    alturaBodega,
  })
  if (!valido && mensaje.includes('excede')) {
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
export function validateZStacking(elements, candidate, Z_EPS = 0.001) {
  const m = {
    ...candidate,
    tolerancias: { ...(candidate.tolerancias || {}), zEpsilon: Z_EPS },
  }
  for (const other of elements) {
    if (other.id === candidate.id) continue
    const { intersectXY } = narrowPhase2D(m, other)
    if (!intersectXY) continue
    const o = {
      ...other,
      tolerancias: { ...(other.tolerancias || {}), zEpsilon: Z_EPS },
    }
    const { overlap } = zOverlapCheck(m, o)
    if (overlap) {
      return { valid: false, code: 'Z_STACKING_COLLISION' }
    }
  }
  return { valid: true }
}

export default {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
}
