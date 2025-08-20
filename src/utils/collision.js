// utils/collision.js
// Detección de conflictos: broad-phase (AABB), narrow-phase (2D) y chequeo Z

// Pequeño throttle (16-32ms)
export function throttle(fn, wait = 16) {
  let last = 0
  let pending = null
  return function throttled(...args) {
    const now = Date.now()
    const remaining = wait - (now - last)
    if (remaining <= 0) {
      last = now
      return fn.apply(this, args)
    }
    if (!pending) {
      pending = setTimeout(() => {
        pending = null
        last = Date.now()
        fn.apply(this, args)
      }, remaining)
    }
  }
}

export function getAABB(el) {
  return { x: el.x, y: el.y, w: el.width, h: el.height }
}

export function aabbIntersect(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
}

// Sencillo índice espacial: placeholder para quadtree; interfaz compatible
export function buildSpatialIndex(elements) {
  // Para empezar, devolvemos arreglo simple; se puede reemplazar por quadtree real
  return elements.map((el) => ({ id: el.id, aabb: getAABB(el) }))
}

export function broadPhaseCandidates(movingEl, index) {
  const aabb = getAABB(movingEl)
  const out = []
  for (const n of index) {
    if (n.id === movingEl.id) continue
    if (aabbIntersect(aabb, n.aabb)) out.push(n.id)
  }
  return out
}

// Narrow phase 2D
// suelo = polígono (aquí aproximamos como rect del elemento)
// pared = segmento bufferizado a rect usando elevacion.espesor (aprox: usar rect existente y engrosar por espesor en el eje menor)

function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay)
}

function inflateRectForWall(el) {
  const e = el.elevacion || {}
  const esp = e.espesor || 0
  // inflar por espesor en el eje menor
  const isHorizontal = (el.width || 0) >= (el.height || 0)
  const dx = isHorizontal ? 0 : esp
  const dy = isHorizontal ? esp : 0
  return { x: el.x - dx / 2, y: el.y - dy / 2, w: el.width + dx, h: el.height + dy }
}

export function narrowPhase2D(a, b) {
  const tipoA = a.ubicacion || 'suelo'
  const tipoB = b.ubicacion || 'suelo'

  let ra, rb
  if (tipoA === 'pared') ra = inflateRectForWall(a)
  else ra = { x: a.x, y: a.y, w: a.width, h: a.height }
  if (tipoB === 'pared') rb = inflateRectForWall(b)
  else rb = { x: b.x, y: b.y, w: b.width, h: b.height }

  const inter = rectsIntersect(ra.x, ra.y, ra.w, ra.h, rb.x, rb.y, rb.w, rb.h)
  return { intersectXY: inter, ra, rb }
}

export function zOverlapCheck(a, b) {
  const tolA = a.tolerancias || {}
  const tolB = b.tolerancias || {}
  const zEpsilon = Math.max(tolA.zEpsilon || 0, tolB.zEpsilon || 0)

  const ea = a.elevacion || { zBase: 0, altura: 0 }
  const eb = b.elevacion || { zBase: 0, altura: 0 }
  const a0 = ea.zBase || 0
  const a1 = (ea.zBase || 0) + (ea.altura || 0)
  const b0 = eb.zBase || 0
  const b1 = (eb.zBase || 0) + (eb.altura || 0)

  const overlap = !(a1 <= b0 + zEpsilon || b1 <= a0 + zEpsilon)
  const amount = Math.min(a1, b1) - Math.max(a0, b0)
  return { overlap, amount: overlap ? amount : 0, zEpsilon }
}

export function classifyPair(a, b) {
  const tA = a.ubicacion || 'suelo'
  const tB = b.ubicacion || 'suelo'
  if (tA === 'suelo' && tB === 'suelo') return 'suelo-suelo'
  if ((tA === 'suelo' && tB === 'pared') || (tA === 'pared' && tB === 'suelo')) return 'suelo-pared'
  if (tA === 'pared' && tB === 'pared') return 'pared-pared'
  return 'otro'
}

// Regla de permisos y bloqueos (warning=true para clases no bloqueantes con XY solapado)
export function evaluateConflict(a, b) {
  const clase = classifyPair(a, b)
  const { intersectXY } = narrowPhase2D(a, b)
  if (!intersectXY) return null

  const z = zOverlapCheck(a, b)
  const base = { aId: a.id, bId: b.id, clase, xyOverlap: true, zOverlap: z.overlap, zAmount: z.amount }

  if (clase === 'suelo-suelo') {
    return { ...base, permitido: false, bloqueante: true, warning: false }
  }
  if (clase === 'suelo-pared' || clase === 'pared-pared') {
    return { ...base, permitido: true, bloqueante: false, warning: true }
  }
  // Otros casos: permitido, advertencia si XY
  return { ...base, permitido: true, bloqueante: false, warning: true }
}

export function detectConflictsFor(movingEl, allElements) {
  const index = buildSpatialIndex(allElements)
  const candidates = broadPhaseCandidates(movingEl, index)
  const idSet = new Set(candidates)
  const out = []
  for (const other of allElements) {
    if (other.id === movingEl.id) continue
    if (!idSet.has(other.id)) continue
    const res = evaluateConflict(movingEl, other)
    if (res) out.push(res)
  }
  return out
}

// MTD (mínima traslación) entre AABB A y B para separar A de B
export function computeMTD(ax, ay, aw, ah, bx, by, bw, bh) {
  const aLeft = ax
  const aRight = ax + aw
  const aTop = ay
  const aBottom = ay + ah
  const bLeft = bx
  const bRight = bx + bw
  const bTop = by
  const bBottom = by + bh

  // Si no hay solape, no hay MTD
  if (aRight <= bLeft || bRight <= aLeft || aBottom <= bTop || bBottom <= aTop) {
    return { dx: 0, dy: 0 }
  }

  // Traslaciones necesarias para separar A de B en cada eje
  // Eje X: valores positivos desplazan A hacia la derecha, negativos hacia la izquierda
  const moveLeft = aRight - bLeft // mover A hacia la izquierda (dx negativo)
  const moveRight = bRight - aLeft // mover A hacia la derecha (dx positivo)

  // Eje Y: valores positivos desplazan A hacia abajo, negativos hacia arriba
  const moveUp = aBottom - bTop // mover A hacia arriba (dy negativo)
  const moveDown = bBottom - aTop // mover A hacia abajo (dy positivo)

  // Elegir la menor magnitud en cada eje
  const mtdX = Math.abs(moveLeft) < Math.abs(moveRight) ? -moveLeft : moveRight
  const mtdY = Math.abs(moveUp) < Math.abs(moveDown) ? -moveUp : moveDown

  // Proyectar a un único eje: elegir el de menor magnitud absoluta
  if (Math.abs(mtdX) < Math.abs(mtdY)) {
    return { dx: mtdX, dy: 0 }
  }
  return { dx: 0, dy: mtdY }
}
