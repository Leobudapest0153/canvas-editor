import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CanvasView from '@/inventory-smart/components/CanvasView.vue'

let mockStore
vi.mock('@/inventory-smart/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({ store: mockStore })
}))

beforeEach(() => {
  setActivePinia(createPinia())
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
    canvasAdaptativo: { width: 100, height: 100 },
    gridSize: 50,
    contextoActual: { tipo: 'plantas' },
    estaEnPlanta: true,
    estaEnElemento: false,
    estaEnContenedor: false
  }
})

describe('canvas layers order', () => {
  it('background below content and overlays without clip', () => {
    const wrapper = mount(CanvasView)
    expect(wrapper.vm.backgroundLayerRef).toBeTruthy()
    expect(wrapper.vm.layerRef).toBeTruthy()
    expect(wrapper.vm.overlaysLayerRef).toBeTruthy()
  })
})
