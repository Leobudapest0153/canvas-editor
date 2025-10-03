import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/inventory-smart/utils/isPlacementValid', () => ({
  isPlacementValid: vi.fn(),
}))

import { usePlacementSuggestionModal } from '@/inventory-smart/composables/usePlacementSuggestionModal'
import { generatePlacementSuggestions, applyPlacementAdjustments } from '@/inventory-smart/utils/placementSuggestions'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'

const areaBounds = { minX: 0, minY: 0, maxX: 500, maxY: 500 }

describe('placementSuggestions utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('genera sugerencias de dimensiones cuando la escala reduce el conflicto', () => {
    vi.mocked(isPlacementValid).mockReturnValueOnce(true)

    const suggestions = generatePlacementSuggestions({
      reason: 'bounds',
      element: { dimensiones: { ancho: 120, largo: 80 } },
      candidate: { x: 0, y: 0, width: 240, height: 160 },
      areaBounds,
      neighbors: [],
      vista: 'XY',
      cmPerPx: 1,
    })

    expect(isPlacementValid).toHaveBeenCalled()
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].type).toBe('dimensions')
    expect(suggestions[0].summary).toContain('Dimensiones propuestas')
  })

  it('omite sugerencias de dimensiones cuando ningún escalado es válido', () => {
    vi.mocked(isPlacementValid).mockReturnValue(false)

    const suggestions = generatePlacementSuggestions({
      reason: 'bounds',
      element: { dimensiones: { ancho: 120, largo: 80 } },
      candidate: { x: 0, y: 0, width: 240, height: 160 },
      areaBounds,
      neighbors: [],
      vista: 'XY',
      cmPerPx: 1,
    })

    expect(suggestions).toHaveLength(0)
  })

  it('retorna sugerencias de capacidad cuando hay exceso de peso', () => {
    const suggestions = generatePlacementSuggestions({
      reason: 'weight',
      element: { capacidadCarga: 200 },
      weightResult: { limiteDePeso: 150, exceso: 40 },
    })

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ type: 'capacity', capacityKg: 160 })
  })

  it('applyPlacementAdjustments aplica dimensiones y capacidad sugeridas', () => {
    const element = {
      nombre: 'Estante',
      dimensiones: { ancho: 120, largo: 80, alto: 30 },
      capacidadCarga: 200,
      uso: { peso: 180 },
    }

    const adjusted = applyPlacementAdjustments(element, [
      { type: 'dimensions', dimsCm: { ancho: 100, largo: 60 } },
      { type: 'capacity', capacityKg: 150 },
    ])

    expect(adjusted.dimensiones.ancho).toBe(100)
    expect(adjusted.dimensiones.largo).toBe(60)
    expect(adjusted.capacidadCarga).toBe(150)
    expect(adjusted.uso.peso).toBe(150)
  })
})

describe('usePlacementSuggestionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no muestra el modal cuando no hay sugerencias', () => {
    const modal = usePlacementSuggestionModal()
    expect(modal.show({ element: {}, suggestions: [] })).toBe(false)
    expect(modal.open.value).toBe(false)
  })

  it('gestiona estado y ajustes al aceptar sugerencias', () => {
    const modal = usePlacementSuggestionModal()
    const shown = modal.show({
      element: {
        nombre: 'Rack',
        dimensiones: { ancho: 120, largo: 80, alto: 30 },
        capacidadCarga: 200,
        uso: { peso: 150 },
      },
      suggestions: [
        { type: 'dimensions', dimsCm: { ancho: 100, largo: 60 } },
        { type: 'capacity', capacityKg: 140 },
      ],
      message: 'No hay espacio',
      dropMeta: { clientX: 10, clientY: 20 },
    })

    expect(shown).toBe(true)
    expect(modal.open.value).toBe(true)
    expect(modal.elementLabel.value).toBe('Rack')

    const adjusted = modal.buildAdjustedElement()
    expect(adjusted.dimensiones.ancho).toBe(100)
    expect(adjusted.capacidadCarga).toBe(140)

    modal.close()
    expect(modal.open.value).toBe(false)
    expect(modal.payload.value).toBeNull()
  })
})
