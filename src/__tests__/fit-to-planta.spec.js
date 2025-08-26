import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-konva', () => ({ VueKonva: {}, default: { install: () => {} } }))

let mockStore
vi.mock('@/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({ store: mockStore })
}))

beforeEach(() => {
  setActivePinia(createPinia())
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

import CanvasView from '@/components/CanvasView.vue'

describe('fitToPlanta', () => {
  it('uses polygon bbox for zoom calculation', () => {
    mockStore = {
      zoom: 1,
      panX: 0,
      panY: 0,
      plantaActivaData: {
        nombre: 'Planta',
        dimensiones: { ancho: 200, largo: 100 },
        poligono: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 100 },
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
      canvasAdaptativo: { width: 400, height: 300 },
      configurarZoom: vi.fn(),
      configurarPan: vi.fn(),
    }

    const stubs = {
      'v-stage': { template: '<div><slot/></div>' },
      'v-layer': { props: ['config', 'clipFunc'], template: '<div><slot/></div>' },
      'v-rect': { template: '<div></div>' },
      'v-circle': { template: '<div></div>' },
      'v-text': { template: '<div></div>' },
      'v-group': { template: '<div><slot/></div>' },
      'v-line': { template: '<div></div>' },
      'v-transformer': { template: '<div></div>' }
    }
    const wrapper = mount(CanvasView, { global: { stubs } })
    wrapper.vm.stageRef = { getNode: () => ({}) }
    wrapper.vm.stageSize = { width: 400, height: 400 }

    wrapper.vm.fitToPlanta()

    expect(mockStore.configurarZoom).toHaveBeenCalled()
    const zoom = mockStore.configurarZoom.mock.calls[0][0]
    expect(zoom).toBeCloseTo(1.6)
  })
})
