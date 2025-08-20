import { describe, it, expect } from 'vitest'
import { evaluateConflict, computeMTD } from '@/utils/collision'

function el(id, x, y, w, h, ubicacion = 'suelo', zBase = 0, alto = 0, espesor = 0, zEpsilon = 0) {
  return {
    id,
    x,
    y,
    width: w,
    height: h,
    ubicacion,
    elevacion: { zBase, altura: alto, espesor },
    tolerancias: { zEpsilon },
  }
}

describe('Reglas de solapamiento', () => {
  it('suelo–suelo bloquea', () => {
    const a = el('A', 0, 0, 100, 100, 'suelo', 0, 0)
    const b = el('B', 50, 50, 100, 100, 'suelo', 0, 0)
    const c = evaluateConflict(a, b)
    expect(c).toBeTruthy()
    expect(c.bloqueante).toBe(true)
    expect(c.permitido).toBe(false)
  })

  it('suelo–pared permitido, rojo si Z solapa indebidamente', () => {
    // XY se superponen
    const suelo = el('S', 0, 0, 100, 100, 'suelo', 0, 10)
    const pared = el('P', 50, 0, 20, 100, 'pared', 5, 10, 2, 0) // Z 5..15 sobre suelo 0..10 => solapa Z
    const c = evaluateConflict(suelo, pared)
    expect(c).toBeTruthy()
    expect(c.bloqueante).toBe(false)
    expect(c.permitido).toBe(true)
    expect(c.zOverlap).toBe(true)
  })

  it('suelo–pared permitido con warning', () => {
    const suelo = el('S', 0, 0, 100, 100, 'suelo', 0, 10)
    const pared = el('P', 50, 0, 20, 100, 'pared', 5, 10, 2, 0)
    const c = evaluateConflict(suelo, pared)
    expect(c).toBeTruthy()
    expect(c.bloqueante).toBe(false)
    expect(c.permitido).toBe(true)
    expect(c.warning).toBe(true)
  })

  it('pared–pared paralelo en conflicto (XY superpuestos) permitido con advertencia', () => {
    const p1 = el('P1', 0, 0, 10, 100, 'pared', 0, 10, 1)
    const p2 = el('P2', 5, 0, 10, 100, 'pared', 0, 10, 1)
    const c = evaluateConflict(p1, p2)
    expect(c).toBeTruthy()
    expect(c.bloqueante).toBe(false)
    expect(c.permitido).toBe(true)
    expect(c.warning).toBe(true)
  })

  it('encuentros en L/T por debajo de zEpsilon no se consideran solape Z', () => {
    const a = el('A', 0, 0, 100, 10, 'pared', 0, 10, 1, 2)
    const b = el('B', 0, 5, 10, 100, 'pared', 10, 10, 1, 2) // A [0,10], B [10,20] con zEpsilon=2 -> no solapa
    const c = evaluateConflict(a, b)
    expect(c).toBeTruthy()
    expect(c.zOverlap).toBe(false)
  })

  it('MTD: al empujar suelo contra suelo queda pegado sin solaparse', () => {
    // A fijo
    const A = el('A', 0, 0, 100, 100, 'suelo')
    // B candidato que solapa 20px en X
    let Bx = 90
    let By = 20
    const { dx, dy } = computeMTD(Bx, By, 50, 60, A.x, A.y, A.width, A.height)
    Bx += dx
    By += dy
    // Debe quedar justo a la derecha de A (x = 100) o por encima/abajo sin solape
    const noOverlapX = Bx >= A.x + A.width || Bx + 50 <= A.x
    const noOverlapY = By >= A.y + A.height || By + 60 <= A.y
    // Tras aplicar MTD en un eje, no debe haber solape global
    expect(noOverlapX || noOverlapY).toBe(true)
    // Si resolvió por X, entonces Bx debe ser 100
    if (Math.abs(dx) > 0 && Math.abs(dx) < Math.abs(dy) + 1e-6) {
      expect(Bx).toBe(100)
    }
  })
})
