// Lightweight rAF-based drag loop. Keeps local state only and
// ensures at most one update + one batchDraw per frame.

export function setupRafDrag({ stage, layer, getMovingShapeBBox, onValidateLight, onCommitEnd }) {
  let running = false
  let rafId = 0
  let lastFrameTime = 0
  let dirty = false
  let lastDrawnBBox = null

  // Optional local position cache the client can set from dragmove
  let desiredPos = null

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
    dirty = false

    const bbox = readBBox()
    if (bbox) {
      // Call light validation; consumer can throttle internally
      if (typeof onValidateLight === 'function') {
        try {
          onValidateLight(bbox)
        } catch (_) {
          // ignore validation errors in perf mode
        }
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
    } catch (_) {}
    desiredPos = null
    lastDrawnBBox = null
  }

  return {
    start,
    move,
    end,
    getDesiredPos: () => desiredPos,
  }
}

function shallowEqualBBoxFast(a, b) {
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

