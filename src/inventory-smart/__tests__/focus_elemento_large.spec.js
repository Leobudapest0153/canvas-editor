import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '../composables/useCanvasStore'

/**
 * focus_elemento_large.spec.js
 * Validación de comportamiento de focusElemento con elementos de diferentes tamaños.
 *
 * Caso de uso: Al hacer focus en elementos grandes desde el tab de capas,
 * el zoom debe ser razonable y útil, escalado según la relación elemento/viewport.
 */

describe('focusElemento - Elementos grandes', () => {
  let canvasStore
  let mockStage

  beforeEach(() => {
    // Configurar Pinia
    setActivePinia(createPinia())

    // Mock de Konva stage
    mockStage = {
      width: vi.fn(() => 1200),
      height: vi.fn(() => 800),
      scaleX: vi.fn(() => 1),
      x: vi.fn(() => 0),
      y: vi.fn(() => 0),
      findOne: vi.fn()
    }

    // Mock global para el stage
    window.__konvaStage = mockStage
    window.__getDrawWidth = (e) => e.width || 0
    window.__getDrawHeight = (e) => e.height || 0

    // Inicializar el store
    canvasStore = useCanvasStore()
  })

  it('debe aplicar zoom máximo 0.01 para elementos ultra masivos (>100x viewport) - Cuartos', async () => {
    // Elemento ultra masivo como "Cuarto frío": 217569x55697px (181x viewport de 1200x800)
    const massiveElement = {
      id: 'cuarto-frio-1',
      tipo: 'cuarto',
      x: 100,
      y: 100,
      width: 217569,
      height: 55697,
      dimensiones: {
        ancho: 57575.02, // cm
        largo: 14737.56, // cm
        alto: 300 // cm
      }
    }

    const mockNode = {
      getClientRect: vi.fn(() => ({
        x: 100,
        y: 100,
        width: 217569,
        height: 55697
      }))
    }
    mockStage.findOne.mockReturnValue(mockNode)

    canvasStore.elementos.push(massiveElement)

    canvasStore.focusElemento('cuarto-frio-1', {
      paddingPx: 60,
      fitRatio: 0.95,
      animate: false
    })

    await nextTick()
    await nextTick()

    // El zoom debe ser como máximo 0.01 (1%) para elementos ultra masivos
    expect(canvasStore.zoom).toBeLessThanOrEqual(0.01)
    expect(canvasStore.zoom).toBeGreaterThan(0)
  })

  it('debe aplicar zoom máximo 0.06 para elementos extremadamente grandes (>6x viewport)', async () => {
    // Elemento extremadamente grande: 8000x6000px (>6x viewport de 1200x800)
    const hugeElement = {
      id: 'huge-elem-1',
      tipo: 'producto',
      x: 100,
      y: 100,
      width: 8000,
      height: 6000,
      dimensiones: {
        ancho: 8000 / 37.795275591,
        largo: 6000 / 37.795275591,
        alto: 50 / 37.795275591
      }
    }

    const mockNode = {
      getClientRect: vi.fn(() => ({
        x: 100,
        y: 100,
        width: 8000,
        height: 6000
      }))
    }
    mockStage.findOne.mockReturnValue(mockNode)

    canvasStore.elementos.push(hugeElement)

    canvasStore.focusElemento('huge-elem-1', {
      paddingPx: 60,
      fitRatio: 0.95,
      animate: false
    })

    await nextTick()
    await nextTick()

    // El zoom debe ser como máximo 0.06 (6%) para elementos extremadamente grandes
    expect(canvasStore.zoom).toBeLessThanOrEqual(0.06)
    expect(canvasStore.zoom).toBeGreaterThan(0)
  })

  it('debe aplicar zoom máximo 0.12 para elementos grandes (2-4x viewport)', async () => {
    // Elemento grande: 3000x2000px (2.5x viewport de 1200x800)
    const largeElement = {
      id: 'large-elem-1',
      tipo: 'producto',
      x: 100,
      y: 100,
      width: 3000,
      height: 2000,
      dimensiones: {
        ancho: 3000 / 37.795275591,
        largo: 2000 / 37.795275591,
        alto: 50 / 37.795275591
      }
    }

    const mockNode = {
      getClientRect: vi.fn(() => ({
        x: 100,
        y: 100,
        width: 3000,
        height: 2000
      }))
    }
    mockStage.findOne.mockReturnValue(mockNode)

    canvasStore.elementos.push(largeElement)

    canvasStore.focusElemento('large-elem-1', {
      paddingPx: 60,
      fitRatio: 0.95,
      animate: false
    })

    await nextTick()
    await nextTick()

    // El zoom debe ser como máximo 0.12 (12%) para elementos grandes (2-4x viewport)
    expect(canvasStore.zoom).toBeLessThanOrEqual(0.12)
    expect(canvasStore.zoom).toBeGreaterThan(0)
  })

  it('debe permitir zoom completo para elementos pequeños (<500px)', async () => {
    // Elemento pequeño: 200x150px
    const smallElement = {
      id: 'small-elem-1',
      tipo: 'producto',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      dimensiones: {
        ancho: 200 / 37.795275591,
        largo: 150 / 37.795275591,
        alto: 50 / 37.795275591
      }
    }

    const mockNode = {
      getClientRect: vi.fn(() => ({
        x: 100,
        y: 100,
        width: 200,
        height: 150
      }))
    }
    mockStage.findOne.mockReturnValue(mockNode)

    canvasStore.elementos.push(smallElement)

    canvasStore.focusElemento('small-elem-1', {
      paddingPx: 60,
      fitRatio: 0.95,
      animate: false
    })

    await nextTick()
    await nextTick()

    // Para elementos pequeños, el zoom puede ser alto (el comportamiento anterior)
    // No hay restricción de zoom mínimo adicional
    expect(canvasStore.zoom).toBeGreaterThan(0.05)
    expect(canvasStore.zoom).toBeLessThanOrEqual(5)
  })

  it('debe aplicar zoom razonable para elemento mediano sin restricciones artificiales', async () => {
    const largeElement = {
      id: 'large-centered',
      tipo: 'producto',
      x: 500,
      y: 500,
      width: 1200,
      height: 900,
      dimensiones: {
        ancho: 1200 / 37.795275591,
        largo: 900 / 37.795275591,
        alto: 50 / 37.795275591
      }
    }

    const mockNode = {
      getClientRect: vi.fn(() => ({
        x: 500,
        y: 500,
        width: 1200,
        height: 900
      }))
    }
    mockStage.findOne.mockReturnValue(mockNode)

    canvasStore.elementos.push(largeElement)

    canvasStore.focusElemento('large-centered', {
      paddingPx: 60,
      fitRatio: 0.95,
      animate: false
    })

    await nextTick()
    await nextTick()

    // Elemento de 1200x900 en viewport 1200x800: el zoom natural debe aplicarse
    // Sin restricciones artificiales ya que sizeRatio ~1.5
    expect(canvasStore.zoom).toBeGreaterThan(0)
    expect(canvasStore.zoom).toBeLessThanOrEqual(5)
  })
})
