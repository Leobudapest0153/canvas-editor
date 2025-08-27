import { validateWallPlacement } from '@/utils/placementValidity'
import { narrowPhase2D, zOverlapCheck } from '@/utils/collision'

const Z_EPS = 0.001

/**
 * Valida que elementos con ubicacion "pared" tengan zBase definido y > 0
 */
export function validateWallZBaseRequired({ ubicacion, zBase }) {
  if (ubicacion !== 'pared') return { valid: true }
  const { valido, mensaje } = validateWallPlacement({ zBase, alto: 0, alturaBodega: Infinity })
  return { valid: valido, reason: valido ? '' : mensaje }
}

/**
 * Valida que la suma zBase + alto no exceda la altura de la bodega
 */
export function validateHeightWithinWarehouse({ ubicacion, zBase, alto, alturaBodega }) {
  if (ubicacion !== 'pared') return { valid: true }
  const { valido, mensaje } = validateWallPlacement({ zBase: zBase ?? 1, alto, alturaBodega })
  if (!valido && mensaje.includes('excede')) {
    return { valid: false, reason: 'HEIGHT_EXCEEDS_WAREHOUSE' }
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
      return { valid: false, reason: 'Z_STACKING_COLLISION' }
    }
  }
  return { valid: true }
}

export default {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
}
