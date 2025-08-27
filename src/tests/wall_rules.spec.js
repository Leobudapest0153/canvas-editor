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
    expect(
      isWallFormValid(
        {
          ubicacion: 'pared',
          alturaRespectoAlSuelo: 1500,
          dimensiones: { alto: 750 },
        },
        500,
        CM_TO_PX,
      ),
    ).toBe(true)
    expect(
      isWallFormValid(
        { ubicacion: 'PARED', alturaRespectoAlSuelo: 0, dimensiones: { alto: 5 } },
        300,
        CM_TO_PX,
      ),
    ).toBe(false)
  })

  it('wallZOk with warehouse height', () => {
    expect(
      wallZOk(
        { ubicacion: 'pared', alturaRespectoAlSuelo: 1000, dimensiones: { alto: 1500 } },
        300,
        CM_TO_PX,
      ),
    ).toBe(true)
    expect(
      wallZOk(
        { ubicacion: 'PARED', alturaRespectoSuelo: 2000, dimensiones: { alto: 1500 } },
        300,
        CM_TO_PX,
      ),
    ).toBe(false)
  })

  it('wallNoZOverlap considers XY overlap', () => {
    const a = {
      metadata: { ubicacion: 'Pared' },
      alturaRespectoAlSuelo: 0,
      dimensiones: { alto: 100, ancho: 50, largo: 50 },
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    }
    const b = {
      ubicacion: 'pared',
      alturaRespectoSuelo: 20,
      dimensiones: { alto: 50, ancho: 50, largo: 50 },
      x: 200,
      y: 0,
      width: 50,
      height: 50,
    }
    const c = {
      ubicacion: 'PARED',
      elevacion: { zBase: 20 },
      dimensiones: { alto: 80, ancho: 50, largo: 50 },
      x: 10,
      y: 0,
      width: 50,
      height: 50,
    }
    expect(wallNoZOverlap(a, b, 300, CM_TO_PX)).toBe(true)
    expect(wallNoZOverlap(a, c, 300, CM_TO_PX)).toBe(false)
    const d = { ...c, elevacion: { zBase: 200 } }
    expect(wallNoZOverlap(a, d, 300, CM_TO_PX)).toBe(true)
  })

  it('wallVsFloorOk checks XY overlap', () => {
    const wall = {
      ubicacion: 'pared',
      elevacion: { zBase: 1500 },
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    }
    const floor = {
      metadata: { ubicacion: 'Suelo' },
      dimensiones: { alto: 100, ancho: 50, largo: 50 },
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    }
    const farFloor = { ...floor, x: 200 }
    const lowWall = {
      ubicacion: 'PARED',
      alturaRespectoSuelo: 90,
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    }
    expect(wallVsFloorOk(wall, floor, 300, CM_TO_PX)).toBe(true)
    expect(wallVsFloorOk(lowWall, floor, 300, CM_TO_PX)).toBe(false)
    expect(wallVsFloorOk(lowWall, farFloor, 300, CM_TO_PX)).toBe(true)
  })

  it('validateWallPlacement ok and ko', () => {
    const el = {
      id: 'w',
      ubicacion: 'PARED',
      alturaRespectoAlSuelo: 100,
      dimensiones: { alto: 100, ancho: 50, largo: 50 },
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    }
    const floor = {
      id: 'f',
      metadata: { ubicacion: 'Suelo' },
      dimensiones: { alto: 100, ancho: 50, largo: 50 },
      x: 200,
      y: 0,
      width: 50,
      height: 50,
    }
    const other = {
      id: 'o',
      ubicacion: 'pared',
      elevacion: { zBase: 20 },
      altura: 50,
      x: 200,
      y: 0,
      width: 50,
      height: 50,
    }
    expect(
      validateWallPlacement({ el, all: [floor, other], bodegaH: 300, CM_TO_PX }),
    ).toEqual({ ok: true })
    const badOther = {
      id: 'b',
      metadata: { ubicacion: 'pared' },
      alturaRespectoSuelo: 150,
      dimensiones: { alto: 80, ancho: 50, largo: 50 },
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    }
    const res = validateWallPlacement({ el, all: [badOther], bodegaH: 300, CM_TO_PX })
    expect(res.ok).toBe(false)
  })
})
