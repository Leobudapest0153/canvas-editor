import * as orchestrator from '@/validation/placementOrchestrator'
const {
  resolveCoplanarNeighbors,
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  validateCoplanarSameTypeNoOverlap,
  errorsPlacement,
} = orchestrator
import { resolveTypeId } from '@/validation/fieldResolvers'
import { mtdAgainstSet } from '@/utils/collision'
import { useCanvasStore } from '@/composables/useCanvasStore'

export function usePlacementGuards() {
  const store = useCanvasStore()
  const validators = [
    validateWallZBaseRequired,
    validateHeightWithinWarehouse,
    validateZStacking,
    validateCoplanarSameTypeNoOverlap,
  ]

  const getCtx = () => {
    const planta =
      typeof store.plantaPorId === 'function'
        ? store.plantaPorId(store.plantaActiva)
        : null
    const alturaBodega =
      planta?.alturaBodega ??
      planta?.dimensiones?.alto ??
      planta?.altura ??
      null
    return { alturaBodega }
  }

  const dragState = new Map()

  const installClamp = (shape, el) => {
    if (!shape?.dragBoundFunc) return
    const parent = shape.getParent ? shape.getParent() : null
    const toAbs = parent?.getAbsoluteTransform?.()?.copy?.()
    const toLocal = toAbs?.copy?.()?.invert?.()
    const lastGood =
      shape.getAbsolutePosition?.() || { x: el.x || 0, y: el.y || 0 }

    const typeA = resolveTypeId(el, {})
    const coplanar = resolveCoplanarNeighbors(el, store.elementosVisibles)
    const neighbors = coplanar.filter(
      (n) => resolveTypeId(n, {}) === typeA,
    )
    const neighborRects = neighbors.map((n) => ({
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    }))
    const orig = shape.dragBoundFunc()
    const state = { shape, lastGood: { ...lastGood }, orig, neighborRects }

    const bound = (pos) => {
      let abs = toAbs?.point ? toAbs.point(pos) : { ...pos }
      const mtd = mtdAgainstSet(
        { x: abs.x, y: abs.y, width: el.width, height: el.height },
        state.neighborRects,
      )
      if (mtd.dx || mtd.dy) {
        abs = { x: abs.x + mtd.dx, y: abs.y + mtd.dy }
      }
      state.lastGood = { x: abs.x, y: abs.y }
      return toLocal?.point ? toLocal.point(abs) : abs
    }
    shape.dragBoundFunc(bound)
    dragState.set(el.id, state)
  }

  const run = (el, cand) => {
    const ctx = getCtx()
    const neighbors = store.elementosVisibles.filter((n) => n.id !== el?.id)
    for (const v of validators) {
      let res
      if (v === validateZStacking) res = v(el, cand, neighbors)
      else res = v(el, cand, ctx)
      if (res && res.valid === false) return res
    }
    return { valid: true }
  }

  const handle = (el, cand, opts = {}) => {
    const res = run(el, cand)
    if (!res.valid) {
      opts.revert?.()
      const msg = errorsPlacement[res.code] || 'Posición inválida'
      window?.__toasts?.show?.(msg, { type: 'error' })
    }
    return res
  }

  const onDragStartGuard = (shape, el) => installClamp(shape, el)
  const onDragMoveGuard = (el, cand) => run(el, cand)
  const onDragEndGuard = (el, cand, opts = {}) => {
    const state = dragState.get(el.id)
    if (state) {
      const { shape, lastGood, orig, neighborRects } = state
      shape.dragBoundFunc(orig || undefined)
      dragState.delete(el.id)
      const overlap = mtdAgainstSet(
        { x: cand.x, y: cand.y, width: el.width, height: el.height },
        neighborRects,
      )
      if (overlap.dx || overlap.dy) {
        if (shape.absolutePosition) shape.absolutePosition(lastGood)
        else if (shape.setAbsolutePosition) shape.setAbsolutePosition(lastGood)
        else shape.position?.(lastGood)
        opts?.revert?.()
        return { valid: false }
      }
      const wrapped = {
        ...opts,
        revert: () => {
          if (shape.absolutePosition) shape.absolutePosition(lastGood)
          else if (shape.setAbsolutePosition) shape.setAbsolutePosition(lastGood)
          else shape.position?.(lastGood)
          opts?.revert?.()
        },
      }
      return handle(el, cand, wrapped)
    }
    return handle(el, cand, opts)
  }
  const onTransformEndGuard = (el, cand, opts) => handle(el, cand, opts)

  return {
    onDragStartGuard,
    onDragMoveGuard,
    onDragEndGuard,
    onTransformEndGuard,
  }
}
