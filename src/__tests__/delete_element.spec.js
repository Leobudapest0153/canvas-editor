import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { useCanvasHistory } from '@/composables/useCanvasHistory'
import { useDeleteElement } from '@/composables/useDeleteElement'
import { useCanvasBuffer } from '@/composables/useCanvasBuffer'

const addElement = (store, el) => {
  store.elementos.push({
    id: el.id,
    nombre: el.nombre || el.id,
    tipo: el.tipo || 'elementos',
    categoria: el.categoria || 'anaqueles',
    x: el.x || 0,
    y: el.y || 0,
    width: el.width || 50,
    height: el.height || 40,
    plantaId: el.plantaId || 'planta_1',
    padre: el.padre || null,
    hijos: el.hijos || [],
    visible: true,
  })
}

describe('deleteSelected', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    if (typeof window !== 'undefined') window.__dvCanvasDragActive = false
  })

  it('(a) elimina elemento simple y empuja snapshot', () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_1', tipo: 'elementos' })
    store.seleccionarElemento('el_1')

    history.initializeHistory('pre')
    const beforeSize = history.historySize.value

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ok = deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    confirmSpy.mockRestore()

    expect(store.elementos.find((e) => e.id === 'el_1')).toBeUndefined()
    expect(history.historySize.value).toBe(beforeSize + 1)
  })

  it('(b) elimina contenedor con hijos tras confirmación en cascada', () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'c_1', tipo: 'contenedores', hijos: ['h_1', 'h_2'] })
    addElement(store, { id: 'h_1', tipo: 'elementos', padre: 'c_1' })
    addElement(store, { id: 'h_2', tipo: 'elementos', padre: 'c_1' })
    store.seleccionarElemento('c_1')

    history.initializeHistory('pre')

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation((msg) => {
      expect(msg).toContain('Se eliminará también 2 elemento(s) dentro')
      return true
    })

    const ok = deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    confirmSpy.mockRestore()

    expect(store.elementos.find((e) => e.id === 'c_1')).toBeUndefined()
    expect(store.elementos.find((e) => e.id === 'h_1')).toBeUndefined()
    expect(store.elementos.find((e) => e.id === 'h_2')).toBeUndefined()
  })

  it('(c) undo restaura estado previo', () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_2', tipo: 'elementos' })
    store.seleccionarElemento('el_2')

    history.initializeHistory('pre')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ok = deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    expect(store.elementos.find((e) => e.id === 'el_2')).toBeUndefined()

    const undone = history.undo()
    expect(undone).toBe(true)
    expect(store.elementos.find((e) => e.id === 'el_2')).toBeTruthy()
    confirmSpy.mockRestore()
  })

  it('(d) sin selección no hace nada', () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_3', tipo: 'elementos' })
    history.initializeHistory('pre')
    const before = store.elementos.length
    const hBefore = history.historySize.value

    const ok = deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)
    expect(store.elementos.length).toBe(before)
    expect(history.historySize.value).toBe(hBefore)
  })

  it('(e) durante drag no elimina', () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_4', tipo: 'elementos' })
    store.seleccionarElemento('el_4')
    history.initializeHistory('pre')

    window.__dvCanvasDragActive = true

    const ok = deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)
    expect(store.elementos.find((e) => e.id === 'el_4')).toBeTruthy()
  })

  it('limpia buffer si referencia al elemento eliminado', () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()
    const buffer = useCanvasBuffer()

    addElement(store, { id: 'el_buf', tipo: 'elementos' })
    store.seleccionarElemento('el_buf')
    buffer.copyToBuffer('el_buf')

    history.initializeHistory('pre')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ok = deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    confirmSpy.mockRestore()

    const any = buffer.getBufferItems().some((it) => it.originalId === 'el_buf')
    expect(any).toBe(false)
  })
})
