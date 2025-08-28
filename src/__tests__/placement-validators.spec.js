import { describe, it, expect } from 'vitest'
import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
} from '@/validation/placementOrchestrator'

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
  const base = {
    id: 'a',
    plantaId: 'p1',
    width: 10,
    height: 10,
    x: 0,
    y: 0,
    ubicacion: 'suelo',
    zBase: 0,
    alto: 100,
  }

  it('detects overlapping Z with XY overlap', () => {
    const neighbor = { ...base, id: 'b', zBase: 50 }
    const res = validateZStacking(base, { x: 0, y: 0 }, [neighbor])
    expect(res).toEqual({ valid: false, code: 'Z_STACK_CONFLICT', offenderId: 'b' })
  })

  it('allows exact top touch in Z', () => {
    const neighbor = { ...base, id: 'b', zBase: 100 }
    const res = validateZStacking(base, { x: 0, y: 0 }, [neighbor])
    expect(res.valid).toBe(true)
  })

  it('allows separated Z intervals', () => {
    const neighbor = { ...base, id: 'b', zBase: 150 }
    const res = validateZStacking(base, { x: 0, y: 0 }, [neighbor])
    expect(res.valid).toBe(true)
  })
})
