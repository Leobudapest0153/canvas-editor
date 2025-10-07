/**
 * Composable para manejar el arrastre de elementos en el canvas
 * Incluye lógica de RAF drag, validaciones, snapping y resolución de colisiones
 */

import { ref, nextTick } from 'vue'
import { useCacheOnDrag } from '@/inventory-smart/composables/useCacheOnDrag'
import { setupRafDrag } from '@/inventory-smart/composables/useRafDrag'
import { enablePerfMode } from '@/inventory-smart/composables/usePerfMode'
import { throttleEveryNFrames } from '@/inventory-smart/utils/dragMath'
import { applyEdgeConstraint } from '@/inventory-smart/utils/edgeConstraint'
import { resetEdgeState } from '@/inventory-smart/composables/useEdgeState'
import { finalizePlacement, solveFinalPlacement } from '@/inventory-smart/utils/finalizeDrag'
import { solveDragPosition } from '@/inventory-smart/utils/placementSolver'
import { resolveCoplanarNeighbors, rangesOverlap, PLACEMENT_TOLERANCES } from '@/inventory-smart/validation/placementOrchestrator'
import { resolveVerticalProps } from '@/inventory-smart/validation/fieldResolvers'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { makeInnerSession } from '@/inventory-smart/composables/useInnerNoOverlap'
import { GRID_SIZE, CM_TO_PX } from '@/inventory-smart/utils/constants'
import { boundaryToAreaBounds } from '@/inventory-smart/utils/bounds'
import {
  detectConflictsFor,
  computeMTD,
  projectMTDAgainstBoundary,
} from '@/inventory-smart/utils/collision'
import {
  clampRectToPolygon,
  clampCircleToPolygon,
  clampCircleToPolygonSmooth,
  pointInPolygon,
  clampPointToPolygon,
} from '@/inventory-smart/utils/polygonBounds'
import { clampRectToRect } from '@/inventory-smart/utils/geometry'

export function useElementDrag({
  canvasStore,
  stageRef,
  layerRef,
  layerConfig,
  conflictsApi,
  showToast,
  isElementLocked,
  isSnappingEnabled,
  performSnap,
  clearGuides,
  onDragStartGuard,
  onDragMoveGuard,
  onDragEndGuard,
  setLiveConflictsThrottled,
  computeBoundary,
}) {
  // Estado del drag
  const isElementDragging = ref(false)
  const stageDragEnabled = ref(true)

  // Tracking de posiciones
  const dragStartPositions = ref(new Map())
  const lastValidPositions = ref(new Map())
  const lastDesiredPosMap = ref(new Map())
  const lastVelocityMap = ref(new Map())

  // RAF + Perf mode state per element
  const rafControllers = new Map()
  const perfContexts = new Map()
  const innerSessions = new Map()
  // Estado de contacto por elemento para deslizamiento (como en sesiones internas)
  const contactState = new Map()
  const throttle2 = throttleEveryNFrames(2)

  // Schedule drawing
  let needsDraw = false
  let rafId = null

  function scheduleDraw() {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (needsDraw) {
        const layerNode = layerRef.value?.getNode ? layerRef.value.getNode() : layerRef.value
        layerNode?.batchDraw?.()
        needsDraw = false
      }
    })
  }

  // Resolver posición con solver compartido (deslizante por eje, multi-vecino), respetando polígono/infinito
  const resolveAgainstBlockingObstacles = (candidateX, candidateY, elemento) => {
    const all = canvasStore.elementosVisibles
    const boundary = computeBoundary() || {}
    const areaBounds = boundaryToAreaBounds(boundary, {
      minX: 0,
      minY: 0,
      maxX: layerConfig.value.width,
      maxY: layerConfig.value.height,
      mode: boundary?.mode || 'fixed',
      polygon: boundary?.type === 'polygon' ? boundary.points : null,
    })

    // Vecinos candidatos (excluir self)
    const candidates = all.filter((e) => e && e.id !== elemento.id)
    // Coplanares (misma ubic y misma capa Z)
    const coplanar = resolveCoplanarNeighbors({ ...elemento }, candidates)
    const hardNeighbors = coplanar.filter((e) => (e.ubicacion || 'suelo') === 'suelo' && (elemento.ubicacion || 'suelo') === 'suelo')

    // Soft neighbors para efecto deslizante:
    // - pared–pared: coplanares en pared
    const softWalls = coplanar.filter((e) => (e.ubicacion || 'suelo') === 'pared' && (elemento.ubicacion || 'suelo') === 'pared')
    // - suelo–pared con solape vertical (Z)
    const softCross = candidates.filter((n) => {
      const ua = (elemento.ubicacion || 'suelo').toLowerCase()
      const ub = (n.ubicacion || 'suelo').toLowerCase()
      if ((ua === 'suelo' && ub === 'pared') || (ua === 'pared' && ub === 'suelo')) {
        const a = resolveVerticalProps(elemento, {})
        const b = resolveVerticalProps(n, {})
        if (!Number.isFinite(a.zBaseCm) || !Number.isFinite(a.altoCm) || !Number.isFinite(b.zBaseCm) || !Number.isFinite(b.altoCm)) return false
        const a0 = a.zBaseCm, a1 = a.zBaseCm + a.altoCm
        const b0 = b.zBaseCm, b1 = b.zBaseCm + b.altoCm
        return rangesOverlap(a0, a1, b0, b1, PLACEMENT_TOLERANCES.Z_LAYER)
      }
      return false
    })
    const softNeighbors = [...softWalls, ...softCross]

    const lastPos = lastValidPositions.value.get(elemento.id) || { x: elemento.x, y: elemento.y }
    const lastVel = lastVelocityMap.value.get(elemento.id) || { x: 0, y: 0 }

    const moving = elemento.forma === 'circular'
      ? { ...elemento, width: Math.min(elemento.width, elemento.height), height: Math.min(elemento.width, elemento.height), forma: 'circular' }
      : { ...elemento, forma: elemento.forma || 'rectangular' }

    const solved = solveDragPosition({
      candidate: { x: candidateX, y: candidateY },
      movingEl: moving,
      hardNeighbors,
      softNeighbors,
      areaBounds,
      lastValidPos: lastPos,
      lastVelocity: lastVel,
      maxIters: 6,
    })

    return { x: solved.x, y: solved.y, fellBack: solved.fellBack }
  }

  // Map of template refs for draggable nodes, keyed by element id
  const draggableNodeRefs = new Map()
  const registerDraggableRef = (id, node) => {
    let r = draggableNodeRefs.get(id)
    if (!r) {
      r = ref(null)
      draggableNodeRefs.set(id, r)
      // Enable caching on drag for this node
      useCacheOnDrag(r)
    }
    r.value = node
  }

  const startElementDrag = (elementId, options = {}) => {
    const { select = true } = options
    if (isElementLocked(elementId)) {
      // Si está bloqueado, no iniciar drag ni mover el layer
      isElementDragging.value = false
      stageDragEnabled.value = false
      return
    }

    const isNotCurrentElement = canvasStore.elementoSeleccionado !== elementId
    if (canvasStore.cambiosNoAplicados && isNotCurrentElement) {
      isElementDragging.value = false
      stageDragEnabled.value = false

      const msg = 'No puedes arrastrar un elemento con cambios pendientes de guardar'
      showToast(msg, 'warn')
      return
    }

    isElementDragging.value = true
    stageDragEnabled.value = false // Deshabilitar arrastre del canvas

    // Seleccionar elemento automáticamente al arrastrarlo (si aplica)
    if (select) {
      canvasStore.seleccionarElemento(elementId)
    }

    const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
    if (elemento) {
      dragStartPositions.value.set(elementId, { x: elemento.x, y: elemento.y })
      lastValidPositions.value.set(elementId, { x: elemento.x, y: elemento.y })
      // Inicializar pos deseada y velocidad
      lastDesiredPosMap.value.set(elementId, { x: elemento.x, y: elemento.y })
      lastVelocityMap.value.set(elementId, { x: 0, y: 0 })
    }

    // Resetear estado de borde/histéresis al iniciar
    try {
      resetEdgeState(elementId)
    } catch {
      /* ignore */
    }

    // Limpiar conflictos previos al iniciar un nuevo arrastre
    conflictsApi.clear()

    // Habilitar modo performance en layer y arrancar rAF loop
    try {
      const stage = stageRef.value.getNode()
      const layer = layerRef.value.getNode()
      const shape = stage.findOne(`#${elementId}`)
      if (layer && shape) {
        const ctx = enablePerfMode(layer, { shape })
        perfContexts.set(elementId, ctx)

        const getMovingShapeBBox = () => {
          if (!shape) return null
          return {
            x: shape.x(),
            y: shape.y(),
            width: shape.width?.() || 0,
            height: shape.height?.() || 0,
          }
        }

        const onValidateLight = throttle2((bbox) => {
          // Overlay rojo/ok basado en el MISMO predicado de validez (modelo puro)
          const boundary = typeof computeBoundary === 'function' ? computeBoundary() : null
          const areaBounds = boundaryToAreaBounds(boundary, {
            minX: 0,
            minY: 0,
            maxX: layerConfig.value.width,
            maxY: layerConfig.value.height,
            polygon: boundary?.type === 'polygon' ? boundary.points : null,
            mode: boundary?.mode || 'fixed',
          })
          const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
          if (!elemento) return
          const moving = {
            id: elementId,
            width: elemento.forma === 'circular' ? Math.min(bbox.width, bbox.height) : bbox.width,
            height: elemento.forma === 'circular' ? Math.min(bbox.width, bbox.height) : bbox.height,
            forma: elemento.forma || 'rectangular',
            ubicacion: elemento.ubicacion || 'suelo',
          }
          const neighbors = canvasStore.elementosVisibles.filter((e) => e.id !== elementId)
          const isOk = isPlacementValid({
            pos: { x: bbox.x, y: bbox.y },
            movingEl: moving,
            neighbors,
            areaBounds,
            CM_TO_PX,
            epsPx: 0.5,
          })
          const warn = !isOk
          try {
            const bbox = shape.findOne('.bbox')
            const circle =
              elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'
                ? shape.findOne('Circle')
                : null
            if (elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY') {
              circle?.stroke(warn ? '#ef4444' : undefined)
              circle?.strokeWidth(warn ? 2 : 0)
            } else {
              bbox?.stroke(warn ? '#ef4444' : undefined)
              bbox?.strokeWidth(warn ? 2 : 0)
            }
          } catch {
            console.warn('Error al actualizar el color del borde del shape:', elementId)
          }
        })

        const onCommitEnd = () => {}

        // onFrame: aplicar clamp puro de borde con histéresis y luego resolver colisiones
        const onFrame = (desiredPos) => {
          if (!shape) return
          const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
          if (!elemento) return
          const W = layerConfig.value.width
          const H = layerConfig.value.height
          const boundary = typeof computeBoundary === 'function' ? computeBoundary() : null
          const areaBounds = boundaryToAreaBounds(boundary, {
            minX: 0,
            minY: 0,
            maxX: W,
            maxY: H,
            polygon: boundary?.type === 'polygon' ? boundary.points : null,
            mode: boundary?.mode || 'fixed',
          })

          // Para círculos, desiredPos ya es top-left (convertido en updateElementPosition)
          const asRect =
            elemento.forma === 'circular'
              ? {
                  ...elemento,
                  width: Math.min(elemento.width, elemento.height),
                  height: Math.min(elemento.width, elemento.height),
                }
              : elemento

          const { pos } = applyEdgeConstraint(
            { x: desiredPos.x, y: desiredPos.y },
            asRect,
            areaBounds,
          )

          // Resolver colisiones después del clamp a borde
          let x = pos.x
          let y = pos.y
          const res = resolveAgainstBlockingObstacles(x, y, asRect)
          x = res.x
          y = res.y

          // Escribir en el shape sin snap durante drag
          shape.x(x)
          shape.y(y)
          lastValidPositions.value.set(elementId, { x, y })
        }

        // Función de validación para el RAF drag
        const validatePosition = (pos) => {
          const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
          if (!elemento) return false
          const neighbors = canvasStore.elementosVisibles.filter((e) => e.id !== elementId)
          const boundary = typeof computeBoundary === 'function' ? computeBoundary() : null
          const areaBounds = boundaryToAreaBounds(boundary, {
            minX: 0,
            minY: 0,
            maxX: layerConfig.value.width,
            maxY: layerConfig.value.height,
            polygon: boundary?.type === 'polygon' ? boundary.points : null,
            mode: boundary?.mode || 'fixed',
          })
          return isPlacementValid({ pos, movingEl: elemento, neighbors, areaBounds, CM_TO_PX, epsPx: 0.5 })
        }

        const ctrl = setupRafDrag({
          stage,
          layer,
          getMovingShapeBBox,
          onValidateLight,
          onCommitEnd,
          onFrame,
          validatePosition,
        })
        rafControllers.set(elementId, { ctrl, shape, layer })
        ctrl.start()
      }
    } catch {
      console.warn('Error al iniciar el arrastre del elemento:', elementId)
    }
  }

  const updateElementPosition = (e, elementId) => {
    if (canvasStore.cambiosNoAplicados && canvasStore.elementoSeleccionado) {
      return
    }
    const target = e.target
    let x = target.x()
    let y = target.y()
    const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
    if (!elemento) return

    // Aplicar object snapping solo si está habilitado y hay movimiento activo
    if (isSnappingEnabled.value && isElementDragging.value) {
      const otherElements = canvasStore.elementosVisibles.filter((el) => el.id !== elementId)
      // Evitar object-snapping en vista frontal (XZ) — causa "ajuste invisible"
      let snapResult = { x, y }
      if (canvasStore.vistaActiva !== 'XZ') {
        snapResult = performSnap(elemento, x, y, otherElements, {
          width: layerConfig.value.width,
          height: layerConfig.value.height,
        })
      } else {
        // En XZ mostrar guías pero no mover el elemento; usar snapDistance menor para mayor precisión visual
        snapResult = performSnap(
          elemento,
          x,
          y,
          otherElements,
          { width: layerConfig.value.width, height: layerConfig.value.height },
          { allowSnap: false, snapDistance: 0.5 },
        )
      }

      // Usar la posición ajustada por snapping (o la original si se omitió)
      x = snapResult.x
      y = snapResult.y
    } else {
      // Si el snapping está deshabilitado o no hay arrastre activo, limpiar guías
      clearGuides()
    }

    // Actualizar lastVelocity respecto a la última pos deseada conocida
    const prev = lastDesiredPosMap.value.get(elementId) || { x: elemento.x, y: elemento.y }
    lastVelocityMap.value.set(elementId, { x: x - prev.x, y: y - prev.y })
    lastDesiredPosMap.value.set(elementId, { x, y })

    // Detectar conflictos en tiempo real (no bloquea)
    const moving = { ...elemento, x, y }
    setLiveConflictsThrottled(moving)

    // Dejar feedback visual y draw al rAF loop; NO escribir en store
    const rec = rafControllers.get(elementId)
    if (rec && rec.ctrl) rec.ctrl.move({ x, y })
  }

  const endElementDrag = async (elementId) => {
    isElementDragging.value = false
    stageDragEnabled.value = true // Rehabilitar arrastre del canvas

    // Limpiar guías de snapping
    clearGuides()

    // Guardar en historial al finalizar el arrastre
    const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
    if (!elemento) return

    // Obtener lastGoodPos y pausar rAF/validaciones live
    const rec = rafControllers.get(elementId)
    let lastGoodPos = null
    if (rec && rec.ctrl && rec.ctrl.getLastGoodPos) {
      lastGoodPos = rec.ctrl.getLastGoodPos()
    }
    // Pausar rAF inmediatamente para evitar interferencias durante finalize
    try {
      rec?.ctrl?.end?.()
    } catch {
      /* ignore */
    }

    // Ejecutar validación y finalización con nueva lógica
    try {
      const stage = stageRef.value.getNode()
      const layer = layerRef.value.getNode()
      const shape = stage.findOne(`#${elementId}`)
      if (shape && layer) {
        const boundary = typeof computeBoundary === 'function' ? computeBoundary() : null
        const areaBounds = boundaryToAreaBounds(boundary, {
          minX: 0,
          minY: 0,
          maxX: layerConfig.value.width,
          maxY: layerConfig.value.height,
          polygon: boundary?.type === 'polygon' ? boundary.points : null,
          mode: boundary?.mode || 'fixed',
        })
        const elementoActual = canvasStore.elementosVisibles.find((e) => e.id === elementId)
        if (elementoActual) {
          // Candidato desde el shape (bbox de modelo)
          let candX = shape.x()
          let candY = shape.y()

          // Vecinos bloqueantes (suelo–suelo)
          let neighbors = []
          try {
            const isInfiniteFloor = canvasStore.estaEnPlanta && canvasStore.plantaActivaData?.isInfinite === true
            const plantaId = canvasStore.plantaActivaData?.id
            if (isInfiniteFloor && plantaId && typeof canvasStore.elementosEnPlanta === 'function') {
              neighbors = (canvasStore.elementosEnPlanta(plantaId) || []).filter(
                (e) =>
                  e &&
                  e.id !== elementId &&
                  (e.ubicacion || 'suelo') === 'suelo' &&
                  (elementoActual.ubicacion || 'suelo') === 'suelo',
              )
            } else {
              neighbors = canvasStore.elementosVisibles.filter(
                (e) =>
                  e.id !== elementId &&
                  (e.ubicacion || 'suelo') === 'suelo' &&
                  (elementoActual.ubicacion || 'suelo') === 'suelo',
              )
            }
          } catch {
            neighbors = canvasStore.elementosVisibles.filter(
              (e) =>
                e.id !== elementId &&
                (e.ubicacion || 'suelo') === 'suelo' &&
                (elementoActual.ubicacion || 'suelo') === 'suelo',
            )
          }

          // strokePxEstable: usar el stroke normal del elemento (no la selección). Por defecto 1px
          const strokePx = 1

          // 1. Verificar validez de la posición actual después de finalizePlacement
          const lastPos = lastValidPositions.value.get(elementId) || {
            x: elementoActual.x,
            y: elementoActual.y,
          }
          const lastVel = lastVelocityMap.value.get(elementId) || { x: 0, y: 0 }

          // Elemento rectangular para resolver (círculos como AABB)
          const asRect =
            elementoActual.forma === 'circular'
              ? {
                  ...elementoActual,
                  width: Math.min(elementoActual.width, elementoActual.height),
                  height: Math.min(elementoActual.width, elementoActual.height),
                }
              : { ...elementoActual }
          asRect.__strokePx = strokePx

          // Ejecutar finalizePlacement primero
          const effectiveGrid =
            canvasStore.vistaActiva === 'XZ' ? 0 : (canvasStore.gridSize ?? GRID_SIZE)

          const solved = finalizePlacement({
            candidate: { x: candX, y: candY },
            movingEl: asRect,
            neighbors,
            areaBounds,
            grid: effectiveGrid,
            lastValidPos: lastPos,
            CM_TO_PX,
            strokePx,
            lastVelocity: lastVel,
          })

          // 2. Verificar validez final con el MISMO predicado isPlacementValid (modelo puro)
          const finalIsValid = isPlacementValid({
            pos: { x: solved.x, y: solved.y },
            movingEl: elementoActual,
            neighbors,
            areaBounds,
            CM_TO_PX,
            epsPx: 0.5,
          })

          let finalPosition = { x: solved.x, y: solved.y }
          let fallbackUsed = false

          // 3. Si la posición final no es válida, usar lastGoodPos o lastValidPos
          if (!finalIsValid) {
            console.log('Posición final inválida, usando fallback...')

            if (lastGoodPos) {
              finalPosition = { x: lastGoodPos.x, y: lastGoodPos.y }
            } else {
              finalPosition = { x: lastPos.x, y: lastPos.y }
            }

            // Aplicar clamp→snap→re-clamp en la posición de fallback
            const { MARGIN_CM } = await import('@/inventory-smart/utils/constants')
            const marginPx = (MARGIN_CM || 0) * (CM_TO_PX || 1)

            const reclampResult = finalizePlacement({
              candidate: finalPosition,
              movingEl: asRect,
              neighbors,
              areaBounds,
              grid: effectiveGrid,
              lastValidPos: lastPos,
              CM_TO_PX,
              strokePx,
              lastVelocity: { x: 0, y: 0 }, // Sin velocidad en fallback
            })

            // Validar el resultado del re-clamp
            const reclampIsValid = isPlacementValid({
              pos: { x: reclampResult.x, y: reclampResult.y },
              movingEl: elementoActual,
              neighbors,
              areaBounds,
              CM_TO_PX,
              epsPx: 0.5,
            })

            if (reclampIsValid) {
              finalPosition = { x: reclampResult.x, y: reclampResult.y }
            } else {
              // Si sigue inválido, mantener lastValidPos original
              finalPosition = { x: lastPos.x, y: lastPos.y }
            }

            fallbackUsed = true
          }

          // 4. Aplicar posición final al shape
          shape.x(finalPosition.x)
          shape.y(finalPosition.y)

          // 5. Limpiar stroke rojo - elemento ya no debe estar en estado inválido
          try {
            const bbox = shape.findOne('.bbox')
            const circle =
              elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'
                ? shape.findOne('Circle')
                : null
            if (elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY') {
              circle?.stroke(undefined)
              circle?.strokeWidth(0)
            } else {
              bbox?.stroke(undefined)
              bbox?.strokeWidth(0)
            }
          } catch {
            console.warn('Error al limpiar stroke del shape:', elementId)
          }

          // Repaint sincronizado
          await nextTick()
          await new Promise((r) => requestAnimationFrame(() => r()))
          layer.clearCache?.()
          layer.batchDraw?.()
          await new Promise((r) => requestAnimationFrame(() => r()))

          // 6. Guardar snapshot solo si la posición final difiere de lastValidPos
          const positionChanged =
            Math.abs(finalPosition.x - lastPos.x) > 1e-6 ||
            Math.abs(finalPosition.y - lastPos.y) > 1e-6

          if (positionChanged) {
            const guardRes = onDragEndGuard(elementoActual, finalPosition)
            if (guardRes.valid) {
              canvasStore.actualizarPosicion(
                elementId,
                finalPosition.x,
                finalPosition.y,
                true,
                `Elemento movido: ${elementoActual.nombre || elementoActual.tipo || elementId}`,
              )
            }
          }
          // Actualizar lastValidPositions con la posición final
          lastValidPositions.value.set(elementId, finalPosition)
        }
      }
    } catch (err) {
      console.warn('Error en endElementDrag:', err)
    }

    // Leer posición final del shape para persistir
    let finalX, finalY
    try {
      const stage = stageRef.value.getNode()
      const shape = stage.findOne(`#${elementId}`)
      const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
      if (shape && elemento) {
        finalX = shape.x()
        finalY = shape.y()
      }
    } catch {
      /* ignore */
    }

    // Fallback si no se pudo leer shape
    if (finalX == null || finalY == null) {
      const last = lastValidPositions.value.get(elementId) || { x: elemento.x, y: elemento.y }
      finalX = last.x
      finalY = last.y
    }

    // Garantizar persistencia CON VALIDACIÓN: solo persistir si la posición final es válida
    try {
      const storeEl = canvasStore.elementosVisibles.find((el) => el.id === elementId)
      const EPS_PERSIST = 0.5 // px, tolerancia mínima para considerar cambio
      const posDiff =
        storeEl &&
        (Math.abs((storeEl.x || 0) - finalX) > EPS_PERSIST ||
          Math.abs((storeEl.y || 0) - finalY) > EPS_PERSIST)

      if (storeEl && posDiff) {
        // Validar que la posición final está dentro del área y es válida según el validador común
        const boundary = typeof computeBoundary === 'function' ? computeBoundary() : null
        const areaBounds = boundaryToAreaBounds(boundary, {
          minX: 0,
          minY: 0,
          maxX: layerConfig.value.width,
          maxY: layerConfig.value.height,
          polygon: boundary?.type === 'polygon' ? boundary.points : null,
          mode: boundary?.mode || 'fixed',
        })
          let neighbors = []
          try {
            const isInfiniteFloor = canvasStore.estaEnPlanta && canvasStore.plantaActivaData?.isInfinite === true
            const plantaId = canvasStore.plantaActivaData?.id
            if (isInfiniteFloor && plantaId && typeof canvasStore.elementosEnPlanta === 'function') {
              neighbors = (canvasStore.elementosEnPlanta(plantaId) || []).filter((e) => e && e.id !== elementId)
            } else {
              neighbors = canvasStore.elementosVisibles.filter((e) => e.id !== elementId)
            }
          } catch {
            neighbors = canvasStore.elementosVisibles.filter((e) => e.id !== elementId)
          }
          const isValidNow = isPlacementValid({
            pos: { x: finalX, y: finalY },
            movingEl: storeEl,
            neighbors,
            areaBounds,
            CM_TO_PX,
            epsPx: 0.5,
          })

        if (isValidNow) {
          const guardRes = onDragEndGuard(storeEl, { x: finalX, y: finalY })
          if (guardRes.valid) {
            // Persistir posición final con historial
            canvasStore.actualizarPosicion(
              elementId,
              finalX,
              finalY,
              true,
              `Elemento movido: ${storeEl.nombre || storeEl.tipo || elementId}`,
            )
            // Actualizar lastValidPositions para evitar divergencias posteriores
            lastValidPositions.value.set(elementId, { x: finalX, y: finalY })
          }
        } else {
          // Si la posición final NO es válida, revertir visualmente a la última válida y persistir esa última válida
          const revertPos = lastGoodPos ||
            lastValidPositions.value.get(elementId) || { x: storeEl.x || 0, y: storeEl.y || 0 }
          try {
            const stage2 = stageRef.value?.getNode?.()
            const layer2 = layerRef.value?.getNode?.()
            const shape2 = stage2?.findOne?.(`#${elementId}`)
            if (shape2) {
              shape2.x(revertPos.x)
              shape2.y(revertPos.y)
              // repaint
              layer2?.batchDraw?.()
            }
          } catch (err) {
            console.warn('Error reverting shape position', err)
          }

          // Persistir la posición revertida para mantener consistencia
          try {
            const guardRes = onDragEndGuard(storeEl, revertPos)
            if (guardRes.valid) {
              canvasStore.actualizarPosicion(
                elementId,
                revertPos.x,
                revertPos.y,
                true,
                `Revertir posición inválida: ${storeEl.nombre || storeEl.tipo || elementId}`,
              )
              lastValidPositions.value.set(elementId, { x: revertPos.x, y: revertPos.y })
            }
          } catch (err) {
            console.warn('Error persisting revert position', err)
          }
        }
      }
    } catch (err) {
      console.warn('Error persisting final position for', elementId, err)
    }

    // 7. Limpiar conflictos después del dragend exitoso
    conflictsApi.clear()

    // Limpiar estado del controlador rAF (ya pausado arriba)
    if (rec && rec.ctrl) {
      try {
        rec.ctrl.resetLastGoodPos()
      } catch {
        /* ignore */
      }
    }
    // Limpiar memoria de contacto del elemento al finalizar
    contactState.delete(elementId)
    rafControllers.delete(elementId)
    const perf = perfContexts.get(elementId)
    try {
      if (perf && perf.restore) perf.restore()
    } catch {
      console.warn('Error al restaurar el contexto de rendimiento del elemento:', elementId)
    }
    perfContexts.delete(elementId)

    // Forzar un redibujado completo del layer para asegurar que todos los elementos se renderizan correctamente
    // Esto es especialmente importante cuando hay elementos grandes que pueden haber usado cache
    try {
      const layer = layerRef.value?.getNode?.()
      if (layer) {
        await nextTick()
        // Limpiar cache del layer completo y redibujar
        layer.clearCache?.()
        layer.batchDraw?.()
        // Segundo frame para asegurar que el navegador ha procesado el cambio
        await new Promise((r) => requestAnimationFrame(() => {
          layer.batchDraw?.()
          r()
        }))
      }
    } catch (err) {
      console.warn('Error al forzar redibujado completo del layer:', err)
    }
  }

  const onShapeDragStart = (e, el, options = {}) => {
    const { select = true } = options
    if (!canvasStore.estaEnPlanta) {
      const shape = e.target
      const parent =
        canvasStore.estructuraContenedorActual ||
        canvasStore.elementoPorId(canvasStore.elementoSeleccionado)
      const siblings =
        parent?.hijos?.map((id) => canvasStore.elementoPorId(id)).filter(Boolean) || []
      const session = makeInnerSession({
        parentEl: parent,
        movingEl: el,
        siblings,
        vista: canvasStore.vistaActiva,
      })
      const pointer = e.evt ? { x: e.evt.clientX || 0, y: e.evt.clientY || 0 } : { x: 0, y: 0 }
      innerSessions.set(el.id, {
        session,
        parent,
        lastPointer: pointer,
        initial: { x: el.posicion?.x ?? el.x ?? 0, y: el.posicion?.y ?? el.y ?? 0 },
      })
      isElementDragging.value = true
      stageDragEnabled.value = false
      if (select) {
        canvasStore.seleccionarElemento(el.id)
      }
    } else {
      startElementDrag(el.id, { select })
    }
    onDragStartGuard(e.target, el)
  }

  const onShapeDragMove = (e, el) => {
    if (canvasStore.floatingOrigin?.interactionsSuspended) {
      return
    }
    const data = innerSessions.get(el.id)
    if (data) {
      const { session, parent } = data
      const shape = e.target
      const pointer = e.evt ? { x: e.evt.clientX || 0, y: e.evt.clientY || 0 } : { x: 0, y: 0 }
      const vel = {
        x: e.evt?.movementX ?? pointer.x - data.lastPointer.x,
        y: e.evt?.movementY ?? pointer.y - data.lastPointer.y,
      }
      data.lastPointer = pointer
      let posWorld = shape.position()

      // Primero aplicar las restricciones de sesión
      const posLocal = session.toLocal(posWorld, parent)
      const nextLocal = session.dragBoundFuncLocal(posLocal, vel)
      const constrainedWorld = session.toWorld(nextLocal, parent)

      // Luego aplicar object snapping si está habilitado
      let finalWorld = constrainedWorld
      if (isSnappingEnabled.value && isElementDragging.value) {
        // Obtener elementos hermanos (otros elementos dentro del mismo contenedor)
        const siblings =
          parent?.hijos?.map((id) => canvasStore.elementoPorId(id)).filter(Boolean) || []
        const otherElements = siblings.filter((sibling) => sibling.id !== el.id)

        if (otherElements.length > 0) {
          // Convertir posición del shape a coordenadas de elemento
          const elementX = constrainedWorld.x
          const elementY = constrainedWorld.y

          // Aplicar snapping: en XZ solo mostrar guías (allowSnap:false)
          const snapResult =
            canvasStore.vistaActiva !== 'XZ'
              ? performSnap(el, elementX, elementY, otherElements, {
                  width: layerConfig.value.width,
                  height: layerConfig.value.height,
                })
              : performSnap(
                  el,
                  elementX,
                  elementY,
                  otherElements,
                  { width: layerConfig.value.width, height: layerConfig.value.height },
                  { allowSnap: false, snapDistance: 0.5 },
                )

          // Convertir de vuelta a coordenadas del shape (si allowSnap:false, snapResult.x/y == elementX/elementY)
          finalWorld = { x: snapResult.x, y: snapResult.y }
        }
      }

      const guardRes = onDragMoveGuard(el, { x: finalWorld.x, y: finalWorld.y })
      if (!guardRes.valid) return
      shape.position(finalWorld)
      needsDraw = true
      scheduleDraw()
    } else {
      const candidate = { x: e.target?.x?.() ?? 0, y: e.target?.y?.() ?? 0 }
      const guardRes = onDragMoveGuard(el, candidate)
      if (guardRes.valid) {
        updateElementPosition(e, el.id)
      }
    }
  }

  const onShapeDragEnd = (e, el) => {
    const data = innerSessions.get(el.id)
    if (data) {
      const { session, parent, initial } = data
      innerSessions.delete(el.id)
      isElementDragging.value = false
      stageDragEnabled.value = true

      // Limpiar guías de snapping
      clearGuides()

      const shape = e.target
      let candLocal = session.toLocal(shape.position(), parent)
      let finalLocal = session.finalizeLocal(candLocal)
      const finalWorld = session.toWorld(finalLocal, parent)
      shape.position(finalWorld)
      needsDraw = true
      scheduleDraw()

      const guardRes = onDragEndGuard(
        el,
        { x: finalWorld.x, y: finalWorld.y },
        {
          revert: () => {
            shape.position(initial)
            needsDraw = true
            scheduleDraw()
          },
        },
      )
      if (!guardRes.valid) return

      const changed =
        Math.round(finalWorld.x) !== Math.round(initial.x) ||
        Math.round(finalWorld.y) !== Math.round(initial.y)
      if (changed) {
        canvasStore.actualizarElemento(
          el.id,
          { posicion: { x: finalWorld.x, y: finalWorld.y }, x: finalWorld.x, y: finalWorld.y },
          true,
          `Elemento movido: ${el.id}`,
        )
      }
    } else {
      endElementDrag(el.id)
    }
  }

  const shiftMapPositions = (map, deltaX, deltaY) => {
    if (!map || typeof map.forEach !== 'function') return
    map.forEach((pos, key) => {
      if (!pos || typeof pos !== 'object') return
      const next = { ...pos }
      if (next.x != null && Number.isFinite(Number(next.x))) {
        next.x = Number(next.x) - deltaX
      }
      if (next.y != null && Number.isFinite(Number(next.y))) {
        next.y = Number(next.y) - deltaY
      }
      map.set(key, next)
    })
  }

  const shiftDragStateBy = (dx = 0, dy = 0) => {
    const deltaX = Number(dx) || 0
    const deltaY = Number(dy) || 0
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return
    if (Math.abs(deltaX) < 1e-6 && Math.abs(deltaY) < 1e-6) return
    shiftMapPositions(dragStartPositions.value, deltaX, deltaY)
    shiftMapPositions(lastValidPositions.value, deltaX, deltaY)
    shiftMapPositions(lastDesiredPosMap.value, deltaX, deltaY)
    innerSessions.forEach((session) => {
      if (session && session.initial) {
        if (session.initial.x != null && Number.isFinite(Number(session.initial.x))) {
          session.initial.x = Number(session.initial.x) - deltaX
        }
        if (session.initial.y != null && Number.isFinite(Number(session.initial.y))) {
          session.initial.y = Number(session.initial.y) - deltaY
        }
      }
    })
  }

  return {
    // Refs
    isElementDragging,
    stageDragEnabled,
    dragStartPositions,
    lastValidPositions,
    innerSessions,

    // Methods
    startElementDrag,
    updateElementPosition,
    endElementDrag,
    onShapeDragStart,
    onShapeDragMove,
    onShapeDragEnd,
    registerDraggableRef,
    shiftDragStateBy,

    // Utils
    scheduleDraw,
  }
}
