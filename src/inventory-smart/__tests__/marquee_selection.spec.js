/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useMarqueeSelection } from '@/inventory-smart/composables/useMarqueeSelection'

describe('useMarqueeSelection', () => {
  let canvasStore, stageRef, marquee

  beforeEach(() => {
    // Mock del canvasStore
    canvasStore = {
      elementosVisibles: [
        { id: 'el1', x: 50, y: 50, width: 100, height: 80 },
        { id: 'el2', x: 200, y: 100, width: 120, height: 60 },
        { id: 'el3', x: 400, y: 300, width: 80, height: 100 },
      ],
      seleccionarElemento: vi.fn(),
    }

    // Mock del stageRef con transform
    const mockTransform = {
      point: vi.fn((p) => p),
      invert: vi.fn(),
      copy: vi.fn(() => mockTransform),
    }

    stageRef = ref({
      getNode: () => ({
        getAbsoluteTransform: () => mockTransform,
        getPointerPosition: () => ({ x: 100, y: 100 }),
      }),
    })

    marquee = useMarqueeSelection({ canvasStore, stageRef })
  })

  it('debe inicializar con marquesina inactiva', () => {
    expect(marquee.isMarqueeActive.value).toBe(false)
    expect(marquee.selectedElementIds.value.size).toBe(0)
  })

  it('debe iniciar marquesina correctamente', () => {
    marquee.startMarquee({ x: 10, y: 20 })
    
    expect(marquee.isMarqueeActive.value).toBe(true)
    expect(marquee.marqueeRect.value.x).toBe(10)
    expect(marquee.marqueeRect.value.y).toBe(20)
    expect(marquee.marqueeRect.value.width).toBe(0)
    expect(marquee.marqueeRect.value.height).toBe(0)
  })

  it('debe actualizar marquesina y detectar elementos intersectados', () => {
    // Iniciar marquesina
    marquee.startMarquee({ x: 0, y: 0 })
    
    // Actualizar para cubrir el primer elemento (50,50 - 150,130)
    marquee.updateMarquee({ x: 160, y: 140 })
    
    expect(marquee.isMarqueeActive.value).toBe(true)
    expect(marquee.marqueeRect.value.width).toBe(160)
    expect(marquee.marqueeRect.value.height).toBe(140)
    expect(marquee.selectedElementIds.value.has('el1')).toBe(true)
  })

  it('debe calcular rectángulo normalizado correctamente (arrastre hacia arriba-izquierda)', () => {
    marquee.startMarquee({ x: 200, y: 200 })
    marquee.updateMarquee({ x: 50, y: 50 })
    
    const rect = marquee.marqueeRect.value
    expect(rect.x).toBe(50)
    expect(rect.y).toBe(50)
    expect(rect.width).toBe(150)
    expect(rect.height).toBe(150)
  })

  it('debe detectar múltiples elementos intersectados', () => {
    // Marquesina que cubra los primeros dos elementos
    marquee.startMarquee({ x: 0, y: 0 })
    marquee.updateMarquee({ x: 350, y: 200 })
    
    expect(marquee.selectedElementIds.value.size).toBeGreaterThan(0)
    expect(marquee.selectedElementIds.value.has('el1')).toBe(true)
    expect(marquee.selectedElementIds.value.has('el2')).toBe(true)
    expect(marquee.selectedElementIds.value.has('el3')).toBe(false)
  })

  it('debe finalizar marquesina y seleccionar elementos', () => {
    canvasStore.seleccionarElementosMultiple = vi.fn()
    
    marquee.startMarquee({ x: 0, y: 0 })
    marquee.updateMarquee({ x: 160, y: 140 })
    
    expect(marquee.selectedElementIds.value.has('el1')).toBe(true)
    
    marquee.endMarquee()
    
    expect(marquee.isMarqueeActive.value).toBe(false)
    expect(canvasStore.seleccionarElementosMultiple).toHaveBeenCalledWith(['el1'])
  })

  it('debe cancelar marquesina sin seleccionar elementos', () => {
    marquee.startMarquee({ x: 0, y: 0 })
    marquee.updateMarquee({ x: 160, y: 140 })
    
    marquee.cancelMarquee()
    
    expect(marquee.isMarqueeActive.value).toBe(false)
    expect(marquee.selectedElementIds.value.size).toBe(0)
    expect(canvasStore.seleccionarElemento).not.toHaveBeenCalled()
  })

  it('no debe seleccionar nada si marquesina está vacía', () => {
    marquee.startMarquee({ x: 1000, y: 1000 })
    marquee.updateMarquee({ x: 1100, y: 1100 })
    
    expect(marquee.selectedElementIds.value.size).toBe(0)
    
    marquee.endMarquee()
    
    expect(canvasStore.seleccionarElemento).not.toHaveBeenCalled()
  })

  it('debe detectar intersección parcial (elemento parcialmente dentro)', () => {
    // Marquesina que solo intersecta parcialmente el elemento el1
    marquee.startMarquee({ x: 100, y: 100 })
    marquee.updateMarquee({ x: 130, y: 120 })
    
    // El elemento el1 está en (50,50) con tamaño 100x80, termina en (150,130)
    // La marquesina (100,100)-(130,120) debería intersectar
    expect(marquee.selectedElementIds.value.has('el1')).toBe(true)
  })

  it('debe limpiar selección al actualizar marquesina fuera de elementos', () => {
    // Primero seleccionar un elemento
    marquee.startMarquee({ x: 0, y: 0 })
    marquee.updateMarquee({ x: 160, y: 140 })
    expect(marquee.selectedElementIds.value.has('el1')).toBe(true)
    
    // Mover marquesina a zona vacía
    marquee.updateMarquee({ x: 10, y: 10 })
    
    // No debería haber elementos seleccionados en marquesina pequeña sin elementos
    const hasAnySelected = marquee.selectedElementIds.value.size > 0
    const allStillInRange = Array.from(marquee.selectedElementIds.value).every(id => {
      const el = canvasStore.elementosVisibles.find(e => e.id === id)
      return el.x < 10 && el.y < 10
    })
    
    // O no hay nada seleccionado, o lo seleccionado sigue estando en rango
    expect(!hasAnySelected || allStillInRange).toBe(true)
  })
})
