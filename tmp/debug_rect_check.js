function pointInPolygon(pt, poly) {
  const x = pt.x ?? pt[0]
  const y = pt.y ?? pt[1]
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x ?? poly[i][0]
    const yi = poly[i].y ?? poly[i][1]
    const xj = poly[j].x ?? poly[j][0]
    const yj = poly[j].y ?? poly[j][1]
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

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

function rectFullyInsidePolygon(rect, poly) {
  if (!Array.isArray(poly) || poly.length < 3) return false
  const w = rect.width || 0
  const h = rect.height || 0
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + w, y: rect.y },
    { x: rect.x + w, y: rect.y + h },
    { x: rect.x, y: rect.y + h }
  ]

  const cornerResults = corners.map(c => ({ c, inside: pointInPolygon(c, poly) }))

  // 1) Todas las esquinas deben estar dentro
  const allInside = cornerResults.every(r => r.inside)

  // 2) Ninguna arista del polígono puede cruzar el interior del rect
  const rectEdges = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ]

  let crossing = false
  let crossingEdge = null
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const aInRect = a.x >= rect.x && a.x <= rect.x + w && a.y >= rect.y && a.y <= rect.y + h
    const bInRect = b.x >= rect.x && b.x <= rect.x + w && b.y >= rect.y && b.y <= rect.y + h
    if (aInRect && bInRect) {
      crossing = true
      crossingEdge = { a, b, reason: 'both endpoints inside rect' }
      break
    }
    for (const [r1, r2] of rectEdges) {
      if (segmentsIntersect(a, b, r1, r2)) {
        crossing = true
        crossingEdge = { a, b, r1, r2 }
        break
      }
    }
    if (crossing) break
  }

  return { allInside, cornerResults, crossing, crossingEdge }
}

const poly = [
  { x:0,y:0 },
  { x:5000,y:0 },
  { x:5000,y:3897 },
  { x:2473,y:3252 },
  { x:5000,y:5000 },
  { x:0,y:5000 }
]

const elem = { x:2504.2891336795446, y:3236.347616054419, width:1000, height:1000 }

const res = rectFullyInsidePolygon(elem, poly)
console.log('Corners inside? ', res.allInside)
res.cornerResults.forEach((r, i) => console.log(`corner ${i}: ${r.c.x},${r.c.y} inside=${r.inside}`))
console.log('crossing? ', res.crossing)
if (res.crossing) console.log('crossingEdge:', res.crossingEdge)
