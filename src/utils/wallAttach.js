import { clamp } from './geometry'

export function nearestWallPoint(poly, p) {
  if (!Array.isArray(poly) || poly.length < 2) return { point: { ...p }, dist: 0, segmentIndex: -1 }
  let best = null
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const abLenSq = abx * abx + aby * aby || 1
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / abLenSq
    t = clamp(t, 0, 1)
    const proj = { x: a.x + t * abx, y: a.y + t * aby }
    const dx = p.x - proj.x
    const dy = p.y - proj.y
    const dist = Math.hypot(dx, dy)
    if (!best || dist < best.dist) {
      best = { point: proj, dist, segmentIndex: i }
    }
  }
  return best || { point: { ...p }, dist: 0, segmentIndex: -1 }
}

export function attachToWall(pos, size, poly) {
  const center = { x: pos.x + size.width / 2, y: pos.y + size.height / 2 }
  const { point } = nearestWallPoint(poly, center)
  const dx = center.x - point.x
  const dy = center.y - point.y
  const len = Math.hypot(dx, dy) || 1
  const nx = dx / len
  const ny = dy / len
  const offset = Math.abs(nx) > Math.abs(ny) ? size.width / 2 : size.height / 2
  const newCenter = { x: point.x + nx * offset, y: point.y + ny * offset }
  return { x: newCenter.x - size.width / 2, y: newCenter.y - size.height / 2 }
}

export default { nearestWallPoint, attachToWall }
