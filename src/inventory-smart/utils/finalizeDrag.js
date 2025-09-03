// Final clamp pipeline at pointerup to avoid visual overflow with stroke
// runFinalClamp({ shape, el, areaBounds, grid, elements, lastValidPos, CM_TO_PX })
// Steps:
//  (a) applyEdgeConstraint (clamp puro, stroke-safe)
//  (b) resolver colisiones bloqueantes
//  (c) clamp→snap→re-clamp (stroke-safe)
// Al final, si aún queda fuera (rounding/zoom), reubica a lastValidPos si existe.

import { applyEdgeConstraint, finalizeRectClampSnapReclamp } from '@/inventory-smart/utils/edgeConstraint'
import { detectConflictsFor, computeMTD } from '@/inventory-smart/utils/collision'
import { snapToGrid } from '@/inventory-smart/utils/geometry'

function getModelBBoxFromShape(shape) {
  if (!shape) return { x: 0, y: 0, width: 0, height: 0, className: '' }
  const className = shape.className || shape.getClassName?.() || ''
  if (className === 'Circle') {
    const r = typeof shape.radius === 'function' ? shape.radius() : (shape.radius || 0)
    return { x: shape.x() - r, y: shape.y() - r, width: r * 2, height: r * 2, className }
  }
  // Rect/Group default
  const w = typeof shape.width === 'function' ? (shape.width() || 0) : (shape.width || 0)
  const h = typeof shape.height === 'function' ? (shape.height() || 0) : (shape.height || 0)
  return { x: shape.x(), y: shape.y(), width: w, height: h, className }
}

function shrinkBoundsByStroke(areaBounds, strokeHalf) {
  if (!strokeHalf || strokeHalf <= 0) return { ...areaBounds }
  const { minX, minY, maxX, maxY } = areaBounds
  return {
    minX: minX + strokeHalf,
    minY: minY + strokeHalf,
    maxX: maxX - strokeHalf,
    maxY: maxY - strokeHalf,
  }
}

function clampRectToBounds(x, y, w, h, b) {
  const nx = Math.max(b.minX, Math.min(x, b.maxX - w))
  const ny = Math.max(b.minY, Math.min(y, b.maxY - h))
  return { x: nx, y: ny }
}

function rectOutsideBounds(x, y, w, h, b, eps = 1e-6) {
  return x < b.minX - eps || y < b.minY - eps || x + w > b.maxX + eps || y + h > b.maxY + eps
}

function overlapAABB(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay)
}

function dominantAxisFromVelocity(vx, vy) {
  const ax = Math.abs(vx)
  const ay = Math.abs(vy)
  if (ax >= ay) return 'x'
  return 'y'
}

function corridorFeasible({ movingEl, neighbors = [], areaBounds, axis = 'x', CM_TO_PX, strokeHalf = 0, marginPx = 0 }) {
  void CM_TO_PX
  const EPS = 1e-6
  const w = movingEl.width || 0
  const h = movingEl.height || 0

  const minX = areaBounds.minX + strokeHalf + (marginPx || 0)
  const maxX = areaBounds.maxX - strokeHalf - (marginPx || 0)
  const minY = areaBounds.minY + strokeHalf + (marginPx || 0)
  const maxY = areaBounds.maxY - strokeHalf - (marginPx || 0)

  if (axis === 'x') {
    const needed = w
    for (const n of neighbors) {
      const nx0 = n.x
      const nx1 = n.x + (n.width || 0)
      // Vecino pegado a borde izquierdo
      if (nx0 <= minX + EPS) {
        const gap = Math.max(0, nx0 - minX)
        if (gap + EPS < needed) return false
      }
      // Vecino pegado a borde derecho
      if (nx1 >= maxX - EPS) {
        const gap = Math.max(0, maxX - nx1)
        if (gap + EPS < needed) return false
      }
    }
  } else {
    const needed = h
    for (const n of neighbors) {
      const ny0 = n.y
      const ny1 = n.y + (n.height || 0)
      // Vecino pegado a borde superior
      if (ny0 <= minY + EPS) {
        const gap = Math.max(0, ny0 - minY)
        if (gap + EPS < needed) return false
      }
      // Vecino pegado a borde inferior
      if (ny1 >= maxY - EPS) {
        const gap = Math.max(0, maxY - ny1)
        if (gap + EPS < needed) return false
      }
    }
  }
  return true
}

function resolveBlockingCollisions(x0, y0, el, elements, areaBounds) {
  const w = el.width
  const h = el.height
  let x = x0
  let y = y0
  const MAX_ITERS = 3

  // clamp stroke-safe bounds primero
  const c0 = clampRectToBounds(x, y, w, h, areaBounds)
  x = c0.x; y = c0.y

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const moving = { ...el, x, y }
    const conflicts = detectConflictsFor(moving, elements)
    const blocking = conflicts.filter((c) => c.bloqueante)
    if (!blocking.length) break
    let accDx = 0, accDy = 0
    for (const c of blocking) {
      const otherId = c.aId === el.id ? c.bId : c.aId
      const other = elements.find((e) => e.id === otherId)
      if (!other) continue
      const { dx, dy } = computeMTD(x, y, w, h, other.x, other.y, other.width, other.height)
      accDx += dx
      accDy += dy
    }
    x += accDx
    y += accDy
    const c1 = clampRectToBounds(x, y, w, h, areaBounds)
    x = c1.x; y = c1.y
    if (Math.abs(accDx) < 1e-6 && Math.abs(accDy) < 1e-6) break
  }
  return { x, y }
}

export async function runFinalClamp({ shape, el, areaBounds, grid = 50, elements = [], lastValidPos = null, CM_TO_PX }) {
  if (!shape || !el || !areaBounds) return { x: el?.x ?? 0, y: el?.y ?? 0, appliedFallback: true }
  // marcar CM_TO_PX como usado para evitar lint si no se requiere
  void CM_TO_PX

  const strokeEnabled = typeof shape.strokeEnabled === 'function' ? shape.strokeEnabled() : !!shape.strokeEnabled
  const strokeWidth = typeof shape.strokeWidth === 'function' ? shape.strokeWidth() : (shape.strokeWidth || 0)
  const strokeHalf = strokeEnabled ? (strokeWidth / 2) : 0
  const bStroke = shrinkBoundsByStroke(areaBounds, strokeHalf)

  // Leer bbox de modelo actual del shape (sin sombras)
  const bbox = getModelBBoxFromShape(shape)
  let candidate = { x: bbox.x, y: bbox.y }

  // (a) clamp puro con histéresis (edge constraint)
  const { pos: posA } = applyEdgeConstraint(candidate, el, bStroke)

  // (b) resolver bloqueantes simple
  const { x: xB, y: yB } = resolveBlockingCollisions(posA.x, posA.y, el, elements, bStroke)

  // (c) clamp → snap → re-clamp (rects) o snap de centro para círculos
  let xf = xB
  let yf = yB
  if (bbox.className === 'Circle' || el.forma === 'circular') {
    const r = Math.min(el.width, el.height) / 2
    const cx = xf + r
    const cy = yf + r
    // Snap solo si grid > 0
    if (typeof grid === 'number' && grid > 0) {
      const sx = Math.round(cx / grid) * grid
      const sy = Math.round(cy / grid) * grid
      const cxClamped = Math.max(bStroke.minX + r, Math.min(sx, bStroke.maxX - r))
      const cyClamped = Math.max(bStroke.minY + r, Math.min(sy, bStroke.maxY - r))
      xf = cxClamped - r
      yf = cyClamped - r
    } else {
      // No snap: solo clamp
      const cxClamped = Math.max(bStroke.minX + r, Math.min(cx, bStroke.maxX - r))
      const cyClamped = Math.max(bStroke.minY + r, Math.min(cy, bStroke.maxY - r))
      xf = cxClamped - r
      yf = cyClamped - r
    }
  } else {
    // finalizeRectClampSnapReclamp internamente hacía snap; si grid <= 0 evitamos el snap
    if (typeof grid === 'number' && grid > 0) {
      const fr = finalizeRectClampSnapReclamp(xf, yf, el.width, el.height, bStroke, grid)
      xf = fr.x
      yf = fr.y
    } else {
      // Solo clamp
      const cHard = clampRectToBounds(xf, yf, el.width, el.height, bStroke)
      xf = cHard.x
      yf = cHard.y
    }
  }

  // Aplicar en shape
  if (bbox.className === 'Circle' || el.forma === 'circular') {
    const r = Math.min(el.width, el.height) / 2
    shape.x(xf + r)
    shape.y(yf + r)
  } else {
    shape.x(xf)
    shape.y(yf)
  }

  // Validación final stroke-safe
  const out = rectOutsideBounds(xf, yf, el.width, el.height, bStroke)
  if (out) {
    // Fallback a última válida si existe
    const fallback = lastValidPos || null
    if (fallback) {
      if (bbox.className === 'Circle' || el.forma === 'circular') {
        const r = Math.min(el.width, el.height) / 2
        shape.x(fallback.x + r)
        shape.y(fallback.y + r)
        return { x: fallback.x, y: fallback.y, appliedFallback: true }
      } else {
        shape.x(fallback.x)
        shape.y(fallback.y)
        return { x: fallback.x, y: fallback.y, appliedFallback: true }
      }
    }
    // Último recurso: clamp duro
    const cHard = clampRectToBounds(xf, yf, el.width, el.height, bStroke)
    if (bbox.className === 'Circle' || el.forma === 'circular') {
      const r = Math.min(el.width, el.height) / 2
      shape.x(cHard.x + r)
      shape.y(cHard.y + r)
    } else {
      shape.x(cHard.x)
      shape.y(cHard.y)
    }
    return { x: cHard.x, y: cHard.y, appliedFallback: true }
  }

  return { x: xf, y: yf, appliedFallback: false }
}

export function solveFinalPlacement({
  candidate,
  movingEl,
  neighbors = [],
  areaBounds,
  grid = 50,
  CM_TO_PX, // sin uso directo, mantenido por compat
  lastValidPos = null,
  lastVelocity = null,
  marginPx = 0,
}) {
  void CM_TO_PX
  const EPS = 1e-6
  const w = movingEl.width || 0
  const h = movingEl.height || 0

  // (A) determinar eje por lastVelocity (default 'x')
  const axis = lastVelocity ? dominantAxisFromVelocity(lastVelocity.x || 0, lastVelocity.y || 0) : 'x'

  // stroke para shrink final y para inflar vecino en chequeo
  const strokeHalf = (movingEl.__strokePx || 0) / 2

  // (B) chequear factibilidad del corredor contra vecinos pegados al borde
  const feasible = corridorFeasible({ movingEl, neighbors, areaBounds, axis, CM_TO_PX, strokeHalf, marginPx })
  if (!feasible) {
    return lastValidPos ? { ...lastValidPos } : { x: movingEl.x || 0, y: movingEl.y || 0 }
  }

  // (C) clamp inicial a área (sin stroke)
  let pos = clampRectToBounds(candidate.x, candidate.y, w, h, areaBounds)

  // Helper GS en eje único
  const tryPassAxis = (maxIters) => {
    for (let iter = 0; iter < maxIters; iter++) {
      let anyOverlap = false
      for (const n of neighbors) {
        // Inflar vecino por strokeHalf
        const nbx = n.x - strokeHalf
        const nby = n.y - strokeHalf
        const nbw = (n.width || 0) + strokeHalf * 2
        const nbh = (n.height || 0) + strokeHalf * 2
        if (!overlapAABB(pos.x, pos.y, w, h, nbx, nby, nbw, nbh)) continue
        anyOverlap = true
        let { dx, dy } = computeMTD(pos.x, pos.y, w, h, nbx, nby, nbw, nbh)
        // Anular eje no elegido para evitar diagonales
        if (axis === 'x') dy = 0
        else dx = 0
        const nx = pos.x + dx
        const ny = pos.y + dy
        if (rectOutsideBounds(nx, ny, w, h, areaBounds, EPS)) {
          // Rompería el área -> falla inmediata
          return { ok: false }
        }
        pos.x = nx
        pos.y = ny
        const c = clampRectToBounds(pos.x, pos.y, w, h, areaBounds)
        pos.x = c.x
        pos.y = c.y
      }
      if (!anyOverlap) return { ok: true }
    }
    // Comprobar remanente
    for (const n of neighbors) {
      const nbx = n.x - strokeHalf
      const nby = n.y - strokeHalf
      const nbw = (n.width || 0) + strokeHalf * 2
      const nbh = (n.height || 0) + strokeHalf * 2
      if (overlapAABB(pos.x, pos.y, w, h, nbx, nby, nbw, nbh)) return { ok: false }
    }
    return { ok: true }
  }

  // (D) GS en eje elegido (6 iteraciones)
  const r1 = tryPassAxis(6)
  if (!r1.ok) return lastValidPos ? { ...lastValidPos } : { x: movingEl.x || 0, y: movingEl.y || 0 }

  // (E) snap a grilla y revalidación (3 iteraciones)
  const snapped = snapToGrid(pos.x, pos.y, grid)
  pos.x = snapped.x
  pos.y = snapped.y
  const r2 = tryPassAxis(3)
  if (!r2.ok) return lastValidPos ? { ...lastValidPos } : { x: movingEl.x || 0, y: movingEl.y || 0 }

  // (F) clamp final stroke-safe
  if (strokeHalf > 0) {
    const bStroke = shrinkBoundsByStroke(areaBounds, strokeHalf)
    const c = clampRectToBounds(pos.x, pos.y, w, h, bStroke)
    pos.x = c.x
    pos.y = c.y
  } else {
    const c = clampRectToBounds(pos.x, pos.y, w, h, areaBounds)
    pos.x = c.x
    pos.y = c.y
  }

  return { x: pos.x, y: pos.y }
}

// Nueva función finalizePlacement para corregir el bug de solape con vecinos pegados al borde
export function finalizePlacement({
  candidate,
  movingEl,
  neighbors = [],
  areaBounds,
  grid = 50,
  lastValidPos = null,
  CM_TO_PX,
  strokePx = 0,
  lastVelocity = null
}) {
  void CM_TO_PX // evitar warning de lint

  // (1) Calcular axis por lastVelocity
  let axis = 'x'
  if (lastVelocity) {
    const vx = lastVelocity.x || 0
    const vy = lastVelocity.y || 0
    axis = dominantAxisFromVelocity(vx, vy)
  }

  // Función auxiliar para calcular gap disponible
  function gapDisponible(axis, neighbors, areaBounds) {
    const EPS = 1e-6
    const strokeHalf = strokePx / 2

    const minX = areaBounds.minX + strokeHalf
    const maxX = areaBounds.maxX - strokeHalf
    const minY = areaBounds.minY + strokeHalf
    const maxY = areaBounds.maxY - strokeHalf

    if (axis === 'x') {
      let minGap = maxX - minX
      for (const n of neighbors) {
        const nx0 = n.x
        const nx1 = n.x + (n.width || 0)

        // Vecino pegado a borde izquierdo - gap disponible entre vecino y borde izquierdo
        if (nx0 <= minX + EPS) {
          const gap = Math.max(0, nx0 - minX)
          minGap = Math.min(minGap, gap)
        }

        // Vecino pegado a borde derecho - gap disponible entre borde derecho y vecino
        if (nx1 >= maxX - EPS) {
          const gap = Math.max(0, maxX - nx1)
          minGap = Math.min(minGap, gap)
        }
      }
      return minGap
    } else {
      let minGap = maxY - minY
      for (const n of neighbors) {
        const ny0 = n.y
        const ny1 = n.y + (n.height || 0)

        // Vecino pegado a borde superior - gap disponible entre vecino y borde superior
        if (ny0 <= minY + EPS) {
          const gap = Math.max(0, ny0 - minY)
          minGap = Math.min(minGap, gap)
        }

        // Vecino pegado a borde inferior - gap disponible entre borde inferior y vecino
        if (ny1 >= maxY - EPS) {
          const gap = Math.max(0, maxY - ny1)
          minGap = Math.min(minGap, gap)
        }
      }
      return minGap
    }
  }

  // Función auxiliar para obtener tamaño del elemento en el eje especificado
  function size(movingEl, axis) {
    return axis === 'x' ? (movingEl.width || 0) : (movingEl.height || 0)
  }

  // Función auxiliar para clamp stroke-safe
  function clampAreaStrokeSafe(candidate, areaBounds, strokePx) {
    const strokeHalf = strokePx / 2
    const bStroke = shrinkBoundsByStroke(areaBounds, strokeHalf)
    const w = movingEl.width || 0
    const h = movingEl.height || 0
    return clampRectToBounds(candidate.x, candidate.y, w, h, bStroke)
  }

  // Función auxiliar para re-clamp stroke-safe
  function reclampAreaStrokeSafe(pos) {
    return clampAreaStrokeSafe(pos, areaBounds, strokePx)
  }

  // (2) Verificar si el corredor es factible
  const corredorFactible = gapDisponible(axis, neighbors, areaBounds) >= size(movingEl, axis)
  if (!corredorFactible) {
    return lastValidPos || { x: movingEl.x || 0, y: movingEl.y || 0 }
  }

  // (3) Clamp inicial stroke-safe
  let pos = clampAreaStrokeSafe(candidate, areaBounds, strokePx)

  // (4) Verificar conflictos bloqueantes
  const movingAtPos = { ...movingEl, x: pos.x, y: pos.y }
  const conflicts = detectConflictsFor(movingAtPos, neighbors)
  const hasBlocking = conflicts.some(c => c.bloqueante)
  if (hasBlocking) {
    return lastValidPos || { x: movingEl.x || 0, y: movingEl.y || 0 }
  }

  // (5) Snap to grid
  const snapped = snapToGrid(pos.x, pos.y, grid)
  pos = { x: snapped.x, y: snapped.y }

  // (6) Re-clamp stroke-safe después del snap
  pos = reclampAreaStrokeSafe(pos)

  // (7) Verificar conflictos bloqueantes después del snap
  const movingAfterSnap = { ...movingEl, x: pos.x, y: pos.y }
  const conflictsAfterSnap = detectConflictsFor(movingAfterSnap, neighbors)
  const hasBlockingAfterSnap = conflictsAfterSnap.some(c => c.bloqueante)
  if (hasBlockingAfterSnap) {
    return lastValidPos || { x: movingEl.x || 0, y: movingEl.y || 0 }
  }

  // (8) Retornar posición final
  return pos
}
