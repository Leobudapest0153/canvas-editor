import { validateWallPlacement } from '@/utils/placementValidity'
import { zOverlapCheck } from '@/utils/collision'

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
    return { valid: false, reason: mensaje }
  }
  return { valid: true }
}

/**
 * Valida que no exista solape en Z con otros elementos
 */
export function validateZStacking({ movingEl, neighbors = [] }) {
  const m = {
    ...movingEl,
    tolerancias: { ...(movingEl.tolerancias || {}), zEpsilon: Z_EPS },
  }
  for (const other of neighbors) {
    const o = {
      ...other,
      tolerancias: { ...(other.tolerancias || {}), zEpsilon: Z_EPS },
    }
    const { overlap } = zOverlapCheck(m, o)
    if (overlap) {
      return { valid: false, reason: 'Solape vertical con otro elemento' }
    }
  }
  return { valid: true }
}

export default {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
}
