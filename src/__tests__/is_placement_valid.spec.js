import { describe, it, expect } from 'vitest'
import { isPlacementValid, insideAreaModel } from '@/utils/isPlacementValid'

const area = { minX: 0, minY: 0, maxX: 200, maxY: 100 }

const makeEl = (id, x, y, w, h, forma = 'rectangular', ubicacion = 'suelo') => ({
  id, x, y, width: w, height: h, forma, ubicacion,
})

describe('isPlacementValid (modelo puro, unificado)', () => {
  it('insideAreaModel: rectángulo completamente dentro del área', () => {
    const el = makeEl('B', 0, 0, 40, 20)
    expect(insideAreaModel({ x: 10, y: 10 }, el, area, 0.5)).toBe(true)
    expect(insideAreaModel({ x: 180, y: 85 }, el, area, 0.5)).toBe(false)
  })

  it('sin bloqueantes y dentro de área => válido', () => {
    const B = makeEl('B', 0, 0, 40, 20)
    const neighbors = [makeEl('A', 100, 0, 50, 100)]
    const ok = isPlacementValid({ pos: { x: 10, y: 10 }, movingEl: B, neighbors, areaBounds: area, CM_TO_PX: 1 })
    expect(ok).toBe(true)
  })

  it('con bloqueante (suelo–suelo) => inválido', () => {
    const B = makeEl('B', 0, 0, 40, 20)
    const neighbors = [makeEl('A', 15, 5, 60, 40)] // solapa a B en pos {10,10}
    const ok = isPlacementValid({ pos: { x: 10, y: 10 }, movingEl: B, neighbors, areaBounds: area, CM_TO_PX: 1 })
    expect(ok).toBe(false)
  })

  it('elemento circular usa diámetro (AABB) y no depende de stroke/zoom', () => {
    const C = makeEl('C', 0, 0, 30, 30, 'circular')
    const neighbors = []
    const ok = isPlacementValid({ pos: { x: 170, y: 70 }, movingEl: C, neighbors, areaBounds: area, CM_TO_PX: 1 })
    expect(ok).toBe(true) // 170+30<=200 y 70+30<=100
  })
})

