import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { pointInPolygon } from '@/inventory-smart/utils/polygonBounds'

vi.mock('@/inventory-smart/composables/usePlacementSuggestionModal', () => ({
  usePlacementSuggestionModal: () => ({
    open: { value: false, __v_isRef: true },
    payload: { value: null, __v_isRef: true },
    elementLabel: { value: 'Elemento', __v_isRef: true },
    show: () => false,
    close: vi.fn(),
    buildAdjustedElement: vi.fn(),
  }),
}))

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
import { ToastSymbol } from '@/inventory-smart/plugins/toast'

beforeEach(() => {
  setActivePinia(createPinia())
  const toastMock = { toasts: { value: [] }, show: vi.fn(), remove: vi.fn(), clearAll: vi.fn(), maxToasts: 5 }
  config.global.provide = { ...(config.global.provide || {}), [ToastSymbol]: toastMock }
  config.global.stubs = { ...(config.global.stubs || {}), PlacementSuggestionModal: true, FloatingControls: true }
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
    const setupState = wrapper.vm.$.setupState || {}
    if (setupState.containerRef) {
      setupState.containerRef.value = { getBoundingClientRect: () => ({ left: 0, top: 0 }) }
    }
    if (setupState.stageRef) {
      setupState.stageRef.value = {
        getNode: () => ({ x: () => 0, y: () => 0, scaleX: () => 1, scaleY: () => 1 })
      }
    }
    if (setupState.stageSize) {
      setupState.stageSize.value = { width: 100, height: 100 }
    }

    const data = { elemento: { dimensiones: { ancho: 20, largo: 20 }, tipo: 'elementos', forma: 'rectangular', color: '#f00' } }
    const dropEvent = { clientX: 150, clientY: 50, preventDefault: () => {} }

    wrapper.vm.createElementFromDrop(data, dropEvent)

    expect(config.global.provide[ToastSymbol].show).not.toHaveBeenCalled()
    expect(mockStore.agregarElemento).toHaveBeenCalled()
    const added = mockStore.agregarElemento.mock.calls[0][0]
    const inside = pointInPolygon({ x: added.x, y: added.y }, mockStore.plantaActivaData.poligono)
    expect(inside).toBe(true)
  })
})
