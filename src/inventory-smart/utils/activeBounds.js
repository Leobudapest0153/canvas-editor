import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { cmToPx, fmtCm } from '@/inventory-smart/utils/units'

// Map physical dimensions (cm) to width/height depending on active view
// dims: {ancho, largo, alto}
export function mapDimsByView(dims = {}, view = 'XY') {
  const { ancho = 0, largo = 0, alto = 0 } = dims
  if (view === 'XZ') {
    // Front view: width -> ancho, height -> alto
    return { widthCm: ancho, heightCm: alto }
  }
  if (view === 'ZY') {
    // Side view: width -> largo, height -> alto
    return { widthCm: largo, heightCm: alto }
  }
  // Top view (XY): width -> ancho, height -> largo
  return { widthCm: ancho, heightCm: largo }
}

// Determine active working bounds (rectangle) and polygon in pixels
// depending on navigation context. Returns { boundsPx:{width,height}, polygonPx }
export function getActiveBounds(canvasStore, cmPerPx = 1 / CM_TO_PX) {
  // Inside element/container: use its dimensions
  if (canvasStore.estaEnElemento || canvasStore.estaEnContenedor) {
    const elem = canvasStore.elementoContenedorActual || {}
    const dims = elem.dimensiones || {}
    // Siempre utilizar vista de frente para detalle de elemento
    let { widthCm, heightCm } = mapDimsByView(dims, 'XZ')

    // Convertir dimensiones a píxeles usando el helper
    let widthPx = cmToPx(widthCm, cmPerPx)
    let heightPx = cmToPx(heightCm, cmPerPx)

    // Fallback to legacy pixel dimensions if cm dims missing
    if (!widthPx || !heightPx) {
      widthPx = elem.width || 0
      heightPx = elem.height || 0
    }

    const polygonPx = [
      { x: 0, y: 0 },
      { x: widthPx, y: 0 },
      { x: widthPx, y: heightPx },
      { x: 0, y: heightPx },
    ]

    return {
      boundsPx: { width: widthPx, height: heightPx },
      polygonPx,
      labels: { width: fmtCm(widthCm), height: fmtCm(heightCm) },
    }
  }

  // Root level: active plant polygon or rectangle from dimensions
  const planta = canvasStore.plantaActivaData || {}
  if (planta.poligono && Array.isArray(planta.poligono) && planta.poligono.length >= 3) {
    const polygonPx = planta.poligono
    const xs = polygonPx.map((p) => p.x)
    const ys = polygonPx.map((p) => p.y)
    const width = Math.max(...xs) - Math.min(...xs)
    const height = Math.max(...ys) - Math.min(...ys)
    return { boundsPx: { width, height }, polygonPx }
  }

  const ancho = planta.dimensiones?.ancho || 0
  const largo = planta.dimensiones?.largo || 0
  const width = cmToPx(ancho, cmPerPx)
  const height = cmToPx(largo, cmPerPx)
  const polygonPx = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  return {
    boundsPx: { width, height },
    polygonPx,
    labels: { width: fmtCm(ancho), height: fmtCm(largo) },
  }
}

