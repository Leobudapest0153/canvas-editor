import { ref, computed, watch, nextTick } from 'vue'
import { throttleEveryNFrames } from '@/inventory-smart/utils/dragMath'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { clampInsideArea } from '@/inventory-smart/utils/bounds'
import { circleInPolygon, pointInPolygon } from '@/inventory-smart/utils/polygonBounds'

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

  // Cache de nodos para evitar múltiples findOne() calls
  const nodeCache = new Map()
  const MAX_CACHE_SIZE = 50

  // Helper para verificar si un rectángulo está completamente dentro del polígono
  // Usa intersección de segmentos para detectar si algún borde del rectángulo cruza el polígono
  const isRectCompletelyInPolygon = (x, y, width, height, polygon) => {
    console.debug('[rect-validation-start]', { x, y, width, height, polygon: polygon?.length })

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
        console.error('[corner-failed]', corner)
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
          console.error('[edge-intersection]', {
            rectEdge: rectEdge.label,
            rectStart: rectEdge.start,
            rectEnd: rectEdge.end,
            polyStart,
            polyEnd
          })
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
          console.error('[internal-failed]', internalPoint)
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
        console.error('[near-edge-failed]', { point, edge: 'top' })
        return false
      }
    }
    
    // Puntos cerca del borde inferior
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const t = i / EDGE_SAMPLES
      const point = { x: x + width * t, y: y + height - EDGE_OFFSET }
      if (!pointInPolygon(point, polygon)) {
        console.error('[near-edge-failed]', { point, edge: 'bottom' })
        return false
      }
    }
    
    // Puntos cerca del borde izquierdo
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const t = i / EDGE_SAMPLES
      const point = { x: x + EDGE_OFFSET, y: y + height * t }
      if (!pointInPolygon(point, polygon)) {
        console.error('[near-edge-failed]', { point, edge: 'left' })
        return false
      }
    }
    
    // Puntos cerca del borde derecho
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
      const t = i / EDGE_SAMPLES
      const point = { x: x + width - EDGE_OFFSET, y: y + height * t }
      if (!pointInPolygon(point, polygon)) {
        console.error('[near-edge-failed]', { point, edge: 'right' })
        return false
      }
    }

    console.debug('[rect-validation-passed]', { 
      totalPointsChecked: corners.length + (INTERNAL_SAMPLES - 1) * (INTERNAL_SAMPLES - 1) + (EDGE_SAMPLES + 1) * 4,
      rectBounds: { x, y, width, height, right: x + width, bottom: y + height }
    })
    return true
  }

  // Cache de nodos para evitar múltiples findOne() calls

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
  // Asegurar que las gudas de snapping se limpien al revertir
  try { if (typeof clearGuides === 'function') clearGuides() } catch (e) { /* ignore */ }
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
      // Mostrar gudas de snapping al iniciar transform si est  habilitado
      try {
        if (isSnappingEnabled && isSnappingEnabled.value && typeof performSnap === 'function') {
          const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
          const neighbors = canvasStore.elementosVisibles.filter(el => el.id !== elementId)
          const pageBounds = layerConfig?.value ? { width: layerConfig.value.width, height: layerConfig.value.height } : null
          // Usar un elemento temporal con las dimensiones actuales del nodo para que detectSnap calcule gudas correctamente
          // Preserve circular shape: if elemento is circular, pass a square diameter (min) and keep forma
          const movingForSnap = elemento
            ? (elemento.forma === 'circular'
                ? { ...elemento, width: Math.min(width, height), height: Math.min(width, height), forma: elemento.forma }
                : { ...elemento, width, height })
            : { x, y, width, height }
          performSnap(movingForSnap, x, y, neighbors, pageBounds, { allowSnap: false, pageSnapDistance: 24 })
        }
      } catch { /* ignore */ }
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

      // Durante el movimiento del transformer, aplicar snapping (efecto im n) si est  habilitado
      try {
        if (isSnappingEnabled && isSnappingEnabled.value && typeof performSnap === 'function') {
          const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
          const neighbors = canvasStore.elementosVisibles.filter(el => el.id !== elementId)
          const pageBounds = layerConfig?.value ? { width: layerConfig.value.width, height: layerConfig.value.height } : null
          // Importante: pasar las dimensiones actuales (width/height) para que detectSnap compare el borde derecho correctamente
          // Preserve circular shape during transform snapping: use diameter (min of width/height)
          const movingForSnap = elemento
            ? (elemento.forma === 'circular'
                ? { ...elemento, width: Math.min(width, height), height: Math.min(width, height), forma: elemento.forma }
                : { ...elemento, width, height })
            : { x, y, width, height }
          const snapRes = performSnap(movingForSnap, x, y, neighbors, pageBounds, { allowSnap: true, pageSnapDistance: 24 })
          if (snapRes && (snapRes.x !== x || snapRes.y !== y)) {
            node.x(snapRes.x)
            node.y(snapRes.y)
            // Actualizar el estado cache con la posici n ajustada
            transformState.set(elementId, { x: snapRes.x, y: snapRes.y, width, height })
            node.getLayer()?.batchDraw?.()
          }
        }
      } catch (err) { /* ignore */ }

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

      // VALIDACIÓN 2: Verificar que esté dentro del polígono de la planta
      try {
        if (typeof computeBoundary === 'function') {
          const boundary = computeBoundary()
          if (boundary && boundary.type === 'polygon') {
            let isInsidePolygon = false
            const polygon = boundary.inset || boundary.points
            
            console.debug('[transform-boundary-check]', {
              elementId,
              forma: elemento?.forma,
              position: { x, y, width, height },
              polygonPoints: polygon?.length || 0
            })
            
            if (elemento?.forma === 'circular') {
              // Para círculos, verificar que el círculo completo esté dentro
              const radius = Math.min(width, height) / 2
              const centerX = x + radius
              const centerY = y + radius
              isInsidePolygon = circleInPolygon({ x: centerX, y: centerY, radius }, polygon)
              
              console.debug('[transform-circle-check]', {
                center: { x: centerX, y: centerY },
                radius,
                isInside: isInsidePolygon
              })
            } else {
              // Para rectángulos, usar verificación completa con muestreo denso
              isInsidePolygon = isRectCompletelyInPolygon(x, y, width, height, polygon)
              
              console.debug('[transform-rect-check]', {
                rect: { x, y, width, height },
                isInside: isInsidePolygon,
                samplingPoints: '10 per side + 8x8 internal grid + midpoints'
              })
            }

            if (!isInsidePolygon) {
              console.debug('[transform-debug] Elemento fuera del polígono, revirtiendo transformación')
              showToast('El elemento debe permanecer completamente dentro del área de la planta', 'warning')
              revertTransform(elementId, 'elemento fuera del polígono')
              return
            } else {
              console.debug('[transform-debug] Elemento validado correctamente dentro del polígono')
            }
          }
        }
      } catch (err) {
        console.warn('[transform-boundary-validation-error]', err)
      }

      // VALIDACIÓN 3: Placement validation (colisiones, área)
      const neighbors = canvasStore.elementosVisibles.filter(e => e.id !== elementId)
      const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
      const elementoParaValidacion = elemento?.forma === 'circular'
        ? { ...elemento, x, y, width: Math.min(width, height), height: Math.min(width, height), forma: elemento.forma }
        : { ...elemento, x, y, width, height }

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
  // Limpiar gudas visibles
  try { if (typeof clearGuides === 'function') clearGuides() } catch (e) { /* ignore */ }

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
