// Geometry and containment helpers for 2D canvas (XY view)
// Units: use canvas world units (same as layer coordinates, pixels tied to cm in UI)

export const EPSILON = 1e-6

// Basic math helpers
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
export const approxEqual = (a, b, eps = EPSILON) => Math.abs(a - b) <= eps

// Grid snapping
export const snapToGrid = (x, y, gridSize = 50) => {
  const sx = Math.round(x / gridSize) * gridSize
  const sy = Math.round(y / gridSize) * gridSize
  return { x: sx, y: sy }
}

// Point in polygon (ray casting), supports concave polygons
export const pointInPolygon = (pt, polygon) => {
  const { x, y } = pt
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y
    const xj = polygon[j].x,
      yj = polygon[j].y
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// Segment intersection
export const segmentsIntersect = (p1, p2, p3, p4) => {
  const r = { x: p2.x - p1.x, y: p2.y - p1.y }
  const s = { x: p4.x - p3.x, y: p4.y - p3.y }
  const rxs = r.x * s.y - r.y * s.x
  const qpxr = (p3.x - p1.x) * r.y - (p3.y - p1.y) * r.x
  if (approxEqual(rxs, 0)) {
    if (approxEqual(qpxr, 0)) {
      // Colinear: check overlap on t in [0,1]
      const rDotr = r.x * r.x + r.y * r.y || EPSILON
      const t0 = ((p3.x - p1.x) * r.x + (p3.y - p1.y) * r.y) / rDotr
      const t1 = t0 + (s.x * r.x + s.y * r.y) / rDotr
      return Math.max(Math.min(t0, t1), 0) <= Math.min(Math.max(t0, t1), 1)
    }
    return false
  }
  const t = ((p3.x - p1.x) * s.y - (p3.y - p1.y) * s.x) / rxs
  const u = ((p3.x - p1.x) * r.y - (p3.y - p1.y) * r.x) / rxs
  return t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON
}

export const rectCorners = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
]

export const polygonEdges = (poly) => {
  const edges = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    edges.push([a, b])
  }
  return edges
}

// Check if rectangle (axis-aligned) fully inside polygon
export const rectInsidePolygon = (x, y, w, h, polygon) => {
  // console.log('Checking rect inside polygon:', { x, y, w, h, polygon })
  const corners = rectCorners(x, y, w, h)
  // All corners inside
  const allInside = corners.every((c) => pointInPolygon(c, polygon))
  if (!allInside) return false
  // No edge intersections between rect edges and polygon edges
  const rectEdges = polygonEdges(corners)
  const polyEdges = polygonEdges(polygon)
  for (const [a, b] of rectEdges) {
    for (const [c, d] of polyEdges) {
      if (segmentsIntersect(a, b, c, d)) return false
    }
  }
  return true
}

// Check if circle fully inside polygon
export const circleInsidePolygon = (cx, cy, r, polygon) => {
  if (!pointInPolygon({ x: cx, y: cy }, polygon)) return false
  // Distance from center to each edge must be >= r
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const dist = pointLineDistance(cx, cy, a.x, a.y, b.x, b.y)
    if (dist < r - EPSILON) return false
  }
  return true
}

// Point-line distance (segment)
export const pointLineDistance = (px, py, x1, y1, x2, y2) => {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  if (lenSq !== 0) param = dot / lenSq
  let xx, yy
  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }
  const dx = px - xx
  const dy = py - yy
  return Math.hypot(dx, dy)
}

// Rect containment within rectangular boundary (0..W,0..H)
export const rectWithinRect = (x, y, w, h, W, H) => {
  return x >= -EPSILON && y >= -EPSILON && x + w <= W + EPSILON && y + h <= H + EPSILON
}

// Clamp rectangle top-left inside rectangular boundary
export const clampRectToRect = (x, y, w, h, W, H) => {
  const nx = clamp(x, 0, Math.max(0, W - w))
  const ny = clamp(y, 0, Math.max(0, H - h))
  return { x: nx, y: ny }
}

// Alias explicit for clarity in API
export const clampInsideRect = (x, y, w, h, W, H) => clampRectToRect(x, y, w, h, W, H)

// Center+radius containment within rectangular boundary
export const circleWithinRect = (cx, cy, r, W, H) => {
  return cx - r >= -EPSILON && cy - r >= -EPSILON && cx + r <= W + EPSILON && cy + r <= H + EPSILON
}

export const clampCircleToRect = (cx, cy, r, W, H) => {
  const nx = clamp(cx, r, Math.max(r, W - r))
  const ny = clamp(cy, r, Math.max(r, H - r))
  return { x: nx, y: ny }
}

// Generic element containment helpers
export const isRectElementInsideBoundary = (elem, boundary) => {
  const { x, y, width, height } = elem
  if (boundary.type === 'rect') {
    return rectWithinRect(x, y, width, height, boundary.W, boundary.H)
  }
  if (boundary.type === 'polygon') {
    return rectInsidePolygon(x, y, width, height, boundary.points)
  }
  return true
}

export const isCircleElementInsideBoundary = (elem, boundary) => {
  const { cx, cy, radius } = elem
  if (boundary.type === 'rect') {
    return circleWithinRect(cx, cy, radius, boundary.W, boundary.H)
  }
  if (boundary.type === 'polygon') {
    return circleInsidePolygon(cx, cy, radius, boundary.points)
  }
  return true
}

// Attempt basic snap inside boundary
export const snapRectElementInside = (elem, boundary, gridSize = null) => {
  if (boundary.type === 'rect') {
    // Optional grid snap before clamping
    let nx = elem.x
    let ny = elem.y
    if (gridSize) {
      const s = snapToGrid(nx, ny, gridSize)
      nx = s.x
      ny = s.y
    }
    return clampRectToRect(nx, ny, elem.width, elem.height, boundary.W, boundary.H)
  }
  // For polygons, snapping is non-trivial; return null to signal unsupported
  return null
}

export const snapCircleElementInside = (elem, boundary, gridSize = null) => {
  if (boundary.type === 'rect') {
    let cx = elem.cx
    let cy = elem.cy
    if (gridSize) {
      const s = snapToGrid(cx, cy, gridSize)
      cx = s.x
      cy = s.y
    }
    return clampCircleToRect(cx, cy, elem.radius, boundary.W, boundary.H)
  }
  return null
}

// === New helpers ===
// Check if an axis-aligned bounding box is fully inside a polygon boundary
export const isBBoxInsidePolygon = (x, y, w, h, polygon) => rectInsidePolygon(x, y, w, h, polygon)

// Compute bounded position for a rectangle element drag with optional snap-to-edge
// Returns { x, y, atEdge, snapped, inside }
export const boundedRectDrag = (candidateX, candidateY, w, h, boundary, snapEps = 0) => {
  if (boundary.type === 'rect') {
    // Clamp to rect
    const clamped = clampRectToRect(candidateX, candidateY, w, h, boundary.W, boundary.H)
    let x = clamped.x
    let y = clamped.y
    // Snap to near edges if within epsilon
    let atEdge = false
    let snapped = false
    if (snapEps > 0) {
      const toLeft = Math.abs(x)
      const toTop = Math.abs(y)
      const toRight = Math.abs(boundary.W - (x + w))
      const toBottom = Math.abs(boundary.H - (y + h))
      if (toLeft <= snapEps) {
        x = 0
        snapped = true
      }
      if (toTop <= snapEps) {
        y = 0
        snapped = true
      }
      if (toRight <= snapEps) {
        x = boundary.W - w
        snapped = true
      }
      if (toBottom <= snapEps) {
        y = boundary.H - h
        snapped = true
      }
      atEdge = toLeft <= snapEps || toTop <= snapEps || toRight <= snapEps || toBottom <= snapEps
    }
    const inside = rectWithinRect(x, y, w, h, boundary.W, boundary.H)
    return { x, y, atEdge, snapped, inside }
  }
  if (boundary.type === 'polygon') {
    const inside = rectInsidePolygon(candidateX, candidateY, w, h, boundary.points)
    return { x: candidateX, y: candidateY, atEdge: false, snapped: false, inside }
  }
  return { x: candidateX, y: candidateY, atEdge: false, snapped: false, inside: true }
}

// Detecta si dos AABB están en contacto exacto en X o Y (bordes coinciden) con solape en el eje ortogonal
export const aabbTouchingAxes = (ax, ay, aw, ah, bx, by, bw, bh, eps = EPSILON) => {
  const aRight = ax + aw
  const aBottom = ay + ah
  const bRight = bx + bw
  const bBottom = by + bh

  // Solape en Y para contacto por X
  const overlapY = !(aBottom <= by + eps || bBottom <= ay + eps)
  // Solape en X para contacto por Y
  const overlapX = !(aRight <= bx + eps || bRight <= ax + eps)

  const touchX = overlapY && (approxEqual(aRight, bx, eps) || approxEqual(bRight, ax, eps))
  const touchY = overlapX && (approxEqual(aBottom, by, eps) || approxEqual(bBottom, ay, eps))
  return { touchX, touchY }
}

// Snap-to-grid que preserva ejes en contacto con vecinos para no abrir margen
export const safeSnapRect = (
  x,
  y,
  w,
  h,
  boundaryRect,
  neighbors = [],
  gridSize = 50,
  eps = EPSILON,
  axes = { snapX: true, snapY: true },
  gridEps = 6,
) => {
  const { W, H } = boundaryRect
  // Detectar si hay contacto en X/Y con algún vecino
  let preserveX = false
  let preserveY = false
  for (const n of neighbors) {
    const { touchX, touchY } = aabbTouchingAxes(x, y, w, h, n.x, n.y, n.width, n.height, eps)
    preserveX = preserveX || touchX
    preserveY = preserveY || touchY
    if (preserveX && preserveY) break
  }

  const snapped = snapToGrid(x, y, gridSize)
  const nearX = Math.abs(snapped.x - x) <= gridEps
  const nearY = Math.abs(snapped.y - y) <= gridEps

  let nx = preserveX ? x : axes?.snapX && nearX ? snapped.x : x
  let ny = preserveY ? y : axes?.snapY && nearY ? snapped.y : y

  // Clamp final y validar que no se alteró el eje preservado
  const c = clampRectToRect(nx, ny, w, h, W, H)
  // Si clamp modificó un eje preservado, mantener original
  if (preserveX && !approxEqual(c.x, x, eps)) {
    nx = x
  } else {
    nx = c.x
  }
  if (preserveY && !approxEqual(c.y, y, eps)) {
    ny = y
  } else {
    ny = c.y
  }

  return { x: nx, y: ny }
}

// Nudge placement: búsqueda en espiral para encontrar posición válida
export const nudgePlace = (
  x,
  y,
  width,
  height,
  boundary,
  allElements,
  elementToPlace,
  gridSize = 20,
  maxAttempts = 16,
  detectConflictsFn = null, // Función para detectar conflictos pasada como parámetro
) => {
  // Función auxiliar para verificar si una posición es válida
  const isValidPosition = (testX, testY) => {
    // Verificar que esté dentro del área
    if (boundary.type === 'rect') {
      if (testX < 0 || testY < 0 || testX + width > boundary.W || testY + height > boundary.H) {
        return false
      }
    } else if (boundary.type === 'polygon') {
      if (!rectInsidePolygon(testX, testY, width, height, boundary.points)) {
        return false
      }
    }

    // Solo verificar conflictos si se proporciona la función
    if (detectConflictsFn) {
      // Crear elemento temporal para verificar conflictos
      const tempElement = {
        ...elementToPlace,
        x: testX,
        y: testY,
        width,
        height,
      }

      const conflicts = detectConflictsFn(tempElement, allElements)
      const blockingConflicts = conflicts.filter((c) => c.bloqueante)

      return blockingConflicts.length === 0
    }

    return true
  }

  // Verificar posición inicial
  if (isValidPosition(x, y)) {
    return { x, y, found: true }
  }

  // Búsqueda en espiral
  for (let radius = 1; radius <= maxAttempts; radius++) {
    const step = gridSize
    const currentRadius = radius * step

    // Generar puntos en espiral
    const spiralPoints = []

    // Arriba
    for (let i = -radius; i <= radius; i++) {
      spiralPoints.push({ x: x + i * step, y: y - currentRadius })
    }
    // Derecha
    for (let i = -radius + 1; i <= radius; i++) {
      spiralPoints.push({ x: x + currentRadius, y: y + i * step })
    }
    // Abajo
    for (let i = radius - 1; i >= -radius; i--) {
      spiralPoints.push({ x: x + i * step, y: y + currentRadius })
    }
    // Izquierda
    for (let i = radius - 1; i >= -radius + 1; i--) {
      spiralPoints.push({ x: x - currentRadius, y: y + i * step })
    }

    // Probar cada punto en esta distancia
    for (const point of spiralPoints) {
      if (isValidPosition(point.x, point.y)) {
        return { x: point.x, y: point.y, found: true }
      }
    }
  }

  return { x, y, found: false }
}
