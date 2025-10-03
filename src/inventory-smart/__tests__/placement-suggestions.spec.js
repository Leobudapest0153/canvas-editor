import { describe, it, expect } from 'vitest'
import { buildPlacementSuggestion, applyPlacementSuggestion } from '@/inventory-smart/utils/placementSuggestions'

describe('placementSuggestions', () => {
  it('proposes capacity adjustment when weight exceeds limit', () => {
    const suggestion = buildPlacementSuggestion({
      failure: {
        type: 'weight',
        message: 'Excede capacidad',
        element: { capacidadCarga: 200 },
        weightResult: {
          valido: false,
          capacidadCarga: 500,
          pesoActual: 450,
        },
      },
    })
    expect(suggestion).not.toBeNull()
    expect(suggestion.adjustments[0].type).toBe('capacity')
    const applied = applyPlacementSuggestion({ capacidadCarga: 200 }, suggestion)
    expect(applied.capacidadCarga).toBeCloseTo(50)
  })

  it('proposes dimension adjustment when scale is required', () => {
    const suggestion = buildPlacementSuggestion({
      failure: {
        type: 'space',
        message: 'No cabe',
        dimsCm: { ancho: 120, largo: 80, alto: 30 },
        pixelSize: { width: 120, height: 80 },
        areaBounds: { minX: 0, minY: 0, maxX: 60, maxY: 80 },
        conflicts: [],
        view: 'XY',
      },
    })
    expect(suggestion).not.toBeNull()
    expect(suggestion.adjustments[0].type).toBe('dimensions')
    const applied = applyPlacementSuggestion({ dimensiones: { ancho: 120, largo: 80, alto: 30 } }, suggestion)
    expect(applied.dimensiones.ancho).toBeLessThan(120)
    expect(applied.dimensiones.largo).toBeLessThan(80)
  })

  it('returns null when no adjustment is needed', () => {
    const suggestion = buildPlacementSuggestion({
      failure: {
        type: 'space',
        message: 'Todo ok',
        dimsCm: { ancho: 60, largo: 40, alto: 30 },
        pixelSize: { width: 60, height: 40 },
        areaBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        conflicts: [],
        view: 'XY',
      },
    })
    expect(suggestion).toBeNull()
  })
})
