/* eslint-env vitest, jsdom */
import { describe, it, expect } from 'vitest'
import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
} from '@/validation/placementOrchestrator'
import { resolveVerticalProps } from '@/validation/fieldResolvers'

describe('validateWallZBaseRequired', () => {
  it('rechaza zBase faltante o <=0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'Pared', zBase: 0 }, {})
    expect(res.valid).toBe(false)
    expect(res.code).toBe('ZBASE_REQUIRED')
  })

  it('acepta zBase mayor a 0', () => {
    const res = validateWallZBaseRequired({ ubicacion: 'Pared', zBase: 10 }, {})
    expect(res.valid).toBe(true)
  })
})

describe('validateHeightWithinWarehouse', () => {
  const ALTURA = 300
  it('rechaza cuando excede altura de bodega', () => {
    const res = validateHeightWithinWarehouse({ ubicacion: 'Pared', zBase: 250, alto: 100 }, {}, ALTURA)
    expect(res.valid).toBe(false)
    expect(res.code).toBe('HEIGHT_EXCEEDS_WAREHOUSE')
  })

  it('permite cuando zBase + alto es igual a alturaBodega', () => {
    const res = validateHeightWithinWarehouse({ ubicacion: 'Pared', zBase: 200, alto: 100 }, {}, ALTURA)
    expect(res.valid).toBe(true)
  })
})

describe('validateZStacking', () => {
  const base = {
    id: 'a',
    ubicacion: 'Pared',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    elevacion: { zBase: 0, altura: 100 },
  }

  it('detecta solape en Z', () => {
    const cand = {
      id: 'b',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 50, altura: 100 },
    }
    const res = validateZStacking([base], cand, { minX: 0, minY: 0, maxX: 100, maxY: 100 })
    expect(res.valid).toBe(false)
    expect(res.code).toBe('Z_STACKING_COLLISION')
  })

  it('permite tocar en Z', () => {
    const cand = {
      id: 'b',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 100, altura: 100 },
    }
    const res = validateZStacking([base], cand, { minX: 0, minY: 0, maxX: 100, maxY: 100 })
    expect(res.valid).toBe(true)
  })

  it('permite alturas separadas', () => {
    const cand = {
      id: 'b',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 200, altura: 50 },
    }
    const res = validateZStacking([base], cand, { minX: 0, minY: 0, maxX: 100, maxY: 100 })
    expect(res.valid).toBe(true)
  })

  it('clamp corrige posición al borde no conflictivo', () => {
    const cand = {
      id: 'b',
      ubicacion: 'Pared',
      x: 8,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 0, altura: 100 },
    }
    const res = validateZStacking([base], cand, { minX: 0, minY: 0, maxX: 100, maxY: 100 })
    expect(res.valid).toBe(false)
    expect(res.reason).toBe('Z_STACK_CONFLICT')
    expect(res.corrected.x).toBe(10)
    expect(res.corrected.y).toBe(0)
  })
})

describe('resolveVerticalProps', () => {
  it('coalesce y parsea strings numéricos', () => {
    const res = resolveVerticalProps(
      { ubicacion: 'Pared', alturaRespectoAlSuelo: '120', altura: '80' },
      { alto: '80' }
    )
    expect(res.ubic).toBe('Pared')
    expect(res.zBaseCm).toBe(120)
    expect(res.altoCm).toBe(80)
  })

  it('lee campos desde elevacion', () => {
    const res = resolveVerticalProps(
      { ubicacion: 'Pared', elevacion: { zBase: '50', altura: '30' } },
      {}
    )
    expect(res.zBaseCm).toBe(50)
    expect(res.altoCm).toBe(30)
  })
})
