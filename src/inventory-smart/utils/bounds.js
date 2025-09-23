import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { clampRectToRect } from '@/inventory-smart/utils/geometry'
import { clampRectToPolygon, clampCircleToPolygon, clampCircleToPolygonSmooth } from '@/inventory-smart/utils/polygonBounds'

// Returns width/height in centimeters for an element.
// Rectangular elements use dimensiones.ancho × dimensiones.largo/prof.
// Circular elements use diametro (or ancho/largo fallbacks).
export function dimsCmFor(el = {}, vista = 'XY') {
  const dims = el.dimensiones || {}
  if (el.forma === 'circular') {
    const d = el.diametroCm || dims.diametro || dims.ancho || dims.largo || Math.max(el.width || 0, el.height || 0) / CM_TO_PX
    return { w_cm: d, h_cm: d }
  }

  const fallbackWidthCm = (el.width || 0) / CM_TO_PX
  const fallbackHeightCm = (el.height || 0) / CM_TO_PX
  const w = dims.ancho != null ? dims.ancho : fallbackWidthCm

  // Seleccionar la dimensión vertical adecuada según la vista:
  // - En vista XY (planta) la dimensión vertical corresponde a 'largo' (o 'prof')
  // - En vista XZ (frontal) la dimensión vertical corresponde a 'alto' (o 'prof')
  let h
  if (vista === 'XZ') {
    if (dims.alto != null) h = dims.alto
    else if (dims.prof != null) h = dims.prof
    else if (dims.largo != null) h = dims.largo
    else h = fallbackHeightCm
  } else {
    if (dims.prof != null) h = dims.prof
    else if (dims.largo != null) h = dims.largo
    else h = fallbackHeightCm
  }

  return { w_cm: w, h_cm: h }
}

// Clamp rectangle (x,y,w,h) inside active area boundary.
// Para elementos circulares, el parámetro element debe incluir la información de forma.
// useSmooth: true para usar clamp suave durante el drag (evita saltos)
export function clampInsideArea(x, y, w, h, boundary, element = null, useSmooth = false, previousPos = null) {
  if (boundary?.isInfinite === true || boundary?.points?._isInfinite === true) {
    return { x, y }
  }
  const mode = boundary?.mode ?? 'fixed'
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

  const W = boundary?.width ?? boundary?.W ?? boundary?.maxX ?? 0
  const H = boundary?.height ?? boundary?.H ?? boundary?.maxY ?? 0
  const c = clampRectToRect(x, y, w, h, W, H)
  return { x: c.x, y: c.y }
}
