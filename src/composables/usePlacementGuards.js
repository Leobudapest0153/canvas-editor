import { validateWallZBaseRequired, validateHeightWithinWarehouse, validateZStacking } from '@/validation/placementOrchestrator'
import { useToast } from '@/composables/useToast'
import { errorsPlacement } from '@/utils/errorsPlacement'

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
    return validateZStacking(store.elementosVisibles, el)
  }

  const onDragMoveGuard = (el) => {
    const height = validateHeightWithinWarehouse({
      ubicacion: el.ubicacion,
      zBase: el.elevacion?.zBase,
      alto: el.elevacion?.altura,
      alturaBodega,
    })
    if (!height.valid) {
      el.invalidPlacement = true
      return height
    }
    const zRes = validateZStacking(store.elementosVisibles, el)
    el.invalidPlacement = !zRes.valid
    return zRes
  }

  const handleEnd = (el) => {
    const res = validateAll(el)
    el.invalidPlacement = !res.valid
    if (!res.valid) {
      toast.showError(errorsPlacement[res.reason] || res.reason)
      if (el.start) {
        const { x, y, width, height } = el.start
        const payload = {}
        if (x !== undefined) payload.x = x
        if (y !== undefined) payload.y = y
        if (width !== undefined) payload.width = width
        if (height !== undefined) payload.height = height
        store.actualizarElemento(el.id, payload)
        return { ...res, corrected: el.start }
      }
    }
    return res
  }

  const onDragEndGuard = (el) => handleEnd(el)
  const onTransformEndGuard = (el) => handleEnd(el)

  return { onDragMoveGuard, onDragEndGuard, onTransformEndGuard }
}

export default usePlacementGuards
