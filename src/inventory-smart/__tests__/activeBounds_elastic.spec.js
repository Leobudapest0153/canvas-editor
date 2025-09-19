import { describe, it, expect } from 'vitest'
import { getActiveBounds } from '@/inventory-smart/utils/activeBounds'

const makeStore = (overrides = {}) => ({
  estaEnPlanta: true,
  plantaActivaData: null,
  vistaActiva: 'XY',
  ...overrides,
})

describe('getActiveBounds elastic mode', () => {
  it('returns elastic polygon and mode when planta is elastic with elasticBoundaryPx', () => {
    const elasticPoly = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ]
    const store = makeStore({
      plantaActivaData: {
        modo: 'elastic',
        elasticBoundaryPx: elasticPoly,
      },
    })
    const res = getActiveBounds(store)
    expect(res.mode).toBe('elastic')
    expect(res.polygonPx).toEqual(elasticPoly)
    expect(res.boundsPx).toEqual({ width: 100, height: 50 })
  })

  it('falls back to fixed polygon when elastic mode is set but polygon is invalid', () => {
    const fixedPoly = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 0, y: 100 },
    ]
    const store = makeStore({
      plantaActivaData: {
        modo: 'elastic',
        elasticBoundaryPx: [{ x: 0, y: 0 }], // inválido
        poligono: fixedPoly,
      },
    })
    const res = getActiveBounds(store)
    expect(res.mode).toBe('fixed')
    expect(res.polygonPx).toEqual(fixedPoly)
    expect(res.boundsPx).toEqual({ width: 200, height: 100 })
  })

  it('uses container dims and returns fixed mode when not in planta', () => {
    const store = makeStore({
      estaEnPlanta: false,
      estructuraContenedorActual: {
        dimensiones: { ancho: 10, largo: 5 },
      },
    })
    const res = getActiveBounds(store)
    expect(res.mode).toBe('fixed')
    expect(res.boundsPx.width).toBeGreaterThan(0)
    expect(res.polygonPx.length).toBeGreaterThanOrEqual(3)
  })
})

