import { SNAP_EPS } from './constants'
import { nearestWallPoint } from './wallAttach'

function overlapXY(pos, size, other) {
  return !(pos.x + size.width <= other.x || other.x + other.width <= pos.x || pos.y + size.height <= other.y || other.y + other.height <= pos.y)
}

export function isWallPlacementValid({ posXY, size, plantaPoly, bodegaAltura, el, vecinos = [], eps = 0.5, snapPx = SNAP_EPS }) {
  if (!posXY || !size || !plantaPoly || !el) return false
  // a) pegado a pared
  const center = { x: posXY.x + size.width / 2, y: posXY.y + size.height / 2 }
  const { point, dist } = nearestWallPoint(plantaPoly, center)
  const dx = center.x - point.x
  const dy = center.y - point.y
  const len = Math.hypot(dx, dy) || 1
  const nx = dx / len
  const ny = dy / len
  const offset = Math.abs(nx) > Math.abs(ny) ? size.width / 2 : size.height / 2
  const edgeDist = Math.abs(dist - offset)
  if (edgeDist > snapPx + eps) return false

  // b) altura techo
  const elev = el.elevacion || { zBase: 0, altura: 0 }
  const zTop = (elev.zBase || 0) + (elev.altura || 0)
  if (bodegaAltura !== undefined && zTop > bodegaAltura + eps) return false

  const zEpsSelf = el.tolerancias?.zEpsilon ?? eps
  for (const v of vecinos) {
    const vElev = v.elevacion || { zBase: 0, altura: 0 }
    const vZBase = vElev.zBase || 0
    const vZTop = vZBase + (vElev.altura || 0)
    const zEps = Math.max(zEpsSelf, v.tolerancias?.zEpsilon ?? eps)
    if (v.ubicacion === 'pared') {
      if (overlapXY(posXY, size, v)) {
        const zBase = elev.zBase || 0
        if (!(zTop <= vZBase + zEps || vZTop <= zBase + zEps)) return false
      }
    } else if ((v.ubicacion || 'suelo') === 'suelo') {
      if (overlapXY(posXY, size, v)) {
        const zBase = elev.zBase || 0
        const floorTop = vZTop
        if (zBase < floorTop + zEps) return false
      }
    }
  }

  return true
}

export default { isWallPlacementValid }
