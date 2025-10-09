// /inventory-smart/utils/finalIntervals.js
// Interval clamping final resolver para evitar solape residual o salida del área
// resolveFinalByIntervals({ candidate, movingEl, neighbors, areaBounds, grid, CM_TO_PX, strokePx=0, marginPx=0, lastValidPos, lastVelocity })
// Modelo: posiciones top-left (bbox de modelo sin stroke ni sombra)

import { snapToGrid } from '@/inventory-smart/utils/geometry'

const EPS = 1e-6

function isInfiniteArea(bounds) {
  if (!bounds) return false
  if (bounds.mode === 'elastic') return true
  return !!(bounds.polygon && bounds.polygon._isInfinite === true)
}

function clampRectToBounds(x, y, w, h, b) {
  if (!b || isInfiniteArea(b)) return { x, y }
  const nx = Math.max(b.minX, Math.min(x, b.maxX - w))
  const ny = Math.max(b.minY, Math.min(y, b.maxY - h))
  return { x: nx, y: ny }
}

function shrinkBoundsByStroke(areaBounds, strokeHalf) {
  if (!strokeHalf || strokeHalf <= 0) return { ...areaBounds }
  const { minX, minY, maxX, maxY, polygon, mode, ...rest } = areaBounds
  return {
    ...rest,
    minX: minX + strokeHalf,
    minY: minY + strokeHalf,
    maxX: maxX - strokeHalf,
    maxY: maxY - strokeHalf,
    ...(mode !== undefined ? { mode } : {}),
    ...(polygon ? { polygon } : {}),
  }
}

function overlap1D(a0, a1, b0, b1) {
  return !(a1 <= b0 + EPS || b1 <= a0 + EPS)
}

function overlapAABB(ax, ay, aw, ah, bx, by, bw, bh) {
  return overlap1D(ax, ax + aw, bx, bx + bw) && overlap1D(ay, ay + ah, by, by + bh)
}

// Interval set operations (on closed intervals [a,b])
function intersectInterval([a0, a1], [b0, b1]) {
  const lo = Math.max(a0, b0)
  const hi = Math.min(a1, b1)
  if (hi < lo) return null
  return [lo, hi]
}

function subtractOne(base, forb) {
  // base and forb are [lo, hi]
  const [a0, a1] = base
  const [b0, b1] = forb
  // no overlap
  if (b1 <= a0 || b0 >= a1) return [base]
  const out = []
  if (b0 > a0) out.push([a0, Math.max(a0, Math.min(b0, a1))])
  if (b1 < a1) out.push([Math.max(a0, Math.min(b1, a1)), a1])
  return out
}

function subtractIntervals(allowed, forb) {
  // allowed: array of [lo, hi] disjoint sorted; forb: [lo,hi]
  const out = []
  for (const seg of allowed) {
    const parts = subtractOne(seg, forb)
    for (const p of parts) {
      if (p[1] - p[0] > EPS) out.push(p)
    }
  }
  // Normalize (sort/merge small gaps)
  out.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const seg of out) {
    if (!merged.length) {
      merged.push(seg)
    } else {
      const last = merged[merged.length - 1]
      if (seg[0] <= last[1] + EPS) {
        last[1] = Math.max(last[1], seg[1])
      } else {
        merged.push(seg)
      }
    }
  }
  return merged
}

function projectCoordToAllowed(cand, allowed) {
  // If inside any segment, keep; else clamp to nearest boundary
  let nearest = null
  for (const [lo, hi] of allowed) {
    if (cand >= lo - EPS && cand <= hi + EPS) {
      return Math.min(Math.max(cand, lo), hi)
    }
    const dist = cand < lo ? lo - cand : cand - hi
    const boundary = cand < lo ? lo : hi
    if (nearest == null || dist < nearest.dist) nearest = { dist, value: boundary }
  }
  return nearest ? nearest.value : cand
}

export function resolveFinalByIntervals({
  candidate,
  movingEl,
  neighbors = [],
  areaBounds,
  grid = 50,
  CM_TO_PX, // sin uso directo, mantenido por compatibilidad
  strokePx = 0,
  marginPx = 0,
  lastValidPos = null,
  lastVelocity = null,
}) {
  void CM_TO_PX
  if (!candidate || !movingEl || !areaBounds) {
    return lastValidPos ? { ...lastValidPos } : { x: movingEl?.x || 0, y: movingEl?.y || 0 }
  }

  const w = movingEl.width || 0
  const h = movingEl.height || 0
  const isInf = isInfiniteArea(areaBounds)
  const strokeHalf = (strokePx || 0) / 2
  const pad = (marginPx || 0) + strokeHalf

  // (1) eje primario por velocidad
  const vx = lastVelocity?.x || 0
  const vy = lastVelocity?.y || 0
  const axis = Math.abs(vx) >= Math.abs(vy) ? 'x' : 'y'

  // (2) construir conjunto permitido en eje primario
  let allowed
  if (axis === 'x') {
    // base interval for top-left x
    const base = isInf
      ? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]
      : [areaBounds.minX, areaBounds.maxX - w]
    // Start with base as allowed set
    allowed = [base]
    // Consider vecinos que se solapan con el candidato en Y (inflado)
    const candY0 = candidate.y
    const candY1 = candidate.y + h
    for (const nb of neighbors) {
      const ny0 = (nb.y || 0) - pad
      const ny1 = (nb.y || 0) + (nb.height || 0) + pad
      if (!overlap1D(candY0, candY1, ny0, ny1)) continue
      // Forbidden interval on x to prevent overlap: [nb.x - w - pad, nb.x + nb.width + pad]
      const fx0 = (nb.x || 0) - w - pad
      const fx1 = (nb.x || 0) + (nb.width || 0) + pad
      // Intersect with base before subtracting
      const forb = intersectInterval([fx0, fx1], base)
      if (!forb) continue
      allowed = subtractIntervals(allowed, forb)
      if (!allowed.length) break
    }
  } else {
    const base = isInf
      ? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]
      : [areaBounds.minY, areaBounds.maxY - h]
    allowed = [base]
    const candX0 = candidate.x
    const candX1 = candidate.x + w
    for (const nb of neighbors) {
      const nx0 = (nb.x || 0) - pad
      const nx1 = (nb.x || 0) + (nb.width || 0) + pad
      if (!overlap1D(candX0, candX1, nx0, nx1)) continue
      const fy0 = (nb.y || 0) - h - pad
      const fy1 = (nb.y || 0) + (nb.height || 0) + pad
      const forb = intersectInterval([fy0, fy1], base)
      if (!forb) continue
      allowed = subtractIntervals(allowed, forb)
      if (!allowed.length) break
    }
  }

  // (3) si queda vacío, fallback
  if (!allowed || allowed.length === 0) {
    return lastValidPos ? { ...lastValidPos } : { x: movingEl.x || 0, y: movingEl.y || 0 }
  }

  // (4) proyectar coordenada candidata al intervalo permitido más cercano
  let px = candidate.x
  let py = candidate.y
  if (axis === 'x') px = projectCoordToAllowed(candidate.x, allowed)
  else py = projectCoordToAllowed(candidate.y, allowed)

  // Validación rápida: si el clamp duro sigue dejando el elemento fuera, fallback
  if (!isInf) {
    const preview = clampRectToBounds(px, py, w, h, areaBounds)
    if (
      preview.x < areaBounds.minX - EPS ||
      preview.y < areaBounds.minY - EPS ||
      preview.x + w > areaBounds.maxX + EPS ||
      preview.y + h > areaBounds.maxY + EPS
    ) {
      return lastValidPos ? { ...lastValidPos } : { x: movingEl.x || 0, y: movingEl.y || 0 }
    }
    px = preview.x
    py = preview.y
  }

  // (5) snap-to-grid post-proyección y reproyección del eje principal
  const snapped = snapToGrid(px, py, grid)
  px = snapped.x
  py = snapped.y
  if (axis === 'x') px = projectCoordToAllowed(px, allowed)
  else py = projectCoordToAllowed(py, allowed)

  // (6) clamp final stroke-safe
  const bStroke = shrinkBoundsByStroke(areaBounds, strokeHalf)
  const c = clampRectToBounds(px, py, w, h, bStroke)
  px = c.x
  py = c.y

  // (7) Validación de overlap final: si hay solape, fallback
  for (const nb of neighbors) {
    if (overlapAABB(px, py, w, h, nb.x || 0, nb.y || 0, nb.width || 0, nb.height || 0)) {
      return lastValidPos ? { ...lastValidPos } : { x: movingEl.x || 0, y: movingEl.y || 0 }
    }
  }

  return { x: px, y: py }
}
