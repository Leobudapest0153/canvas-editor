import { describe, it, expect } from 'vitest'
import {
  isWallFormValid,
  wallZOk,
  wallNoZOverlap,
  wallVsFloorOk,
  validateWallPlacement,
} from '../utils/wallRules.js'

describe('wallRules utilities', () => {
  it('isWallFormValid', () => {
    expect(
      isWallFormValid({ ubicacion: 'Pared', alturaRespectoSuelo: 10, dimensiones: { alto: 20 } })
    ).toBe(true)
    expect(
      isWallFormValid({ ubicacion: 'Pared', alturaRespectoSuelo: 0, dimensiones: { alto: 20 } })
    ).toBe(false)
    expect(isWallFormValid({ ubicacion: 'Suelo' })).toBe(true)
  })

  it('wallZOk with bodega 300cm', () => {
    expect(
      wallZOk({ ubicacion: 'Pared', alturaRespectoSuelo: 100, dimensiones: { alto: 100 } }, 300)
    ).toBe(true)
    expect(
      wallZOk({ ubicacion: 'Pared', alturaRespectoSuelo: 250, dimensiones: { alto: 60 } }, 300)
    ).toBe(false)
  })

  it('wallNoZOverlap', () => {
    const a = { ubicacion: 'Pared', alturaRespectoSuelo: 0, dimensiones: { alto: 100 } }
    const b = { ubicacion: 'Pared', alturaRespectoSuelo: 150, dimensiones: { alto: 50 } }
    const c = { ubicacion: 'Pared', alturaRespectoSuelo: 50, dimensiones: { alto: 80 } }
    expect(wallNoZOverlap(a, b)).toBe(true)
    expect(wallNoZOverlap(a, c)).toBe(false)
  })

  it('wallVsFloorOk with high floor', () => {
    const wall = { ubicacion: 'Pared', alturaRespectoSuelo: 50, dimensiones: { alto: 50 } }
    const floor = { ubicacion: 'Suelo', dimensiones: { alto: 40 } }
    const floorHigh = { ubicacion: 'Suelo', dimensiones: { alto: 60 } }
    expect(wallVsFloorOk(wall, floor)).toBe(true)
    expect(wallVsFloorOk(wall, floorHigh)).toBe(false)
  })

  it('validateWallPlacement ok and ko', () => {
    const wall = { ubicacion: 'Pared', alturaRespectoSuelo: 10, dimensiones: { alto: 20 }, id: 'w1' }
    const resOk = validateWallPlacement({ el: wall, all: [], bodegaH: 300 })
    expect(resOk.ok).toBe(true)

    const badForm = validateWallPlacement({
      el: { ubicacion: 'Pared', alturaRespectoSuelo: 0, dimensiones: { alto: 20 }, id: 'w2' },
      all: [],
      bodegaH: 300,
    })
    expect(badForm.ok).toBe(false)

    const overHeight = validateWallPlacement({
      el: { ubicacion: 'Pared', alturaRespectoSuelo: 290, dimensiones: { alto: 20 }, id: 'w3' },
      all: [],
      bodegaH: 300,
    })
    expect(overHeight.ok).toBe(false)

    const overlap = validateWallPlacement({
      el: { ubicacion: 'Pared', alturaRespectoSuelo: 20, dimensiones: { alto: 40 }, id: 'w4' },
      all: [wall],
      bodegaH: 300,
    })
    expect(overlap.ok).toBe(false)

    const floor = { ubicacion: 'Suelo', dimensiones: { alto: 60 }, id: 'f1' }
    const floorHit = validateWallPlacement({
      el: { ubicacion: 'Pared', alturaRespectoSuelo: 50, dimensiones: { alto: 50 }, id: 'w5' },
      all: [floor],
      bodegaH: 300,
    })
    expect(floorHit.ok).toBe(false)
  })
})
