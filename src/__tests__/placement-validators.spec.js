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
  const ctx = { alturaBodega: 300 }

  it('allows when sum equals warehouse height', () => {
    const res = validateHeightWithinWarehouse(
      { alturaRespectoAlSuelo: 100, height: 200 },
      {},
      ctx,
    )
    expect(res.valid).toBe(true)
  })

  it('fails when sum exceeds warehouse height', () => {
    const res = validateHeightWithinWarehouse(
      { alturaRespectoAlSuelo: 100, height: 201 },
      {},
      ctx,
    )
    expect(res).toEqual({ valid: false, code: 'HEIGHT_EXCEEDS_WAREHOUSE' })
  })
})
