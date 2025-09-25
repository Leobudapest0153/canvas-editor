import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { clampRectToRect } from '@/inventory-smart/utils/geometry'
import { clampRectToPolygon, clampCircleToPolygon, clampCircleToPolygonSmooth } from '@/inventory-smart/utils/polygonBounds'

const toFiniteNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

export function boundaryToAreaBounds(boundary, fallback = {}) {
  const fallbackMinX = toFiniteNumber(fallback.minX) ?? 0
  const fallbackMinY = toFiniteNumber(fallback.minY) ?? 0
  const fallbackMaxX = toFiniteNumber(fallback.maxX) ?? fallbackMinX
  const fallbackMaxY = toFiniteNumber(fallback.maxY) ?? fallbackMinY
  const fallbackMode = fallback.mode ?? 'fixed'
  const fallbackPolygon = fallback.polygon ?? null

  if (!boundary || typeof boundary !== 'object') {
    return {
      minX: fallbackMinX,
      minY: fallbackMinY,
      maxX: Math.max(fallbackMinX, fallbackMaxX),
      maxY: Math.max(fallbackMinY, fallbackMaxY),
      mode: fallbackMode,
      polygon: fallbackPolygon,
    }
  }

  const baseMinX = toFiniteNumber(boundary.minX ?? boundary.x)
  const baseMinY = toFiniteNumber(boundary.minY ?? boundary.y)
  const minX = baseMinX ?? fallbackMinX
  const minY = baseMinY ?? fallbackMinY

  const rawMaxX = toFiniteNumber(boundary.maxX)
  const rawMaxY = toFiniteNumber(boundary.maxY)

  const width = toFiniteNumber(boundary.width) ?? toFiniteNumber(boundary.W)
  const height = toFiniteNumber(boundary.height) ?? toFiniteNumber(boundary.H)

  const maxX = rawMaxX ?? (Number.isFinite(width) ? minX + Math.max(0, width) : fallbackMaxX)
  const maxY = rawMaxY ?? (Number.isFinite(height) ? minY + Math.max(0, height) : fallbackMaxY)

  const polygon = Array.isArray(boundary.points)
    ? boundary.points
    : Array.isArray(boundary.polygon)
      ? boundary.polygon
      : fallbackPolygon

  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
    mode: boundary.mode ?? fallbackMode,
    polygon,
  }
}

// Returns width/height in centimeters for an element.
// Rectangular elements use dimensiones.ancho × dimensiones.largo/prof.
// Circular elements use diametro (or ancho/largo fallbacks).
export function dimsCmFor(el = {}, vista = 'XY') {
  const dims = el.dimensiones || {}
  if (el.forma === 'circular') {
    const d = el.diametroCm || dims.diametro || dims.ancho || dims.largo || Math.max(el.width || 0, el.height || 0) / CM_TO_PX
    return { w_cm: d, h_cm: d }
  }

  const w = dims.ancho != null ? dims.ancho : (el.width || 0) / CM_TO_PX

  // Seleccionar la dimensión vertical adecuada según la vista:
  // - En vista XY (planta) la dimensión vertical corresponde a 'largo' (o 'prof')
  // - En vista XZ (frontal) la dimensión vertical corresponde a 'alto' (o 'prof')
  let h
  if (vista === 'XZ') {
    h = dims.alto != null ? dims.alto : dims.prof != null ? dims.prof : dims.largo != null ? dims.largo : (el.height || 0) / CM_TO_PX
  } else {
    h = dims.prof != null ? dims.prof : dims.largo != null ? dims.largo : (el.height || 0) / CM_TO_PX
  }

  return { w_cm: w, h_cm: h }
}

// Clamp rectangle (x,y,w,h) inside active area boundary.
// Para elementos circulares, el parámetro element debe incluir la información de forma.
// useSmooth: true para usar clamp suave durante el drag (evita saltos)
export function clampInsideArea(x, y, w, h, boundary, element = null, useSmooth = false, previousPos = null) {
  const area = boundaryToAreaBounds(boundary)
  const mode = area.mode ?? 'fixed'
  const shouldClamp = mode !== 'elastic'

  if (boundary?.type === 'polygon') {
    if (!shouldClamp) {
      return { x, y }
    }
    // Para elementos circulares, usar clamp circular
    if (element?.forma === 'circular') {
      const radius = Math.min(w, h) / 2
      const centerX = x + radius
      const centerY = y + radius

      let clampedCenter
      if (useSmooth && previousPos) {
        const previousCenter = { x: previousPos.x + radius, y: previousPos.y + radius }
        clampedCenter = clampCircleToPolygonSmooth({ x: centerX, y: centerY, radius }, boundary.inset, previousCenter)
      } else {
        clampedCenter = clampCircleToPolygon({ x: centerX, y: centerY, radius }, boundary.inset)
      }

      return { x: clampedCenter.x - radius, y: clampedCenter.y - radius }
    } else {
      // Para elementos rectangulares, usar clamp rectangular
      const c = clampRectToPolygon({ x, y, width: w, height: h }, boundary.inset)
      return { x: c.x, y: c.y }
    }
  }

  if (!shouldClamp) {
    return { x, y }
  }

  const width = Math.max(0, (area.maxX ?? 0) - (area.minX ?? 0))
  const height = Math.max(0, (area.maxY ?? 0) - (area.minY ?? 0))
  const c = clampRectToRect(x - (area.minX ?? 0), y - (area.minY ?? 0), w, h, width, height)
  return { x: c.x + (area.minX ?? 0), y: c.y + (area.minY ?? 0) }
}
