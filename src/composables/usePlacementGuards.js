import { validateWallZBaseRequired, validateHeightWithinWarehouse, validateZStacking } from '@/validation/placementOrchestrator'
import { useToast } from '@/composables/useToast'
import { errorsPlacement } from '@/utils/errorsPlacement'

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

    const resHeight = validateHeightWithinWarehouse(cand, alturaBodega)
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

    const resStack = validateZStacking(store.elementosVisibles, cand)
    if (!resStack.valid) {
      if (start) {
        const { x, y, width, height } = start
        const payload = {}
        if (x !== undefined) payload.x = x
        if (y !== undefined) payload.y = y
        if (width !== undefined) payload.width = width
        if (height !== undefined) payload.height = height
        store.actualizarElemento(candidate.id, payload)
      }
      return { ...resStack, candidate: cand }
    }

    return { valid: true, candidate: cand }
  }

  const onDragMoveGuard = (el) => {
    const res = runPipeline(el)
    el.invalidPlacement = !res.valid
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
