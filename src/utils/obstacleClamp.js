// utils/obstacleClamp.js
// Clamp contra obstáculos (elemento–elemento) sin jitter ni desbordes
// resolveBlockingOverlap({ candidate, movingEl, neighbors, areaBounds, CM_TO_PX, strokePx=0, maxIters=3 })
// - Usa bbox de MODELO (x,y,width,height) en coords de mundo (sin stroke/shadow)
// - Detecta solo colisiones BLOQUEANTES (p.ej., suelo–suelo) usando evaluateConflict
// - Calcula MTD por par con computeMTD, los agrega y PROYECTA contra los bordes para no empujar fuera
// - Aplica candidate += MTD, clamp a bounds y repite hasta maxIters o convergencia

import { evaluateConflict, computeMTD } from '@/utils/collision'

const EPS = 1e-6

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

function approxEqual(a, b, eps = EPS) {
  return Math.abs(a - b) <= eps
}

export function resolveBlockingOverlap({
  candidate,
  movingEl,
  neighbors = [],
  areaBounds,
  CM_TO_PX, // opcional; mantenido para consistencia API
  strokePx = 0,
  maxIters = 3,
}) {
  // marcar como usado para evitar lint si no se requiere
  void CM_TO_PX

  if (!candidate || !movingEl || !areaBounds) {
    return { x: candidate?.x ?? 0, y: candidate?.y ?? 0 }
  }

  const w = movingEl.width || 0
  const h = movingEl.height || 0
  const strokeHalf = (strokePx || 0) / 2
  const b = shrinkBoundsByStroke(areaBounds, strokeHalf)

  // Estado mutable del candidato (top-left de bbox de modelo)
  let x = candidate.x
  let y = candidate.y

  // Clamp inicial para garantizar que partimos dentro del área útil (stroke-safe)
  const c0 = clampRectToBounds(x, y, w, h, b)
  x = c0.x
  y = c0.y

  for (let iter = 0; iter < Math.max(1, maxIters); iter++) {
    // Evaluar colisiones bloqueantes contra vecinos
    const movingNow = { ...movingEl, x, y }
    let accDx = 0
    let accDy = 0
    let foundBlocking = false

    for (const n of neighbors) {
      if (!n || n.id === movingEl.id) continue
      // evaluateConflict ya hace narrow-phase y clasifica bloqueante (suelo–suelo)
      const res = evaluateConflict(movingNow, n)
      if (!res || !res.bloqueante) continue
      foundBlocking = true
      const { dx, dy } = computeMTD(x, y, w, h, n.x, n.y, n.width, n.height)
      accDx += dx
      accDy += dy
    }

    if (!foundBlocking) break

    // Proyección contra límites para no empujar fuera del área
    const atMinX = approxEqual(x, b.minX)
    const atMaxX = approxEqual(x, b.maxX - w)
    const atMinY = approxEqual(y, b.minY)
    const atMaxY = approxEqual(y, b.maxY - h)

    if (atMinX && accDx < 0) accDx = 0
    if (atMaxX && accDx > 0) accDx = 0
    if (atMinY && accDy < 0) accDy = 0
    if (atMaxY && accDy > 0) accDy = 0

    // Aplicar y reclamp dentro del área
    x += accDx
    y += accDy
    const c1 = clampRectToBounds(x, y, w, h, b)
    x = c1.x
    y = c1.y

    if (Math.abs(accDx) < EPS && Math.abs(accDy) < EPS) break
  }

  return { x, y }
}

