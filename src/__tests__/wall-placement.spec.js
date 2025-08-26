import { describe, it, expect } from 'vitest'
import { isWallFormValid } from '@/utils/validation'
import { isWallPlacementValid } from '@/utils/wallPlacement'
import { attachToWall } from '@/utils/wallAttach'

const poly = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]

describe('wall placement utilities', () => {
  it('formulario pared inválido si altura o alto son ≤0', () => {
    expect(
      isWallFormValid({ ubicacion: 'pared', alturaRespectoAlSuelo: 0, dimensiones: { alto: 10 } }),
    ).toBe(false)
    expect(
      isWallFormValid({ ubicacion: 'pared', alturaRespectoAlSuelo: 10, dimensiones: { alto: 0 } }),
    ).toBe(false)
    expect(
      isWallFormValid({ ubicacion: 'pared', alturaRespectoAlSuelo: 10, dimensiones: { alto: 5 } }),
    ).toBe(true)
  })

  it('zTop debe estar bajo el techo', () => {
    const size = { width: 10, height: 10 }
    const pos = attachToWall({ x: 0, y: 0 }, size, poly)
    const el = { ubicacion: 'pared', elevacion: { zBase: 50, altura: 200 }, tolerancias: { zEpsilon: 0.5 } }
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 300, el, vecinos: [] }),
    ).toBe(true)
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 200, el, vecinos: [] }),
    ).toBe(false)
  })

  it('pared/pared: solape Z bloquea, Z disjunto permite', () => {
    const size = { width: 10, height: 10 }
    const pos = attachToWall({ x: 0, y: 0 }, size, poly)
    const el = { ubicacion: 'pared', x: pos.x, y: pos.y, width: 10, height: 10, elevacion: { zBase: 0, altura: 10 }, tolerancias: { zEpsilon: 0.5 } }
    const solapa = { ubicacion: 'pared', x: 5, y: pos.y, width: 10, height: 10, elevacion: { zBase: 5, altura: 10 }, tolerancias: { zEpsilon: 0.5 } }
    const disjunta = { ubicacion: 'pared', x: 5, y: pos.y, width: 10, height: 10, elevacion: { zBase: 20, altura: 10 }, tolerancias: { zEpsilon: 0.5 } }
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 100, el, vecinos: [solapa] }),
    ).toBe(false)
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 100, el, vecinos: [disjunta] }),
    ).toBe(true)
  })

  it('pared contra suelo sólo válido si zBase supera altura del suelo', () => {
    const size = { width: 10, height: 10 }
    const pos = attachToWall({ x: 0, y: 0 }, size, poly)
    const suelo = { ubicacion: 'suelo', x: 0, y: 0, width: 20, height: 20, elevacion: { zBase: 0, altura: 10 }, tolerancias: { zEpsilon: 0.5 } }
    const elOk = { ubicacion: 'pared', elevacion: { zBase: 11, altura: 10 }, tolerancias: { zEpsilon: 0.5 } }
    const elBad = { ubicacion: 'pared', elevacion: { zBase: 9, altura: 10 }, tolerancias: { zEpsilon: 0.5 } }
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 100, el: elOk, vecinos: [suelo] }),
    ).toBe(true)
    expect(
      isWallPlacementValid({ posXY: pos, size, plantaPoly: poly, bodegaAltura: 100, el: elBad, vecinos: [suelo] }),
    ).toBe(false)
  })

  it('attachToWall lleva la posición al segmento más cercano', () => {
    const size = { width: 10, height: 10 }
    const pos = { x: 30, y: 40 }
    const snapped = attachToWall(pos, size, poly)
    expect(snapped.x).toBeCloseTo(0)
    expect(snapped.y).toBeCloseTo(40)
  })
})
