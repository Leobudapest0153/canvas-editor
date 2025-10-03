import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CanvasView from '@/inventory-smart/components/CanvasView.vue'
import { ToastSymbol } from '@/inventory-smart/plugins/toast'
import { GRID_SIZE } from '@/inventory-smart/utils/constants'

let toastMockRef = {
  show: vi.fn(),
}

vi.mock('@/inventory-smart/composables/useToast', () => ({
  useToast: () => ({
    showToast: (message, type = 'error', options = {}) =>
      toastMockRef.show(message, { type, timeout: options.timeout ?? 4000 }),
  }),
}))

const placementSuggestionInstances = []

vi.mock('@/inventory-smart/composables/usePlacementSuggestionModal', () => ({
  usePlacementSuggestionModal: () => {
    const state = {
      open: { value: false, __v_isRef: true },
      payload: { value: null, __v_isRef: true },
      elementLabel: { value: 'Elemento', __v_isRef: true },
      show: vi.fn(({ element, suggestions = [], message, dropMeta } = {}) => {
        if (!suggestions.length) return false
        state.payload.value = { element, suggestions, message, dropMeta }
        state.open.value = true
        return true
      }),
      close: vi.fn(() => {
        state.open.value = false
        state.payload.value = null
      }),
      buildAdjustedElement: vi.fn(),
    }
    placementSuggestionInstances.push(state)
    return state
  },
}))

vi.mock('@/inventory-smart/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => {
    const store = {
      zoom: 1,
      panX: 0,
      panY: 0,
      plantaActivaData: {
        nombre: 'Planta Test',
        dimensiones: { ancho: 400, largo: 300 },
      },
      plantaActiva: 'planta_test',
      elementosVisibles: [],
      elementoSeleccionado: null,
      agregarElemento: vi.fn(),
      seleccionarElemento: vi.fn(),
      actualizarPosicion: vi.fn(),
      contextoActual: { tipo: 'plantas', id: 'planta_test' },
      estaEnPlanta: true,
      estaEnCuarto: false,
      estaEnPiso: false,
      estaEnContenedor: false,
      estaEnElemento: false,
      vistaActiva: 'XY',
      gridSize: GRID_SIZE,
      canvasAdaptativo: { width: 800, height: 600 },
      modoConfigurarEsl: false,
    }

    return {
      store,
      actions: { actualizarPosicion: vi.fn() },
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
    }
  },
}))

vi.mock('@/inventory-smart/composables/useCanvasBuffer', () => ({
  useCanvasBuffer: () => ({
    getBufferItem: vi.fn(),
    pasteFromBuffer: vi.fn(),
    pasteFromSerialized: vi.fn(),
  }),
}))

const weightValidationMock = { validarPesoElemento: vi.fn(() => ({ valido: true })) }
vi.mock('@/inventory-smart/composables/useWeightValidation', () => ({
  useWeightValidation: () => weightValidationMock,
}))

vi.mock('@/inventory-smart/composables/useConflicts', () => ({
  useConflicts: () => ({
    conflicts: { value: [] },
    setConflicts: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@/inventory-smart/composables/useEditorMode', () => ({
  useEditorMode: () => ({ modoEdicion: { value: true } }),
}))

const mockStage = {
  x: () => 0,
  y: () => 0,
  scaleX: () => 1,
  scaleY: () => 1,
  getPointerPosition: () => ({ x: 100, y: 100 }),
}

let toastMock
let wrapper

const mountComponent = () => {
  const setupWrapper = mount(CanvasView, {
    global: {
      plugins: [createPinia()],
    },
  })
  const setupState = setupWrapper.vm.$.setupState || {}
  if (setupState.stageRef) {
    setupState.stageRef.value = {
      getNode: () => mockStage,
    }
  }
  if (setupState.containerRef) {
    setupState.containerRef.value = {
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
    }
  }
  if (setupState.stageSize) {
    setupState.stageSize.value = { width: 800, height: 600 }
  }
  return setupWrapper
}

describe('CanvasView placement suggestion handlers', () => {
  beforeEach(() => {
    placementSuggestionInstances.length = 0
    setActivePinia(createPinia())
    toastMock = {
      toasts: { value: [] },
      show: vi.fn(),
      remove: vi.fn(),
      clearAll: vi.fn(),
      maxToasts: 5,
    }
    toastMockRef = toastMock
    config.global.provide = { ...(config.global.provide || {}), [ToastSymbol]: toastMock }
    config.global.stubs = {
      ...(config.global.stubs || {}),
      PlacementSuggestionModal: true,
      FloatingControls: true,
    }
    wrapper = mountComponent()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const getSetupState = () => wrapper.vm.$.setupState || {}

  it('cierra el modal y muestra el mensaje al cancelar', async () => {
    const setupState = getSetupState()
    const modal = placementSuggestionInstances[0]
    modal.show({
      element: {
        tipo: 'elementos',
        categoria: 'anaquel',
        dimensiones: { ancho: 100, largo: 60, alto: 20 },
      },
      suggestions: [{ type: 'dimensions' }],
      message: 'No hay espacio aquí para colocar el elemento',
      dropMeta: { clientX: 0, clientY: 0, data: { tipo: 'elemento-catalogo' } },
    })

    await setupState.handlePlacementSuggestionCancel()

    expect(modal.close).toHaveBeenCalled()
    expect(toastMock.show).toHaveBeenCalledWith(
      'No hay espacio aquí para colocar el elemento',
      { type: 'error', timeout: 4000 },
    )
  })

  it('limpia el modal y prepara ajustes al aceptar', async () => {
    const setupState = getSetupState()
    const modal = placementSuggestionInstances[0]
    modal.show({
      element: {
        tipo: 'elementos',
        categoria: 'anaquel',
        nombre: 'Original',
        dimensiones: { ancho: 100, largo: 60, alto: 20 },
      },
      suggestions: [{ type: 'dimensions' }],
      message: 'No hay espacio aquí para colocar el elemento',
      dropMeta: { clientX: 120, clientY: 140, data: { tipo: 'elemento-catalogo' } },
    })
    modal.buildAdjustedElement.mockReturnValue({
      tipo: 'elementos',
      categoria: 'anaquel',
      nombre: 'Ajustado',
      dimensiones: { ancho: 100, largo: 60, alto: 20 },
    })

    await setupState.handlePlacementSuggestionAccept()

    expect(modal.close).toHaveBeenCalled()
    expect(modal.buildAdjustedElement).toHaveBeenCalled()
    expect(modal.payload.value).toBeNull()
    expect(toastMock.show).toHaveBeenCalledWith(
      'No hay espacio aquí para colocar el elemento',
      { type: 'error', timeout: 4000 },
    )
  })

  it('muestra error si falta metadato de drop al aceptar', async () => {
    const setupState = getSetupState()
    const modal = placementSuggestionInstances[0]
    modal.show({
      element: {
        tipo: 'elementos',
        categoria: 'anaquel',
        dimensiones: { ancho: 100, largo: 60, alto: 20 },
      },
      suggestions: [{ type: 'dimensions' }],
      message: 'No hay espacio aquí para colocar el elemento',
      dropMeta: { clientX: 10, clientY: 20, data: { tipo: 'elemento-catalogo' } },
    })
    modal.buildAdjustedElement.mockReturnValue({
      tipo: 'elementos',
      categoria: 'anaquel',
      nombre: 'Ajustado',
      dimensiones: { ancho: 100, largo: 60, alto: 20 },
    })
    modal.payload.value = {
      ...modal.payload.value,
      dropMeta: null,
    }

    await setupState.handlePlacementSuggestionAccept()

    expect(modal.close).toHaveBeenCalled()
    expect(toastMock.show).toHaveBeenCalledWith(
      'No hay espacio aquí para colocar el elemento',
      { type: 'error', timeout: 4000 },
    )
  })
})
