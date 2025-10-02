import { describe, it, expect } from 'vitest'
import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
} from '@/inventory-smart/validation/placementOrchestrator'

describe('validateWallZBaseRequired', () => {
  it('passes for non-wall', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'suelo' }, {}, {})
    expect(res.valid).toBe(true)
  })

  it('fails when wall and zBase missing', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'pared' }, {}, {})
    expect(res).toEqual({ valid: false, code: 'ZBASE_REQUIRED' })
  })

  it('fails when wall and zBase <=0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'pared', alturaRespectoAlSuelo: 0 }, {}, {})
    expect(res).toEqual({ valid: false, code: 'ZBASE_REQUIRED' })
  })

  it('passes when wall and zBase >0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'pared', alturaRespectoAlSuelo: 5 }, {}, {})
    expect(res.valid).toBe(true)
  })
})

describe('validateHeightWithinWarehouse', () => {
  it('allows floor element with nested height when below roof', () => {
    const res = validateHeightWithinWarehouse(
      {},
      { ubicacion: 'Suelo', dimensiones: { alto: 180 } },
      { alturaBodega: 500 },
    )
    expect(res.valid).toBe(true)
  })

  it('allows lowercase ubicacion for floor element', () => {
    const res = validateHeightWithinWarehouse(
      {},
      { ubicacion: 'suelo', dimensiones: { alto: 180 } },
      { alturaBodega: 500 },
    )
    expect(res.valid).toBe(true)
  })

  it('skips check when warehouse height missing', () => {
    const res = validateHeightWithinWarehouse(
      {},
      { ubicacion: 'Suelo', dimensiones: { alto: 180 } },
      {},
    )
    expect(res.valid).toBe(true)
  })

  it('allows wall element exactly at warehouse height', () => {
    const res = validateHeightWithinWarehouse(
      {},
      { ubicacion: 'Pared', zBase: 400, alto: 100 },
      { alturaBodega: 500 },
    )
    expect(res.valid).toBe(true)
  })

  it('rejects wall element exceeding warehouse height', () => {
    const res = validateHeightWithinWarehouse(
      {},
      { ubicacion: 'Pared', zBase: 401, alto: 100 },
      { alturaBodega: 500 },
    )
    expect(res).toEqual({ valid: false, code: 'HEIGHT_EXCEEDS_WAREHOUSE' })
  })
})

describe('validateZStacking', () => {
  const baseEl = { id: 'A', x: 0, y: 0, width: 10, height: 10, zBase: 0, alto: 100 }
  const neighbor = {
    id: 'B',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    zBase: 50,
    alto: 100,
  }

  it('fails when Z intervals overlap and XY overlaps', () => {
    const res = validateZStacking(baseEl, {}, [neighbor], {}, {})
    expect(res).toEqual({ valid: false, code: 'Z_STACK_CONFLICT', offenderId: 'B' })
  })

  it('passes when Z intervals just touch', () => {
    const n = { ...neighbor, zBase: 100 }
    const res = validateZStacking(baseEl, {}, [n], {}, {})
    expect(res.valid).toBe(true)
  })

  it('passes when XY does not overlap', () => {
    const n = { ...neighbor, x: 100 }
    const res = validateZStacking(baseEl, {}, [n], {}, {})
    expect(res.valid).toBe(true)
  })

  it('skips validation when plant is infinite', () => {
    const res = validateZStacking(baseEl, {}, [neighbor], {}, { isInfinite: true })
    expect(res.valid).toBe(true)
  })
})
