import { ref, computed, watch, nextTick } from 'vue'
import { throttleEveryNFrames } from '@/inventory-smart/utils/dragMath'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { clampInsideArea } from '@/inventory-smart/utils/bounds'
import { circleInPolygon, pointInPolygon } from '@/inventory-smart/utils/polygonBounds'
import { correctTransformValues } from '@/inventory-smart/utils/precision'
import { toTransformerPrecision } from '../utils/fixedDimensions'

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
  isElementLocked,
  // Snapping helpers (opcionales)
  performSnap,
  clearGuides,
  isSnappingEnabled,
  // Boundary provider para clamping
  computeBoundary
}) {
  // Estado del transformer
  const transformerRef = ref(null)
  const isInteractingWithTransformer = ref(false)
  const editingElementId = ref(null)
  const transformInitialState = new Map()
  const transformState = new Map()

  // Helper para verificar si un rectángulo está completamente dentro del polígono
  // Usa intersección de segmentos para detectar si algún borde del rectángulo cruza el polígono
  const isRectCompletelyInPolygon = (x, y, width, height, polygon) => {

    // 1. Verificar que todas las esquinas estén dentro
    const corners = [
      { x, y, label: 'top-left' },
      { x: x + width, y, label: 'top-right' },
      { x: x + width, y: y + height, label: 'bottom-right' },
      { x, y: y + height, label: 'bottom-left' }
    ]

    for (const corner of corners) {
      const isInside = pointInPolygon(corner, polygon)
      if (!isInside) {
        return false
      }
    }

    // 2. Verificar que ningún borde del rectángulo intersecte con los bordes del polígono
    const rectEdges = [
      { start: { x, y }, end: { x: x + width, y }, label: 'top' },
      { start: { x: x + width, y }, end: { x: x + width, y: y + height }, label: 'right' },
      { start: { x: x + width, y: y + height }, end: { x, y: y + height }, label: 'bottom' },
      { start: { x, y: y + height }, end: { x, y }, label: 'left' }
    ]

    // Función para verificar intersección entre dos segmentos de línea
    const doLinesIntersect = (line1Start, line1End, line2Start, line2End) => {
      const x1 = line1Start.x, y1 = line1Start.y
      const x2 = line1End.x, y2 = line1End.y
      const x3 = line2Start.x, y3 = line2Start.y
      const x4 = line2End.x, y4 = line2End.y

      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
      if (Math.abs(denom) < 1e-10) return false // Líneas paralelas

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

      return t >= 0 && t <= 1 && u >= 0 && u <= 1
    }

    // Verificar intersecciones con cada borde del polígono
    for (let i = 0; i < polygon.length; i++) {
      const polyStart = polygon[i]
      const polyEnd = polygon[(i + 1) % polygon.length]

      for (const rectEdge of rectEdges) {
        if (doLinesIntersect(rectEdge.start, rectEdge.end, polyStart, polyEnd)) {
          return false
        }
      }
    }

    // 3. Verificar puntos internos densos (especialmente cerca de ángulos)
    const INTERNAL_SAMPLES = 20
    for (let i = 1; i < INTERNAL_SAMPLES; i++) {
      for (let j = 1; j < INTERNAL_SAMPLES; j++) {
        const internalPoint = {
          x: x + (width * i) / INTERNAL_SAMPLES,
          y: y + (height * j) / INTERNAL_SAMPLES,
          label: `internal-${i}-${j}`
        }
        const isInside = pointInPolygon(internalPoint, polygon)
        if (!isInside) {
          return false
        }
      }
    }

    // 4. Verificar puntos adicionales muy cerca de los bordes (para capturar ángulos)
    const EDGE_SAMPLES = 25
    const EDGE_OFFSET = 2 // píxeles hacia adentro desde el borde

    // Puntos cerca del borde superior
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const t = i / EDGE_SAMPLES
      const point = { x: x + width * t, y: y + EDGE_OFFSET }
      if (!pointInPolygon(point, polygon)) {
        return false
      }
    }

    // Puntos cerca del borde inferior
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const t = i / EDGE_SAMPLES
      const point = { x: x + width * t, y: y + height - EDGE_OFFSET }
      if (!pointInPolygon(point, polygon)) {
        return false
      }
    }

    // Puntos cerca del borde izquierdo
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const t = i / EDGE_SAMPLES
      const point = { x: x + EDGE_OFFSET, y: y + height * t }
      if (!pointInPolygon(point, polygon)) {
        return false
      }
    }

    // Puntos cerca del borde derecho
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const t = i / EDGE_SAMPLES
      const point = { x: x + width - EDGE_OFFSET, y: y + height * t }
      if (!pointInPolygon(point, polygon)) {
        return false
      }
    }

    return true
  }

  // Cleanup automático para prevenir memory leaks
  const cleanupStaleStates = () => {
    const activeIds = new Set(canvasStore.elementosVisibles.map((e) => e.id))

    // Limpiar estados de elementos que ya no existen
    for (const id of transformInitialState.keys()) {
      if (!activeIds.has(id)) {
        transformInitialState.delete(id)
        transformState.delete(id)
      }
    }
  }

  // Helper para obtener nodos del stage directamente
  const getNode = (elementId) => {
    const stage = stageRef.value?.getNode?.()
    if (!stage) return null
    return stage.findOne(`#${elementId}`)
  }

  // Computeds
  const isEditingSelected = computed(
    () => editingElementId.value === canvasStore.elementoSeleccionado,
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

    // Verificar que no hay transformación activa antes de configurar
    if (isInteractingWithTransformer.value) return

    const trComp = transformerRef.value?.getNode?.()
    if (!trComp) return

    const node = getNode(canvasStore.elementoSeleccionado)
    if (node) {
      trComp.nodes([node])
      const elemento = canvasStore.elementosVisibles.find(
        (e) => e.id === canvasStore.elementoSeleccionado,
      )
      if (!elemento) {
        console.error(
          '[transform-error] Elemento no encontrado en elementosVisibles:',
          canvasStore.elementoSeleccionado,
        )
        return
      }

      trComp.setAttrs({
        flipEnabled: false,
        boundBoxFunc: (oldBox, newBox) => {
          const MINW = 10
          const MINH = 10
          if (newBox.width <= 0 || newBox.height <= 0) return oldBox
          if (newBox.width < MINW || newBox.height < MINH) return oldBox

          // Para elementos circulares, mantener aspecto cuadrado
          if (elemento?.forma === 'circular') {
            const size = Math.max(newBox.width, newBox.height)
            return { ...newBox, width: size, height: size }
          }

          // NO aplicar clamping aquí - permitir transformación libre
          return newBox
        },
      })
      trComp.getLayer()?.batchDraw?.()
    } else {
      console.warn(
        '[transform-warning] No se pudo encontrar el nodo para elemento:',
        canvasStore.elementoSeleccionado,
      )
    }
  }

  // Feedback visual ligero durante transformación
  const updateTransformVisualFeedback = (node, elementId) => {
    try {
      const shape = getNode(elementId)
      if (!shape) {
        console.warn('[transform-feedback] No se pudo encontrar el nodo para feedback:', elementId)
        return
      }

      const bbox = shape.findOne('.bbox')
      const elemento = canvasStore.elementosVisibles.find((e) => e.id === elementId)

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
      const shape = getNode(elementId)
      if (!shape) {
        console.warn(
          '[transform-clear-feedback] No se pudo encontrar el nodo para limpiar feedback:',
          elementId,
        )
        return
      }

      const elemento = canvasStore.elementosVisibles.find((e) => e.id === elementId)
      const bbox = shape.findOne('.bbox')
      const circle =
        elemento?.forma === 'circular' && canvasStore.vistaActiva === 'XY'
          ? shape.findOne('Circle')
          : null

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
    const elemento = canvasStore.elementosVisibles.find((e) => e.id === elementId)
    if (!elemento) {
      console.warn('[transform-revert] Elemento no encontrado para revertir:', elementId)
      return
    }

    const prev = transformInitialState.get(elementId) || {
      x: elemento.x,
      y: elemento.y,
      width: elemento.width,
      height: elemento.height,
      rotation: elemento.rotation || 0,
    }

    try {
      const node = getNode(elementId)
      if (node) {
        // NO aplicar corrección de precisión - usar valores originales exactos
        node.x(prev.x)
        node.y(prev.y)
        // Importante: resetear escala antes de reestablecer dimensiones para evitar drift
        if (typeof node.scaleX === 'function') node.scaleX(1)
        if (typeof node.scaleY === 'function') node.scaleY(1)
        if (typeof node.width === 'function') node.width(prev.width)
        if (typeof node.height === 'function') node.height(prev.height)
        node.rotation && node.rotation(prev.rotation || 0)
      } else {
        console.warn('[transform-revert] No se pudo encontrar el nodo para revertir:', elementId)
      }

      clearTransformVisualFeedback(elementId)
    } catch (error) {
      console.error('[transform-revert-error] Error revirtiendo transformación visual:', error)
    }

    console.debug('[transform-debug] reverted', elementId, { reason, prev })
    // Asegurar que las guías de snapping se limpien al revertir
    if (typeof clearGuides === 'function') {
      try {
        clearGuides()
      } catch (error) {
        console.warn('[transform-revert] Error limpiando guías:', error)
      }
    }
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

      // Mostrar guías de snapping al iniciar transform si está habilitado
      if (isSnappingEnabled?.value && typeof performSnap === 'function') {
        try {
          const elemento = canvasStore.elementosVisibles.find((e) => e.id === elementId)
          const neighbors = canvasStore.elementosVisibles.filter((el) => el.id !== elementId)
          const pageBounds = layerConfig?.value
            ? { width: layerConfig.value.width, height: layerConfig.value.height }
            : null
          // Usar un elemento temporal con las dimensiones actuales del nodo para que detectSnap calcule guías correctamente
          // Preserve circular shape: if elemento is circular, pass a square diameter (min) and keep forma
          const movingForSnap = elemento
            ? elemento.forma === 'circular'
              ? {
                  ...elemento,
                  width: Math.min(width, height),
                  height: Math.min(width, height),
                  forma: elemento.forma,
                }
              : { ...elemento, width, height }
            : { x, y, width, height }
          performSnap(movingForSnap, x, y, neighbors, pageBounds, {
            allowSnap: false,
            pageSnapDistance: 24,
            isTransforming: true,
          })
        } catch (error) {
          console.warn('[transform-start-snap] Error en snapping durante start:', error)
        }
      }
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

      // Durante el movimiento del transformer, aplicar snapping (efecto imán) si está habilitado
      if (isSnappingEnabled?.value && typeof performSnap === 'function') {
        try {
          const elemento = canvasStore.elementosVisibles.find((e) => e.id === elementId)
          const neighbors = canvasStore.elementosVisibles.filter((el) => el.id !== elementId)
          const pageBounds = layerConfig?.value
            ? { width: layerConfig.value.width, height: layerConfig.value.height }
            : null
          // Importante: pasar las dimensiones actuales (width/height) para que detectSnap compare el borde derecho correctamente
          // Preserve circular shape during transform snapping: use diameter (min of width/height)
          const movingForSnap = elemento
            ? elemento.forma === 'circular'
              ? {
                  ...elemento,
                  width: Math.min(width, height),
                  height: Math.min(width, height),
                  forma: elemento.forma,
                }
              : { ...elemento, width, height }
            : { x, y, width, height }
          const snapRes = performSnap(movingForSnap, x, y, neighbors, pageBounds, {
            allowSnap: false,
            pageSnapDistance: 24,
            isTransforming: true,
          })
        } catch (error) {
          console.warn('[transform-move-snap] Error en snapping durante move:', error)
        }
      }
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

      // Snapshot INMUTABLE del elemento al inicio para evitar race conditions
      // Crear un snapshot completo incluyendo todos los elementos visibles en este momento
      const elementosSnapshot = new Map(
        canvasStore.elementosVisibles.map(el => [el.id, Object.freeze({ ...el })])
      )

      const elemento = elementosSnapshot.get(elementId)
      if (!elemento) {
        console.warn('[transform-end] Elemento no encontrado en snapshot:', elementId)
        return
      }

      // Usar el snapshot congelado para todas las operaciones
      const elementoSnapshot = elemento

      // Extraer valores de Konva (mantener valores originales para Konva y store)
      const width = node.width() * node.scaleX()
      const height = node.height() * node.scaleY()
      const x = node.x()
      const y = node.y()
      const rotation = node.rotation?.() || 0

      // CORRECCIÓN DE PRECISIÓN: Solo para validaciones
      const valoresParaValidacion = correctTransformValues({
        x,
        y,
        width,
        height,
        rotation,
      })

      // Limpiar estado de transformación
      transformState.delete(elementId)

      // Preparar dimensiones (cm) para validaciones: se usarán tanto por guards como por validación de dimensiones
      let tempDimensiones = elementoSnapshot?.dimensiones
        ? { ...elementoSnapshot.dimensiones }
        : undefined
      if (tempDimensiones) {
        const widthCm = toTransformerPrecision(valoresParaValidacion.width / CM_TO_PX)
        const heightCm = toTransformerPrecision(valoresParaValidacion.height / CM_TO_PX)
        if (canvasStore.vistaActiva === 'XY') {
          tempDimensiones.ancho = widthCm
          tempDimensiones.largo = heightCm
        } else if (canvasStore.vistaActiva === 'XZ') {
          tempDimensiones.ancho = widthCm
          tempDimensiones.alto = heightCm
          if (tempDimensiones.largo === undefined)
            tempDimensiones.largo = elementoSnapshot.dimensiones?.largo || 60
        }
      }

      // VALIDACIÓN 1: Guards del sistema (usar valores corregidos con contexto de transformación y dimensiones cm)
      const guardRes = onTransformEndGuard(
        elementoSnapshot,
        {
          x: valoresParaValidacion.x,
          y: valoresParaValidacion.y,
          width: valoresParaValidacion.width,
          height: valoresParaValidacion.height,
          rotation: valoresParaValidacion.rotation,
          dimensiones: tempDimensiones,
        },
        {
          revert: () => revertTransform(elementId, 'guard validation failed'),
          validationOptions: { isTransforming: true } // Indicar que es una validación de transformación
        },
      )
      if (!guardRes.valid) return

      // VALIDACIÓN 2: Verificar que esté dentro del polígono de la planta
      try {
        if (typeof computeBoundary === 'function') {
          const boundary = computeBoundary()
          if (boundary && boundary.type === 'polygon') {
            let isInsidePolygon = false
            const polygon = boundary.inset || boundary.points

            if (elemento?.forma === 'circular') {
              // Para círculos, verificar que el círculo completo esté dentro
              const radius = Math.min(width, height) / 2
              const centerX = x + radius
              const centerY = y + radius
              isInsidePolygon = circleInPolygon({ x: centerX, y: centerY, radius }, polygon)
            } else {
              // Para rectángulos, usar verificación completa con muestreo denso
              isInsidePolygon = isRectCompletelyInPolygon(x, y, width, height, polygon)
            }

            if (!isInsidePolygon) {
              showToast('El elemento debe permanecer completamente dentro del área de la planta', 'warning')
              revertTransform(elementId, 'elemento fuera del polígono')
              return
            }
          }
        }
      } catch (err) {
        console.warn('[transform-boundary-validation-error]', err)
      }

      // VALIDACIÓN 3: Placement validation (colisiones, área) - usar valores corregidos
      // Usar neighbors del snapshot para evitar cambios durante la validación
      const neighbors = Array.from(elementosSnapshot.values()).filter((e) => e.id !== elementId)
      const areaBounds = {
        minX: 0,
        minY: 0,
        maxX: layerConfig.value.width,
        maxY: layerConfig.value.height,
      }
      const elementoParaValidacion =
        elementoSnapshot?.forma === 'circular'
          ? {
              ...elementoSnapshot,
              x: valoresParaValidacion.x,
              y: valoresParaValidacion.y,
              width: Math.min(valoresParaValidacion.width, valoresParaValidacion.height),
              height: Math.min(valoresParaValidacion.width, valoresParaValidacion.height),
              forma: elementoSnapshot.forma,
            }
          : {
              ...elementoSnapshot,
              x: valoresParaValidacion.x,
              y: valoresParaValidacion.y,
              width: valoresParaValidacion.width,
              height: valoresParaValidacion.height
            }

      const isValidNow = isPlacementValid({
        pos: { x: valoresParaValidacion.x, y: valoresParaValidacion.y },
        movingEl: elementoParaValidacion,
        neighbors,
        areaBounds,
        CM_TO_PX,
        epsPx: 0.5,
      })

      if (!isValidNow) {
        revertTransform(elementId, 'placement validation failed')
        nextTick(() => setupTransformer())
        return
      }

      // VALIDACIÓN 3: Dimension validation (usar valores corregidos)
      // tempDimensiones ya calculado para los guards; se reutiliza para validación de dimensiones

      // Crear elemento temporal con valores corregidos solo para validación
      const elementoTemporal = {
        ...elementoSnapshot,
        x: valoresParaValidacion.x,
        y: valoresParaValidacion.y,
        width: valoresParaValidacion.width,
        height: valoresParaValidacion.height,
        dimensiones: tempDimensiones,
      }

      // Ejecutar validación de dimensiones (silenciosa y con tolerancia para transformaciones)
      const resultadoValidacionDimensiones = dimensionValidation.validarDimensiones(
        elementId,
        {
          ancho: tempDimensiones?.ancho,
          largo: tempDimensiones?.largo,
          alto: tempDimensiones?.alto,
        },
        {
          silencioso: true,
          elementoTemporal: elementoTemporal, // Pasar el elemento con coordenadas de transformación
          isTransforming: true, // Indicar que es una validación durante transformación
          relaxedTolerance: true, // Usar tolerancias más permisivas
        },
      )

      if (!resultadoValidacionDimensiones.valida) {
        showToast(resultadoValidacionDimensiones.razon, 'error', { timeout: 5000 })

        revertTransform(
          elementId,
          `dimension validation failed: ${resultadoValidacionDimensiones.razon}`,
        )
        nextTick(() => setupTransformer())
        return
      }

      // APLICACIÓN EXITOSA
      const newDimensiones = tempDimensiones

      // Solo verificamos para detectar inconsistencias en las validaciones
      const bounds = {
        minX: 0,
        minY: 0,
        maxX: layerConfig.value.width,
        maxY: layerConfig.value.height,
      }

      // IMPORTANTE: Usar valores originales de Konva (sin corrección de precisión)
      // Solo aplicar dimensiones y rotación originales - NO modificar coordenadas x, y
      const valoresFinales = {
        width,
        height,
        rotation,
      }

      // Aplicar solo dimensiones y rotación originales - NUNCA modificar x, y después de transformer
      node.width(valoresFinales.width)
      node.height(valoresFinales.height)
      node.scaleX(1)
      node.scaleY(1)
      // NO llamar node.x() ni node.y() - dejar que transformer mantenga sus coordenadas

      // Para el store, usar las coordenadas finales del transformer sin corrección
      const finalNodeX = node.x()
      const finalNodeY = node.y()

      // Limpiar feedback visual
      clearTransformVisualFeedback(elementId)
      // Limpiar guías visibles
      if (typeof clearGuides === 'function') {
        try {
          clearGuides()
        } catch (e) {
          console.warn('[transform-end] Error limpiando guías:', e)
        }
      }

      // Persistir en el store usando valores originales (sin corrección de precisión)
      canvasStore.actualizarElemento(
        elementId,
        {
          x: finalNodeX, // Coordenadas originales del transformer
          y: finalNodeY, // Coordenadas originales del transformer
          width: valoresFinales.width, // Dimensiones originales
          height: valoresFinales.height, // Dimensiones originales
          rotation: valoresFinales.rotation,
          dimensiones: newDimensiones,
          dimensionLock: true,
        },
        true,
        `Elemento redimensionado: ${elementoSnapshot?.nombre || elementoSnapshot?.tipo || elementId}`,
      )

      lastValidPositions.value.set(elementId, { x: finalNodeX, y: finalNodeY })

      nextTick(() => setupTransformer())
    } catch (err) {
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
  watch(
    () => canvasStore.elementoSeleccionadoCompleto,
    (elementoActual) => {
      if (elementoActual && isEditingSelected.value && !isInteractingWithTransformer.value) {
        nextTick(() => {
          setupTransformer()
        })
      }
    },
    { deep: true },
  )

  // Cleanup automático periódico para prevenir memory leaks
  const cleanupInterval = setInterval(() => {
    cleanupStaleStates()
  }, 30000) // Cada 30 segundos

  // Cleanup al desmontar
  const cleanup = () => {
    clearInterval(cleanupInterval)
    transformInitialState.clear()
    transformState.clear()
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
    cleanupStaleStates,

    // Cleanup
    cleanup,
  }
}
