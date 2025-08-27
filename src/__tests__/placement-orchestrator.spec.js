/* eslint-env vitest, jsdom */
import { describe, it, expect } from 'vitest'
import { validateWallZBaseRequired, validateHeightWithinWarehouse, validateZStacking } from '@/validation/placementOrchestrator'

describe('validateWallZBaseRequired', () => {
  it('rechaza zBase faltante o <=0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'pared', zBase: 0 })
    expect(res.valid).toBe(false)
  })

  it('acepta zBase mayor a 0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'pared', zBase: 10 })
    expect(res.valid).toBe(true)
  })
})

describe('validateHeightWithinWarehouse', () => {
  const ALTURA = 300
  it('rechaza cuando excede altura de bodega', () => {
    const res = validateHeightWithinWarehouse({ ubicacion: 'pared', zBase: 250, alto: 100, alturaBodega: ALTURA })
    expect(res.valid).toBe(false)
    expect(res.reason).toBe('HEIGHT_EXCEEDS_WAREHOUSE')
  })

  it('permite cuando zBase + alto es igual a alturaBodega', () => {
    const res = validateHeightWithinWarehouse({ ubicacion: 'pared', zBase: 200, alto: 100, alturaBodega: ALTURA })
    expect(res.valid).toBe(true)
  })
})

describe('validateZStacking', () => {
  it('detecta solape en Z', () => {
    const moving = { id: 'b', ubicacion: 'pared', elevacion: { zBase: 50, altura: 100 } }
    const neighbors = [{ id: 'a', ubicacion: 'pared', elevacion: { zBase: 0, altura: 100 } }]
    const res = validateZStacking({ movingEl: moving, neighbors })
    expect(res.valid).toBe(false)
  })

  it('permite alturas separadas', () => {
    const moving = { id: 'b', ubicacion: 'pared', elevacion: { zBase: 150, altura: 50 } }
    const neighbors = [{ id: 'a', ubicacion: 'pared', elevacion: { zBase: 0, altura: 100 } }]
    const res = validateZStacking({ movingEl: moving, neighbors })
    expect(res.valid).toBe(true)
  })
})
