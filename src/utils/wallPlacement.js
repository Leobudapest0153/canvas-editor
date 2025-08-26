import { attachToWall as attachHelper } from './wallAttach.js'

function rectsOverlap(aPos, aSize, bPos, bSize, eps = 0) {
  return !(
    aPos.x + aSize.width <= bPos.x + eps ||
    bPos.x + bSize.width <= aPos.x + eps ||
    aPos.y + aSize.height <= bPos.y + eps ||
    bPos.y + bSize.height <= aPos.y + eps
  )
}

/**
 * Valida la colocación de un elemento de pared en el plano.
 * @param {Object} params
 */
export function isWallPlacementValid({
  posXY,
  size,
  plantaPoly,
  bodegaAltura,
  el,
  vecinos = [],
  eps = 0.5,
}) {
  if (!posXY || !size || !plantaPoly || !el) return false
  const snapped = attachHelper(posXY, size, plantaPoly)
  const dist = Math.hypot(snapped.x - posXY.x, snapped.y - posXY.y)
  if (dist > eps) return false

  const zBase = el.elevacion?.zBase || 0
  const zTop = zBase + (el.elevacion?.altura || 0)
  if (Number.isFinite(bodegaAltura) && zTop > bodegaAltura + eps) return false

  for (const v of vecinos) {
    if (!rectsOverlap(posXY, size, { x: v.x, y: v.y }, { width: v.width, height: v.height }, eps)) continue
    const vzBase = v.elevacion?.zBase || 0
    const vzTop = vzBase + (v.elevacion?.altura || 0)
    const zEps = Math.max(el.tolerancias?.zEpsilon ?? eps, v.tolerancias?.zEpsilon ?? eps)
    if (v.ubicacion === 'pared') {
      const overlapZ = zBase < vzTop - zEps && vzBase < zTop - zEps
      if (overlapZ) return false
    } else if (v.ubicacion === 'suelo') {
      const floorTop = vzTop
      if (zBase < floorTop + zEps) return false
    }
  }

  return true
}

export default { isWallPlacementValid }
