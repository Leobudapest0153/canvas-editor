import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CanvasView from '@/inventory-smart/components/CanvasView.vue'
import { detectConflictsFor } from '@/inventory-smart/utils/collision'

// Mock del sistema de sugerencias
const mockPlacementSuggestions = {
  tryPlaceWithSuggestions: vi.fn(() => Promise.resolve(true)),
  generatePlacementSuggestions: vi.fn(() => null),
  applySuggestedAdjustments: vi.fn((el) => el)
}
import { snapToGrid, nudgePlace } from '@/inventory-smart/utils/geometry'
import { GRID_SIZE } from '@/inventory-smart/utils/constants'

// Mock Konva
vi.mock('vue-konva', () => ({
  VueKonva: {},
  default: {
    install: () => {}
  }
}))

// Mock del stage de Konva
const mockStage = {
  x: () => 0,
  y: () => 0,
  scaleX: () => 1,
  scaleY: () => 1,
  getPointerPosition: () => ({ x: 100, y: 100 })
}

// Mock del composable useCanvasWithHistory
vi.mock('@/inventory-smart/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({
    store: {
      zoom: 1,
      panX: 0,
      panY: 0,
      plantaActivaData: {
        nombre: 'Planta Test',
        dimensiones: { ancho: 400, largo: 300 }
      },
      elementosVisibles: [],
      elementoSeleccionado: null,
      agregarElemento: vi.fn(),
      seleccionarElemento: vi.fn(),
      actualizarPosicion: vi.fn()
    },
    actions: {
      actualizarPosicion: vi.fn()
    },
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false
  })
}))

// Mock de otros composables
vi.mock('@/inventory-smart/composables/useCanvasBuffer', () => ({
  useCanvasBuffer: () => ({
    getBufferItem: vi.fn(),
    pasteFromBuffer: vi.fn(),
    pasteFromSerialized: vi.fn()
  })
}))

const weightValidationMock = { validarPesoElemento: vi.fn(() => ({ valido: true })) }
vi.mock('@/inventory-smart/composables/useWeightValidation', () => ({
  useWeightValidation: () => weightValidationMock
}))

vi.mock('@/inventory-smart/composables/useConflicts', () => ({
  useConflicts: () => ({
    conflicts: { value: [] },
    setConflicts: vi.fn(),
    clear: vi.fn()
  })
}))

// Mock del sistema de toast (vía provide)
import { ToastSymbol } from '@/inventory-smart/plugins/toast'
config.global.provide = {
  ...(config.global.provide || {}),
  [ToastSymbol]: { toasts: { value: [] }, show: vi.fn(), remove: vi.fn(), clearAll: vi.fn(), maxToasts: 5 },
}

describe('Drop Validation - Bug Fix: Drop que nace bloqueado', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    wrapper = mount(CanvasView, {
      global: {
        plugins: [pinia],
        provide: {
          placementSuggestions: mockPlacementSuggestions
        }
      }
    })

    // Mock de las referencias del componente
    wrapper.vm.stageRef = {
      value: {
        getNode: () => mockStage
      }
    }
    wrapper.vm.containerRef = {
      value: {
        getBoundingClientRect: () => ({ left: 0, top: 0 })
      }
    }
  })

  describe('Test 1: Drop sobre suelo–suelo se rechaza o reubica sin quedar bloqueado', () => {
    it('debería rechazar drop cuando hay conflicto suelo-suelo y no hay espacio alternativo', async () => {
      // Preparar escenario con elemento existente que bloquea
      const elementoExistente = {
        id: 'existente1',
        x: 50,
        y: 50,
        width: 100,
        height: 60,
        ubicacion: 'suelo',
        tipo: 'anaquel'
      }

      wrapper.vm.canvasStore.elementosVisibles = [elementoExistente]

      // Mock de detectConflictsFor para simular conflicto bloqueante
      vi.mocked(detectConflictsFor).mockReturnValue([
        {
          aId: '__temp_drop__',
          bId: 'existente1',
          bloqueante: true,
          tipo: 'suelo-suelo'
        }
      ])

      // Mock de nudgePlace para simular que no encuentra espacio
      vi.mocked(nudgePlace).mockReturnValue({ found: false, x: 50, y: 50 })

      // Datos del drop
      const dropData = {
        tipo: 'elemento-catalogo',
        elemento: {
          tipo: 'anaquel',
          nombre: 'Anaquel Test',
          width: 100,
          height: 60,
          ubicacion: 'suelo',
          color: '#3B82F6'
        }
      }

      // Simular evento de drop
      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn().mockReturnValue(JSON.stringify(dropData))
        },
        clientX: 100,
        clientY: 100
      }

      // Ejecutar drop
      await wrapper.vm.createElementFromDrop(dropData, dropEvent)

      // Verificar que se mostró el toast de error
      expect(config.global.provide[ToastSymbol].show).toHaveBeenCalledWith(
        'No hay espacio aquí para colocar el elemento',
        { type: 'error', timeout: 4000 }
      )

      // Verificar que NO se agregó el elemento
      expect(wrapper.vm.canvasStore.agregarElemento).not.toHaveBeenCalled()
    })

    it('debería reubicar elemento cuando nudgePlace encuentra posición válida', async () => {
      // Elemento existente
      const elementoExistente = {
        id: 'existente1',
        x: 50,
        y: 50,
        width: 100,
        height: 60,
        ubicacion: 'suelo'
      }

      wrapper.vm.canvasStore.elementosVisibles = [elementoExistente]

      // Primera llamada: conflicto en posición original
      // Segunda llamada: sin conflicto en posición reubicada
      vi.mocked(detectConflictsFor)
        .mockReturnValueOnce([{ bloqueante: true }])
        .mockReturnValue([])

      // nudgePlace encuentra una posición válida
      vi.mocked(nudgePlace).mockReturnValue({
        found: true,
        x: 200,
        y: 200
      })

      const dropData = {
        tipo: 'elemento-catalogo',
        elemento: {
          tipo: 'anaquel',
          nombre: 'Anaquel Test',
          width: 100,
          height: 60,
          ubicacion: 'suelo'
        }
      }

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn().mockReturnValue(JSON.stringify(dropData)) },
        clientX: 100,
        clientY: 100
      }

      await wrapper.vm.createElementFromDrop(dropData, dropEvent)

      // Verificar que se agregó el elemento en la posición reubicada
      expect(wrapper.vm.canvasStore.agregarElemento).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 200,
          y: 200
        })
      )

      // Verificar que NO se mostró toast de error
  expect(config.global.provide[ToastSymbol].show).not.toHaveBeenCalled()
    })
  })

  describe('Test 2: Con zoom y pan las coords del mundo se calculan bien', () => {
    it('debería convertir correctamente las coordenadas del puntero a coordenadas de mundo con zoom', () => {
      // Configurar zoom y pan
      const mockStageWithZoom = {
        x: () => 50,  // pan X
        y: () => 30,  // pan Y
        scaleX: () => 2,  // zoom 200%
        scaleY: () => 2
      }

      wrapper.vm.stageRef.value.getNode = () => mockStageWithZoom

      const dropEvent = {
        clientX: 200,  // posición del mouse en pantalla
        clientY: 150
      }

      const worldCoords = wrapper.vm.getWorldCoordinatesFromPointer(dropEvent)

      // Cálculo esperado: ((200 - 0) - 50) / 2 = 75, ((150 - 0) - 30) / 2 = 60
      expect(worldCoords).toEqual({
        x: 75,
        y: 60
      })
    })

    it('debería manejar coordenadas con pan negativo y zoom fraccionario', () => {
      const mockStageComplex = {
        x: () => -100,
        y: () => -50,
        scaleX: () => 0.5,
        scaleY: () => 0.5
      }

      wrapper.vm.stageRef.value.getNode = () => mockStageComplex

      const dropEvent = {
        clientX: 150,
        clientY: 100
      }

      const worldCoords = wrapper.vm.getWorldCoordinatesFromPointer(dropEvent)

      // Cálculo: ((150 - 0) - (-100)) / 0.5 = 500, ((100 - 0) - (-50)) / 0.5 = 300
      expect(worldCoords).toEqual({
        x: 500,
        y: 300
      })
    })
  })

  describe('Test 3: Snap a grilla ocurre antes de validar', () => {
    it('debería aplicar snap a grilla antes de detectar conflictos', async () => {
      // Mock de snapToGrid
      vi.mocked(snapToGrid).mockReturnValue({ x: 40, y: 60 })

      const dropData = {
        tipo: 'elemento-catalogo',
        elemento: {
          tipo: 'mesa',
          width: 80,
          height: 60,
          ubicacion: 'suelo'
        }
      }

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn().mockReturnValue(JSON.stringify(dropData)) },
        clientX: 97,  // posición no alineada a grilla
        clientY: 83
      }

      // Mock sin conflictos para que proceda normalmente
      vi.mocked(detectConflictsFor).mockReturnValue([])

      await wrapper.vm.createElementFromDrop(dropData, dropEvent)

      // Verificar que snapToGrid fue llamado antes que detectConflictsFor
      expect(snapToGrid).toHaveBeenCalledWith(57, 53, GRID_SIZE) // 97-40, 83-30 (mitad del elemento)

      // Verificar que detectConflictsFor recibió las coordenadas snapeadas
      expect(detectConflictsFor).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 40,
          y: 60
        }),
        expect.any(Array)
      )
    })
  })

  describe('Test 4: Si nudgePlace no encuentra hueco, no se crea el elemento y se muestra el toast', () => {
    it('debería mostrar toast y no crear elemento cuando nudgePlace falla', async () => {
      // Simular área llena de obstáculos
      const obstaculos = [
        { id: 'obs1', x: 0, y: 0, width: 200, height: 200, ubicacion: 'suelo' },
        { id: 'obs2', x: 200, y: 0, width: 200, height: 200, ubicacion: 'suelo' },
        { id: 'obs3', x: 0, y: 200, width: 200, height: 200, ubicacion: 'suelo' },
        { id: 'obs4', x: 200, y: 200, width: 200, height: 200, ubicacion: 'suelo' }
      ]

      wrapper.vm.canvasStore.elementosVisibles = obstaculos

      // Mock que siempre retorna conflictos
      vi.mocked(detectConflictsFor).mockReturnValue([{ bloqueante: true }])

      // nudgePlace no encuentra espacio
      vi.mocked(nudgePlace).mockReturnValue({ found: false, x: 100, y: 100 })

      const dropData = {
        tipo: 'elemento-catalogo',
        elemento: {
          tipo: 'contenedor',
          width: 50,
          height: 50,
          ubicacion: 'suelo'
        }
      }

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn().mockReturnValue(JSON.stringify(dropData)) },
        clientX: 150,
        clientY: 150
      }

      await wrapper.vm.createElementFromDrop(dropData, dropEvent)

      // Verificar que nudgePlace fue llamado con los parámetros correctos
      expect(nudgePlace).toHaveBeenCalledWith(
        expect.any(Number),  // x
        expect.any(Number),  // y
        50,                  // width
        50,                  // height
        expect.any(Object),  // boundary
        obstaculos,          // allElements
        expect.objectContaining({ id: '__temp_drop__' }),  // tempElement
        GRID_SIZE,          // gridSize
        16                  // maxAttempts
      )

      // Verificar que se mostró el toast de error
      expect(config.global.provide[ToastSymbol].show).toHaveBeenCalledWith(
        'No hay espacio aquí para colocar el elemento',
        { type: 'error', timeout: 4000 }
      )

      // Verificar que NO se creó el elemento
      expect(wrapper.vm.canvasStore.agregarElemento).not.toHaveBeenCalled()
    })

    it('debería funcionar igual para elementos desde buffer', async () => {
      // Mock del buffer que retorna un elemento
      const bufferItem = {
        elemento: {
          tipo: 'armario',
          width: 60,
          height: 40,
          ubicacion: 'suelo'
        }
      }

      wrapper.vm.buffer.getBufferItem = vi.fn().mockReturnValue(bufferItem)

      // Simular conflictos y nudgePlace fallido
      vi.mocked(detectConflictsFor).mockReturnValue([{ bloqueante: true }])
      vi.mocked(nudgePlace).mockReturnValue({ found: false, x: 100, y: 100 })

      const dropData = {
        tipo: 'buffer-element',
        bufferItemId: 'buffer123'
      }

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn().mockReturnValue(JSON.stringify(dropData)) },
        clientX: 200,
        clientY: 200
      }

      await wrapper.vm.createElementFromBuffer(dropData, dropEvent)

      // Verificar toast específico para buffer
      expect(config.global.provide[ToastSymbol].show).toHaveBeenCalledWith(
        'No hay espacio aquí para pegar el elemento',
        { type: 'error', timeout: 4000 }
      )

      // Verificar que NO se pegó desde buffer
      expect(wrapper.vm.buffer.pasteFromBuffer).not.toHaveBeenCalled()
    })
  })

  describe('Test de integración: dragBoundFunc nunca recibe elemento en estado inválido', () => {
    it('debería prevenir que dragBoundFunc procese elementos recién creados en posición inválida', async () => {
      // Simular que el drop valida correctamente y crea elemento
      vi.mocked(detectConflictsFor).mockReturnValue([]) // sin conflictos
      vi.mocked(snapToGrid).mockReturnValue({ x: 100, y: 100 })

      const dropData = {
        tipo: 'elemento-catalogo',
        elemento: {
          tipo: 'mesa',
          width: 80,
          height: 60,
          ubicacion: 'suelo'
        }
      }

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn().mockReturnValue(JSON.stringify(dropData)) },
        clientX: 140,
        clientY: 130
      }

      await wrapper.vm.createElementFromDrop(dropData, dropEvent)

      // Verificar que el elemento se creó en posición válida
      expect(wrapper.vm.canvasStore.agregarElemento).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 100
        })
      )

      // El elemento ya está en posición válida, por lo que dragBoundFunc
      // recibirá elementos siempre en estados válidos
      const elementoCreado = wrapper.vm.canvasStore.agregarElemento.mock.calls[0][0]
      expect(elementoCreado.x).toBe(100)
      expect(elementoCreado.y).toBe(100)
    })
  })

  describe('Template pre-drop validation', () => {
    it('allows valid template drop', () => {
      weightValidationMock.validarPesoElemento.mockReturnValue({ valido: true })
      vi.mocked(detectConflictsFor).mockReturnValue([])
      wrapper.vm.canvasStore.contextoActual = { tipo: 'plantas', id: 'p1' }
      const tpl = { id: 't1', tipo: 'elementos', dimensiones: { ancho: 100, largo: 60, alto: 20 }, width: 100, height: 60 }
      const res = wrapper.vm.runPreDropValidations(tpl, { clientX: 50, clientY: 50 })
      expect(res.ok).toBe(true)
    })

    it('rejects invalid hierarchy', () => {
      wrapper.vm.canvasStore.contextoActual = { tipo: 'elementos', id: 'e1' }
      const tpl = { id: 't1', tipo: 'elementos', dimensiones: { ancho: 100, largo: 60, alto: 20 }, width: 100, height: 60 }
      const res = wrapper.vm.runPreDropValidations(tpl, { clientX: 50, clientY: 50 })
      expect(res.ok).toBe(false)
    })

    it('rejects weight limit', () => {
      weightValidationMock.validarPesoElemento.mockReturnValueOnce({ valido: false, exceso: 5 })
      const tpl = { id: 't1', tipo: 'elementos', dimensiones: { ancho: 100, largo: 60, alto: 20 }, width: 100, height: 60 }
      const res = wrapper.vm.runPreDropValidations(tpl, { clientX: 50, clientY: 50 })
      expect(res.ok).toBe(false)
    })

    it('rejects collision', () => {
      vi.mocked(detectConflictsFor).mockReturnValueOnce([{ bloqueante: true }])
      const tpl = { id: 't1', tipo: 'elementos', dimensiones: { ancho: 100, largo: 60, alto: 20 }, width: 100, height: 60 }
      const res = wrapper.vm.runPreDropValidations(tpl, { clientX: 50, clientY: 50 })
      expect(res.ok).toBe(false)
    })

    it('rejects when outside bounds', () => {
      const tpl = { id: 't1', tipo: 'elementos', dimensiones: { ancho: 500, largo: 500, alto: 20 }, width: 500, height: 500 }
      const res = wrapper.vm.runPreDropValidations(tpl, { clientX: 10, clientY: 10 })
      expect(res.ok).toBe(false)
    })
  })
})
