// /inventory-smart/utils/placementSolver.js
// Solver unificado para resolver posición durante drag con deslizamiento por eje (Gauss–Seidel),
// respetando límites rectangulares o poligonales e integrando la lógica de colisiones existente
// (incluye tangencia de círculos vía detectConflictsFor).

import { detectConflictsFor, computeMTD } from '@/inventory-smart/utils/collision'
import { clampRectToRect } from '@/inventory-smart/utils/geometry'
import { clampRectToPolygon, clampCircleToPolygonSmooth, pointInPolygon } from '@/inventory-smart/utils/polygonBounds'

// Clamp stroke-safe básico según areaBounds: si el área es elástica/infinita, no clampa.
function clampToArea(x, y, w, h, movingEl, areaBounds, lastValidPos = null) {
  if (!areaBounds) return { x, y }
  const mode = areaBounds.mode || 'fixed'
  const poly = Array.isArray(areaBounds.polygon) ? areaBounds.polygon : null
  const isInf = !!(poly && poly._isInfinite === true) || mode === 'elastic'
  if (isInf) return { x, y }

  if (poly) {
    if (movingEl.forma === 'circular') {
      const r = Math.min(w, h) / 2
      const centerX = x + r
      const centerY = y + r
      const prev = lastValidPos ? { x: lastValidPos.x + r, y: lastValidPos.y + r } : null
      const c = clampCircleToPolygonSmooth({ x: centerX, y: centerY, radius: r }, poly, prev)
      return { x: c.x - r, y: c.y - r }
    }
    const c = clampRectToPolygon({ x, y, width: w, height: h }, poly)
    return { x: c.x, y: c.y }
  }

  const minX = areaBounds.minX ?? 0
  const minY = areaBounds.minY ?? 0
  const W = Math.max(0, (areaBounds.maxX ?? minX) - minX)
  const H = Math.max(0, (areaBounds.maxY ?? minY) - minY)
  const c = clampRectToRect(x - minX, y - minY, w, h, W, H)
  return { x: c.x + minX, y: c.y + minY }
}

function insidePolyOrRect(x, y, w, h, areaBounds) {
  if (!areaBounds) return true
  const poly = Array.isArray(areaBounds.polygon) ? areaBounds.polygon : null
  const mode = areaBounds.mode || 'fixed'
  const isInf = !!(poly && poly._isInfinite === true) || mode === 'elastic'
  if (isInf) return true
  if (poly) {
    // Validar centro dentro del polígono como heurística rápida
    return pointInPolygon({ x: x + w / 2, y: y + h / 2 }, poly)
  }
  const minX = areaBounds.minX ?? 0
  const minY = areaBounds.minY ?? 0
  const maxX = areaBounds.maxX ?? 0
  const maxY = areaBounds.maxY ?? 0
  return x >= minX - 1e-6 && y >= minY - 1e-6 && x + w <= maxX + 1e-6 && y + h <= maxY + 1e-6
}

// Eje dominante a partir de velocidad
function dominantAxisFromVelocity(vx, vy) {
  return Math.abs(vx || 0) >= Math.abs(vy || 0) ? 'x' : 'y'
}

// Resuelve una posición candidata aplicando:
// - clamp de borde (si no es elástico)
// - iteraciones de GS por eje (MTD proyectada) contra TODOS los bloqueantes
// - re-clamp tras cada paso
// - fallback a lastValidPos si persisten bloqueos
export function solveDragPosition({
  candidate,
  movingEl,
  hardNeighbors = [],
  softNeighbors = [],
  areaBounds,
  lastValidPos = null,
  lastVelocity = { x: 0, y: 0 },
  maxIters = 6,
}) {
  const w = movingEl.width || 0
  const h = movingEl.height || 0
  // Normalizar forma (círculo usa diámetro mínimo en AABB para MTD)
  const isCirc = movingEl.forma === 'circular'
  const aw = isCirc ? Math.min(w, h) : w
  const ah = isCirc ? Math.min(w, h) : h

  // Clamp inicial
  let { x, y } = clampToArea(candidate.x, candidate.y, aw, ah, movingEl, areaBounds, lastValidPos)

  const getConflicts = (xx, yy) => {
    const test = isCirc
      ? { ...movingEl, x: xx, y: yy, width: aw, height: ah, forma: 'circular' }
      : { ...movingEl, x: xx, y: yy, width: aw, height: ah, forma: 'rectangular' }
    const hard = detectConflictsFor(test, hardNeighbors).filter((c) => c && c.bloqueante)
    const soft = detectConflictsFor(test, softNeighbors).filter((c) => c && !c.bloqueante && c.xyOverlap)
    return { hard, soft }
  }

  const doClamp = (xx, yy) => clampToArea(xx, yy, aw, ah, movingEl, areaBounds, lastValidPos)

  // GS por eje
  const axis1 = dominantAxisFromVelocity(lastVelocity.x || 0, lastVelocity.y || 0)
  const axis2 = axis1 === 'x' ? 'y' : 'x'
  const tryAxis = (axis, iters = 4) => {
    for (let i = 0; i < iters; i++) {
      const { hard, soft } = getConflicts(x, y)
      if (hard.length === 0 && soft.length === 0) return true
      let moved = false
      const applyFor = (confList, pool) => {
        for (const b of confList) {
          const otherId = b.aId === movingEl.id ? b.bId : b.aId
          const other = pool.find((n) => n.id === otherId)
          if (!other) continue
          let { dx, dy } = computeMTD(x, y, aw, ah, other.x, other.y, other.width, other.height)
          if (axis === 'x') dy = 0
          else dx = 0
          if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
            x += dx
            y += dy
            const cl = doClamp(x, y)
            x = cl.x
            y = cl.y
            moved = true
          }
        }
      }
      applyFor(hard, hardNeighbors)
      applyFor(soft, softNeighbors)
      if (!moved) {
        const { hard: h2 } = getConflicts(x, y)
        return h2.length === 0
      }
    }
    const { hard: h3 } = getConflicts(x, y)
    return h3.length === 0
  }

  let ok = tryAxis(axis1, Math.ceil(maxIters / 2))
  if (!ok) ok = tryAxis(axis2, Math.floor(maxIters / 2))

  const { hard: rest } = getConflicts(x, y)
  if (rest.length > 0 || !insidePolyOrRect(x, y, aw, ah, areaBounds)) {
    // Fallback a última válida si queda bloqueo o se salió
    if (lastValidPos) return { x: lastValidPos.x, y: lastValidPos.y, fellBack: true }
  }
  return { x, y, fellBack: false }
}
