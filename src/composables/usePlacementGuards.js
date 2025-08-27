import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  resolveZStackClamp,
} from '@/validation/placementOrchestrator'
import { useToast } from '@/composables/useToast'
import { errorsPlacement } from '@/utils/errorsPlacement'
import { getActiveBounds } from '@/utils/activeBounds'
import { finalizeRectClampSnapReclamp, areaClamp } from '@/utils/edgeConstraint'

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
  const dragState = new Map()

  const clampAbs = (absPos, elementId) => {
    const base = store.elementos.find((e) => e.id === elementId)
    if (!base) return absPos

    const { boundsPx } = getActiveBounds(store)
    const areaBounds = { minX: 0, minY: 0, maxX: boundsPx.width, maxY: boundsPx.height }

    let x = Math.max(areaBounds.minX, Math.min(absPos.x, areaBounds.maxX - base.width))
    let y = Math.max(areaBounds.minY, Math.min(absPos.y, areaBounds.maxY - base.height))

    let cand = { ...base, x, y }

    const neighbors = store.elementosVisibles.filter((n) => {
      if (n.id === base.id) return false
      if (n.plantaId && base.plantaId && n.plantaId !== base.plantaId) return false
      return !(
        x + base.width <= n.x ||
        n.x + n.width <= x ||
        y + base.height <= n.y ||
        n.y + n.height <= y
      )
    })

    const res = resolveZStackClamp(cand, neighbors, areaBounds)
    if (res.collided && res.corrected) {
      x = res.corrected.x
      y = res.corrected.y
      cand = { ...cand, x, y }
    }

    const grid = store.gridSize || 50
    const snapped = finalizeRectClampSnapReclamp(x, y, cand.width, cand.height, areaBounds, grid)
    if (snapped.x !== x || snapped.y !== y) {
      const res2 = resolveZStackClamp({ ...cand, x: snapped.x, y: snapped.y }, neighbors, areaBounds)
      if (!res2.collided) {
        x = snapped.x
        y = snapped.y
      }
    }

    return { x, y }
  }

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

    const { boundsPx } = getActiveBounds(store)
    const areaBounds = { minX: 0, minY: 0, maxX: boundsPx.width, maxY: boundsPx.height }
    const resStack = validateZStacking(store.elementosVisibles, cand, areaBounds)
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
    let candidate = el
    if (store.useDragBoundsClamp) {
      const ctx = dragState.get(el.id)
      if (ctx) {
        const { lastGoodAbsPos, areaBounds, base, neighbors } = ctx
        const grid = store.gridSize || 50
        const snapped = finalizeRectClampSnapReclamp(
          lastGoodAbsPos.x,
          lastGoodAbsPos.y,
          base.width,
          base.height,
          areaBounds,
          grid,
        )
        const resSnap = resolveZStackClamp({ ...base, x: snapped.x, y: snapped.y }, neighbors, areaBounds)
        if (!resSnap.collided) {
          candidate = { ...el, x: snapped.x, y: snapped.y }
        } else {
          candidate = { ...el, x: lastGoodAbsPos.x, y: lastGoodAbsPos.y }
        }
        dragState.delete(el.id)
      }
    }
    const res = runPipeline(candidate, candidate.start)
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
    if (!store.useDragBoundsClamp) {
      node.dragBoundFunc((absPos) => clampAbs(absPos, elementId))
      const cleanup = () => {
        node.dragBoundFunc(null)
        node.off('dragend', cleanup)
      }
      node.on('dragend', cleanup)
      return
    }

    const base = store.elementos.find((e) => e.id === elementId)
    if (!base) return

    const parent = node.getParent()
    const parentAbsToLocal = parent.getAbsoluteTransform().copy().invert()
    const parentLocalToAbs = parent.getAbsoluteTransform().copy()
    const { boundsPx } = getActiveBounds(store)
    const areaBounds = { minX: 0, minY: 0, maxX: boundsPx.width, maxY: boundsPx.height }
    const bbox = { x: base.x, y: base.y, width: base.width, height: base.height }
    const margin = base.width + base.height
    const expanded = {
      x: bbox.x - margin,
      y: bbox.y - margin,
      width: bbox.width + margin * 2,
      height: bbox.height + margin * 2,
    }
    const neighbors = store.elementosVisibles.filter((n) => {
      if (n.id === base.id) return false
      if (n.plantaId && base.plantaId && n.plantaId !== base.plantaId) return false
      return !(
        expanded.x + expanded.width < n.x ||
        n.x + n.width < expanded.x ||
        expanded.y + expanded.height < n.y ||
        n.y + n.height < expanded.y
      )
    })
    let lastGoodAbsPos = node.getAbsolutePosition()
    dragState.set(elementId, {
      neighbors,
      parentAbsToLocal,
      parentLocalToAbs,
      areaBounds,
      base,
      lastGoodAbsPos,
    })

    const bound = (posLocal) => {
      const abs = parentLocalToAbs.point(posLocal)
      let { x, y } = areaClamp(abs.x, abs.y, base.width, base.height, areaBounds)
      const res = resolveZStackClamp({ ...base, x, y }, neighbors, areaBounds)
      if (res.collided && res.corrected) {
        x = res.corrected.x
        y = res.corrected.y
      }
      lastGoodAbsPos = { x, y }
      const ctx = dragState.get(elementId)
      if (ctx) ctx.lastGoodAbsPos = lastGoodAbsPos
      return parentAbsToLocal.point({ x, y })
    }

    node.dragBoundFunc(bound)
    const cleanup = () => {
      node.dragBoundFunc(null)
      node.off('dragend', cleanup)
    }
    node.on('dragend', cleanup)
  }

  return { onDragMoveGuard, onDragEndGuard, onTransformEndGuard, installDragBounds }
}

export default usePlacementGuards
