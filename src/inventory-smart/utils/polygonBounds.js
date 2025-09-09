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

// --- Funciones para chequeo estricto de rect dentro de polígono ---
function onSegment(a, b, c) {
  return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) && Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y)
}

function segmentsIntersect(p1, p2, q1, q2) {
  const orient = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const o1 = orient(p1, p2, q1)
  const o2 = orient(p1, p2, q2)
  const o3 = orient(q1, q2, p1)
  const o4 = orient(q1, q2, p2)
  if (o1 === 0 && onSegment(p1, q1, p2)) return true
  if (o2 === 0 && onSegment(p1, q2, p2)) return true
  if (o3 === 0 && onSegment(q1, p1, q2)) return true
  if (o4 === 0 && onSegment(q1, p2, q2)) return true
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)
}

/**
 * Comprueba de forma estricta si un rect (AABB) está completamente dentro de un polígono.
 * Requisitos:
 *  - todas las esquinas dentro (pointInPolygon)
 *  - ninguna arista del polígono cruza el interior del rect (segment intersection)
 */
export function rectFullyInsidePolygon(rect, poly) {
  if (!Array.isArray(poly) || poly.length < 3) return false
  const w = rect.width || 0
  const h = rect.height || 0
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + w, y: rect.y },
    { x: rect.x + w, y: rect.y + h },
    { x: rect.x, y: rect.y + h }
  ]

  for (const c of corners) {
    if (!pointInPolygon(c, poly)) return false
  }

  const rectEdges = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ]

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    // Si ambos extremos del segmento del polígono caen dentro del rect, la frontera pasa por el interior
    const aInRect = a.x >= rect.x && a.x <= rect.x + w && a.y >= rect.y && a.y <= rect.y + h
    const bInRect = b.x >= rect.x && b.x <= rect.x + w && b.y >= rect.y && b.y <= rect.y + h
    if (aInRect && bInRect) return false
    for (const [r1, r2] of rectEdges) {
      if (segmentsIntersect(a, b, r1, r2)) return false
    }
  }

  return true
}
