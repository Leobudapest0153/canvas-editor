/**
 * useMarqueeSelection
 *
 * Composable que implementa la selección múltiple mediante arrastre de marquesina.
 * Permite seleccionar varios elementos dibujando un rectángulo de selección,
 * similar al comportamiento del escritorio de Windows.
 */

import { ref, computed } from 'vue'

export function useMarqueeSelection({ canvasStore, stageRef }) {
  // Estado de la marquesina
  const isMarqueeActive = ref(false)
  const marqueeStart = ref({ x: 0, y: 0 })
  const marqueeEnd = ref({ x: 0, y: 0 })
  const selectedElementIds = ref(new Set())

  // Coordenadas normalizadas del rectángulo de marquesina
  const marqueeRect = computed(() => {
    const x1 = Math.min(marqueeStart.value.x, marqueeEnd.value.x)
    const y1 = Math.min(marqueeStart.value.y, marqueeEnd.value.y)
    const x2 = Math.max(marqueeStart.value.x, marqueeEnd.value.x)
    const y2 = Math.max(marqueeStart.value.y, marqueeEnd.value.y)

    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    }
  })

  /**
   * Inicia la selección de marquesina
   * @param {Object} stagePos - Posición en coordenadas del layer
   */
  const startMarquee = (stagePos) => {
    isMarqueeActive.value = true
    marqueeStart.value = { x: stagePos.x, y: stagePos.y }
    marqueeEnd.value = { x: stagePos.x, y: stagePos.y }
    selectedElementIds.value.clear()
  }

  /**
   * Actualiza la posición final de la marquesina durante el arrastre
   * @param {Object} stagePos - Posición actual en coordenadas del layer
   */
  const updateMarquee = (stagePos) => {
    if (!isMarqueeActive.value) return

    marqueeEnd.value = { x: stagePos.x, y: stagePos.y }

    // Calcular elementos que intersectan con la marquesina
    const rect = marqueeRect.value
    const newSelection = new Set()

    canvasStore.elementosVisibles.forEach((elemento) => {
      if (isElementIntersectingMarquee(elemento, rect)) {
        newSelection.add(elemento.id)
      }
    })

    selectedElementIds.value = newSelection
  }

  /**
   * Finaliza la selección de marquesina
   */
  const endMarquee = () => {
    if (!isMarqueeActive.value) return

    // Si hay elementos seleccionados, aplicar la selección múltiple
    if (selectedElementIds.value.size > 0) {
      const idsArray = Array.from(selectedElementIds.value)

      // Usar el nuevo método de selección múltiple
      if (typeof canvasStore.seleccionarElementosMultiple === 'function') {
        canvasStore.seleccionarElementosMultiple(idsArray)
      } else {
        // Fallback: seleccionar solo el primero si no existe el método
        canvasStore.seleccionarElemento(idsArray[0])
      }
    }

    // Reset
    isMarqueeActive.value = false
    marqueeStart.value = { x: 0, y: 0 }
    marqueeEnd.value = { x: 0, y: 0 }
    selectedElementIds.value.clear()
  }

  /**
   * Cancela la selección de marquesina
   */
  const cancelMarquee = () => {
    isMarqueeActive.value = false
    marqueeStart.value = { x: 0, y: 0 }
    marqueeEnd.value = { x: 0, y: 0 }
    selectedElementIds.value.clear()
  }

  const translateMarquee = (dx, dy) => {
    if (!dx && !dy) return
    marqueeStart.value = {
      x: marqueeStart.value.x - dx,
      y: marqueeStart.value.y - dy,
    }
    marqueeEnd.value = {
      x: marqueeEnd.value.x - dx,
      y: marqueeEnd.value.y - dy,
    }
  }

  /**
   * Verifica si un elemento intersecta con el rectángulo de marquesina
   * @param {Object} elemento - Elemento del canvas
   * @param {Object} rect - Rectángulo de marquesina {x, y, width, height}
   * @returns {boolean}
   */
  const isElementIntersectingMarquee = (elemento, rect) => {
    const elemX = elemento.x
    const elemY = elemento.y
    const elemWidth = elemento.width || 0
    const elemHeight = elemento.height || 0

    // Detectar intersección entre dos rectángulos
    return !(
      elemX + elemWidth < rect.x ||
      rect.x + rect.width < elemX ||
      elemY + elemHeight < rect.y ||
      rect.y + rect.height < elemY
    )
  }

  /**
   * Convierte coordenadas del stage a coordenadas del layer
   * @param {Object} stagePoint - Punto en coordenadas del stage {x, y}
   * @returns {Object} - Punto en coordenadas del layer
   */
  const stageToLayerCoords = (stagePoint) => {
    const stage = stageRef.value?.getNode?.()
    if (!stage) return stagePoint

    const transform = stage.getAbsoluteTransform().copy()
    transform.invert()

    return transform.point(stagePoint)
  }

  return {
    // Estado
    isMarqueeActive,
    marqueeRect,
    selectedElementIds,

    // Métodos
    startMarquee,
    updateMarquee,
    endMarquee,
    cancelMarquee,
    stageToLayerCoords,
    translateMarquee,
  }
}
