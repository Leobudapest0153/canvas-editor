// Utility functions for polygonal bounds operations
// pointInPolygon(pt, poly): pt {x,y}, poly array of {x,y}
// nearestPointOnSegment(p,a,b): p {x,y} to segment ab {x,y}
// clampPointToPolygon(p, poly): project point p to nearest point on polygon
// clampRectToPolygon(rect, poly): rect {x,y,width,height}

export function pointInPolygon(pt, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const intersect = (yi > pt.y) !== (yj > pt.y) &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function nearestPointOnSegment(p, a, b) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby)
  const clampedT = Math.max(0, Math.min(1, t))
  return { x: a.x + abx * clampedT, y: a.y + aby * clampedT }
}

export function clampPointToPolygon(p, poly) {
  if (pointInPolygon(p, poly)) return { ...p }
  let closest = null
  let minDist = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const q = nearestPointOnSegment(p, a, b)
    const dx = p.x - q.x
    const dy = p.y - q.y
    const dist = dx * dx + dy * dy
    if (dist < minDist) {
      minDist = dist
      closest = q
    }
  }
  return closest || { ...p }
}

export function clampRectToPolygon(rect, poly) {
  const { x, y, width, height } = rect
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ]
  let maxDx = 0
  let maxDy = 0
  let changed = false
  for (const c of corners) {
    const q = clampPointToPolygon(c, poly)
    const dx = q.x - c.x
    const dy = q.y - c.y
    if (dx !== 0 || dy !== 0) {
      changed = true
      if (Math.abs(dx) > Math.abs(maxDx)) maxDx = dx
      if (Math.abs(dy) > Math.abs(maxDy)) maxDy = dy
    }
  }
  if (!changed) return { x, y, width, height }
  return { x: x + maxDx, y: y + maxDy, width, height }
}
