import { validateWallZBaseRequired, validateHeightWithinWarehouse, validateZStacking } from '@/validation/placementOrchestrator'

/**
 * Provee guards de validación para movimientos y transformaciones
 * @param {Object} ctx
 * @param {Object} ctx.store - store de canvas
 * @param {number} ctx.alturaBodega - altura máxima permitida
 * @param {number} ctx.CM_TO_PX - factor de conversión
 */
export function usePlacementGuards({ store, alturaBodega, CM_TO_PX }) {
  void CM_TO_PX

  const validateAll = (el) => {
    const base = validateWallZBaseRequired({ ubicacion: el.ubicacion, zBase: el.elevacion?.zBase })
    if (!base.valid) return base
    const height = validateHeightWithinWarehouse({
      ubicacion: el.ubicacion,
      zBase: el.elevacion?.zBase,
      alto: el.elevacion?.altura,
      alturaBodega,
    })
    if (!height.valid) return height
    const neighbors = store.elementosVisibles.filter((e) => e.id !== el.id)
    return validateZStacking({ movingEl: el, neighbors })
  }

  const onDragMoveGuard = (el) => {
    const neighbors = store.elementosVisibles.filter((e) => e.id !== el.id)
    return validateZStacking({ movingEl: el, neighbors })
  }

  const onDragEndGuard = (el) => validateAll(el)
  const onTransformEndGuard = (el) => validateAll(el)

  return { onDragMoveGuard, onDragEndGuard, onTransformEndGuard }
}

export default usePlacementGuards
