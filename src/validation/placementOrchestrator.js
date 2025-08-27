import { validateWallPlacement } from '@/utils/placementValidity'
import { narrowPhase2D, zOverlapCheck } from '@/utils/collision'
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
export function validateZStacking(elements, candidate, Z_EPS = 0.001) {
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
  for (const other of elements) {
    if (other.id === candidate.id) continue
    const { intersectXY } = narrowPhase2D(m, other)
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
    if (overlap) {
      if (globalThis.__DEV__) console.debug('resolveVerticalProps', { cand: candProps, other: otherProps })
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
