
// Utilidades geométricas para polígonos y figuras 2D
// Unidades: en px del lienzo. Para m² usamos un factor de escala configurable

export function polygonArea(points) {
  // Fórmula del zapatero (shoelace). Devuelve área en px^2 positiva.
  if (!Array.isArray(points) || points.length < 3) return 0
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const p1 = points[j]
    const p2 = points[i]
    sum += (p1.x * p2.y - p2.x * p1.y)
  }
  return Math.abs(sum / 2)
}

export function pointInPolygon(point, polygon) {
  // Algoritmo ray casting
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 1e-9) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function rectCorners(x, y, w, h) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
}

export function circleSamplePoints(cx, cy, r, samples = 12) {
  const pts = []
  for (let i = 0; i < samples; i++) {
    const ang = (i / samples) * Math.PI * 2
    pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })
  }
  return pts
}

export function isRectInsidePolygon(x, y, w, h, polygon) {
  const corners = rectCorners(x, y, w, h)
  return corners.every(p => pointInPolygon(p, polygon))
}

export function isCircleInsidePolygon(cx, cy, r, polygon) {
  // Aprox: muestrear varios puntos de la circunferencia
  const pts = circleSamplePoints(cx, cy, r, 16)
  return pts.every(p => pointInPolygon(p, polygon))
}

export function metersSquaredFromPxSquared(px2, pixelsPerUnit, unit = 'm') {
  // Convierte px^2 a m^2 basado en pixeles por unidad (m o cm)
  const ppu = Number(pixelsPerUnit || 100)
  if (ppu <= 0) return 0
  // 1 unidad^2 = (1/ppu)^2 px^2 => px^2 / (ppu^2) unidades^2
  let units2 = px2 / (ppu * ppu)
  if (unit === 'cm') {
    // 1 cm^2 = 0.0001 m^2
    return units2 * 0.0001
  }
  // unit === 'm'
  return units2
}

