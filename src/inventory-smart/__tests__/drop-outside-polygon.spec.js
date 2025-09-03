import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { pointInPolygon } from '@/inventory-smart/utils/polygonBounds'

vi.mock('vue-konva', () => ({ VueKonva: {}, default: { install: () => {} } }))

let mockStore
vi.mock('@/inventory-smart/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({ store: mockStore })
}))

vi.mock('@/inventory-smart/utils/collision', () => ({
  detectConflictsFor: vi.fn(() => []),
  throttle: (fn) => fn,
}))

import CanvasView from '@/inventory-smart/components/CanvasView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  window.__toasts = { show: vi.fn() }
})

describe('drop outside polygon', () => {
  it('clamps drop inside active polygon', async () => {
    mockStore = {
      zoom: 1,
      panX: 0,
      panY: 0,
      plantaActivaData: {
        nombre: 'Planta',
        dimensiones: { ancho: 100, largo: 100 },
        poligono: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 }
        ]
      },
      elementosVisibles: [],
      elementoSeleccionado: null,
      agregarElemento: vi.fn(),
      seleccionarElemento: vi.fn(),
      estaEnElemento: false,
      estaEnContenedor: false,
      estaEnPlanta: true,
      contextoActual: { tipo: 'plantas' },
      vistaActiva: 'XY',
      gridSize: 50,
      canvasAdaptativo: { width: 100, height: 100 },
      configurarZoom: vi.fn(),
      configurarPan: vi.fn(),
    }

    const wrapper = mount(CanvasView)
    wrapper.vm.containerRef = { getBoundingClientRect: () => ({ left: 0, top: 0 }) }
    wrapper.vm.stageRef = {
      getNode: () => ({ x: () => 0, y: () => 0, scaleX: () => 1, scaleY: () => 1 })
    }
    wrapper.vm.stageSize.width = 100
    wrapper.vm.stageSize.height = 100

    const data = { elemento: { dimensiones: { ancho: 20, largo: 20 }, tipo: 'elementos', forma: 'rectangular', color: '#f00' } }
    const dropEvent = { clientX: 150, clientY: 50, preventDefault: () => {} }

    wrapper.vm.createElementFromDrop(data, dropEvent)

    expect(window.__toasts.show).not.toHaveBeenCalled()
    expect(mockStore.agregarElemento).toHaveBeenCalled()
    const added = mockStore.agregarElemento.mock.calls[0][0]
    const inside = pointInPolygon({ x: added.x, y: added.y }, mockStore.plantaActivaData.poligono)
    expect(inside).toBe(true)
  })
})
