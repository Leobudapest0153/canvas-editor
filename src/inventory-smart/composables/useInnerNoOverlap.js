import { mapDimsByView } from '@/inventory-smart/utils/innerViewDims'
import { toLocal, toWorld } from '@/inventory-smart/utils/innerLocalCoords'
import { clampRectToBounds, overlap } from '@/inventory-smart/utils/innerAABB'
import { CM_TO_PX, GRID_SIZE } from '@/inventory-smart/utils/constants'
import { solveDragPosition } from '@/inventory-smart/utils/placementSolver'
import { resolveCoplanarNeighbors } from '@/inventory-smart/validation/placementOrchestrator'
export function makeInnerSession({ parentEl, movingEl, siblings, vista }) {
  const cmToPx = CM_TO_PX
  const { wCm, hCm } = mapDimsByView(parentEl, vista)
  const bounds = {
    minX: 0,
    minY: 0,
    maxX: Math.max(1, wCm * cmToPx),
    maxY: Math.max(1, hCm * cmToPx),
  }
  parentEl.__wPx = bounds.maxX
  parentEl.__hPx = bounds.maxY
  const mSizeCm = mapDimsByView(movingEl, vista)
  const mSize = {
    w: Math.max(1, mSizeCm.wCm * cmToPx),
    h: Math.max(1, mSizeCm.hCm * cmToPx),
  }
  // Map rects de hermanos (en coords locales) y mantener referencia completa
  const siblingsFull = siblings.filter((s) => s && s.id !== movingEl.id)
  const sibRects = siblingsFull.map((s) => {
    const szCm = mapDimsByView(s, vista)
    const sz = {
      w: Math.max(1, szCm.wCm * CM_TO_PX),
      h: Math.max(1, szCm.hCm * CM_TO_PX),
    }
    const pl = toLocal(s.posicion || { x: 0, y: 0 }, parentEl)
    return { x: pl.x, y: pl.y, w: sz.w, h: sz.h, id: s.id }
  })
  let lastGoodLocal = toLocal(movingEl.posicion || { x: 0, y: 0 }, parentEl)
  let contact = { id: null, axis: null }
  const H = 1.0
  let vxf = 0,
    vyf = 0

  function inside(p, size, b) {
    return !(
      p.x < b.minX - 0.5 ||
      p.y < b.minY - 0.5 ||
      p.x + size.w > b.maxX + 0.5 ||
      p.y + size.h > b.maxY + 0.5
    )
  }
  function isValidLocal(p) {
    if (
      p.x < bounds.minX - 0.5 ||
      p.y < bounds.minY - 0.5 ||
      p.x + mSize.w > bounds.maxX + 0.5 ||
      p.y + mSize.h > bounds.maxY + 0.5
    )
      return false
    const A = { x: p.x, y: p.y, w: mSize.w, h: mSize.h }
    for (const B of sibRects) if (overlap(A, B)) return false
    return true
  }
  function dragBoundFuncLocal(posLocal, vel = { x: 0, y: 0 }) {
    vxf = 0.8 * vxf + 0.2 * (vel.x || 0)
    vyf = 0.8 * vyf + 0.2 * (vel.y || 0)

    // Área local como areaBounds
    const areaBounds = {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      mode: 'fixed',
      polygon: null,
    }

    // Filtrar vecinos coplanares
    const coplanar = resolveCoplanarNeighbors({ ...movingEl }, siblingsFull)
    const neighbors = coplanar.map((s) => {
      const szCm = mapDimsByView(s, vista)
      const size = { w: Math.max(1, szCm.wCm * CM_TO_PX), h: Math.max(1, szCm.hCm * CM_TO_PX) }
      const pl = toLocal(s.posicion || { x: 0, y: 0 }, parentEl)
      return { id: s.id, x: pl.x, y: pl.y, width: size.w, height: size.h, ubicacion: s.ubicacion || 'suelo' }
    }).filter((n) => (n.ubicacion || 'suelo') === 'suelo' && (movingEl.ubicacion || 'suelo') === 'suelo')

    const solved = solveDragPosition({
      candidate: { x: posLocal.x, y: posLocal.y },
      movingEl: { id: movingEl.id, width: mSize.w, height: mSize.h, forma: movingEl.forma || 'rectangular', ubicacion: movingEl.ubicacion || 'suelo' },
      neighbors,
      areaBounds,
      lastValidPos: lastGoodLocal,
      lastVelocity: { x: vxf, y: vyf },
      maxIters: 6,
    })

    const p = { x: solved.x, y: solved.y }
    if (inside(p, mSize, bounds)) {
      let ok = true
      const A2 = { x: p.x, y: p.y, w: mSize.w, h: mSize.h }
      for (const B of sibRects) if (overlap(A2, B)) { ok = false; break }
      if (ok) lastGoodLocal = p
    }
    return p
  }
  function finalizeLocal(candidateLocal) {
    // Resolver con solver compartido y luego snap opcional
    const areaBounds = {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      mode: 'fixed',
      polygon: null,
    }
    const coplanar = resolveCoplanarNeighbors({ ...movingEl }, siblingsFull)
    const neighbors = coplanar.map((s) => {
      const szCm = mapDimsByView(s, vista)
      const size = { w: Math.max(1, szCm.wCm * CM_TO_PX), h: Math.max(1, szCm.hCm * CM_TO_PX) }
      const pl = toLocal(s.posicion || { x: 0, y: 0 }, parentEl)
      return { id: s.id, x: pl.x, y: pl.y, width: size.w, height: size.h, ubicacion: s.ubicacion || 'suelo' }
    }).filter((n) => (n.ubicacion || 'suelo') === 'suelo' && (movingEl.ubicacion || 'suelo') === 'suelo')

    let solved = solveDragPosition({
      candidate: { x: candidateLocal.x, y: candidateLocal.y },
      movingEl: { id: movingEl.id, width: mSize.w, height: mSize.h, forma: movingEl.forma || 'rectangular', ubicacion: movingEl.ubicacion || 'suelo' },
      neighbors,
      areaBounds,
      lastValidPos: lastGoodLocal,
      lastVelocity: { x: 0, y: 0 },
      maxIters: 6,
    })

    let p = { x: solved.x, y: solved.y }
    // En vista frontal (XZ) no aplicar redondeo a la grilla; y si GRID_SIZE=0, respetar desactivación
    const G = (vista === 'XZ') ? 0 : (GRID_SIZE > 0 ? GRID_SIZE : 0)
    if (G > 0) {
      p = { x: Math.round(p.x / G) * G, y: Math.round(p.y / G) * G }
      // Re-resolver ligero tras snap para evitar entrar en bloqueo
      solved = solveDragPosition({
        candidate: { x: p.x, y: p.y },
        movingEl: { id: movingEl.id, width: mSize.w, height: mSize.h, forma: movingEl.forma || 'rectangular', ubicacion: movingEl.ubicacion || 'suelo' },
        neighbors,
        areaBounds,
        lastValidPos: lastGoodLocal,
        lastVelocity: { x: 0, y: 0 },
        maxIters: 3,
      })
      p = { x: solved.x, y: solved.y }
    }
    p = clampRectToBounds(p, mSize, bounds)
    if (!isValidLocal(p)) p = lastGoodLocal
    return p
  }
  return {
    bounds,
    mSize,
    sibRects,
    toLocal,
    toWorld,
    isValidLocal,
    dragBoundFuncLocal,
    finalizeLocal,
    get lastGoodLocal() {
      return lastGoodLocal
    },
  }
}
