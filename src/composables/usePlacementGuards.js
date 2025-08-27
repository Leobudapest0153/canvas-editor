import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  resolveZStackClamp,
} from '@/validation/placementOrchestrator'
import { useToast } from '@/composables/useToast'
import { errorsPlacement } from '@/utils/errorsPlacement'
import { getAABB, aabbIntersect } from '@/utils/collision'

function hydrateCandidate(element, partial) {
  const ubicacion = partial.ubicacion ?? element.ubicacion
  const zBase =
    partial.zBase ?? partial.elevacion?.zBase ?? element.zBase ?? element.elevacion?.zBase
  const alto =
    partial.alto ?? partial.elevacion?.altura ?? element.alto ?? element.elevacion?.altura
  return {
    ...element,
    ...partial,
    ubicacion,
    zBase,
    alto,
    elevacion: {
      ...(element.elevacion || {}),
      ...(partial.elevacion || {}),
      zBase,
      altura: alto,
    },
  }
}

/**
 * Provee guards de validación para movimientos y transformaciones
 * @param {Object} ctx
 * @param {Object} ctx.store - store de canvas
 * @param {number} ctx.alturaBodega - altura máxima permitida
 * @param {number} ctx.CM_TO_PX - factor de conversión
 */
export function usePlacementGuards({ store, alturaBodega, CM_TO_PX }) {
  void CM_TO_PX
  const toast = useToast()

  const runPipeline = (candidate, start) => {
    const base = store.elementos.find((e) => e.id === candidate.id) || candidate
    const cand = hydrateCandidate(base, candidate)

    const resBase = validateWallZBaseRequired(base, cand)
    if (!resBase.valid) {
      if (start) {
        const { x, y, width, height } = start
        const payload = {}
        if (x !== undefined) payload.x = x
        if (y !== undefined) payload.y = y
        if (width !== undefined) payload.width = width
        if (height !== undefined) payload.height = height
        store.actualizarElemento(candidate.id, payload)
      }
      return { ...resBase, candidate: cand }
    }

    const resHeight = validateHeightWithinWarehouse(base, cand, alturaBodega)
    if (!resHeight.valid) {
      if (start) {
        const { x, y, width, height } = start
        const payload = {}
        if (x !== undefined) payload.x = x
        if (y !== undefined) payload.y = y
        if (width !== undefined) payload.width = width
        if (height !== undefined) payload.height = height
        store.actualizarElemento(candidate.id, payload)
      }
      return { ...resHeight, candidate: cand }
    }

    const aabb = getAABB(cand)
    const neighbors = store.elementosVisibles.filter(
      (e) => e.id !== cand.id && e.plantaId === cand.plantaId && aabbIntersect(aabb, getAABB(e)),
    )
    const resStack = validateZStacking(neighbors, cand)
    if (!resStack.valid) {
      const { corrected } = resolveZStackClamp(cand, neighbors)
      if (start) {
        const { x, y, width, height } = start
        const payload = {}
        if (x !== undefined) payload.x = x
        if (y !== undefined) payload.y = y
        if (width !== undefined) payload.width = width
        if (height !== undefined) payload.height = height
        store.actualizarElemento(candidate.id, payload)
      }
      return { ...resStack, reason: resStack.code, candidate: cand, corrected }
    }

    return { valid: true, candidate: cand }
  }

  const onDragMoveGuard = (el) => {
    const res = runPipeline(el)
    el.invalidPlacement = !res.valid
    if (res.reason === 'Z_STACK_CONFLICT' && res.corrected) {
      el.x = res.corrected.x
      el.y = res.corrected.y
    }
    return res
  }

  const handleEnd = (el) => {
    const res = runPipeline(el, el.start)
    el.invalidPlacement = !res.valid
    if (!res.valid) {
      toast.showError(errorsPlacement[res.code] || errorsPlacement[res.reason] || res.code || res.reason)
      if (el.start) return { ...res, corrected: el.start }
    }
    return res
  }

  const onDragEndGuard = (el) => handleEnd(el)
  const onTransformEndGuard = (el) => handleEnd(el)

  return { onDragMoveGuard, onDragEndGuard, onTransformEndGuard }
}

export default usePlacementGuards
