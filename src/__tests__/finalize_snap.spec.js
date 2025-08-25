import { describe, it, expect } from 'vitest'
import { finalizeRectClampSnapReclamp } from '@/utils/edgeConstraint'

describe('finalizeRectClampSnapReclamp: orden clamp→snap→re-clamp', () => {
  const area = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  const grid = 10

  it('no crea margen al clavar a la derecha tras snap', () => {
    const w = 23, h = 10
    // candidato muy a la derecha
    const r = finalizeRectClampSnapReclamp(95, 5, w, h, area, grid)
    // clamp inicial sería 77; snap produce 80; re-clamp devuelve 77
    expect(r.x).toBe(77)
  })

  it('en el borde izquierdo se queda en 0 exacto', () => {
    const w = 20, h = 10
    const r = finalizeRectClampSnapReclamp(-5, 5, w, h, area, grid)
    expect(r.x).toBe(0)
  })

  it('en el centro aplica snap dentro del área', () => {
    const w = 10, h = 10
    const r = finalizeRectClampSnapReclamp(34, 22, w, h, area, grid)
    expect(r.x).toBe(30)
    expect(r.y).toBe(20)
  })
})

