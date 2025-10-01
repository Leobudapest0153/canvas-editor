import { mapDimsByView } from '@/inventory-smart/utils/innerViewDims'
import { toLocal, toWorld } from '@/inventory-smart/utils/innerLocalCoords'
import { clampRectToBounds, overlap } from '@/inventory-smart/utils/innerAABB'
import { CM_TO_PX, GRID_SIZE } from '@/inventory-smart/utils/constants'
export function makeInnerSession({ parentEl, movingEl, siblings, vista, CM_TO_PX: cmToPxOverride }) {
  const cmToPx = Number.isFinite(cmToPxOverride) && cmToPxOverride > 0 ? cmToPxOverride : CM_TO_PX
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
  const sibRects = siblings
    .filter((s) => s && s.id !== movingEl.id)
    .map((s) => {
      const szCm = mapDimsByView(s, vista)
      const sz = {
        w: Math.max(1, szCm.wCm * cmToPx),
        h: Math.max(1, szCm.hCm * cmToPx),
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
    let p = clampRectToBounds(posLocal, mSize, bounds)
    const A = { x: p.x, y: p.y, w: mSize.w, h: mSize.h }
    if (contact.id) {
      const B = sibRects.find((s) => s.id === contact.id)
      if (B) {
        const touchingX = A.x + A.w > B.x - H && B.x + B.w > A.x - H
        const touchingY = A.y + A.h > B.y - H && B.y + B.h > A.y - H
        const stillTouching = contact.axis === 'x' ? touchingY : touchingX
        if (stillTouching) {
          if (contact.axis === 'x') {
            p.x = p.x >= B.x ? B.x + B.w : B.x - mSize.w
          } else {
            p.y = p.y >= B.y ? B.y + B.h : B.y - mSize.h
          }
          p = clampRectToBounds(p, mSize, bounds)
        } else {
          contact = { id: null, axis: null }
        }
      } else {
        contact = { id: null, axis: null }
      }
    }
    if (!contact.id) {
      for (const B of sibRects) {
        if (!overlap({ x: p.x, y: p.y, w: mSize.w, h: mSize.h }, B)) continue
        const axis = Math.abs(vxf) >= Math.abs(vyf) ? 'x' : 'y'
        contact = { id: B.id, axis }
        if (axis === 'x') {
          p.x = p.x >= B.x ? B.x + B.w : B.x - mSize.w
        } else {
          p.y = p.y >= B.y ? B.y + B.h : B.y - mSize.h
        }
        p = clampRectToBounds(p, mSize, bounds)
        break
      }
    }
    if (inside(p, mSize, bounds)) {
      let ok = true
      const A2 = { x: p.x, y: p.y, w: mSize.w, h: mSize.h }
      for (const B of sibRects) if (overlap(A2, B)) { ok = false; break }
      if (ok) lastGoodLocal = p
    }
    return p
  }
  function finalizeLocal(candidateLocal) {
    contact = { id: null, axis: null }
    let p = clampRectToBounds(candidateLocal, mSize, bounds)
    if (!isValidLocal(p)) p = lastGoodLocal
    // En vista frontal (XZ) no aplicar redondeo a la grilla; y si GRID_SIZE=0, respetar desactivación
    const G = (vista === 'XZ') ? 0 : (GRID_SIZE > 0 ? GRID_SIZE : 0)
    if (G > 0) {
      p = { x: Math.round(p.x / G) * G, y: Math.round(p.y / G) * G }
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
