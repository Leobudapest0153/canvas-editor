import { describe, it, expect } from 'vitest'
import { resolveCandidateWithBoundary, projectMTDAgainstBoundary, detectConflictsFor } from '@/utils/collision'

function el(id, x, y, w, h, ubicacion = 'suelo') {
  return { id, x, y, width: w, height: h, ubicacion }
}

function noOverlap(a, b) {
  return a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y
}

describe('Resolución con prioridad de contorno (no-expansiva)', () => {
  it('caso repro: A pegado a pared izquierda y 20cm del borde superior; mover B arriba-izquierda no saca A ni B del área', () => {
    const W = 400
    const H = 300

    // A pegado a la pared izquierda (x=0) y a 20cm del tope superior (~40px)
    const A = el('A', 0, 40, 100, 60, 'suelo')
    // B candidato moviéndose arriba-izquierda, posicionándolo solapando con A
    let B = el('B', 50, 30, 100, 60, 'suelo')

    // Resolver B contra A dentro del área [0..W,0..H]
    const resolved = resolveCandidateWithBoundary(B, [A, B], W, H, 3, { x: B.x, y: B.y })
    B = { ...B, x: resolved.x, y: resolved.y }

    // Ambos deben quedar dentro del área
    const insideA = A.x >= 0 && A.y >= 0 && A.x + A.width <= W && A.y + A.height <= H
    const insideB = B.x >= 0 && B.y >= 0 && B.x + B.width <= W && B.y + B.height <= H
    expect(insideA).toBe(true)
    expect(insideB).toBe(true)

    // A queda pegado (x==0) y sin ser "empujado" por la resolución (no se mueve)
    expect(A.x).toBe(0)

    // No hay solape bloqueante entre A y B después de resolver
    expect(noOverlap(A, B)).toBe(true)
    const conflicts = detectConflictsFor(B, [A, B]).filter((c) => c.bloqueante)
    expect(conflicts.length).toBe(0)
  })

  it('prioridad de contorno: la proyección de MTD anula componentes que expulsan fuera del área', () => {
    const W = 300
    const H = 200
    const w = 80
    const h = 50

    // Candidato en minX con MTD hacia la izquierda => dx debe anularse
    let proj = projectMTDAgainstBoundary(0, 10, -25, 0, w, h, W, H)
    expect(proj.dx).toBe(0)
    expect(proj.dy).toBe(0)

    // Candidato en maxX con MTD hacia la derecha => dx debe anularse
    const maxX = Math.max(0, W - w)
    proj = projectMTDAgainstBoundary(maxX, 10, 15, 0, w, h, W, H)
    expect(proj.dx).toBe(0)

    // Candidato en minY con MTD hacia arriba => dy debe anularse
    proj = projectMTDAgainstBoundary(10, 0, 0, -12, w, h, W, H)
    expect(proj.dy).toBe(0)

    // Candidato en maxY con MTD hacia abajo => dy debe anularse
    const maxY = Math.max(0, H - h)
    proj = projectMTDAgainstBoundary(10, maxY, 0, 9, w, h, W, H)
    expect(proj.dy).toBe(0)
  })

  it('el MTD agregado jamás debe producir una posición final fuera del área', () => {
    const W = 300
    const H = 200
    const A = el('A', 0, 60, 120, 60, 'suelo') // pegado a izquierda
    let B = el('B', 40, 80, 100, 50, 'suelo') // solapa con A

    const resolved = resolveCandidateWithBoundary(B, [A, B], W, H, 3, { x: B.x, y: B.y })
    B = { ...B, x: resolved.x, y: resolved.y }

    const insideB = B.x >= 0 && B.y >= 0 && B.x + B.width <= W && B.y + B.height <= H
    expect(insideB).toBe(true)
  })
})

