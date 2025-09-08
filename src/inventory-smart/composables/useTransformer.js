import { ref, computed, watch, nextTick } from 'vue'
import { throttleEveryNFrames } from '@/inventory-smart/utils/dragMath'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'

/**
 * Composable para manejar la lógica de transformación de elementos en el canvas
 * Incluye setup del transformer, validaciones y manejo de estados
 */
export function useTransformer({
  canvasStore,
  stageRef,
  layerRef,
  layerConfig,
  lastValidPositions,
  onTransformEndGuard,
  dimensionValidation,
  showToast,
  isElementLocked
}) {
  // Estado del transformer
  const transformerRef = ref(null)
  const isInteractingWithTransformer = ref(false)
  const editingElementId = ref(null)
  const transformInitialState = new Map()
  const transformState = new Map()

  // Computeds
  const isEditingSelected = computed(() =>
    editingElementId.value === canvasStore.elementoSeleccionado
  )

  const selectedElementLocked = computed(() => {
    const id = canvasStore.elementoSeleccionado
    return id ? isElementLocked(id) : false
  })

  // Throttle para feedback visual
  const throttleTransform = throttleEveryNFrames(3)

  // Configurar el transformer para el elemento seleccionado
  const setupTransformer = () => {
    if (!isEditingSelected.value || selectedElementLocked.value) return
    const trComp = transformerRef.value?.getNode?.()
    const stage = stageRef.value?.getNode?.()
    if (!trComp || !stage) return

    const node = stage.findOne(`#${canvasStore.elementoSeleccionado}`)
    if (node) {
      trComp.nodes([node])
      const elemento = canvasStore.elementosVisibles.find(e => e.id === canvasStore.elementoSeleccionado)
      trComp.setAttrs({
        flipEnabled: false,
        boundBoxFunc: (oldBox, newBox) => {
          const MINW = 10
          const MINH = 10
          if (newBox.width <= 0 || newBox.height <= 0) return oldBox
          if (newBox.width < MINW || newBox.height < MINH) return oldBox
          if (elemento?.forma === 'circular') {
            const size = Math.max(newBox.width, newBox.height)
            return { ...newBox, width: size, height: size }
          }
          return newBox
        },
      })
      trComp.getLayer()?.batchDraw?.()
    }
  }

  // Feedback visual ligero durante transformación
  const updateTransformVisualFeedback = (node, elementId) => {
    try {
      const stage = stageRef.value.getNode()
      const shape = stage.findOne(`#${elementId}`)
      if (!shape) return

      const bbox = shape.findOne('.bbox')
      const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)

      if (elemento?.forma === 'circular' && canvasStore.vistaActiva === 'XY') {
        const circle = shape.findOne('Circle')
        circle?.stroke('#3b82f6')
        circle?.strokeWidth(1)
      } else {
        bbox?.stroke('#3b82f6')
        bbox?.strokeWidth(1)
      }

      shape.getLayer()?.batchDraw?.()
    } catch { /* ignore */ }
  }

  // Limpiar feedback visual
  const clearTransformVisualFeedback = (elementId) => {
    try {
      const stage = stageRef.value.getNode()
      const shape = stage.findOne(`#${elementId}`)
      if (!shape) return

      const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
      const bbox = shape.findOne('.bbox')
      const circle = elemento?.forma === 'circular' && canvasStore.vistaActiva === 'XY'
        ? shape.findOne('Circle') : null

      if (circle) {
        circle.stroke(undefined)
        circle.strokeWidth(0)
      } else {
        bbox?.stroke(undefined)
        bbox?.strokeWidth(0)
      }

      const layer = layerRef.value?.getNode?.()
      layer?.batchDraw?.()
    } catch { /* ignore */ }
  }

  // Revertir transformación visual y en el store
  const revertTransform = (elementId, reason = '') => {
    const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
    if (!elemento) return

    const prev = transformInitialState.get(elementId) ||
      { x: elemento.x, y: elemento.y, width: elemento.width, height: elemento.height, rotation: elemento.rotation || 0 }

    try {
      const stage = stageRef.value.getNode()
      const node = stage.findOne(`#${elementId}`)
      if (node) {
        node.x(prev.x)
        node.y(prev.y)
        node.width && node.width(prev.width)
        node.height && node.height(prev.height)
        node.scaleX && node.scaleX(1)
        node.scaleY && node.scaleY(1)
        node.rotation && node.rotation(prev.rotation || 0)
      }

      clearTransformVisualFeedback(elementId)
    } catch { /* ignore */ }

    // Persistir reversión en el store
    try {
      canvasStore.actualizarElemento(elementId, {
        x: prev.x, y: prev.y, width: prev.width, height: prev.height, rotation: prev.rotation
      })
      lastValidPositions.value.set(elementId, { x: prev.x, y: prev.y })
    } catch (err) {
      console.warn('Error persisting transform revert', err)
    }

    console.debug('[transform-debug] reverted', elementId, { reason, prev })
  }

  // Inicio de transformación - guardar estado inicial
  const handleTransformStart = (e, elementId) => {
    isInteractingWithTransformer.value = true
    try {
      const node = e.target
      if (!node) return
      const x = node.x()
      const y = node.y()
      const width = node.width() * node.scaleX()
      const height = node.height() * node.scaleY()
      const state = { x, y, width, height, rotation: node.rotation?.() || 0 }
      transformInitialState.set(elementId, state)
      console.debug('[transform-debug] start', elementId, state)
    } catch { /* ignore */ }
  }

  // Durante transformación - feedback visual optimizado
  const handleTransformMove = (e, elementId) => {
    try {
      const node = e.target
      if (!node) return

      const width = node.width() * node.scaleX()
      const height = node.height() * node.scaleY()
      const x = node.x()
      const y = node.y()

      // Actualizar cache de estado sin tocar el store
      transformState.set(elementId, { x, y, width, height })

      // Feedback visual ligero throttleado
      throttleTransform(() => {
        updateTransformVisualFeedback(node, elementId)
      })()

    } catch (err) {
      console.warn('Error en handleTransformMove:', err)
    }
  }

  // Fin de transformación - validación completa y persistencia
  const handleTransformEnd = (e, elementId) => {
    isInteractingWithTransformer.value = false

    try {
      const node = e.target
      let width = node.width() * node.scaleX()
      let height = node.height() * node.scaleY()
      let x = node.x()
      let y = node.y()
      const bounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
      x = Math.max(bounds.minX, Math.min(x, bounds.maxX - width))
      y = Math.max(bounds.minY, Math.min(y, bounds.maxY - height))
      const rotation = node.rotation?.() || 0

      const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
      if (!elemento) return

      // Limpiar estado de transformación
      transformState.delete(elementId)

      // VALIDACIÓN 1: Guards del sistema
      const guardRes = onTransformEndGuard(
        elemento,
        { x, y, width, height, rotation },
        { revert: () => revertTransform(elementId, 'guard validation failed') }
      )
      if (!guardRes.valid) return

      // VALIDACIÓN 2: Placement validation (colisiones, área)
      const neighbors = canvasStore.elementosVisibles.filter(e => e.id !== elementId)
      const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
      const isValidNow = isPlacementValid({
        pos: { x, y },
        movingEl: { ...elemento, width, height },
        neighbors,
        areaBounds,
        CM_TO_PX,
        epsPx: 0.5
      })

      console.debug('[transform-debug] end', elementId, {
        prev: transformInitialState.get(elementId),
        new: { x, y, width, height, rotation },
        isValidNow
      })

      if (!isValidNow) {
        revertTransform(elementId, 'placement validation failed')
        nextTick(() => setupTransformer())
        return
      }

      // VALIDACIÓN 3: Dimension validation
      let tempDimensiones = elemento?.dimensiones ? { ...elemento.dimensiones } : undefined
      if (tempDimensiones) {
        const widthCm = Math.round(width / CM_TO_PX)
        const heightCm = Math.round(height / CM_TO_PX)
        if (canvasStore.vistaActiva === 'XY') {
          tempDimensiones.ancho = widthCm
          tempDimensiones.largo = heightCm
        } else if (canvasStore.vistaActiva === 'XZ') {
          tempDimensiones.ancho = widthCm
          tempDimensiones.alto = heightCm
          if (tempDimensiones.largo === undefined) tempDimensiones.largo = elemento.dimensiones?.largo || 60
        }
      }

      // Crear elemento temporal con las nuevas dimensiones para validación
      const elementoTemporal = {
        ...elemento,
        x,
        y,
        width,
        height,
        dimensiones: tempDimensiones
      }

      console.debug('[dimension-debug] validating dimensions', elementId, {
        elementoTemporal: {
          id: elementoTemporal.id,
          posicion: { x: x / CM_TO_PX, y: y / CM_TO_PX },
          dimensiones: tempDimensiones,
          vista: canvasStore.vistaActiva
        }
      })

      // Ejecutar validación de dimensiones (silenciosa)
      const resultadoValidacionDimensiones = dimensionValidation.validarDimensiones(
        elementId,
        {
          ancho: tempDimensiones?.ancho,
          largo: tempDimensiones?.largo,
          alto: tempDimensiones?.alto
        },
        { silencioso: true }
      )

      console.debug('[dimension-debug] validation result', elementId, resultadoValidacionDimensiones)

      if (!resultadoValidacionDimensiones.valida) {
        showToast(
          resultadoValidacionDimensiones.razon,
          'error',
          { timeout: 5000 }
        )

        revertTransform(elementId, `dimension validation failed: ${resultadoValidacionDimensiones.razon}`)
        nextTick(() => setupTransformer())
        return
      }

      // APLICACIÓN EXITOSA
      const newDimensiones = tempDimensiones

      // Aplicar transformación final
      node.width(width)
      node.height(height)
      node.scaleX(1)
      node.scaleY(1)
      node.x(x)
      node.y(y)

      // Limpiar feedback visual
      clearTransformVisualFeedback(elementId)

      // Persistir en el store
      canvasStore.actualizarElemento(
        elementId,
        { x, y, width, height, rotation, dimensiones: newDimensiones, dimensionLock: true },
        true,
        `Elemento redimensionado: ${elemento?.nombre || elemento?.tipo || elementId}`
      )

      lastValidPositions.value.set(elementId, { x, y })
      nextTick(() => setupTransformer())

    } catch (err) {
      console.warn('Error en handleTransformEnd:', err)
    }
  }

  // Activar/desactivar edición del elemento seleccionado
  const toggleEditingMode = (elementId, dragModeActive) => {
    if (!dragModeActive) {
      editingElementId.value = null
    } else {
      if (elementId && !isElementLocked(elementId)) {
        editingElementId.value = elementId
        nextTick(setupTransformer)
      }
    }
  }

  // Limpiar modos si se bloquea el elemento
  watch(selectedElementLocked, (locked) => {
    if (locked) {
      if (editingElementId.value === canvasStore.elementoSeleccionado) {
        editingElementId.value = null
      }
    }
  })

  // Watch para cambios en elemento seleccionado
  watch(() => canvasStore.elementoSeleccionadoCompleto, (elementoActual) => {
    if (elementoActual && isEditingSelected.value && !isInteractingWithTransformer.value) {
      nextTick(() => {
        setupTransformer()
      })
    }
  }, { deep: true })

  return {
    // Refs
    transformerRef,
    editingElementId,
    isInteractingWithTransformer,

    // Computeds
    isEditingSelected,
    selectedElementLocked,

    // Methods
    setupTransformer,
    handleTransformStart,
    handleTransformMove,
    handleTransformEnd,
    toggleEditingMode,
    revertTransform,
    clearTransformVisualFeedback
  }
}
