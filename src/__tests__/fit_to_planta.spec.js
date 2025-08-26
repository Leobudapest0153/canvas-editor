import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-konva', () => ({
  VueKonva: {},
  default: { install: () => {} },
}))

let storeMock

vi.mock('@/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({
    store: storeMock,
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
  }),
}))

import CanvasView from '@/components/CanvasView.vue'

beforeEach(() => {
  const pinia = createPinia()
  setActivePinia(pinia)
})

describe('fitToPlanta', () => {
  it('usa bbox del polígono para ajustar zoom', async () => {
    storeMock = {
      zoom: 1,
      panX: 0,
      panY: 0,
      plantaActivaData: {
        nombre: 'Planta',
        dimensiones: { ancho: 200, largo: 200 },
        poligono: [
          { x: 50, y: 50 },
          { x: 150, y: 50 },
          { x: 150, y: 150 },
          { x: 50, y: 150 },
        ],
      },
      elementosVisibles: [],
      elementoSeleccionado: null,
      configurarZoom: vi.fn(),
      configurarPan: vi.fn(),
    }

    const wrapper = mount(CanvasView, {
      global: { plugins: [createPinia()] },
    })

    wrapper.vm.stageRef = { value: { getNode: () => ({}) } }
    wrapper.vm.stageSize.value = { width: 500, height: 500 }

    wrapper.vm.fitToPlanta()

    expect(storeMock.configurarZoom).toHaveBeenCalled()
    const zoomValue = storeMock.configurarZoom.mock.calls[0][0]
    expect(zoomValue).toBeGreaterThan(3)
  })
})
