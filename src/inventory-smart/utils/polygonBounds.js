export function pointInPolygon(pt, poly) {
  const x = pt.x ?? pt[0]
  const y = pt.y ?? pt[1]
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x ?? poly[i][0]
    const yi = poly[i].y ?? poly[i][1]
    const xj = poly[j].x ?? poly[j][0]
    const yj = poly[j].y ?? poly[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function nearestPointOnSegment(p, a, b) {
  const px = p.x ?? p[0]
  const py = p.y ?? p[1]
  const ax = a.x ?? a[0]
  const ay = a.y ?? a[1]
  const bx = b.x ?? b[0]
  const by = b.y ?? b[1]
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  const t = ab2 === 0 ? 0 : (apx * abx + apy * aby) / ab2
  const clampedT = Math.max(0, Math.min(1, t))
  return { x: ax + abx * clampedT, y: ay + aby * clampedT }
}

export function clampPointToPolygon(p, poly) {
  if (pointInPolygon(p, poly)) return { x: p.x ?? p[0], y: p.y ?? p[1] }
  let best = { x: 0, y: 0, d: Infinity }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const np = nearestPointOnSegment(p, a, b)
    const dx = (p.x ?? p[0]) - np.x
    const dy = (p.y ?? p[1]) - np.y
    const d = dx * dx + dy * dy
    if (d < best.d) {
      best = { x: np.x, y: np.y, d }
    }
  }
  return { x: best.x, y: best.y }
}

export function clampRectToPolygon(rect, poly) {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ]
  const deltas = []
  for (const c of corners) {
    if (!pointInPolygon(c, poly)) {
      const clamped = clampPointToPolygon(c, poly)
      deltas.push({ dx: clamped.x - c.x, dy: clamped.y - c.y })
    }
  }
  if (deltas.length === 0) return { x: rect.x, y: rect.y }
  // choose largest translation to cover all outside corners
  let best = deltas[0]
  let bestLen = best.dx * best.dx + best.dy * best.dy
  for (const d of deltas.slice(1)) {
    const len = d.dx * d.dx + d.dy * d.dy
    if (len > bestLen) {
      best = d
      bestLen = len
    }
  }
  return { x: rect.x + best.dx, y: rect.y + best.dy }
}
