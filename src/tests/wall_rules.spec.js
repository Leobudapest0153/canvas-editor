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
      isWallFormValid({ ubicacion: 'pared', alturaRespectoSuelo: 0, dimensiones: { alto: 5 } }),
    ).toBe(false)
    expect(
      isWallFormValid({
        metadata: { ubicacion: 'PARED' },
        elevacion: { zBase: 20 },
        altura: 10,
      }),
    ).toBe(true)
  })

  it('wallZOk with warehouse height', () => {
    expect(
      wallZOk(
        { ubicacion: 'pared', alturaRespectoAlSuelo: 100, dimensiones: { alto: 150 } },
        300,
      ),
    ).toBe(true)
    expect(
      wallZOk(
        { ubicacion: 'PARED', alturaRespectoAlSuelo: 200, dimensiones: { alto: 150 } },
        300,
      ),
    ).toBe(false)
  })

  it('wallNoZOverlap disjoint vs overlapping', () => {
    const a = { ubicacion: 'PARED', alturaRespectoAlSuelo: 0, dimensiones: { alto: 100 } }
    const b = { ubicacion: 'pared', alturaRespectoAlSuelo: 110, dimensiones: { alto: 50 } }
    const c = { metadata: { ubicacion: 'pareD' }, elevacion: { zBase: 50 }, dimensiones: { alto: 80 } }
    expect(wallNoZOverlap(a, b)).toBe(true)
    expect(wallNoZOverlap(a, c)).toBe(false)
  })

  it('wallVsFloorOk with high floor', () => {
    const wall = { ubicacion: 'PARED', alturaRespectoAlSuelo: 15 }
    const floor = { metadata: { ubicacion: 'suelo' }, dimensiones: { alto: 10 } }
    const lowWall = { ubicacion: 'pared', alturaRespectoAlSuelo: 9 }
    expect(wallVsFloorOk(wall, floor)).toBe(true)
    expect(wallVsFloorOk(lowWall, floor)).toBe(false)
  })

  it('validateWallPlacement ok and ko', () => {
    const el = {
      id: 'w',
      metadata: { ubicacion: 'PARED' },
      alturaRespectoAlSuelo: 50,
      dimensiones: { alto: 100 },
    }
    const floor = {
      id: 'f',
      metadata: { ubicacion: 'suelo' },
      dimensiones: { alto: 10 },
    }
    const other = {
      id: 'o',
      ubicacion: 'pared',
      alturaRespectoAlSuelo: 200,
      dimensiones: { alto: 50 },
    }
    expect(
      validateWallPlacement({ el, all: [floor, other], bodegaH: 300 }),
    ).toEqual({ ok: true })
    const badOther = {
      id: 'b',
      ubicacion: 'PARED',
      alturaRespectoAlSuelo: 80,
      dimensiones: { alto: 80 },
    }
    const res = validateWallPlacement({ el, all: [badOther], bodegaH: 300 })
    expect(res.ok).toBe(false)
  })
})
