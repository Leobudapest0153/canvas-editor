/**
 * Composable para manejar la lógica de zoom de forma consistente
 * Centraliza el cálculo del zoom mínimo dinámico y las operaciones de zoom
 */

import { computed } from 'vue'
import { useCanvasStore } from './useCanvasStore'
import { CM_TO_PX } from '../utils/constants'

export function useZoom(stageSize, layerConfig) {
  const canvasStore = useCanvasStore()

  /**
   * Calcula el bounding box para diferentes contextos
   */
  const calculateBoundingBox = () => {
    // Contexto 1: si no estamos en planta (navegando dentro de un elemento)
    if ((!canvasStore.estaEnPlanta) && canvasStore.estructuraContenedorActual) {
      const localW = layerConfig.value.width || Math.max(1, canvasStore.estructuraContenedorActual.width || 1)
      const localH = layerConfig.value.height || Math.max(1, canvasStore.estructuraContenedorActual.height || 1)
      return { x: 0, y: 0, width: Math.max(1, localW), height: Math.max(1, localH) }
    }

    // Contexto 2: planta activa
    if (canvasStore.plantaActivaData) {
      const planta = canvasStore.plantaActivaData

      // Priorizar polígono si está disponible
      if (planta.poligono && Array.isArray(planta.poligono) && planta.poligono.length > 0) {
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

      // Usar dimensiones físicas de la planta
      if (planta.dimensiones && (planta.dimensiones.ancho || planta.dimensiones.largo)) {
        const w = (planta.dimensiones.ancho || 100) * CM_TO_PX
        const h = (planta.dimensiones.largo || 100) * CM_TO_PX
        return { x: 0, y: 0, width: Math.max(1, w), height: Math.max(1, h) }
      }
    }

    // Contexto 3: fallback al layerConfig
    if (layerConfig.value?.width && layerConfig.value?.height) {
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

  /**
   * Establece el zoom al valor mínimo dinámico y centra la vista en 0,0
   */
  const fitToMinZoom = (stage) => {
    if (!stage) return

    const dynamicMinZoom = getDynamicMinZoom()

    // Resetear transformaciones del stage antes de aplicar nuevas
    stage.scale({ x: 1, y: 1 })
    stage.position({ x: 0, y: 0 })

    // Centrar en 0,0 con el zoom mínimo
    const centerX = stageSize.value.width / 2
    const centerY = stageSize.value.height / 2

    // Aplicar transformaciones desde estado limpio
    stage.scale({ x: dynamicMinZoom, y: dynamicMinZoom })
    stage.position({ x: centerX, y: centerY })

    // Sincronizar con el store
    canvasStore.configurarZoom(dynamicMinZoom, dynamicMinZoom)
    canvasStore.configurarPan(centerX, centerY)

    // Forzar redibujado
    stage.batchDraw()
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

      // IMPORTANTE: Resetear transformaciones del stage antes de aplicar nuevas
      // Esto asegura que partimos de un estado limpio independientemente de transformaciones previas
      stage.scale({ x: 1, y: 1 })
      stage.position({ x: 0, y: 0 })

      // Calcular pan para centrar bbox en viewport (en coords de stage)
      const stageX = (stageSize.value.width - chosen.width * dynamicMinZoom) / 2 - chosen.x * dynamicMinZoom
      const stageY = (stageSize.value.height - chosen.height * dynamicMinZoom) / 2 - chosen.y * dynamicMinZoom

      // Aplicar transformaciones desde estado limpio
      stage.scale({ x: dynamicMinZoom, y: dynamicMinZoom })
      stage.position({ x: stageX, y: stageY })

      // Sincronizar con el store DESPUÉS de aplicar al stage
      canvasStore.configurarZoom(dynamicMinZoom, dynamicMinZoom)
      canvasStore.configurarPan(stageX, stageY)

      // Forzar redibujado
      stage.batchDraw()
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
