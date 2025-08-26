import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-konva', () => ({ VueKonva: {}, default: { install: () => {} } }))

let mockStore
vi.mock('@/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({ store: mockStore })
}))

vi.mock('@/utils/collision', () => ({
  detectConflictsFor: vi.fn(() => [])
}))

import CanvasView from '@/components/CanvasView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.__toasts = { show: vi.fn() }
})

describe('drop outside polygon', () => {
  it('rejects drop when outside active polygon', async () => {
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
    wrapper.vm.containerRef = { getBoundingClientRect: () => ({ left: 0, top: 0 }) }
    wrapper.vm.stageRef = { getNode: () => ({}) }

    const data = { elemento: { dimensiones: { ancho: 20, largo: 20 }, tipo: 'elementos', forma: 'rectangular', color: '#f00' } }
    const dropEvent = { clientX: 150, clientY: 50, preventDefault: () => {} }

    wrapper.vm.createElementFromDrop(data, dropEvent)

    expect(window.__toasts.show).toHaveBeenCalledWith('Fuera de los límites de la planta', { type: 'error', timeout: 4000 })
    expect(mockStore.agregarElemento).not.toHaveBeenCalled()
  })
})
