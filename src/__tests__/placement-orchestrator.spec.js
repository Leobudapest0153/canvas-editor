/* eslint-env vitest, jsdom */
import { describe, it, expect } from 'vitest'
import { validateWallZBaseRequired, validateHeightWithinWarehouse, validateZStacking } from '@/validation/placementOrchestrator'

describe('validateWallZBaseRequired', () => {
  it('rechaza zBase faltante o <=0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'pared', zBase: 0 }, {})
    expect(res.valid).toBe(false)
    expect(res.code).toBe('ZBASE_REQUIRED')
  })

  it('acepta zBase mayor a 0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'pared', zBase: 10 }, {})
    expect(res.valid).toBe(true)
  })
})

describe('validateHeightWithinWarehouse', () => {
  const ALTURA = 300
  it('rechaza cuando excede altura de bodega', () => {
    const res = validateHeightWithinWarehouse({ ubicacion: 'pared', zBase: 250, alto: 100 }, ALTURA)
    expect(res.valid).toBe(false)
    expect(res.code).toBe('HEIGHT_EXCEEDS_WAREHOUSE')
  })

  it('permite cuando zBase + alto es igual a alturaBodega', () => {
    const res = validateHeightWithinWarehouse({ ubicacion: 'pared', zBase: 200, alto: 100 }, ALTURA)
    expect(res.valid).toBe(true)
  })
})

describe('validateZStacking', () => {
  const base = {
    id: 'a',
    ubicacion: 'pared',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    elevacion: { zBase: 0, altura: 100 },
  }

  it('detecta solape en Z', () => {
    const cand = {
      id: 'b',
      ubicacion: 'pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 50, altura: 100 },
    }
    const res = validateZStacking([base], cand)
    expect(res.valid).toBe(false)
    expect(res.code).toBe('Z_STACKING_COLLISION')
  })

  it('permite tocar en Z', () => {
    const cand = {
      id: 'b',
      ubicacion: 'pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 100, altura: 100 },
    }
    const res = validateZStacking([base], cand)
    expect(res.valid).toBe(true)
  })

  it('permite alturas separadas', () => {
    const cand = {
      id: 'b',
      ubicacion: 'pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 200, altura: 50 },
    }
    const res = validateZStacking([base], cand)
    expect(res.valid).toBe(true)
  })
})
