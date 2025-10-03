import { describe, it, expect, vi } from 'vitest'
import { generateDropSuggestions } from '@/inventory-smart/modules/drop/dropPlacementAdjustments'

describe('dropPlacementAdjustments', () => {
  it('sugiere nueva capacidad cuando hay espacio disponible', () => {
    const element = { capacidadCarga: 300 }
    const failure = {
      reason: 'weight',
      details: {
        weight: {
          capacidadCarga: 500,
          pesoActual: 250,
          exceso: 50,
        },
      },
    }
    const runProbe = vi.fn().mockReturnValue({ ok: true })

    const suggestions = generateDropSuggestions({ element, failure, runProbe })

    expect(runProbe).toHaveBeenCalledWith({ capacidadCarga: 250 })
    expect(suggestions?.capacity?.newValue).toBe(250)
    expect(suggestions?.overrides?.capacidadCarga).toBe(250)
  })

  it('propone ajuste de dimensiones proporcional cuando un factor pasa la validación', () => {
    const element = { dimensiones: { ancho: 200, largo: 120, alto: 50 } }
    const failure = {
      reason: 'bounds',
      details: {
        dimsCm: { ancho: 200, largo: 120, alto: 50 },
      },
    }
    const runProbe = vi
      .fn()
      .mockReturnValueOnce({ ok: false })
      .mockReturnValueOnce({ ok: true, dimsCm: { ancho: 180, largo: 108, alto: 45 } })

    const suggestions = generateDropSuggestions({ element, failure, runProbe })

    expect(runProbe).toHaveBeenCalledTimes(2)
    expect(suggestions?.dimension?.newDims).toEqual({ ancho: 180, largo: 108, alto: 45 })
    expect(suggestions?.overrides?.dimensiones).toEqual({ ancho: 180, largo: 108, alto: 45 })
  })

  it('retorna null cuando no encuentra ajustes viables', () => {
    const element = { capacidadCarga: 120 }
    const failure = {
      reason: 'weight',
      details: {
        weight: {
          capacidadCarga: 200,
          pesoActual: 80,
        },
      },
    }
    const runProbe = vi.fn().mockReturnValue({ ok: false })

    const suggestions = generateDropSuggestions({ element, failure, runProbe })

    expect(suggestions).toBeNull()
  })
})
