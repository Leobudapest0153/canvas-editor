import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  validateCoplanarSameTypeNoOverlap,
  resolveCoplanarNeighbors,
  errorsPlacement,
} from '@/validation/placementOrchestrator'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { mtdAgainstSet } from '@/utils/collision'

export function usePlacementGuards({ useTopeClamp = true } = {}) {
  const store = useCanvasStore()
  const clampState = new Map()
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

  const onDragStartGuard = (el, shape) => {
    if (!useTopeClamp) return
    const parent = shape?.getParent?.()
    const absTransform = parent?.getAbsoluteTransform?.().copy?.()
    const inv = parent?.getAbsoluteTransform?.().copy?.().invert?.()
    if (!absTransform || !inv || !shape?.dragBoundFunc) return

    const toAbs = (p) => absTransform.point({ x: p.x, y: p.y })
    const toLocal = (p) => inv.point({ x: p.x, y: p.y })
    const lastGoodAbsPos = shape.getAbsolutePosition?.() || { x: 0, y: 0 }
    const neighbors = resolveCoplanarNeighbors(el, store.elementosVisibles)
    const rects = neighbors.map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height }))

    const bound = (pos) => {
      const abs = toAbs(pos)
      const candRect = { x: abs.x, y: abs.y, w: el.width, h: el.height }
      const { dx, dy } = mtdAgainstSet(candRect, rects)
      abs.x += dx
      abs.y += dy
      if (dx !== 0 || dy !== 0) {
        lastGoodAbsPos.x = abs.x
        lastGoodAbsPos.y = abs.y
      }
      return toLocal(abs)
    }

    shape.dragBoundFunc(bound)
    clampState.set(el.id, { toLocal, lastGoodAbsPos })
  }

  const onDragMoveGuard = (el, cand) => run(el, cand)
  const onDragEndGuard = (el, cand, opts = {}) => {
    const state = clampState.get(el.id)
    const revert = () => {
      if (state && opts.shape?.position) {
        opts.shape.position(state.toLocal(state.lastGoodAbsPos))
      } else {
        opts.revert?.()
      }
    }
    const res = handle(el, cand, { revert })
    clampState.delete(el.id)
    return res
  }
  const onTransformEndGuard = (el, cand, opts) => handle(el, cand, opts)

  return {
    onDragStartGuard,
    onDragMoveGuard,
    onDragEndGuard,
    onTransformEndGuard,
  }
}
