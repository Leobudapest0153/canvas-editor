import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  validateCoplanarSameTypeNoOverlap,
} from '@/validation/placementOrchestrator'

export function usePlacementGuards() {
  const validators = [
    validateWallZBaseRequired,
    validateHeightWithinWarehouse,
    validateZStacking,
    validateCoplanarSameTypeNoOverlap,
  ]

  const run = (el, cand, ctx) => {
    for (const v of validators) {
      const res = v(el, cand, ctx)
      if (res && res.valid === false) return res
    }
    return { valid: true }
  }

  const onDragMoveGuard = (el, cand, ctx) => run(el, cand, ctx)
  const onDragEndGuard = (el, cand, ctx) => run(el, cand, ctx)
  const onTransformEndGuard = (el, cand, ctx) => run(el, cand, ctx)

  return {
    onDragMoveGuard,
    onDragEndGuard,
    onTransformEndGuard,
  }
}
