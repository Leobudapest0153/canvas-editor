export function pointInPolygon(pt, poly) {
  const x = pt.x ?? pt[0]
  const y = pt.y ?? pt[1]
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x ?? poly[i][0]
    const yi = poly[i].y ?? poly[i][1]
    const xj = poly[j].x ?? poly[j][0]
    const yj = poly[j].y ?? poly[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi
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
    { x: rect.x, y: rect.y + rect.height },
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

// Nueva función para validar si un círculo está dentro de un polígono
export function circleInPolygon(circle, poly) {
  const { x, y, radius } = circle

  // Verificar que el centro del círculo esté dentro del polígono
  if (!pointInPolygon({ x, y }, poly)) {
    return false
  }

  // Verificar que no haya intersección entre el círculo y ningún borde del polígono
  // Usamos una tolerancia pequeña para evitar problemas de precisión flotante
  const tolerance = 0.1

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]

    // Calcular la distancia del centro del círculo a la línea del borde
    const distanceToSegment = distancePointToSegment({ x, y }, a, b)

    // Si la distancia es menor que el radio (menos tolerancia), el círculo intersecta con el borde
    if (distanceToSegment < radius - tolerance) {
      return false
    }
  }

  return true
}

// Helper para verificar si un rectángulo está completamente dentro del polígono
// Usa intersección de segmentos para detectar si algún borde del rectángulo cruza el polígono
export const isRectCompletelyInPolygon = (x, y, width, height, polygon) => {
  // 1. Verificar que todas las esquinas estén dentro
  const corners = [
    { x, y, label: 'top-left' },
    { x: x + width, y, label: 'top-right' },
    { x: x + width, y: y + height, label: 'bottom-right' },
    { x, y: y + height, label: 'bottom-left' },
  ]

  for (const corner of corners) {
    const isInside = pointInPolygon(corner, polygon)
    if (!isInside) {
      return false
    }
  }

  // 2. Verificar que ningún borde del rectángulo intersecte con los bordes del polígono
  const rectEdges = [
    { start: { x, y }, end: { x: x + width, y }, label: 'top' },
    { start: { x: x + width, y }, end: { x: x + width, y: y + height }, label: 'right' },
    { start: { x: x + width, y: y + height }, end: { x, y: y + height }, label: 'bottom' },
    { start: { x, y: y + height }, end: { x, y }, label: 'left' },
  ]

  // Función para verificar intersección entre dos segmentos de línea
  const doLinesIntersect = (line1Start, line1End, line2Start, line2End) => {
    const x1 = line1Start.x,
      y1 = line1Start.y
    const x2 = line1End.x,
      y2 = line1End.y
    const x3 = line2Start.x,
      y3 = line2Start.y
    const x4 = line2End.x,
      y4 = line2End.y

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 1e-10) return false // Líneas paralelas

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  }

  // Verificar intersecciones con cada borde del polígono
  for (let i = 0; i < polygon.length; i++) {
    const polyStart = polygon[i]
    const polyEnd = polygon[(i + 1) % polygon.length]

    for (const rectEdge of rectEdges) {
      if (doLinesIntersect(rectEdge.start, rectEdge.end, polyStart, polyEnd)) {
        return false
      }
    }
  }

  // 3. Verificar puntos internos densos (especialmente cerca de ángulos)
  const INTERNAL_SAMPLES = 20
  for (let i = 1; i < INTERNAL_SAMPLES; i++) {
    for (let j = 1; j < INTERNAL_SAMPLES; j++) {
      const internalPoint = {
        x: x + (width * i) / INTERNAL_SAMPLES,
        y: y + (height * j) / INTERNAL_SAMPLES,
        label: `internal-${i}-${j}`,
      }
      const isInside = pointInPolygon(internalPoint, polygon)
      if (!isInside) {
        return false
      }
    }
  }

  // 4. Verificar puntos adicionales muy cerca de los bordes (para capturar ángulos)
  const EDGE_SAMPLES = 25
  const EDGE_OFFSET = 2 // píxeles hacia adentro desde el borde

  // Puntos cerca del borde superior
  for (let i = 0; i <= EDGE_SAMPLES; i++) {
    const t = i / EDGE_SAMPLES
    const point = { x: x + width * t, y: y + EDGE_OFFSET }
    if (!pointInPolygon(point, polygon)) {
      return false
    }
  }

  // Puntos cerca del borde inferior
  for (let i = 0; i <= EDGE_SAMPLES; i++) {
    const t = i / EDGE_SAMPLES
    const point = { x: x + width * t, y: y + height - EDGE_OFFSET }
    if (!pointInPolygon(point, polygon)) {
      return false
    }
  }

  // Puntos cerca del borde izquierdo
  for (let i = 0; i <= EDGE_SAMPLES; i++) {
    const t = i / EDGE_SAMPLES
    const point = { x: x + EDGE_OFFSET, y: y + height * t }
    if (!pointInPolygon(point, polygon)) {
      return false
    }
  }

  // Puntos cerca del borde derecho
  for (let i = 0; i <= EDGE_SAMPLES; i++) {
    const t = i / EDGE_SAMPLES
    const point = { x: x + width - EDGE_OFFSET, y: y + height * t }
    if (!pointInPolygon(point, polygon)) {
      return false
    }
  }

  return true
}

// Función auxiliar para calcular la distancia de un punto a un segmento de línea
function distancePointToSegment(point, segmentStart, segmentEnd) {
  const px = point.x
  const py = point.y
  const ax = segmentStart.x ?? segmentStart[0]
  const ay = segmentStart.y ?? segmentStart[1]
  const bx = segmentEnd.x ?? segmentEnd[0]
  const by = segmentEnd.y ?? segmentEnd[1]

  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay

  const ab2 = abx * abx + aby * aby

  if (ab2 === 0) {
    // El segmento es un punto
    return Math.hypot(px - ax, py - ay)
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
  const projectionX = ax + t * abx
  const projectionY = ay + t * aby

  return Math.hypot(px - projectionX, py - projectionY)
}

// Versión suave de clamp que evita saltos bruscos durante el drag
export function clampCircleToPolygonSmooth(circle, poly, previousPos = null) {
  const { x, y, radius } = circle

  // Si el círculo ya está completamente dentro, no hacer nada
  if (circleInPolygon(circle, poly)) {
    return { x, y }
  }

  // Si tenemos posición previa, intentar hacer movimiento incremental más suave
  if (previousPos) {
    const dx = x - previousPos.x
    const dy = y - previousPos.y
    const movementDistance = Math.hypot(dx, dy)

    // Si el movimiento es muy pequeño, permitir movimiento libre
    if (movementDistance < radius * 0.1) {
      // Para movimientos pequeños, usar corrección mínima
      if (pointInPolygon({ x, y }, poly)) {
        // Centro está dentro, solo verificar si el círculo se sale ligeramente
        let minCorrection = { x: 0, y: 0 }
        let needsCorrection = false

        for (let i = 0; i < poly.length; i++) {
          const a = poly[i]
          const b = poly[(i + 1) % poly.length]
          const distance = distancePointToSegment({ x, y }, a, b)

          if (distance < radius) {
            needsCorrection = true
            // Calcular vector normal hacia adentro del segmento
            const segmentLength = Math.hypot(b.x - a.x, b.y - a.y)
            if (segmentLength > 0) {
              const normalX = -(b.y - a.y) / segmentLength
              const normalY = (b.x - a.x) / segmentLength

              // Mover solo lo mínimo necesario
              const pushDistance = radius - distance + 0.5
              minCorrection.x = normalX * pushDistance
              minCorrection.y = normalY * pushDistance
              break // Solo tomar la primera corrección
            }
          }
        }

        if (needsCorrection) {
          return { x: x + minCorrection.x, y: y + minCorrection.y }
        }
        return { x, y }
      }
    }

    // Para movimientos más grandes, hacer interpolación suave
    const maxStep = radius * 0.3 // Reducir el paso máximo para más suavidad
    if (movementDistance > maxStep) {
      const steps = Math.ceil(movementDistance / maxStep)
      const stepX = dx / steps
      const stepY = dy / steps

      let currentX = previousPos.x
      let currentY = previousPos.y
      let lastValidX = currentX
      let lastValidY = currentY

      for (let i = 1; i <= steps; i++) {
        currentX = previousPos.x + stepX * i
        currentY = previousPos.y + stepY * i

        const testCircle = { x: currentX, y: currentY, radius }
        if (circleInPolygon(testCircle, poly)) {
          lastValidX = currentX
          lastValidY = currentY
        } else {
          // Se salió, retornar la última posición válida
          return { x: lastValidX, y: lastValidY }
        }
      }

      return { x: currentX, y: currentY }
    }
  }

  // Si no hay posición previa o el movimiento es manejable, usar clamp regular pero con menos agresividad
  return clampCircleToPolygon(circle, poly)
}

// Nueva función para ajustar (clamp) un círculo dentro de un polígono de forma fluida
export function clampCircleToPolygon(circle, poly) {
  const { x, y, radius } = circle

  // Si el círculo ya está completamente dentro, no hacer nada
  if (circleInPolygon(circle, poly)) {
    return { x, y }
  }

  // Si el centro está dentro pero el círculo se sale, hacer un ajuste mínimo
  if (pointInPolygon({ x, y }, poly)) {
    // Encontrar la distancia mínima del centro a cualquier borde
    let minDistance = Infinity
    let bestOffset = { x: 0, y: 0 }

    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]

      const distance = distancePointToSegment({ x, y }, a, b)

      if (distance < radius && distance < minDistance) {
        minDistance = distance

        // Calcular vector normal hacia adentro del polígono
        const segmentLength = Math.hypot(b.x - a.x, b.y - a.y)
        if (segmentLength > 0) {
          const normalX = -(b.y - a.y) / segmentLength
          const normalY = (b.x - a.x) / segmentLength

          // Mover solo lo necesario para que el círculo no se salga
          const pushDistance = radius - distance + 1 // +1 para pequeño margen
          bestOffset = {
            x: normalX * pushDistance,
            y: normalY * pushDistance,
          }
        }
      }
    }

    return { x: x + bestOffset.x, y: y + bestOffset.y }
  }

  // Si el centro está fuera, encontrar la posición más cercana válida
  // pero limitando el movimiento para mantener fluidez
  const maxMoveDistance = radius * 2 // Limitar cuánto puede moverse de una vez

  let bestPos = { x, y }
  let bestDistance = Infinity

  // Intentar puntos alrededor del borde del polígono
  const samplePoints = 16 // Reducir muestras para mejor rendimiento
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]

    // Muestrear puntos a lo largo del segmento
    for (let j = 0; j <= samplePoints; j++) {
      const t = j / samplePoints
      const segmentX = a.x + t * (b.x - a.x)
      const segmentY = a.y + t * (b.y - a.y)

      // Calcular normal hacia adentro
      const segmentLength = Math.hypot(b.x - a.x, b.y - a.y)
      if (segmentLength === 0) continue

      const normalX = -(b.y - a.y) / segmentLength
      const normalY = (b.x - a.x) / segmentLength

      // Posición candidata (centro del círculo)
      const candidateX = segmentX + normalX * radius
      const candidateY = segmentY + normalY * radius

      // Verificar si esta posición está dentro del polígono y es válida
      if (pointInPolygon({ x: candidateX, y: candidateY }, poly)) {
        const distance = Math.hypot(candidateX - x, candidateY - y)

        // Solo considerar si el movimiento no es demasiado brusco
        if (distance <= maxMoveDistance && distance < bestDistance) {
          bestDistance = distance
          bestPos = { x: candidateX, y: candidateY }
        }
      }
    }
  }

  // Si no encontramos una buena posición cercana, hacer movimiento gradual
  if (bestDistance === Infinity || bestDistance > maxMoveDistance) {
    // Mover gradualmente hacia el centroide del polígono
    const centroid = calculatePolygonCentroid(poly)
    const directionX = centroid.x - x
    const directionY = centroid.y - y
    const directionLength = Math.hypot(directionX, directionY)

    if (directionLength > 0) {
      const normalizedX = directionX / directionLength
      const normalizedY = directionY / directionLength

      // Mover una distancia limitada hacia el centroide
      const moveDistance = Math.min(maxMoveDistance, directionLength)
      bestPos = {
        x: x + normalizedX * moveDistance,
        y: y + normalizedY * moveDistance,
      }
    }
  }

  return bestPos
}

// Función auxiliar para calcular el centroide de un polígono
function calculatePolygonCentroid(poly) {
  let area = 0
  let centroidX = 0
  let centroidY = 0

  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y

    const a = xi * yj - xj * yi
    area += a
    centroidX += (xi + xj) * a
    centroidY += (yi + yj) * a
  }

  area *= 0.5
  if (Math.abs(area) < 1e-10) {
    // Polígono degenerado, usar promedio simple
    const sumX = poly.reduce((sum, p) => sum + p.x, 0)
    const sumY = poly.reduce((sum, p) => sum + p.y, 0)
    return { x: sumX / poly.length, y: sumY / poly.length }
  }

  centroidX /= 6 * area
  centroidY /= 6 * area

  return { x: centroidX, y: centroidY }
}

// --- Funciones para chequeo estricto de rect dentro de polígono ---
function onSegment(a, b, c) {
  return (
    Math.min(a.x, c.x) <= b.x &&
    b.x <= Math.max(a.x, c.x) &&
    Math.min(a.y, c.y) <= b.y &&
    b.y <= Math.max(a.y, c.y)
  )
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
  return o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0
}

/**
 * Comprueba de forma estricta si un rect (AABB) está completamente dentro de un polígono.
 * Requisitos:
 *  - todas las esquinas dentro (pointInPolygon)
 *  - ninguna arista del polígono cruza el interior del rect (segment intersection)
 *
 * Para elementos circulares, usa geometría circular en lugar de AABB.
 */
export function rectFullyInsidePolygon(rect, poly, isCircular = false) {
  if (!Array.isArray(poly) || poly.length < 3) return false

  // Si es circular, usar validación circular
  if (isCircular) {
    const radius = Math.min(rect.width, rect.height) / 2
    const centerX = rect.x + radius
    const centerY = rect.y + radius
    return circleInPolygon({ x: centerX, y: centerY, radius }, poly)
  }

  const w = rect.width || 0
  const h = rect.height || 0
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + w, y: rect.y },
    { x: rect.x + w, y: rect.y + h },
    { x: rect.x, y: rect.y + h },
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
