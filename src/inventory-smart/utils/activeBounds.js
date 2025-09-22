import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { setPlantInfiniteFlag } from '@/inventory-smart/utils/polygonBounds'

// Map physical dimensions (cm) to width/height depending on active view and orientation
// dims: {ancho, largo, alto}, element: elemento con orientación
export function mapDimsByView(dims = {}, view = 'XY', element = null) {
  const { ancho = 0, largo = 0, alto = 0 } = dims

  if (view === 'XZ') {
    // Front view: considerar orientación del elemento
    if (element && element.orientacion !== undefined) {
      const orientacion = Number(element.orientacion || 0)
      const orientacionNormalizada = ((orientacion % 360) + 360) % 360
      const useAncho = (orientacionNormalizada === 0 || orientacionNormalizada === 180)

      return {
        widthCm: useAncho ? ancho : largo,
        heightCm: alto
      }
    }
    // Sin orientación: usar lógica original
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
export function getActiveBounds(canvasStore) {
  // Inside element/container: use its dimensions
  if (!canvasStore.estaEnPlanta) {
    // En contextos internos, NO bypass de límites
    setPlantInfiniteFlag(false)

    const elem = canvasStore.estructuraContenedorActual || {}
    const dims = elem.dimensiones || {}
    let { widthCm, heightCm } = mapDimsByView(dims, canvasStore.vistaActiva, elem)

    let widthPx = widthCm * CM_TO_PX
    let heightPx = heightCm * CM_TO_PX

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

    return { boundsPx: { width: widthPx, height: heightPx }, polygonPx }
  }

  // Root level: active plant polygon or rectangle from dimensions
  const planta = canvasStore.plantaActivaData || {}
  // Actualizar flag global para validaciones de límites
  setPlantInfiniteFlag(!!planta.isInfinite)

  if (planta.poligono && Array.isArray(planta.poligono) && planta.poligono.length >= 3) {
    // Clonar superficial para evitar mutar store
    const polygonPx = planta.poligono.map(p => ({ x: p.x, y: p.y }))
    // Marcar metadata opcional
    if (planta.isInfinite) {
      Object.defineProperty(polygonPx, '_isInfinite', { value: true, enumerable: false, configurable: true })
    }
    const xs = polygonPx.map((p) => p.x)
    const ys = polygonPx.map((p) => p.y)
    const width = Math.max(...xs) - Math.min(...xs)
    const height = Math.max(...ys) - Math.min(...ys)
    return { boundsPx: { width, height }, polygonPx }
  }

  const ancho = planta.dimensiones?.ancho || 0
  const largo = planta.dimensiones?.largo || 0
  const width = ancho * CM_TO_PX
  const height = largo * CM_TO_PX
  const polygonPx = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  if (planta.isInfinite) {
    Object.defineProperty(polygonPx, '_isInfinite', { value: true, enumerable: false, configurable: true })
  }
  return { boundsPx: { width, height }, polygonPx }
}
