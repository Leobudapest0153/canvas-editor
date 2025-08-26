import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, defineComponent } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-konva', () => ({ VueKonva: {}, default: { install: () => {} } }))

let mockStore
vi.mock('@/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({ store: mockStore })
}))
vi.mock('@/utils/collision', () => ({ detectConflictsFor: vi.fn(() => []) }))

import CanvasView from '@/components/CanvasView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} }
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
    elementosVisibles: [
      { id: 'a', x: 10, y: 10, width: 10, height: 10, forma: 'rectangular', color: '#f00' }
    ],
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
})

describe('canvas layers', () => {
  it('orders layers and applies clip only to content', () => {
    const layerStub = defineComponent({
      props: ['config', 'clipFunc'],
      template:
        '<div class="layer" :data-listening="config && config.listening" :data-clip="clipFunc ? true : undefined"><slot/></div>'
    })
    const stubs = {
      'v-stage': { template: '<div class="stage"><slot/></div>' },
      'v-layer': layerStub,
      'v-rect': { template: '<div></div>' },
      'v-circle': { template: '<div></div>' },
      'v-text': { template: '<div></div>' },
      'v-group': { template: '<div><slot/></div>' },
      'v-line': { template: '<div></div>' },
      'v-transformer': { template: '<div></div>' },
    }

    const wrapper = mount(CanvasView, { global: { stubs } })
    const layers = wrapper.findAll('.layer')
    expect(layers.length).toBe(3)
    expect(layers[0].attributes('data-listening')).toBe('false')
    expect(layers[1].attributes('data-clip')).toBe('true')
    expect(layers[2].attributes('data-clip')).toBeUndefined()
  })
})
