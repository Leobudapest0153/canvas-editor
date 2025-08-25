// Lightweight rAF-based drag loop. Keeps local state only and
// ensures at most one update + one batchDraw per frame.

export function setupRafDrag({
  stage: _stage,
  layer,
  getMovingShapeBBox,
  onValidateLight,
  onCommitEnd,
  onFrame,
  // Nuevos parámetros para validación de posición
  validatePosition = null, // función (pos) => boolean
  onValidPositionUpdate = null // callback cuando se encuentra una posición válida
}) {
  // Marcar _stage como usado para ESLint
  void _stage
  let running = false
  let rafId = 0
  let lastFrameTime = 0
  let dirty = false
  let lastDrawnBBox = null

  // Optional local position cache the client can set from dragmove
  let desiredPos = null

  // Tracking de la última posición válida durante el drag
  let lastGoodPos = null

  const readBBox = () => {
    if (typeof getMovingShapeBBox === 'function') return getMovingShapeBBox()
    return null
  }

  const loop = (ts) => {
    if (!running) return
    // Only process once per frame
    if (ts === lastFrameTime && !dirty) {
      rafId = requestAnimationFrame(loop)
      return
    }
    lastFrameTime = ts
    const wasDirty = dirty
    dirty = false

    // Permitir que el cliente aplique desiredPos en el frame, si existe
    if (wasDirty && desiredPos && typeof onFrame === 'function') {
      try {
        onFrame(desiredPos)
      } catch (e) { void e }
    }

    const bbox = readBBox()
    if (bbox) {
      // Validar la posición actual si se proporciona validador
      if (validatePosition && typeof validatePosition === 'function') {
        try {
          const isValid = validatePosition({ x: bbox.x, y: bbox.y })
          if (isValid) {
            lastGoodPos = { x: bbox.x, y: bbox.y }
            // Notificar al callback si se proporciona
            if (onValidPositionUpdate && typeof onValidPositionUpdate === 'function') {
              onValidPositionUpdate(lastGoodPos)
            }
          }
        } catch (e) {
          console.warn('Error en validación de posición durante drag:', e)
        }
      }

      // Call light validation; consumer can throttle internally
      if (typeof onValidateLight === 'function') {
        try {
          onValidateLight(bbox)
        } catch (e) { void e }
      }
      // Only draw if bbox changed to avoid extra renders
      if (!lastDrawnBBox || !shallowEqualBBoxFast(lastDrawnBBox, bbox)) {
        lastDrawnBBox = { ...bbox }
        layer && layer.batchDraw && layer.batchDraw()
      }
    }

    rafId = requestAnimationFrame(loop)
  }

  const start = () => {
    if (running) return
    running = true
    dirty = true
    lastDrawnBBox = null
    lastGoodPos = null // Reset al inicio del drag
    try { if (typeof window !== 'undefined') window.__dvCanvasDragActive = true } catch (e) { void e }
    rafId = requestAnimationFrame(loop)
  }

  const move = (pos) => {
    desiredPos = pos || null
    // Mark frame dirty so loop runs validation/draw once
    dirty = true
  }

  const end = (finalBBox) => {
    if (!running) return
    running = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    try {
      if (typeof onCommitEnd === 'function') onCommitEnd(finalBBox)
    } catch (e) { void e }
    desiredPos = null
    lastDrawnBBox = null
    // No reseteamos lastGoodPos aquí para que esté disponible en endElementDrag
    try { if (typeof window !== 'undefined') window.__dvCanvasDragActive = false } catch (e) { void e }
  }

  return {
    start,
    move,
    end,
    getDesiredPos: () => desiredPos,
    getLastGoodPos: () => lastGoodPos, // Nuevo método para obtener la última posición válida
    resetLastGoodPos: () => { lastGoodPos = null } // Método para limpiar después del dragend
  }
}

function shallowEqualBBoxFast(a, b) {
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}
