import { describe, it, expect } from 'vitest'
import {
  isWallFormValid,
  wallZOk,
  wallNoZOverlap,
  wallVsFloorOk,
  validateWallPlacement,
} from '@/utils/wallRules'

describe('wallRules utils', () => {
  it('isWallFormValid', () => {
    expect(
      isWallFormValid({ ubicacion: 'Pared', alturaRespectoSuelo: 10, dimensiones: { alto: 5 } }),
    ).toBe(true)
    expect(
      isWallFormValid({ ubicacion: 'Pared', alturaRespectoSuelo: 0, dimensiones: { alto: 5 } }),
    ).toBe(false)
  })

  it('wallZOk with warehouse height', () => {
    expect(
      wallZOk(
        { ubicacion: 'Pared', alturaRespectoSuelo: 100, dimensiones: { alto: 150 } },
        300,
      ),
    ).toBe(true)
    expect(
      wallZOk(
        { ubicacion: 'Pared', alturaRespectoSuelo: 200, dimensiones: { alto: 150 } },
        300,
      ),
    ).toBe(false)
  })

  it('wallNoZOverlap disjoint vs overlapping', () => {
    const a = { ubicacion: 'Pared', alturaRespectoSuelo: 0, dimensiones: { alto: 100 } }
    const b = { ubicacion: 'Pared', alturaRespectoSuelo: 110, dimensiones: { alto: 50 } }
    const c = { ubicacion: 'Pared', alturaRespectoSuelo: 50, dimensiones: { alto: 80 } }
    expect(wallNoZOverlap(a, b)).toBe(true)
    expect(wallNoZOverlap(a, c)).toBe(false)
  })

  it('wallVsFloorOk with high floor', () => {
    const wall = { ubicacion: 'Pared', alturaRespectoSuelo: 15 }
    const floor = { ubicacion: 'Suelo', dimensiones: { alto: 10 } }
    const lowWall = { ubicacion: 'Pared', alturaRespectoSuelo: 9 }
    expect(wallVsFloorOk(wall, floor)).toBe(true)
    expect(wallVsFloorOk(lowWall, floor)).toBe(false)
  })

  it('validateWallPlacement ok and ko', () => {
    const el = {
      id: 'w',
      ubicacion: 'Pared',
      alturaRespectoSuelo: 50,
      dimensiones: { alto: 100 },
    }
    const floor = { id: 'f', ubicacion: 'Suelo', dimensiones: { alto: 10 } }
    const other = {
      id: 'o',
      ubicacion: 'Pared',
      alturaRespectoSuelo: 200,
      dimensiones: { alto: 50 },
    }
    expect(
      validateWallPlacement({ el, all: [floor, other], bodegaH: 300 }),
    ).toEqual({ ok: true })
    const badOther = {
      id: 'b',
      ubicacion: 'Pared',
      alturaRespectoSuelo: 80,
      dimensiones: { alto: 80 },
    }
    const res = validateWallPlacement({ el, all: [badOther], bodegaH: 300 })
    expect(res.ok).toBe(false)
  })
})
