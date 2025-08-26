import { describe, it, expect } from 'vitest'
import { isWallFormValid } from '@/utils/validation'
import { attachToWall } from '@/utils/wallAttach'
import { isWallPlacementValid } from '@/utils/wallPlacement'

const poly = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 200, y: 200 },
  { x: 0, y: 200 },
]

describe('validación de formularios de pared', () => {
  it('guardar deshabilitado si alturaRespectoSuelo <= 0', () => {
    const el = { ubicacion: 'pared', alturaRespectoSuelo: 0, dimensiones: { alto: 10 } }
    expect(isWallFormValid(el)).toBe(false)
    const ok = { ubicacion: 'pared', alturaRespectoSuelo: 5, dimensiones: { alto: 10 } }
    expect(isWallFormValid(ok)).toBe(true)
  })
})

describe('isWallPlacementValid reglas básicas', () => {
  const baseEl = {
    id: 'wall',
    ubicacion: 'pared',
    elevacion: { zBase: 10, altura: 50 },
    tolerancias: { zEpsilon: 0.5 },
  }
  const size = { width: 20, height: 20 }
  const pos = { x: 0, y: 90 } // near left wall

  it('zTop ≤ bodegaAltura', () => {
    const el = { ...baseEl, elevacion: { zBase: 260, altura: 50 } }
    expect(isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 300, el, vecinos: [] })).toBe(false)
    const okEl = { ...baseEl, elevacion: { zBase: 200, altura: 50 } }
    expect(isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 300, el: okEl, vecinos: [] })).toBe(true)
  })

  it('pared/pared con solape Z bloquea', () => {
    const vecino = {
      id: 'v1',
      x: 0,
      y: 90,
      width: 20,
      height: 20,
      ubicacion: 'pared',
      elevacion: { zBase: 20, altura: 40 },
      tolerancias: { zEpsilon: 0.5 },
    }
    const el = { ...baseEl, elevacion: { zBase: 30, altura: 40 } }
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 300, el, vecinos: [vecino] })
    ).toBe(false)

    const el2 = { ...baseEl, elevacion: { zBase: 70, altura: 20 } }
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 300, el: el2, vecinos: [vecino] })
    ).toBe(true)
  })

  it('pared con elemento de suelo requiere zBase por encima del suelo', () => {
    const suelo = {
      id: 's1',
      x: 0,
      y: 90,
      width: 20,
      height: 20,
      ubicacion: 'suelo',
      elevacion: { zBase: 0, altura: 30 },
      tolerancias: { zEpsilon: 0.5 },
    }
    const el = { ...baseEl, elevacion: { zBase: 20, altura: 20 } }
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 300, el, vecinos: [suelo] })
    ).toBe(false)

    const el2 = { ...baseEl, elevacion: { zBase: 40, altura: 20 } }
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 300, el: el2, vecinos: [suelo] })
    ).toBe(true)
  })
})

describe('attachToWall', () => {
  it('pega al segmento más cercano', () => {
    const pos = { x: 160, y: 20 }
    const size = { width: 20, height: 20 }
    const snapped = attachToWall(pos, size, poly)
    expect(snapped.x).toBe(180)
    expect(snapped.y).toBe(20)
  })
})
