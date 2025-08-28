import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  validateCoplanarSameTypeNoOverlap,
  errorsPlacement,
} from '@/validation/placementOrchestrator'
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

  const run = (el, cand) => {
    const ctx = getCtx()
    for (const v of validators) {
      const res = v(el, cand, ctx)
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

  const onDragMoveGuard = (el, cand) => run(el, cand)
  const onDragEndGuard = (el, cand, opts) => handle(el, cand, opts)
  const onTransformEndGuard = (el, cand, opts) => handle(el, cand, opts)

  return {
    onDragMoveGuard,
    onDragEndGuard,
    onTransformEndGuard,
  }
}
