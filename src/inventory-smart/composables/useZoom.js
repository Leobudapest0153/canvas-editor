/**
 * Composable para manejar la lógica de zoom de forma consistente
 * Centraliza el cálculo del zoom mínimo dinámico y las operaciones de zoom
 */

import { useCanvasStore } from './useCanvasStore'
import { CM_TO_PX, INFINITE_VIEW_PADDING_PX } from '../utils/constants'

const FALLBACK_INFINITE_PADDING = 40
const infinitePadding = Number.isFinite(INFINITE_VIEW_PADDING_PX) ? INFINITE_VIEW_PADDING_PX : FALLBACK_INFINITE_PADDING

export function useZoom(stageSize, layerConfig) {
  const canvasStore = useCanvasStore()

  /**
   * Calcula el bounding box para diferentes contextos
   */
  const calculateBoundingBox = () => {
    // Contexto 1: si no estamos en planta (navegando dentro de un elemento)
    if ((!canvasStore.estaEnPlanta) && canvasStore.estructuraContenedorActual) {
      const structure = canvasStore.estructuraContenedorActual
      const baseWidth = layerConfig.value.width || Math.max(1, Number(structure.width) || 1)
      const baseHeight = layerConfig.value.height || Math.max(1, Number(structure.height) || 1)
      const applyPadding = canvasStore.plantaActivaData?.isInfinite === true
      const padding = applyPadding ? infinitePadding : 0
      const width = Math.max(1, baseWidth)
      const height = Math.max(1, baseHeight)
      return {
        x: padding ? -padding : 0,
        y: padding ? -padding : 0,
        width: width + padding * 2,
        height: height + padding * 2,
      }
    }

    // Contexto 2: planta activa -> priorizar contenido si existe
    if (canvasStore.plantaActivaData) {
      const planta = canvasStore.plantaActivaData
      const isInfinite = planta?.isInfinite === true

      if (!isInfinite) {
        const frame = canvasStore.canvasAdaptativo?.frame
        const frameWidth = Number(frame?.width)
        const frameHeight = Number(frame?.height)
        if (
          frame &&
          Number.isFinite(frameWidth) &&
          Number.isFinite(frameHeight) &&
          frameWidth > 0 &&
          frameHeight > 0
        ) {
          return {
            x: Number(frame.x) || 0,
            y: Number(frame.y) || 0,
            width: Math.max(1, frameWidth),
            height: Math.max(1, frameHeight),
          }
        }
      }

      // 2.a) BBox del contenido visible (elementos de la planta activa)
      const elems = (canvasStore.elementosVisibles || []).filter((e) => e?.visible !== false && e?.plantaId === canvasStore.plantaActiva)
      if (elems.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const el of elems) {
          const x = Number(el.x) || 0
          const y = Number(el.y) || 0
          const w = Number(el.width) || 0
          const h = Number(el.height) || 0
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x + w)
          maxY = Math.max(maxY, y + h)
        }
        if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
          const width = Math.max(1, maxX - minX)
          const height = Math.max(1, maxY - minY)
          if (isInfinite) {
            const margin = infinitePadding
            return {
              x: minX - margin,
              y: minY - margin,
              width: Math.max(1, width + margin * 2),
              height: Math.max(1, height + margin * 2),
            }
          }

          return { x: minX, y: minY, width, height }
        }
      }

      // 2.b) Priorizar polígono si está disponible
      if (!isInfinite && planta.poligono && Array.isArray(planta.poligono) && planta.poligono.length > 0) {
        const xs = planta.poligono.map((p) => p.x)
        const ys = planta.poligono.map((p) => p.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        const bboxRaw = { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }

        // Crear candidatos para manejar ambigüedad de unidades (px vs cm)
        const bboxPx = { ...bboxRaw }
        const bboxCmToPx = {
          x: bboxRaw.x * CM_TO_PX,
          y: bboxRaw.y * CM_TO_PX,
          width: Math.max(1, bboxRaw.width * CM_TO_PX),
          height: Math.max(1, bboxRaw.height * CM_TO_PX)
        }
        return { _candidates: [bboxPx, bboxCmToPx] }
      }

      // 2.c) Usar dimensiones físicas de la planta
      if (!isInfinite && planta.dimensiones && (planta.dimensiones.ancho || planta.dimensiones.largo)) {
        const w = (planta.dimensiones.ancho || 100) * CM_TO_PX
        const h = (planta.dimensiones.largo || 100) * CM_TO_PX
        return { x: 0, y: 0, width: Math.max(1, w), height: Math.max(1, h) }
      }

      if (isInfinite) {
        return null
      }
    }

    // Contexto 3: fallback al layerConfig
    if (canvasStore.plantaActivaData?.isInfinite !== true && layerConfig.value?.width && layerConfig.value?.height) {
      return { x: 0, y: 0, width: Math.max(1, layerConfig.value.width), height: Math.max(1, layerConfig.value.height) }
    }

    return null
  }

  /**
   * Selecciona el mejor candidato de bbox basado en la escala resultante
   */
  const chooseBestBoundingBox = (bbox, viewport) => {
    if (!bbox) return null

    if (bbox._candidates) {
      const scales = bbox._candidates.map((b) => {
        const sX = b.width > 0 ? viewport.width / b.width : 1
        const sY = b.height > 0 ? viewport.height / b.height : 1
        return Math.min(sX, sY)
      })
      // Elegir la interpretación que produce mayor escala (más acercamiento)
      const bestIndex = scales[0] >= scales[1] ? 0 : 1
      return bbox._candidates[bestIndex]
    }

    return bbox
  }

  /**
   * Calcula el zoom mínimo dinámico basado en el contexto actual
   */
  const getDynamicMinZoom = () => {
    if (canvasStore.plantaActivaData?.isInfinite === true) {
      return 0.001
    }

    const margin = 40
    const vw = Math.max(16, stageSize.value.width - margin * 2)
    const vh = Math.max(16, stageSize.value.height - margin * 2)

    const bbox = calculateBoundingBox()
    const chosen = chooseBestBoundingBox(bbox, { width: vw, height: vh })

    // Calcular escala de encuadre
    if (chosen) {
      const scaleX = chosen.width > 0 ? vw / chosen.width : 1
      const scaleY = chosen.height > 0 ? vh / chosen.height : 1
      const fitScale = Math.min(scaleX, scaleY)
      return Math.max(0.001, fitScale) // nunca menor que 0.001
    }

    return 0.001 // valor seguro si no hay nada
  }

  const safeStageCall = (stage, method, ...args) => {
    try {
      if (stage && typeof stage[method] === 'function') {
        return stage[method](...args)
      }
    } catch {
      /* ignore */
    }
    return undefined
  }

  /**
   * Establece el zoom al valor mínimo dinámico y centra la vista en 0,0
   */
  const fitToMinZoom = (stage) => {
    if (!stage) return

    const dynamicMinZoom = getDynamicMinZoom()

    // Resetear transformaciones del stage antes de aplicar nuevas (si existen)
    safeStageCall(stage, 'scale', { x: 1, y: 1 })
    safeStageCall(stage, 'position', { x: 0, y: 0 })

    // Centrar en 0,0 con el zoom mínimo
    const centerX = stageSize.value.width / 2
    const centerY = stageSize.value.height / 2

    // Aplicar transformaciones desde estado limpio
    safeStageCall(stage, 'scale', { x: dynamicMinZoom, y: dynamicMinZoom })
    safeStageCall(stage, 'position', { x: centerX, y: centerY })

    // Sincronizar con el store
    canvasStore.configurarZoom(dynamicMinZoom, dynamicMinZoom)
    canvasStore.configurarPan(centerX, centerY)

    // Forzar redibujado
    safeStageCall(stage, 'batchDraw')
  }

  /**
   * Ajusta la vista para encuadrar perfectamente el contenido activo
   * Versión avanzada que maneja múltiples contextos y centra inteligentemente
   */
  const fitToContent = (stage) => {
    if (!stage) return

    try {
      const margin = 40
      const vw = Math.max(16, stageSize.value.width - margin * 2)
      const vh = Math.max(16, stageSize.value.height - margin * 2)

      const bbox = calculateBoundingBox()
      const chosen = chooseBestBoundingBox(bbox, { width: vw, height: vh })

      if (!chosen) {
        // Fallback: centrar en 0,0 con zoom mínimo
        fitToMinZoom(stage)
        return
      }

      const dynamicMinZoom = getDynamicMinZoom()

      const scaleX = chosen.width > 0 ? vw / chosen.width : 1
      const scaleY = chosen.height > 0 ? vh / chosen.height : 1
      const fitScale = Math.min(scaleX, scaleY)
      const targetScale = Math.max(dynamicMinZoom, Number.isFinite(fitScale) && fitScale > 0 ? fitScale : dynamicMinZoom)

      // IMPORTANTE: Resetear transformaciones del stage antes de aplicar nuevas
      safeStageCall(stage, 'scale', { x: 1, y: 1 })
      safeStageCall(stage, 'position', { x: 0, y: 0 })

      // Calcular pan para centrar bbox en viewport (en coords de stage)
      const stageX = (stageSize.value.width - chosen.width * targetScale) / 2 - chosen.x * targetScale
      const stageY = (stageSize.value.height - chosen.height * targetScale) / 2 - chosen.y * targetScale

      // Aplicar transformaciones desde estado limpio
      safeStageCall(stage, 'scale', { x: targetScale, y: targetScale })
      safeStageCall(stage, 'position', { x: stageX, y: stageY })

      // Sincronizar con el store DESPUÉS de aplicar al stage
      canvasStore.configurarZoom(targetScale, dynamicMinZoom)
      canvasStore.configurarPan(stageX, stageY)

      // Forzar redibujado
      safeStageCall(stage, 'batchDraw')
    } catch (e) {
      console.error('fitToContent error', e)
      // Fallback seguro
      fitToMinZoom(stage)
    }
  }

  return {
    getDynamicMinZoom,
    fitToMinZoom,
    fitToContent,
    calculateBoundingBox,
    chooseBestBoundingBox
  }
}
