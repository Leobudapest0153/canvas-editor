// Final clamp pipeline at pointerup to avoid visual overflow with stroke
// runFinalClamp({ shape, el, areaBounds, grid, elements, lastValidPos, CM_TO_PX })
// Steps:
//  (a) applyEdgeConstraint (clamp puro, stroke-safe)
//  (b) resolver colisiones bloqueantes
//  (c) clamp→snap→re-clamp (stroke-safe)
// Al final, si aún queda fuera (rounding/zoom), reubica a lastValidPos si existe.

import { applyEdgeConstraint, finalizeRectClampSnapReclamp } from '@/utils/edgeConstraint'
import { detectConflictsFor, computeMTD } from '@/utils/collision'

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
    const sx = Math.round(cx / grid) * grid
    const sy = Math.round(cy / grid) * grid
    const cxClamped = Math.max(bStroke.minX + r, Math.min(sx, bStroke.maxX - r))
    const cyClamped = Math.max(bStroke.minY + r, Math.min(sy, bStroke.maxY - r))
    xf = cxClamped - r
    yf = cyClamped - r
  } else {
    const fr = finalizeRectClampSnapReclamp(xf, yf, el.width, el.height, bStroke, grid)
    xf = fr.x
    yf = fr.y
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
