import { mapDimsByView } from '@/utils/innerViewDims'
import { toLocal, toWorld } from '@/utils/innerLocalCoords'
import { clampRectToBounds, overlap } from '@/utils/innerAABB'
export function makeInnerSession({ parentEl, movingEl, siblings, vista, CM_TO_PX }) {
  const { wCm, hCm } = mapDimsByView(parentEl, vista)
  const bounds = {
    minX: 0,
    minY: 0,
    maxX: Math.max(1, wCm * CM_TO_PX),
    maxY: Math.max(1, hCm * CM_TO_PX)
  }
  parentEl.__wPx = bounds.maxX
  parentEl.__hPx = bounds.maxY // hint para toLocal
  const mSizeCm = mapDimsByView(movingEl, vista)
  const mSize = {
    w: Math.max(1, mSizeCm.wCm * CM_TO_PX),
    h: Math.max(1, mSizeCm.hCm * CM_TO_PX)
  }
  const sibRects = siblings
    .filter((s) => s && s.id !== movingEl.id)
    .map((s) => {
      const szCm = mapDimsByView(s, vista)
      const sz = {
        w: Math.max(1, szCm.wCm * CM_TO_PX),
        h: Math.max(1, szCm.hCm * CM_TO_PX)
      }
      const pl = toLocal(s.posicion || { x: 0, y: 0 }, parentEl)
      return { x: pl.x, y: pl.y, w: sz.w, h: sz.h, id: s.id }
    })
  let lastGoodLocal = toLocal(movingEl.posicion || { x: 0, y: 0 }, parentEl)
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
  function dragBoundFuncLocal(posLocal, lastLocal, vel) {
    // 1) clamp a bounds
    let p = clampRectToBounds(posLocal, mSize, bounds)
    // 2) si toca a un hermano, bloquea en el eje dominante
    const A = { x: p.x, y: p.y, w: mSize.w, h: mSize.h }
    for (const B of sibRects) {
      if (!overlap(A, B)) continue
      const axis = Math.abs(vel.x) >= Math.abs(vel.y) ? 'x' : 'y'
      if (axis === 'x') {
        if (p.x >= B.x) p.x = B.x + B.w
        else p.x = B.x - mSize.w
        p = clampRectToBounds(p, mSize, bounds)
      } else {
        if (p.y >= B.y) p.y = B.y + B.h
        else p.y = B.y - mSize.h
        p = clampRectToBounds(p, mSize, bounds)
      }
    }
    // 3) actualizar lastGood si quedó válido
    if (isValidLocal(p)) lastGoodLocal = p
    return p
  }
  function finalizeLocal(candidateLocal) {
    let p = clampRectToBounds(candidateLocal, mSize, bounds)
    if (!isValidLocal(p)) p = lastGoodLocal // fallback duro
    // snap a grilla local (si aplica)
    const G = Math.max(1, window.__GRID_SIZE_PX || 10)
    p = { x: Math.round(p.x / G) * G, y: Math.round(p.y / G) * G }
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
    }
  }
}
