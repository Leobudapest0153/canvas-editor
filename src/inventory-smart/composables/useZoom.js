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
   * Calcula el zoom mínimo dinámico basado en el contexto actual
   * Esta función debe ser consistente con la que está en CanvasView.vue
   */
  const getDynamicMinZoom = () => {
    const margin = 40
    const vw = Math.max(16, stageSize.value.width - margin * 2)
    const vh = Math.max(16, stageSize.value.height - margin * 2)

    let bbox = null

    // Contexto 1: si no estamos en planta
    if ((!canvasStore.estaEnPlanta) && canvasStore.estructuraContenedorActual) {
      const localW = layerConfig.value.width || Math.max(1, canvasStore.estructuraContenedorActual.width || 1)
      const localH = layerConfig.value.height || Math.max(1, canvasStore.estructuraContenedorActual.height || 1)
      bbox = { x: 0, y: 0, width: Math.max(1, localW), height: Math.max(1, localH) }
    }
    // Contexto 2: planta activa
    else if (canvasStore.plantaActivaData) {
      const planta = canvasStore.plantaActivaData
      if (planta.poligono && Array.isArray(planta.poligono) && planta.poligono.length > 0) {
        const xs = planta.poligono.map((p) => p.x)
        const ys = planta.poligono.map((p) => p.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        bbox = { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
      } else if (planta.dimensiones && (planta.dimensiones.ancho || planta.dimensiones.largo)) {
        const w = (planta.dimensiones.ancho || 100) * CM_TO_PX
        const h = (planta.dimensiones.largo || 100) * CM_TO_PX
        bbox = { x: 0, y: 0, width: w, height: h }
      }
    }
    // Contexto 3: fallback al layerConfig
    else if (layerConfig.value?.width && layerConfig.value?.height) {
      bbox = { x: 0, y: 0, width: layerConfig.value.width, height: layerConfig.value.height }
    }

    // Calcular escala de encuadre
    if (bbox) {
      const scaleX = bbox.width > 0 ? vw / bbox.width : 1
      const scaleY = bbox.height > 0 ? vh / bbox.height : 1
      const fitScale = Math.min(scaleX, scaleY)
      return Math.max(0.001, fitScale) // nunca menor que 0.001
    }

    return 0.001 // valor seguro si no hay nada
  }

  /**
   * Establece el zoom al valor mínimo dinámico y centra la vista
   */
  const fitToMinZoom = (stage) => {
    if (!stage) return

    const dynamicMinZoom = getDynamicMinZoom()
    canvasStore.configurarZoom(dynamicMinZoom, dynamicMinZoom)

    // Centrar en 0,0 con el zoom mínimo
    const centerX = stageSize.value.width / 2
    const centerY = stageSize.value.height / 2
    canvasStore.configurarPan(centerX, centerY)

    try {
      canvasStore.view.hasUserZoomPan = true
    } catch {
      /* ignore */
    }
  }

  return {
    getDynamicMinZoom,
    fitToMinZoom
  }
}
