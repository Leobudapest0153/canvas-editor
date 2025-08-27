import { describe, it, expect } from 'vitest'
import {
  isWallFormValid,
  wallZOk,
  wallNoZOverlap,
  wallVsFloorOk,
  validateWallPlacement,
} from '@/utils/wallRules'
import { CM_TO_PX } from '@/utils/constants'

describe('wallRules utils', () => {
  it('isWallFormValid', () => {
    const bH = 300
    expect(
      isWallFormValid(
        {
          ubicacion: 'pared',
          alturaRespectoAlSuelo: '10',
          dimensiones: { alto: '5' },
        },
        bH,
        CM_TO_PX,
      ),
    ).toBe(true)
    expect(
      isWallFormValid(
        {
          ubicacion: 'PARED',
          alturaRespectoAlSuelo: 0,
          dimensiones: { alto: 5 },
        },
        bH,
        CM_TO_PX,
      ),
    ).toBe(false)
    // acepta valores en px
    expect(
      isWallFormValid(
        {
          ubicacion: 'pared',
          alturaRespectoAlSuelo: 1500, // 150px? Wait 1500 = 1500 cm? Correction: it's px 1500
          dimensiones: { alto: 750 },
        },
        bH,
        CM_TO_PX,
      ),
    ).toBe(true)
  })

  it('wallZOk with warehouse height', () => {
    expect(
      wallZOk(
        { ubicacion: 'pared', alturaRespectoAlSuelo: '100', dimensiones: { alto: '150' } },
        300,
        CM_TO_PX,
      ),
    ).toBe(true)
    expect(
      wallZOk(
        { ubicacion: 'PARED', alturaRespectoSuelo: 205, dimensiones: { alto: 151 } },
        300,
        CM_TO_PX,
      ),
    ).toBe(false)
  })

  it('wallNoZOverlap disjoint vs overlapping', () => {
    const a = {
      metadata: { ubicacion: 'Pared' },
      alturaRespectoAlSuelo: 0,
      altura: 100,
    }
    const b = { ubicacion: 'pared', alturaRespectoSuelo: 110, altura: 50 }
    const c = { ubicacion: 'PARED', elevacion: { zBase: 50 }, dimensiones: { alto: 80 } }
    expect(wallNoZOverlap(a, b, 300, CM_TO_PX)).toBe(true)
    expect(wallNoZOverlap(a, c, 300, CM_TO_PX)).toBe(false)
  })

  it('wallVsFloorOk with high floor', () => {
    const wall = { ubicacion: 'pared', elevacion: { zBase: 15 } }
    const floor = { metadata: { ubicacion: 'Suelo' }, dimensiones: { alto: 11 } }
    const lowWall = { ubicacion: 'PARED', alturaRespectoSuelo: 9 }
    expect(wallVsFloorOk(wall, floor, 300, CM_TO_PX)).toBe(true)
    expect(wallVsFloorOk(lowWall, floor, 300, CM_TO_PX)).toBe(false)
  })

  it('validateWallPlacement ok and ko', () => {
    const el = {
      id: 'w',
      ubicacion: 'PARED',
      alturaRespectoAlSuelo: 50,
      dimensiones: { alto: 100 },
    }
    const floor = { id: 'f', metadata: { ubicacion: 'Suelo' }, dimensiones: { alto: 10 } }
    const other = {
      id: 'o',
      ubicacion: 'pared',
      elevacion: { zBase: 200 },
      altura: 50,
    }
    expect(
      validateWallPlacement({
        el,
        all: [floor, other],
        bodegaH: 300,
        CM_TO_PX,
      }),
    ).toEqual({ ok: true })
    const badOther = {
      id: 'b',
      metadata: { ubicacion: 'pared' },
      alturaRespectoSuelo: 80,
      dimensiones: { alto: 80 },
    }
    const res = validateWallPlacement({
      el,
      all: [badOther],
      bodegaH: 300,
      CM_TO_PX,
    })
    expect(res.ok).toBe(false)
  })
})
