import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { config } from '@vue/test-utils'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement'
import { useCanvasHistory } from '@/inventory-smart/composables/useCanvasHistory'
import { ToastSymbol, __setToastApiForTests } from '@/inventory-smart/plugins/toast'

const createToastMock = () => ({
  toasts: { value: [] },
  show: vi.fn(),
  remove: vi.fn(),
  clearAll: vi.fn(),
  maxToasts: 5,
})

const addElement = (store, data) => {
  store.elementos.push({
    id: data.id,
    nombre: data.nombre || data.id,
    tipo: data.tipo,
    categoria: data.categoria || data.tipo,
    plantaId: data.plantaId || 'planta_1',
    padre: data.padre || null,
    hijos: Array.isArray(data.hijos) ? data.hijos.slice() : [],
    width: data.width || 100,
    height: data.height || 50,
    dimensiones: data.dimensiones || { ancho: 100, largo: 50, alto: 30 },
    visible: true,
  })
}

describe('navigation fallbacks after deletions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    if (typeof window !== 'undefined') {
      window.__dvCanvasDragActive = false
    }

    const toastMock = createToastMock()
    config.global.provide = { ...(config.global.provide || {}), [ToastSymbol]: toastMock }
    __setToastApiForTests(toastMock)
  })

  it('promotes the first remaining plant when deleting the active one', () => {
    const store = useCanvasStore()

    store.plantas.push({
      id: 'planta_test',
      nombre: 'Planta Test',
      descripcion: '',
      elementos: [],
      activa: false,
      dimensiones: { alto: 500, ancho: 600, largo: 700 },
      capacidadCargaSoportado: 1000,
      isInfinite: false,
      poligono: [],
    })

    store.seleccionarPlanta('planta_test')

    store.eliminarPlanta('planta_test')

    expect(store.plantaActiva).toBe('planta_1')
    expect(store.contextoNavegacion.tipo).toBe('plantas')
    expect(store.contextoNavegacion.id).toBe('planta_1')
    expect(store.contextoNavegacion.path[0].id).toBe('planta_1')
  })

  it('keeps navigation on the next piso when removing the current one', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, {
      id: 'cuarto_1',
      tipo: 'cuartos',
      categoria: 'cuartos',
      nombre: 'Cuarto Principal',
      hijos: ['piso_a', 'piso_b'],
    })

    addElement(store, {
      id: 'piso_a',
      tipo: 'pisos',
      categoria: 'pisos',
      nombre: 'Piso A',
      padre: 'cuarto_1',
    })

    addElement(store, {
      id: 'piso_b',
      tipo: 'pisos',
      categoria: 'pisos',
      nombre: 'Piso B',
      padre: 'cuarto_1',
    })

    const cuarto = store.elementos.find((el) => el.id === 'cuarto_1')
    cuarto.hijos = ['piso_a', 'piso_b']

    store.navegarAElemento('cuarto_1')
    store.navegarAElemento('piso_a')
    store.seleccionarElemento('piso_a')

    history.initializeHistory('init piso delete')

    const ok = await deleteSelected({ withConfirm: false })
    expect(ok).toBe(true)

    expect(store.elementos.find((el) => el.id === 'piso_a')).toBeUndefined()
    expect(store.contextoNavegacion.tipo).toBe('pisos')
    expect(store.contextoNavegacion.id).toBe('piso_b')
  })

  it('falls back to the parent context when deleting the last piso', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, {
      id: 'cuarto_2',
      tipo: 'cuartos',
      categoria: 'cuartos',
      nombre: 'Cuarto Secundario',
      hijos: ['piso_unico'],
    })

    addElement(store, {
      id: 'piso_unico',
      tipo: 'pisos',
      categoria: 'pisos',
      nombre: 'Piso Unico',
      padre: 'cuarto_2',
    })

    const cuarto = store.elementos.find((el) => el.id === 'cuarto_2')
    cuarto.hijos = ['piso_unico']

    store.navegarAElemento('cuarto_2')
    store.navegarAElemento('piso_unico')
    store.seleccionarElemento('piso_unico')

    history.initializeHistory('init single piso delete')

    const ok = await deleteSelected({ withConfirm: false })
    expect(ok).toBe(true)

    expect(store.elementos.find((el) => el.id === 'piso_unico')).toBeUndefined()
    expect(store.contextoNavegacion.tipo).toBe('cuartos')
    expect(store.contextoNavegacion.id).toBe('cuarto_2')
  })
})
