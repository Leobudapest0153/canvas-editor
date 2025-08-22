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

  it('(a) elimina elemento simple y empuja snapshot', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_1', tipo: 'elementos' })
    store.seleccionarElemento('el_1')

    history.initializeHistory('pre')
    const beforeSize = history.historySize.value

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    confirmSpy.mockRestore()

    expect(store.elementos.find((e) => e.id === 'el_1')).toBeUndefined()
    expect(history.historySize.value).toBe(beforeSize + 1)
  })

  it('(b) elimina contenedor con hijos tras confirmación en cascada', async () => {
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

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    confirmSpy.mockRestore()

    expect(store.elementos.find((e) => e.id === 'c_1')).toBeUndefined()
    expect(store.elementos.find((e) => e.id === 'h_1')).toBeUndefined()
    expect(store.elementos.find((e) => e.id === 'h_2')).toBeUndefined()
  })

  it('(c) undo restaura estado previo', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_2', tipo: 'elementos' })
    store.seleccionarElemento('el_2')

    history.initializeHistory('pre')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    expect(store.elementos.find((e) => e.id === 'el_2')).toBeUndefined()

    const undone = history.undo()
    expect(undone).toBe(true)
    expect(store.elementos.find((e) => e.id === 'el_2')).toBeTruthy()
    confirmSpy.mockRestore()
  })

  it('(d) sin selección no hace nada', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_3', tipo: 'elementos' })
    history.initializeHistory('pre')
    const before = store.elementos.length
    const hBefore = history.historySize.value

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)
    expect(store.elementos.length).toBe(before)
    expect(history.historySize.value).toBe(hBefore)
  })

  it('(e) durante drag no elimina', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'el_4', tipo: 'elementos' })
    store.seleccionarElemento('el_4')
    history.initializeHistory('pre')

    window.__dvCanvasDragActive = true

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)
    expect(store.elementos.find((e) => e.id === 'el_4')).toBeTruthy()
  })

  it('limpia buffer si referencia al elemento eliminado', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()
    const buffer = useCanvasBuffer()

    addElement(store, { id: 'el_buf', tipo: 'elementos' })
    store.seleccionarElemento('el_buf')
    buffer.copyToBuffer('el_buf')

    history.initializeHistory('pre')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    confirmSpy.mockRestore()

    const any = buffer.getBufferItems().some((it) => it.originalId === 'el_buf')
    expect(any).toBe(false)
  })

  it('(lock a) intento de borrar elemento bloqueado → bloquea y muestra aviso', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'lock_1', tipo: 'elementos' })
    // marcar bloqueado
    const el = store.elementos.find((e) => e.id === 'lock_1')
    el.locked = true
    store.seleccionarElemento('lock_1')
    history.initializeHistory('pre')
    const hBefore = history.historySize.value

    const toasts = { show: vi.fn() }
    // stub toasts
    global.window.__toasts = toasts

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)
    expect(toasts.show).toHaveBeenCalled()
    expect(store.elementos.find((e) => e.id === 'lock_1')).toBeTruthy()
    expect(history.historySize.value).toBe(hBefore)
  })

  it('(lock b) desbloquear y borrar → elimina y empuja snapshot', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'lock_2', tipo: 'elementos' })
    const el = store.elementos.find((e) => e.id === 'lock_2')
    el.bloqueado = true
    store.seleccionarElemento('lock_2')

    history.initializeHistory('pre')

    // Primero intenta y bloquea
    global.window.__toasts = { show: vi.fn() }
    let ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)

    // Desbloquear y eliminar
    el.bloqueado = false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const before = history.historySize.value
    ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)
    confirmSpy.mockRestore()

    expect(store.elementos.find((e) => e.id === 'lock_2')).toBeUndefined()
    expect(history.historySize.value).toBe(before + 1)
  })

  it('(lock c) contenedor con al menos un descendiente bloqueado → bloquea sin borrar', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    // contenedor con dos hijos, uno bloqueado
    addElement(store, { id: 'c_lock', tipo: 'contenedores', hijos: ['a1', 'a2'] })
    addElement(store, { id: 'a1', tipo: 'elementos', padre: 'c_lock' })
    addElement(store, { id: 'a2', tipo: 'elementos', padre: 'c_lock' })
    // marcar a1 como bloqueado
    const a1 = store.elementos.find((e) => e.id === 'a1')
    a1.locked = true

    store.seleccionarElemento('c_lock')
    history.initializeHistory('pre')
    const hBefore = history.historySize.value

    const toasts = { show: vi.fn() }
    global.window.__toasts = toasts

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)
    expect(toasts.show).toHaveBeenCalled()

    // Ninguno debe haberse borrado
    expect(store.elementos.find((e) => e.id === 'c_lock')).toBeTruthy()
    expect(store.elementos.find((e) => e.id === 'a1')).toBeTruthy()
    expect(store.elementos.find((e) => e.id === 'a2')).toBeTruthy()

    // Historial no cambia
    expect(history.historySize.value).toBe(hBefore)
  })

  it('snackbar con Deshacer (5s) ejecuta undo al hacer clic dentro del tiempo', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    // Elemento inicial
    addElement(store, { id: 'toast_1', tipo: 'elementos' })
    store.seleccionarElemento('toast_1')

    // Inicializa historial y asegura snapshot base
    history.initializeHistory('pre')

    // Stub de toasts para capturar opciones
    const showSpy = vi.fn()
    global.window.__toasts = { show: showSpy }

    // Confirmación positiva
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    // Ejecuta eliminación
    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)

    // Debe haberse llamado show con mensaje y timeout 5000 y CTA
    expect(showSpy).toHaveBeenCalledTimes(1)
    const [msg, opts] = showSpy.mock.calls[0]
    expect(msg).toContain('Elemento(s) eliminados')
    expect(opts).toBeTruthy()
    expect(opts.timeout).toBe(5000)
    expect(opts.cta).toBeTruthy()
    expect(opts.cta.label).toContain('Deshacer')

    // Elemento ya no está
    expect(store.elementos.find((e) => e.id === 'toast_1')).toBeUndefined()

    // Simular clic en CTA de deshacer
    opts.cta.onClick()

    // Debe restaurarse el elemento tras undo
    expect(store.elementos.find((e) => e.id === 'toast_1')).toBeTruthy()

    confirmSpy.mockRestore()
  })
})
