import { reactive, ref, watch } from 'vue'

const TOUCH_MOVE_THRESHOLD = 8

export function useCanvasTouchEvents({
  canvasStore,
  stageDragEnabled,
  isElementDragging,
  isEditMode,
  ctx,
  selectElement,
  handleElementDoubleClick,
  containerRef,
  handleDrop,
  handleDragEnter,
  handleDragOver,
  getClientXY,
  isDragOverCanvas,
}) {
  const isTouchPrimaryPointer = ref(false)
  const isTouchDragging = ref(false)

  const touchGestures = reactive({
    lastTap: 0,
    tapCount: 0,
    longPressTimer: null,
    elementId: null,
    doubleTapTimer: null,
    pendingDoubleTap: false,
    dragEnableTimer: null,
    currentShape: null,
    dragAllowedById: new Map(),
    shouldRestoreStageDrag: false,
    startX: 0,
    startY: 0,
    hasMoved: false,
  })

  let coarsePointerMediaQuery = null
  let coarsePointerListener = null

  const updatePointerMode = (matches) => {
    const navigatorHasTouch = typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0
    isTouchPrimaryPointer.value = !!(navigatorHasTouch || matches)
  }

  const registerPointerModeWatcher = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      updatePointerMode(false)
      return
    }
    coarsePointerMediaQuery = window.matchMedia('(pointer: coarse)')
    updatePointerMode(coarsePointerMediaQuery.matches)
    coarsePointerListener = (event) => updatePointerMode(event.matches)
    if (typeof coarsePointerMediaQuery.addEventListener === 'function') {
      coarsePointerMediaQuery.addEventListener('change', coarsePointerListener)
    } else if (typeof coarsePointerMediaQuery.addListener === 'function') {
      coarsePointerMediaQuery.addListener(coarsePointerListener)
    }
  }

  const unregisterPointerModeWatcher = () => {
    if (!coarsePointerMediaQuery || !coarsePointerListener) return
    if (typeof coarsePointerMediaQuery.removeEventListener === 'function') {
      coarsePointerMediaQuery.removeEventListener('change', coarsePointerListener)
    } else if (typeof coarsePointerMediaQuery.removeListener === 'function') {
      coarsePointerMediaQuery.removeListener(coarsePointerListener)
    }
    coarsePointerMediaQuery = null
    coarsePointerListener = null
  }

  const resetTouchGestures = () => {
    if (touchGestures.longPressTimer) {
      clearTimeout(touchGestures.longPressTimer)
      touchGestures.longPressTimer = null
    }
    if (touchGestures.doubleTapTimer) {
      clearTimeout(touchGestures.doubleTapTimer)
      touchGestures.doubleTapTimer = null
    }
    if (touchGestures.dragEnableTimer) {
      clearTimeout(touchGestures.dragEnableTimer)
      touchGestures.dragEnableTimer = null
    }
    const shapeNode = touchGestures.currentShape
    if (shapeNode && typeof shapeNode.draggable === 'function') {
      try {
        shapeNode.draggable(false)
      } catch (err) {
        console.warn('No se pudo desactivar el arrastre táctil del elemento:', err)
      }
    }
    if (touchGestures.shouldRestoreStageDrag) {
      stageDragEnabled.value = true
    }
    touchGestures.tapCount = 0
    touchGestures.elementId = null
    touchGestures.pendingDoubleTap = false
    touchGestures.currentShape = null
    touchGestures.shouldRestoreStageDrag = false
    touchGestures.startX = 0
    touchGestures.startY = 0
    touchGestures.hasMoved = false
    touchGestures.dragAllowedById.clear()
    isTouchDragging.value = false
  }

  watch(
    () => canvasStore.elementoSeleccionado,
    () => {
      resetTouchGestures()
    },
  )

  watch(isTouchPrimaryPointer, (isTouchMode) => {
    if (!isTouchMode) {
      touchGestures.dragAllowedById.clear()
    }
  })

  const canStartDrag = (elemento) => {
    if (!isTouchPrimaryPointer.value) return true
    return touchGestures.dragAllowedById.get(elemento.id) === true
  }

  const getEventPointerType = (evt) => {
    if (!evt) return 'mouse'
    const native = evt.evt || evt
    if (!native) return 'mouse'
    if (typeof native.pointerType === 'string') {
      return native.pointerType
    }
    const type = typeof native.type === 'string' ? native.type : ''
    if (type.startsWith('touch')) return 'touch'
    if (type.startsWith('mouse')) return 'mouse'
    if (type.startsWith('pointer')) {
      return native.pointerType || 'mouse'
    }
    return isTouchPrimaryPointer.value ? 'touch' : 'mouse'
  }

  const enableTouchDragForCurrentShape = () => {
    const shape = touchGestures.currentShape
    if (!shape) return
    try {
      if (typeof shape.draggable === 'function') {
        shape.draggable(true)
      }
      if (typeof shape.startDrag === 'function' && !shape.isDragging?.()) {
        shape.startDrag()
      }
      isTouchDragging.value = true
    } catch (err) {
      console.warn('No se pudo habilitar el arrastre táctil del elemento:', err)
    }
  }

  const onShapeTouchStart = (evt, elemento) => {
    if (!elemento?.id) return

    const shapeNode = evt?.currentTarget || evt?.target?.getParent?.() || evt?.target || null
    if (shapeNode && typeof shapeNode.draggable === 'function') {
      shapeNode.draggable(false)
    }
    touchGestures.currentShape = shapeNode

    const touchPoint = evt?.evt?.touches?.[0] || evt?.evt?.changedTouches?.[0]
    if (touchPoint) {
      touchGestures.startX = touchPoint.clientX
      touchGestures.startY = touchPoint.clientY
    } else {
      const { x, y } = typeof getClientXY === 'function' ? getClientXY(evt) : { x: 0, y: 0 }
      touchGestures.startX = x
      touchGestures.startY = y
    }
    touchGestures.hasMoved = false

    if (stageDragEnabled.value) {
      touchGestures.shouldRestoreStageDrag = true
      stageDragEnabled.value = false
    } else {
      touchGestures.shouldRestoreStageDrag = false
    }

    const now = Date.now()
    const timeDiff = now - touchGestures.lastTap

    if (touchGestures.longPressTimer) {
      clearTimeout(touchGestures.longPressTimer)
      touchGestures.longPressTimer = null
    }
    if (touchGestures.doubleTapTimer) {
      clearTimeout(touchGestures.doubleTapTimer)
      touchGestures.doubleTapTimer = null
    }
    if (touchGestures.dragEnableTimer) {
      clearTimeout(touchGestures.dragEnableTimer)
      touchGestures.dragEnableTimer = null
    }

    touchGestures.dragAllowedById.set(elemento.id, false)

    if (timeDiff > 400) {
      touchGestures.tapCount = 0
      touchGestures.pendingDoubleTap = false
    }

    touchGestures.tapCount++
    touchGestures.lastTap = now
    touchGestures.elementId = elemento.id

    touchGestures.dragEnableTimer = setTimeout(() => {
      if (touchGestures.elementId === elemento.id) {
        touchGestures.dragAllowedById.set(elemento.id, true)
        if (touchGestures.hasMoved) {
          enableTouchDragForCurrentShape()
        }
      }
    }, 600)

    touchGestures.longPressTimer = setTimeout(() => {
      if (
        touchGestures.elementId === elemento.id &&
        isEditMode?.value &&
        !touchGestures.hasMoved &&
        !isElementDragging?.value
      ) {
        if (touchGestures.dragEnableTimer) {
          clearTimeout(touchGestures.dragEnableTimer)
          touchGestures.dragEnableTimer = null
        }
        touchGestures.dragAllowedById.set(elemento.id, false)
        const touch = evt.evt?.touches?.[0] || evt.evt?.changedTouches?.[0]
        if (touch) {
          ctx?.openAt?.({ x: touch.clientX, y: touch.clientY, elementId: elemento.id })
        }
      }
    }, 800)

    if (touchGestures.tapCount === 2 && timeDiff <= 400) {
      if (touchGestures.longPressTimer) {
        clearTimeout(touchGestures.longPressTimer)
        touchGestures.longPressTimer = null
      }
      if (touchGestures.dragEnableTimer) {
        clearTimeout(touchGestures.dragEnableTimer)
        touchGestures.dragEnableTimer = null
      }
      touchGestures.dragAllowedById.set(elemento.id, false)
      touchGestures.pendingDoubleTap = true
    } else if (touchGestures.tapCount === 1) {
      touchGestures.doubleTapTimer = setTimeout(() => {
        touchGestures.tapCount = 0
        touchGestures.pendingDoubleTap = false
      }, 400)
    }
  }

  const onShapeTouchMove = (evt, elemento) => {
    if (touchGestures.elementId !== elemento.id) return
    const touch = evt?.evt?.touches?.[0] || evt?.evt?.changedTouches?.[0]
    if (!touch) return

    const dx = touch.clientX - touchGestures.startX
    const dy = touch.clientY - touchGestures.startY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (!touchGestures.hasMoved && distance > TOUCH_MOVE_THRESHOLD) {
      touchGestures.hasMoved = true
      if (touchGestures.longPressTimer) {
        clearTimeout(touchGestures.longPressTimer)
        touchGestures.longPressTimer = null
      }
    }

    if (touchGestures.hasMoved && touchGestures.dragAllowedById.get(elemento.id) === true) {
      enableTouchDragForCurrentShape()
    }
  }

  const onShapeTouchEnd = (evt, elemento) => {
    if (touchGestures.longPressTimer) {
      clearTimeout(touchGestures.longPressTimer)
      touchGestures.longPressTimer = null
    }
    if (touchGestures.dragEnableTimer) {
      clearTimeout(touchGestures.dragEnableTimer)
      touchGestures.dragEnableTimer = null
    }

    const shapeNode = touchGestures.currentShape
    const elementId = elemento.id
    const runCleanup = () => {
      if (shapeNode && typeof shapeNode.draggable === 'function') {
        try {
          shapeNode.draggable(false)
        } catch (err) {
          console.warn('No se pudo desactivar el arrastre táctil del elemento:', err)
        }
      }
      touchGestures.dragAllowedById.delete(elementId)
      touchGestures.currentShape = null
      if (touchGestures.shouldRestoreStageDrag) {
        stageDragEnabled.value = true
      }
      touchGestures.shouldRestoreStageDrag = false
      touchGestures.hasMoved = false
      touchGestures.startX = 0
      touchGestures.startY = 0
      isTouchDragging.value = false
    }

    if (shapeNode?.isDragging?.()) {
      const schedule =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame.bind(window)
          : (cb) => setTimeout(cb, 16)
      schedule(runCleanup)
    } else {
      runCleanup()
    }

    if (touchGestures.pendingDoubleTap && touchGestures.elementId === elemento.id) {
      touchGestures.pendingDoubleTap = false
      touchGestures.tapCount = 0
      handleElementDoubleClick?.(evt, elemento)
      return
    }

    if (
      touchGestures.tapCount === 1 &&
      touchGestures.elementId === elemento.id &&
      !touchGestures.pendingDoubleTap
    ) {
      setTimeout(() => {
        if (
          touchGestures.tapCount === 1 &&
          touchGestures.elementId === elemento.id &&
          !touchGestures.pendingDoubleTap
        ) {
          selectElement?.(elemento)
          touchGestures.tapCount = 0
        }
      }, 100)
    }
  }

  const handleTouchDragStart = (e) => {
    const { dataTransfer } = e.detail || {}
    if (!dataTransfer) return
    isTouchDragging.value = true
    handleDragEnter?.({ preventDefault: () => {}, dataTransfer })
  }

  const handleTouchDragOver = (e) => {
    const { clientX, clientY, dataTransfer } = e.detail || {}
    if (clientX == null || clientY == null) return
    handleDragOver?.({
      preventDefault: () => {},
      dataTransfer,
      clientX,
      clientY,
    })
  }

  const handleTouchDrop = (e) => {
    if (!isTouchDragging.value) return

    const { clientX, clientY, dataTransfer } = e.detail || {}
    if (clientX == null || clientY == null || !containerRef?.value) {
      isTouchDragging.value = false
      return
    }

    const canvasRect = containerRef.value.getBoundingClientRect()
    const isOverCanvas =
      clientX >= canvasRect.left &&
      clientX <= canvasRect.right &&
      clientY >= canvasRect.top &&
      clientY <= canvasRect.bottom

    if (!isOverCanvas) {
      isTouchDragging.value = false
      return
    }

    const fakeEvent = {
      preventDefault: () => {},
      dataTransfer,
      clientX,
      clientY,
    }
    handleDrop?.(fakeEvent)
    if (isDragOverCanvas) {
      isDragOverCanvas.value = false
    }
    isTouchDragging.value = false
  }

  return {
    isTouchPrimaryPointer,
    isTouchDragging,
    canStartDrag,
    getEventPointerType,
    enableTouchDragForCurrentShape,
    onShapeTouchStart,
    onShapeTouchMove,
    onShapeTouchEnd,
    registerPointerModeWatcher,
    unregisterPointerModeWatcher,
    handleTouchDragStart,
    handleTouchDragOver,
    handleTouchDrop,
    resetTouchGestures,
  }
}
