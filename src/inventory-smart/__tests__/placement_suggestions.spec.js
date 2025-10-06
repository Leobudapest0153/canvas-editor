import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlacementSuggestions } from '@/inventory-smart/composables/usePlacementSuggestions'
import { usePlacementWithSuggestions } from '@/inventory-smart/composables/usePlacementWithSuggestions'

// Mock dependencies
vi.mock('@/inventory-smart/composables/useCanvasStore', () => ({
  useCanvasStore: () => ({
    elementosVisibles: [],
    plantaPorId: () => ({ dimensiones: { alto: 400 } }),
    plantaActiva: 'planta1',
    contextoActual: { id: 'test', tipo: 'plantas' }
  })
}))

vi.mock('@/inventory-smart/composables/useWeightValidation', () => ({
  useWeightValidation: () => ({
    calcularPesoDisponible: () => ({ limiteDePeso: true, modoInfinito: false })
  })
}))

vi.mock('@/inventory-smart/utils/isPlacementValid', () => ({
  isPlacementValid: () => true
}))

vi.mock('@/inventory-smart/validation/placementOrchestrator', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    validateHeightWithinWarehouse: () => ({ valid: true }),
    validateZStacking: () => ({ valid: true }),
    resolveCoplanarNeighbors: () => []
  }
})

vi.mock('@/inventory-smart/composables/usePlacementGuards', () => ({
  usePlacementGuards: () => ({
    onDragMoveGuard: () => ({ valid: true })
  })
}))

vi.mock('@/inventory-smart/composables/usePlacementGuards', () => ({
  usePlacementGuards: () => ({
    onDragMoveGuard: () => ({ valid: true })
  })
}))

describe('usePlacementSuggestions', () => {
  let suggestionSystem

  beforeEach(() => {
    suggestionSystem = usePlacementSuggestions()
  })

  describe('calculateDimensionAdjustment', () => {
    it('debería calcular ajuste de dimensiones para elementos que no caben', () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 200, largo: 150, alto: 100 }
      }

      const position = { x: 100, y: 100 }
      const availableSpace = { minX: 0, minY: 0, maxX: 300, maxY: 300 }
      const reason = 'El elemento no cabe en la posición o colisiona con otros elementos'

      const result = suggestionSystem.calculateDimensionAdjustment(
        elemento,
        position,
        availableSpace,
        reason
      )

      expect(result).toBeTruthy()
      expect(result.ancho).toBeLessThan(elemento.dimensiones.ancho)
      expect(result.largo).toBeLessThan(elemento.dimensiones.largo)
      expect(result.reductionPercent).toBeGreaterThan(0)
    })

    it('debería retornar null para elementos con dimensiones inválidas', () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 0, largo: 150, alto: 100 }
      }

      const position = { x: 100, y: 100 }
      const availableSpace = { minX: 0, minY: 0, maxX: 300, maxY: 300 }
      const reason = 'El elemento no cabe'

      const result = suggestionSystem.calculateDimensionAdjustment(
        elemento,
        position,
        availableSpace,
        reason
      )

      expect(result).toBeNull()
    })
  })

  describe('calculateWeightAdjustment', () => {
    it('debería calcular ajuste de peso cuando hay exceso', () => {
      const elemento = {
        id: 'test-element',
        capacidadCarga: 100,
        uso: { peso: 20 }
      }

      const excessWeight = 30

      const result = suggestionSystem.calculateWeightAdjustment(
        elemento,
        'padre-id',
        'pisos',
        excessWeight
      )

      expect(result).toBeTruthy()
      expect(result.capacidadAjustada).toBe(70) // 100 - 30
      expect(result.reductionPercent).toBeGreaterThan(0)
      expect(result.excesoEliminado).toBe(30)
    })

    it('debería retornar null si no hay capacidad que reducir', () => {
      const elemento = {
        id: 'test-element',
        capacidadCarga: 0
      }

      const excessWeight = 30

      const result = suggestionSystem.calculateWeightAdjustment(
        elemento,
        'padre-id',
        'pisos',
        excessWeight
      )

      expect(result).toBeNull()
    })
  })

  describe('generatePlacementSuggestions', () => {
    it('debería generar sugerencias para problemas de espacio', () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 200, largo: 150, alto: 100 }
      }

      const position = { x: 100, y: 100 }
      const validationResult = {
        valid: false,
        reason: 'El elemento no cabe en la posición o colisiona con otros elementos'
      }
      const availableSpace = { minX: 0, minY: 0, maxX: 300, maxY: 300 }

      const result = suggestionSystem.generatePlacementSuggestions(
        elemento,
        position,
        validationResult,
        availableSpace
      )

      expect(result).toBeTruthy()
      expect(result.hasViableOptions).toBe(true)
      expect(result.dimensionAdjustment).toBeTruthy()
    })

    it('debería generar sugerencias para problemas de peso', () => {
      const elemento = {
        id: 'test-element',
        capacidadCarga: 100,
        uso: { peso: 20 }
      }

      const position = { x: 100, y: 100 }
      const validationResult = {
        valid: false,
        reason: 'Excedería el peso máximo soportado por 25 kg'
      }
      const availableSpace = { minX: 0, minY: 0, maxX: 300, maxY: 300 }

      const result = suggestionSystem.generatePlacementSuggestions(
        elemento,
        position,
        validationResult,
        availableSpace
      )

      expect(result).toBeTruthy()
      expect(result.hasViableOptions).toBe(true)
      expect(result.weightAdjustment).toBeTruthy()
    })

    it('debería retornar null para validaciones exitosas', () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 100, largo: 100, alto: 100 }
      }

      const position = { x: 100, y: 100 }
      const validationResult = { valid: true }
      const availableSpace = { minX: 0, minY: 0, maxX: 300, maxY: 300 }

      const result = suggestionSystem.generatePlacementSuggestions(
        elemento,
        position,
        validationResult,
        availableSpace
      )

      expect(result).toBeNull()
    })
  })

  describe('applySuggestedAdjustments', () => {
    it('debería aplicar ajustes de dimensiones correctamente', () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 200, largo: 150, alto: 100 },
        capacidadCarga: 100
      }

      const suggestions = {
        dimensionAdjustment: {
          ancho: 180,
          largo: 135,
          alto: 90
        }
      }

      const result = suggestionSystem.applySuggestedAdjustments(elemento, suggestions)

      expect(result.dimensiones.ancho).toBe(180)
      expect(result.dimensiones.largo).toBe(135)
      expect(result.dimensiones.alto).toBe(90)
      expect(result.capacidadCarga).toBe(100) // Sin cambios en capacidad
    })

    it('debería aplicar ajustes de peso correctamente', () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 200, largo: 150, alto: 100 },
        capacidadCarga: 100
      }

      const suggestions = {
        weightAdjustment: {
          capacidadAjustada: 75
        }
      }

      const result = suggestionSystem.applySuggestedAdjustments(elemento, suggestions)

      expect(result.capacidadCarga).toBe(75)
      expect(result.dimensiones.ancho).toBe(200) // Sin cambios en dimensiones
    })
  })
})

describe('usePlacementWithSuggestions', () => {
  let placementSystem

  beforeEach(() => {
    placementSystem = usePlacementWithSuggestions()
  })

  describe('validatePlacement', () => {
    it('debería validar elementos correctamente', () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 100, largo: 100, alto: 100 },
        ubicacion: 'suelo'
      }

      const position = { x: 100, y: 100 }
      const neighbors = []
      const areaBounds = { minX: 0, minY: 0, maxX: 300, maxY: 300 }

      const result = placementSystem.validatePlacement(elemento, position, neighbors, areaBounds)

      expect(result).toBeTruthy()
      expect(typeof result.valid).toBe('boolean')
    })
  })

  describe('tryPlaceWithSuggestions', () => {
    it('debería ejecutar callback de éxito para elementos válidos', async () => {
      const elemento = {
        id: 'test-element',
        dimensiones: { ancho: 50, largo: 50, alto: 50 },
        ubicacion: 'suelo'
      }

      const position = { x: 100, y: 100 }
      let successCalled = false

      const options = {
        onSuccess: () => { successCalled = true },
        onFailure: () => {}
      }

      const result = await placementSystem.tryPlaceWithSuggestions(elemento, position, options)

      expect(result).toBe(true)
      expect(successCalled).toBe(true)
    })
  })
})
