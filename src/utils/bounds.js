import { CM_TO_PX } from '@/utils/constants'
import { clampRectToRect } from '@/utils/geometry'
import { clampRectToPolygon } from '@/utils/polygonBounds'

// Returns width/height in centimeters for an element.
// Rectangular elements use dimensiones.ancho × dimensiones.largo/prof.
// Circular elements use diametro (or ancho/largo fallbacks).
export function dimsCmFor(el = {}) {
  const dims = el.dimensiones || {}
  if (el.forma === 'circular') {
    const d = el.diametroCm || dims.diametro || dims.ancho || dims.largo || Math.max(el.width || 0, el.height || 0) / CM_TO_PX
    return { w_cm: d, h_cm: d }
  }
  const w = dims.ancho != null ? dims.ancho : (el.width || 0) / CM_TO_PX
  const h = dims.prof != null ? dims.prof : dims.largo != null ? dims.largo : (el.height || 0) / CM_TO_PX
  return { w_cm: w, h_cm: h }
}

// Clamp rectangle (x,y,w,h) inside active area boundary.
export function clampInsideArea(x, y, w, h, boundary) {
  if (boundary?.type === 'polygon') {
    const c = clampRectToPolygon({ x, y, width: w, height: h }, boundary.inset)
    return { x: c.x, y: c.y }
  }
  const W = boundary?.width ?? boundary?.W ?? boundary?.maxX ?? 0
  const H = boundary?.height ?? boundary?.H ?? boundary?.maxY ?? 0
  const c = clampRectToRect(x, y, w, h, W, H)
  return { x: c.x, y: c.y }
}
