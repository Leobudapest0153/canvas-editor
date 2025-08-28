import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  resolveZStackClamp,
} from '@/validation/placementOrchestrator'
import { useToast } from '@/composables/useToast'
import { errorsPlacement } from '@/utils/errorsPlacement'
import { getActiveBounds } from '@/utils/activeBounds'
import { finalizeRectClampSnapReclamp } from '@/utils/edgeConstraint'
import { clampToAreaFast } from '@/utils/dragMath'

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
  const neighborsCache = new Map()
  const lastGoodPos = new Map()

  const runPipeline = (candidate, start, neighborsOverride) => {
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

    const { boundsPx } = getActiveBounds(store)
    const areaBounds = { minX: 0, minY: 0, maxX: boundsPx.width, maxY: boundsPx.height }
    const neighbors = neighborsOverride || store.elementosVisibles
    const resStack = validateZStacking(neighbors, cand, areaBounds)
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
    const neighbors = store.useDragBoundsClamp ? neighborsCache.get(el.id) : undefined
    const res = runPipeline(el, undefined, neighbors)
    if (!res.valid && res.reason === 'Z_STACK_CONFLICT' && res.corrected) {
      store.actualizarElemento(el.id, res.corrected)
      el.x = res.corrected.x
      el.y = res.corrected.y
    }
    el.invalidPlacement = !res.valid
    return res
  }

  const handleEnd = (el) => {
    const id = el.id
    let candidate = { ...el }
    const neighbors = store.useDragBoundsClamp ? neighborsCache.get(id) : undefined
    if (store.useDragBoundsClamp && neighbors) {
      const base = store.elementos.find((e) => e.id === id) || candidate
      const { boundsPx } = getActiveBounds(store)
      const areaBounds = { minX: 0, minY: 0, maxX: boundsPx.width, maxY: boundsPx.height }
      const grid = store.gridSize || 50
      const snapped = finalizeRectClampSnapReclamp(
        candidate.x,
        candidate.y,
        base.width,
        base.height,
        areaBounds,
        grid,
      )
      const snapRes = resolveZStackClamp({ ...base, x: snapped.x, y: snapped.y }, neighbors, areaBounds)
      if (!snapRes.collided) {
        if (snapped.x !== candidate.x || snapped.y !== candidate.y) {
          store.actualizarElemento(id, { x: snapped.x, y: snapped.y })
          candidate.x = snapped.x
          candidate.y = snapped.y
        }
      } else {
        const last = lastGoodPos.get(id)
        if (last) {
          store.actualizarElemento(id, { x: last.x, y: last.y })
          candidate.x = last.x
          candidate.y = last.y
        }
      }
    }
    const res = runPipeline(candidate, candidate.start, neighbors)
    candidate.invalidPlacement = !res.valid
    if (!res.valid) {
      toast.showError(errorsPlacement[res.code] || errorsPlacement[res.reason] || res.code || res.reason)
      if (candidate.start) return { ...res, corrected: candidate.start }
    }
    return res
  }

  const onDragEndGuard = (el) => handleEnd(el)
  const onTransformEndGuard = (el) => handleEnd(el)

  const installDragBounds = (node, elementId) => {
    if (!store.useDragBoundsClamp) return
    const base = store.elementos.find((e) => e.id === elementId)
    if (!base) return
    const parent = node.getParent()
    const parentAbsToLocal = parent.getAbsoluteTransform().copy().invert()
    const parentLocalToAbs = parent.getAbsoluteTransform().copy()
    const { boundsPx } = getActiveBounds(store)
    const areaBounds = { minX: 0, minY: 0, maxX: boundsPx.width, maxY: boundsPx.height }
    const areaFast = { type: 'rect', W: areaBounds.maxX - areaBounds.minX, H: areaBounds.maxY - areaBounds.minY }
    const neighbors = store.elementosVisibles.filter((n) => {
      if (n.id === base.id) return false
      if (n.plantaId && base.plantaId && n.plantaId !== base.plantaId) return false
      return true
    })
    neighborsCache.set(elementId, neighbors)
    lastGoodPos.set(elementId, node.getAbsolutePosition())
    const bound = (posLocal) => {
      const abs = parentLocalToAbs.point(posLocal)
      const cArea = clampToAreaFast(abs.x, abs.y, base.width, base.height, areaFast)
      let x = cArea.x
      let y = cArea.y
      const res = resolveZStackClamp({ ...base, x, y }, neighbors, areaBounds)
      if (res.collided && res.corrected) {
        x = res.corrected.x
        y = res.corrected.y
      }
      const local = parentAbsToLocal.point({ x, y })
      return local
    }
    node.dragBoundFunc(bound)
    const cleanup = () => {
      node.dragBoundFunc(null)
      node.off('dragend', cleanup)
      neighborsCache.delete(elementId)
      lastGoodPos.delete(elementId)
    }
    node.on('dragend', cleanup)
  }

  return { onDragMoveGuard, onDragEndGuard, onTransformEndGuard, installDragBounds }
}

export default usePlacementGuards
