import { describe, it, expect } from 'vitest'
import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
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
