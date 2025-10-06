import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

vi.mock('vue-konva', () => ({ VueKonva: {}, default: { install: () => {} } }))

// Mock del sistema de sugerencias
const mockPlacementSuggestions = {
  tryPlaceWithSuggestions: vi.fn(() => Promise.resolve(true)),
  generatePlacementSuggestions: vi.fn(() => null),
  applySuggestedAdjustments: vi.fn((el) => el)
}

let mockStore
vi.mock('@/inventory-smart/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({ store: mockStore })
}))

beforeEach(() => {
  setActivePinia(createPinia())
  mockStore = useCanvasStore()
})

import CanvasView from '@/inventory-smart/components/CanvasView.vue'

describe('fitToPlanta', () => {
  it('uses polygon bbox for zoom calculation', () => {
    mockStore.plantas = [
      {
        id: 'p1',
        nombre: 'Planta',
        isInfinite: false,
        dimensiones: { ancho: 200, largo: 100 },
        poligono: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 100 },
          { x: 0, y: 100 }
        ],
      }
    ]
    mockStore.plantaActiva = 'p1'
    mockStore.canvasAdaptativo = {
      width: 200,
      height: 100,
      escala: 1,
      frame: { x: 0, y: 0, width: 200, height: 100 },
    }
    mockStore.contextoNavegacion = { tipo: 'plantas', id: 'p1', path: [{ tipo: 'plantas', id: 'p1' }] }

    const wrapper = mount(CanvasView, {
      global: {
        provide: {
          placementSuggestions: mockPlacementSuggestions
        }
      }
    })
    const stageStub = {
      scale: vi.fn(),
      position: vi.fn(),
      batchDraw: vi.fn(),
    }
  wrapper.vm.stageRef = { getNode: () => stageStub }
    // Ensure both the ref proxy and its value point to the stub
    if (wrapper.vm.stageRef && 'value' in wrapper.vm.stageRef) {
      wrapper.vm.stageRef.value = { getNode: () => stageStub }
    }
    // Ajustar tamaño del stage antes de llamar
    wrapper.vm.stageSize.width = 400
    wrapper.vm.stageSize.height = 400

    const result = wrapper.vm.fitToPlanta()

    expect(result).toBeTruthy()
    const zoom = result.scale
    const vw = Math.max(16, wrapper.vm.stageSize.width - 80)
    const vh = Math.max(16, wrapper.vm.stageSize.height - 80)
    const expected = Math.min(vw / 200, vh / 100)
    expect(zoom).toBeCloseTo(expected)
  })

  it('is idempotent immediately after fitting container detail', () => {
    mockStore.plantas = [
      {
        id: 'p1',
        nombre: 'Planta',
        isInfinite: false,
        dimensiones: { ancho: 600, largo: 400 },
        poligono: [
          { x: 0, y: 0 },
          { x: 600, y: 0 },
          { x: 600, y: 400 },
          { x: 0, y: 400 }
        ],
      }
    ]
    mockStore.plantaActiva = 'p1'
    mockStore.elementos = [
      {
        id: 'c1',
        tipo: 'contenedores',
        width: 300,
        height: 200,
        plantaId: 'p1',
      }
    ]
    mockStore.canvasAdaptativo = {
      width: 300,
      height: 200,
      escala: 1,
      frame: { x: 0, y: 0, width: 300, height: 200 },
    }
    mockStore.contextoNavegacion = {
      tipo: 'elementos',
      id: 'c1',
      path: [
        { tipo: 'plantas', id: 'p1' },
        { tipo: 'elementos', id: 'c1' }
      ],
    }

    const wrapper = mount(CanvasView, {
      global: {
        provide: {
          placementSuggestions: mockPlacementSuggestions
        }
      }
    })
    const stageStub = {
      scale: vi.fn(),
      position: vi.fn(),
      batchDraw: vi.fn(),
    }
  wrapper.vm.stageRef = { getNode: () => stageStub }
  expect(wrapper.vm.stageRef.getNode()).toBe(stageStub)
    wrapper.vm.stageSize.width = 600
    wrapper.vm.stageSize.height = 400

    const firstFit = wrapper.vm.fitToPlanta()
    stageStub.scale.mockClear()
    stageStub.position.mockClear()
    const secondFit = wrapper.vm.fitToPlanta()

    expect(firstFit).toBeTruthy()
    expect(secondFit).toBeTruthy()
    expect(secondFit.scale).toBeCloseTo(firstFit.scale)
    expect(secondFit.position.x).toBeCloseTo(firstFit.position.x)
    expect(secondFit.position.y).toBeCloseTo(firstFit.position.y)
    expect(stageStub.scale).toHaveBeenCalledTimes(2)
    expect(stageStub.position).toHaveBeenCalledTimes(2)
    const [, scaleCall] = stageStub.scale.mock.calls
    const [, positionCall] = stageStub.position.mock.calls
    expect(scaleCall[0].x).toBeCloseTo(firstFit.scale)
    expect(scaleCall[0].y).toBeCloseTo(firstFit.scale)
    expect(positionCall[0].x).toBeCloseTo(firstFit.position.x)
    expect(positionCall[0].y).toBeCloseTo(firstFit.position.y)
  })
})
