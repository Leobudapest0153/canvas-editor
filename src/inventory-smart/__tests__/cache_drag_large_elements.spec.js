/**
 * Tests para verificar que el cache durante el arrastre funciona correctamente
 * con elementos de diferentes tamaños, especialmente elementos grandes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCacheOnDrag } from '@/inventory-smart/composables/useCacheOnDrag'
import { enablePerfMode, disablePerfMode } from '@/inventory-smart/composables/usePerfMode'
import { ref } from 'vue'

describe('Cache durante arrastre con elementos grandes', () => {
  let mockNode
  let mockLayer
  let mockShape

  beforeEach(() => {
    // Mock de nodo Konva pequeño
    mockNode = {
      cache: vi.fn(),
      clearCache: vi.fn(),
      draw: vi.fn(),
      width: vi.fn(() => 100),
      height: vi.fn(() => 100),
      getLayer: vi.fn(() => mockLayer),
      getChildren: vi.fn(() => []),
      on: vi.fn(),
      off: vi.fn(),
    }

    mockLayer = {
      clearCache: vi.fn(),
      batchDraw: vi.fn(),
      listening: vi.fn(() => true),
      perfectDrawEnabled: vi.fn(() => true),
    }

    mockShape = {
      getAttr: vi.fn((key) => {
        const attrs = {
          shadowEnabled: true,
          shadowBlur: 4,
          blurEnabled: false,
          strokeWidth: 2,
          fill: '#ff0000',
          opacity: 0.8,
        }
        return attrs[key]
      }),
      setAttrs: vi.fn(),
      getChildren: vi.fn(() => []),
    }
  })

  it('debe aplicar cache con pixelRatio normal para elementos pequeños', () => {
    const refNode = ref(mockNode)
    useCacheOnDrag(refNode)

    // Simular dragstart
    const dragStartHandler = mockNode.on.mock.calls.find(
      (call) => call[0] === 'dragstart.cache'
    )?.[1]

    if (dragStartHandler) {
      dragStartHandler()
      expect(mockNode.cache).toHaveBeenCalledTimes(1)
      expect(mockNode.cache).toHaveBeenCalledWith() // Sin parámetros para pequeños
    }
  })

  it('debe aplicar cache con pixelRatio reducido para elementos medianos', () => {
    // Elemento mediano: 400x300 = 120k píxeles (entre 100k y 500k)
    mockNode.width = vi.fn(() => 400)
    mockNode.height = vi.fn(() => 300)

    const refNode = ref(mockNode)
    useCacheOnDrag(refNode)

    const dragStartHandler = mockNode.on.mock.calls.find(
      (call) => call[0] === 'dragstart.cache'
    )?.[1]

    if (dragStartHandler) {
      dragStartHandler()
      expect(mockNode.cache).toHaveBeenCalledTimes(1)
      expect(mockNode.cache).toHaveBeenCalledWith({ pixelRatio: 1 })
    }
  })

  it('NO debe aplicar cache para elementos muy grandes', () => {
    // Elemento grande: 800x700 = 560k píxeles (> 500k)
    mockNode.width = vi.fn(() => 800)
    mockNode.height = vi.fn(() => 700)

    const refNode = ref(mockNode)
    useCacheOnDrag(refNode)

    const dragStartHandler = mockNode.on.mock.calls.find(
      (call) => call[0] === 'dragstart.cache'
    )?.[1]

    if (dragStartHandler) {
      dragStartHandler()
      expect(mockNode.cache).not.toHaveBeenCalled() // NO debe cachear elementos grandes
    }
  })

  it('debe limpiar cache correctamente en dragend', () => {
    const refNode = ref(mockNode)
    useCacheOnDrag(refNode)

    const dragEndHandler = mockNode.on.mock.calls.find(
      (call) => call[0] === 'dragend.cache'
    )?.[1]

    if (dragEndHandler) {
      dragEndHandler()
      expect(mockNode.clearCache).toHaveBeenCalledTimes(1)
      expect(mockNode.draw).toHaveBeenCalledTimes(1)
      expect(mockLayer.clearCache).toHaveBeenCalledTimes(1)
      expect(mockLayer.batchDraw).toHaveBeenCalledTimes(1)
    }
  })

  it('debe preservar fill y opacity durante perf mode', () => {
    const ctx = enablePerfMode(mockLayer, { shape: mockShape })

    // Verificar que se desactivaron las sombras
    expect(mockShape.setAttrs).toHaveBeenCalledWith(
      expect.objectContaining({
        shadowEnabled: false,
        shadowBlur: 0,
        blurEnabled: false,
      })
    )

    // Restaurar
    ctx.restore()

    // Verificar que se restauraron los atributos originales
    expect(mockShape.setAttrs).toHaveBeenCalledWith(
      expect.objectContaining({
        shadowEnabled: true,
        shadowBlur: 4,
        fill: '#ff0000',
        opacity: 0.8,
      })
    )
  })

  it('debe optimizar children cuando el shape es un Group', () => {
    const mockChild1 = {
      getAttr: vi.fn((key) => ({ fill: '#0000ff', opacity: 0.9, shadowEnabled: true }[key])),
      setAttrs: vi.fn(),
    }
    const mockChild2 = {
      getAttr: vi.fn((key) => ({ fill: '#00ff00', opacity: 0.7, shadowBlur: 2 }[key])),
      setAttrs: vi.fn(),
    }

    mockShape.getChildren = vi.fn(() => [mockChild1, mockChild2])

    const ctx = enablePerfMode(mockLayer, { shape: mockShape })

    // Verificar que se optimizaron los hijos
    expect(mockChild1.setAttrs).toHaveBeenCalledWith(
      expect.objectContaining({
        shadowEnabled: false,
        shadowBlur: 0,
        blurEnabled: false,
      })
    )
    expect(mockChild2.setAttrs).toHaveBeenCalledWith(
      expect.objectContaining({
        shadowEnabled: false,
        shadowBlur: 0,
        blurEnabled: false,
      })
    )

    // Restaurar
    ctx.restore()

    // Verificar que se restauraron los atributos de los hijos
    expect(mockChild1.setAttrs).toHaveBeenCalledWith(
      expect.objectContaining({
        fill: '#0000ff',
        opacity: 0.9,
        shadowEnabled: true,
      })
    )
  })

  it('debe manejar errores gracefully durante cache', () => {
    mockNode.cache = vi.fn(() => {
      throw new Error('Cache failed')
    })

    const refNode = ref(mockNode)
    useCacheOnDrag(refNode)

    const dragStartHandler = mockNode.on.mock.calls.find(
      (call) => call[0] === 'dragstart.cache'
    )?.[1]

    // No debe lanzar error
    expect(() => {
      if (dragStartHandler) {
        dragStartHandler()
      }
    }).not.toThrow()
  })

  it('debe limpiar cache incluso si el nodo tiene hijos', () => {
    const mockChild = {
      clearCache: vi.fn(),
      draw: vi.fn(),
    }

    mockNode.getChildren = vi.fn(() => [mockChild])

    const refNode = ref(mockNode)
    useCacheOnDrag(refNode)

    const dragEndHandler = mockNode.on.mock.calls.find(
      (call) => call[0] === 'dragend.cache'
    )?.[1]

    if (dragEndHandler) {
      dragEndHandler()
      expect(mockNode.clearCache).toHaveBeenCalledTimes(1)
      expect(mockChild.clearCache).toHaveBeenCalledTimes(1)
      expect(mockChild.draw).toHaveBeenCalledTimes(1)
    }
  })
})
