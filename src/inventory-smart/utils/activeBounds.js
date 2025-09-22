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

/**
 * Calcula el bounding box (ancho y alto) de un polígono.
 * @param {Array<{x: number, y: number}>} poly - Array de puntos que representan el polígono.
 * @returns {{width: number, height: number}} Un objeto con las propiedades width y height.
 */
export function bboxFromPolygon(poly) {
  if (!Array.isArray(poly) || poly.length === 0) {
    return { width: 0, height: 0 }
  }
  const xs = poly.map((p) => p.x)
  const ys = poly.map((p) => p.y)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  }
}

// Determina los límites activos de trabajo (rectángulo) y polígono en píxeles
// dependiendo del contexto de navegación. Retorna { mode: 'fixed'|'elastic', boundsPx:{width,height}, polygonPx }
export function getActiveBounds(canvasStore) {
  // Dentro de elemento/contenedor: usar sus dimensiones (siempre fijo)
  if (!canvasStore.estaEnPlanta) {
    // En contextos internos, NO bypass de límites
    setPlantInfiniteFlag(false)

    const elem = canvasStore.estructuraContenedorActual || {}
    const dims = elem.dimensiones || {}
    let { widthCm, heightCm } = mapDimsByView(dims, canvasStore.vistaActiva, elem)

    let widthPx = widthCm * CM_TO_PX
    let heightPx = heightCm * CM_TO_PX

    // Fallback a dimensiones legacy en píxeles si faltan cm
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
    return { mode: 'fixed', boundsPx: { width: widthPx, height: heightPx }, polygonPx }
  }

  const planta = canvasStore.plantaActual || canvasStore.plantaActivaData || {}

  // Normalizar modo del piso a una sola propiedad para reducir complejidad
  if (
    planta?.modoPiso === 'elastic' ||
    planta?.floorMode === 'elastic' ||
    planta?.elastic === true
  ) {
    planta.modo = 'elastic'
  }

  // Actualizar flag global para validaciones de límites
  setPlantInfiniteFlag(!!planta.isInfinite)

  if (planta.poligono && Array.isArray(planta.poligono) && planta.poligono.length >= 3) {
    // Clonar superficial para evitar mutar store
    const polygonPx = planta.poligono.map(p => ({ x: p.x, y: p.y }))
    // Marcar metadata opcional
    if (planta.isInfinite) {
      Object.defineProperty(polygonPx, '_isInfinite', { value: true, enumerable: false, configurable: true })
    }
    const boundsPx = bboxFromPolygon(polygonPx)
    return { mode: 'fixed', boundsPx, polygonPx }
  }

  // Fallback: dimensiones rectangulares
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
  return { mode: 'fixed', boundsPx: { width, height }, polygonPx }
}
