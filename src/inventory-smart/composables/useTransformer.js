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

  // Cache de nodos para evitar múltiples findOne() calls
  const nodeCache = new Map()
  const MAX_CACHE_SIZE = 50

  // Cleanup automático para prevenir memory leaks
  const cleanupStaleStates = () => {
    const activeIds = new Set(canvasStore.elementosVisibles.map(e => e.id))

    // Limpiar estados de elementos que ya no existen
    for (const id of transformInitialState.keys()) {
      if (!activeIds.has(id)) {
        transformInitialState.delete(id)
        transformState.delete(id)
        nodeCache.delete(id)
      }
    }

    // Limpiar cache si excede el tamaño máximo
    if (nodeCache.size > MAX_CACHE_SIZE) {
      const oldestEntries = Array.from(nodeCache.entries()).slice(0, nodeCache.size - MAX_CACHE_SIZE)
      oldestEntries.forEach(([id]) => nodeCache.delete(id))
    }
  }

  // Helper para obtener nodos con cache para evitar múltiples findOne() calls
  const getCachedNode = (elementId) => {
    // Verificar cache primero
    if (nodeCache.has(elementId)) {
      const cachedNode = nodeCache.get(elementId)
      // Verificar que el nodo sigue siendo válido
      if (cachedNode && cachedNode.getParent()) {
        return cachedNode
      } else {
        // Nodo inválido, remover del cache
        nodeCache.delete(elementId)
      }
    }

    // Buscar nodo y agregarlo al cache
    const stage = stageRef.value?.getNode?.()
    if (!stage) return null

    const node = stage.findOne(`#${elementId}`)
    if (node) {
      nodeCache.set(elementId, node)

      // Cleanup preventivo si el cache crece mucho
      if (nodeCache.size > MAX_CACHE_SIZE) {
        cleanupStaleStates()
      }
    }

    return node
  }

  // Invalidar cache cuando sea necesario
  const invalidateNodeCache = (elementId = null) => {
    if (elementId) {
      nodeCache.delete(elementId)
    } else {
      nodeCache.clear()
    }
  }

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
    if (!trComp) return

    const node = getCachedNode(canvasStore.elementoSeleccionado)
    if (node) {
      trComp.nodes([node])
      const elemento = canvasStore.elementosVisibles.find(e => e.id === canvasStore.elementoSeleccionado)
      if (!elemento) {
        console.error('[transform-error] Elemento no encontrado en elementosVisibles:', canvasStore.elementoSeleccionado)
        return
      }

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
    } else {
      console.warn('[transform-warning] No se pudo encontrar el nodo para elemento:', canvasStore.elementoSeleccionado)
    }
  }

  // Feedback visual ligero durante transformación
  const updateTransformVisualFeedback = (node, elementId) => {
    try {
      const shape = getCachedNode(elementId)
      if (!shape) {
        console.warn('[transform-feedback] No se pudo encontrar el nodo para feedback:', elementId)
        return
      }

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
    } catch (error) {
      console.error('[transform-feedback-error] Error aplicando feedback visual:', error)
    }
  }

  // Limpiar feedback visual
  const clearTransformVisualFeedback = (elementId) => {
    try {
      const shape = getCachedNode(elementId)
      if (!shape) {
        console.warn('[transform-clear-feedback] No se pudo encontrar el nodo para limpiar feedback:', elementId)
        return
      }

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
    } catch (error) {
      console.error('[transform-clear-feedback-error] Error limpiando feedback visual:', error)
    }
  }

  // Revertir transformación visual y en el store
  const revertTransform = (elementId, reason = '') => {
    const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
    if (!elemento) {
      console.warn('[transform-revert] Elemento no encontrado para revertir:', elementId)
      return
    }

    const prev = transformInitialState.get(elementId) ||
      { x: elemento.x, y: elemento.y, width: elemento.width, height: elemento.height, rotation: elemento.rotation || 0 }

    try {
      const node = getCachedNode(elementId)
      if (node) {
        node.x(prev.x)
        node.y(prev.y)
        node.width && node.width(prev.width)
        node.height && node.height(prev.height)
        node.scaleX && node.scaleX(1)
        node.scaleY && node.scaleY(1)
        node.rotation && node.rotation(prev.rotation || 0)
      } else {
        console.warn('[transform-revert] No se pudo encontrar el nodo para revertir:', elementId)
      }

      clearTransformVisualFeedback(elementId)
    } catch (error) {
      console.error('[transform-revert-error] Error revirtiendo transformación visual:', error)
    }

    // Persistir reversión en el store
    try {
      canvasStore.actualizarElemento(elementId, {
        x: prev.x, y: prev.y, width: prev.width, height: prev.height, rotation: prev.rotation
      })
      lastValidPositions.value.set(elementId, { x: prev.x, y: prev.y })
    } catch (err) {
      console.error('[transform-revert-store-error] Error persisting transform revert:', err)
    }

    console.debug('[transform-debug] reverted', elementId, { reason, prev })
  }

  // Inicio de transformación - guardar estado inicial
  const handleTransformStart = (e, elementId) => {
    isInteractingWithTransformer.value = true
    try {
      const node = e.target
      if (!node) {
        console.warn('[transform-start] No se encontró el nodo target en el evento')
        return
      }
      const x = node.x()
      const y = node.y()
      const width = node.width() * node.scaleX()
      const height = node.height() * node.scaleY()
      const state = { x, y, width, height, rotation: node.rotation?.() || 0 }
      transformInitialState.set(elementId, state)
      console.debug('[transform-debug] start', elementId, state)
    } catch (error) {
      console.error('[transform-start-error] Error guardando estado inicial:', error)
      isInteractingWithTransformer.value = false
    }
  }

  // Durante transformación - feedback visual optimizado
  const handleTransformMove = (e, elementId) => {
    try {
      const node = e.target
      if (!node) {
        console.warn('[transform-move] No se encontró el nodo target en el evento')
        return
      }

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
      console.error('[transform-move-error] Error en handleTransformMove:', err)
    }
  }

  // Fin de transformación - validación completa y persistencia
  const handleTransformEnd = (e, elementId) => {
    isInteractingWithTransformer.value = false

    try {
      const node = e.target
      if (!node) {
        console.warn('[transform-end] No se encontró el nodo target en el evento')
        return
      }

      // Snapshot del elemento al inicio para evitar race conditions
      const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
      if (!elemento) {
        console.warn('[transform-end] Elemento no encontrado en elementosVisibles:', elementId)
        return
      }

      // Congelar el snapshot para evitar modificaciones durante el proceso
      const elementoSnapshot = Object.freeze({ ...elemento })

      // Extraer valores de Konva con corrección de precisión
      let width = node.width() * node.scaleX()
      let height = node.height() * node.scaleY()
      let x = node.x()
      let y = node.y()
      const rotation = node.rotation?.() || 0

      // CORRECCIÓN DE PRECISIÓN: Redondear a precisión de píxel para evitar errores de punto flotante
      const PRECISION_PIXELS = 1000000 // 6 decimales de precisión (suficiente para píxeles)
      x = Math.round(x * PRECISION_PIXELS) / PRECISION_PIXELS
      y = Math.round(y * PRECISION_PIXELS) / PRECISION_PIXELS
      width = Math.round(width * PRECISION_PIXELS) / PRECISION_PIXELS
      height = Math.round(height * PRECISION_PIXELS) / PRECISION_PIXELS

      console.debug('[transform-debug] valores corregidos por precisión', elementId, {
        valoresOriginales: {
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY()
        },
        valoresCorregidos: { x, y, width, height },
        diferencias: {
          deltaX: Math.abs(x - node.x()),
          deltaY: Math.abs(y - node.y()),
          deltaWidth: Math.abs(width - (node.width() * node.scaleX())),
          deltaHeight: Math.abs(height - (node.height() * node.scaleY()))
        }
      })

      // Limpiar estado de transformación
      transformState.delete(elementId)

      console.debug('[transform-debug] valores sin clamp inicial', elementId, {
        posicionOriginal: { x, y },
        dimensionesFinal: { width, height },
        areaBounds: { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height },
        rotation
      })

      // VALIDACIÓN 1: Guards del sistema
      const guardRes = onTransformEndGuard(
        elementoSnapshot,
        { x, y, width, height, rotation },
        { revert: () => revertTransform(elementId, 'guard validation failed') }
      )
      if (!guardRes.valid) return

      // VALIDACIÓN 2: Placement validation (colisiones, área)
      const neighbors = canvasStore.elementosVisibles.filter(e => e.id !== elementId)
      const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }

      // Crear elemento temporal con las dimensiones correctas para validación
      const elementoParaValidacion = {
        ...elementoSnapshot,
        x,
        y,
        width,
        height
      }

      const isValidNow = isPlacementValid({
        pos: { x, y },
        movingEl: elementoParaValidacion,
        neighbors,
        areaBounds,
        CM_TO_PX,
        epsPx: 0.5
      })

      console.debug('[transform-debug] validación de posicionamiento', elementId, {
        prev: transformInitialState.get(elementId),
        new: { x, y, width, height, rotation },
        areaBounds,
        elementoParaValidacion: {
          id: elementoParaValidacion.id,
          x: elementoParaValidacion.x,
          y: elementoParaValidacion.y,
          width: elementoParaValidacion.width,
          height: elementoParaValidacion.height
        },
        validationDetails: {
          positionToValidate: { x, y },
          elementBounds: {
            left: x,
            top: y,
            right: x + width,
            right_cm: (x + width) / CM_TO_PX,
            bottom: y + height,
            bottom_cm: (y + height) / CM_TO_PX
          },
          areaBounds_cm: {
            maxX_cm: areaBounds.maxX / CM_TO_PX,
            maxY_cm: areaBounds.maxY / CM_TO_PX
          },
          checks: {
            insideAreaX: x >= areaBounds.minX && (x + width) <= areaBounds.maxX,
            insideAreaY: y >= areaBounds.minY && (y + height) <= areaBounds.maxY,
            insideArea: x >= areaBounds.minX && y >= areaBounds.minY && (x + width) <= areaBounds.maxX && (y + height) <= areaBounds.maxY
          }
        },
        isValidNow
      })

      if (!isValidNow) {
        revertTransform(elementId, 'placement validation failed')
        nextTick(() => setupTransformer())
        return
      }

      // VALIDACIÓN 3: Dimension validation
      let tempDimensiones = elementoSnapshot?.dimensiones ? { ...elementoSnapshot.dimensiones } : undefined
      if (tempDimensiones) {
        const widthCm = Math.round(width / CM_TO_PX)
        const heightCm = Math.round(height / CM_TO_PX)
        if (canvasStore.vistaActiva === 'XY') {
          tempDimensiones.ancho = widthCm
          tempDimensiones.largo = heightCm
        } else if (canvasStore.vistaActiva === 'XZ') {
          tempDimensiones.ancho = widthCm
          tempDimensiones.alto = heightCm
          if (tempDimensiones.largo === undefined) tempDimensiones.largo = elementoSnapshot.dimensiones?.largo || 60
        }
      }

      // Crear elemento temporal con las nuevas dimensiones para validación
      const elementoTemporal = {
        ...elementoSnapshot,
        x,  // Usar las coordenadas de Konva directamente
        y,  // Usar las coordenadas de Konva directamente
        width,  // Usar las dimensiones de Konva directamente
        height, // Usar las dimensiones de Konva directamente
        dimensiones: tempDimensiones
      }

      console.debug('[dimension-debug] validating dimensions', elementId, {
        elementoTemporal: {
          id: elementoTemporal.id,
          posicionKonva: { x, y },
          posicionCm: { x: x / CM_TO_PX, y: y / CM_TO_PX },
          dimensionesKonva: { width, height },
          dimensiones: tempDimensiones,
          vista: canvasStore.vistaActiva
        },
        elementoOriginal: {
          id: elementoSnapshot.id,
          posicionOriginal: { x: elementoSnapshot.x, y: elementoSnapshot.y },
          dimensionesOriginales: { width: elementoSnapshot.width, height: elementoSnapshot.height }
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
        {
          silencioso: true,
          elementoTemporal: elementoTemporal  // Pasar el elemento con coordenadas de transformación
        }
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

      // Si las validaciones pasaron, NO deberíamos necesitar clamp
      // Solo verificamos para detectar inconsistencias en las validaciones
      const bounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }

      // Aplicar la misma tolerancia que usamos en las validaciones (0.1 cm ≈ 3.77 px)
      const TOLERANCIA_PX = 0.1 * 37.7953 // 0.1 cm en píxeles
      const estaFueraDeLimites =
        x < (bounds.minX - TOLERANCIA_PX) ||
        y < (bounds.minY - TOLERANCIA_PX) ||
        (x + width) > (bounds.maxX + TOLERANCIA_PX) ||
        (y + height) > (bounds.maxY + TOLERANCIA_PX)

      let finalX = x
      let finalY = y

      if (estaFueraDeLimites) {
        // ESTO NO DEBERÍA SUCEDER si las validaciones están bien implementadas
        console.error('[transform-inconsistencia] ¡Las validaciones pasaron pero el elemento está fuera de límites!', {
          elementId,
          posicion: { x, y, width, height },
          bounds,
          tolerancia: TOLERANCIA_PX,
          validacionesPasaron: true,
          detalles: {
            fueraIzquierda: x < (bounds.minX - TOLERANCIA_PX),
            fueraArriba: y < (bounds.minY - TOLERANCIA_PX),
            fueraDerecha: (x + width) > (bounds.maxX + TOLERANCIA_PX),
            fueraAbajo: (y + height) > (bounds.maxY + TOLERANCIA_PX),
            // Información adicional para debug
            deltaIzquierda: bounds.minX - x,
            deltaArriba: bounds.minY - y,
            deltaDerecha: (x + width) - bounds.maxX,
            deltaAbajo: (y + height) - bounds.maxY
          }
        })

        // Como medida de emergencia, aplicar clamp mínimo
        finalX = Math.max(bounds.minX, Math.min(x, bounds.maxX - width))
        finalY = Math.max(bounds.minY, Math.min(y, bounds.maxY - height))

        console.warn('[transform-emergency-clamp] Aplicado clamp de emergencia:', {
          elementId,
          original: { x, y },
          clamped: { x: finalX, y: finalY },
          razon: 'Inconsistencia entre validaciones y límites'
        })
      } else {
        console.debug('[transform-success] Elemento dentro de límites, sin clamp necesario:', {
          elementId,
          posicion: { x, y, width, height },
          bounds
        })
      }

      console.debug('[transform-debug] verificación final', elementId, {
        coordenadasOriginales: { x, y, width, height },
        coordenadasFinales: { x: finalX, y: finalY, width, height },
        bounds,
        estabaFueraDeLimites: estaFueraDeLimites,
        seAplicoClampEmergencia: finalX !== x || finalY !== y,
        validacionesPasaron: true
      })

      // Aplicar transformación final
      node.width(width)
      node.height(height)
      node.scaleX(1)
      node.scaleY(1)
      node.x(finalX)
      node.y(finalY)

      // Limpiar feedback visual
      clearTransformVisualFeedback(elementId)

      // Persistir en el store con coordenadas finales
      canvasStore.actualizarElemento(
        elementId,
        { x: finalX, y: finalY, width, height, rotation, dimensiones: newDimensiones, dimensionLock: true },
        true,
        `Elemento redimensionado: ${elementoSnapshot?.nombre || elementoSnapshot?.tipo || elementId}`
      )

      lastValidPositions.value.set(elementId, { x: finalX, y: finalY })

      // Invalidar cache para este elemento ya que cambió
      invalidateNodeCache(elementId)

      nextTick(() => setupTransformer())

    } catch (err) {
      console.error('[transform-end-error] Error en handleTransformEnd:', err)
      // En caso de error, revertir la transformación como medida de seguridad
      revertTransform(elementId, `unexpected error: ${err.message}`)
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

  // Cleanup automático periódico para prevenir memory leaks
  const cleanupInterval = setInterval(() => {
    cleanupStaleStates()
  }, 30000) // Cada 30 segundos

  // Cleanup al desmontar
  const cleanup = () => {
    clearInterval(cleanupInterval)
    transformInitialState.clear()
    transformState.clear()
    nodeCache.clear()
  }

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
    clearTransformVisualFeedback,

    // Cache management
    invalidateNodeCache,
    cleanupStaleStates,

    // Cleanup
    cleanup
  }
}
