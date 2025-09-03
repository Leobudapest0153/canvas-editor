import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useCanvasHistory } from '@/inventory-smart/composables/useCanvasHistory'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement'
import { useCanvasBuffer } from '@/inventory-smart/composables/useCanvasBuffer'

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
    globalThis.window = globalThis.window || {}
    globalThis.window.__toasts = toasts

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
    globalThis.window = globalThis.window || {}
    globalThis.window.__toasts = { show: vi.fn() }
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
    globalThis.window = globalThis.window || {}
    globalThis.window.__toasts = toasts

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
    globalThis.window = globalThis.window || {}
    globalThis.window.__toasts = { show: showSpy }

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

  it('referencias: cancelar limpieza → no borra ni limpia', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()
    const buffer = useCanvasBuffer()

    // Crear objetivo y un referenciador
    addElement(store, { id: 'ref_target', tipo: 'elementos' })
    addElement(store, { id: 'ref_src', tipo: 'elementos' })
    // Agregar referencias y vinculos en la fuente hacia el target
    const src = store.elementos.find(e => e.id === 'ref_src')
    src.referencias = ['ref_target']
    src.vinculos = ['ref_target']

    // Copiar target al buffer
    store.seleccionarElemento('ref_target')
    buffer.copyToBuffer('ref_target')

    history.initializeHistory('pre')
    const hBefore = history.historySize.value

    // Primera confirmación (limpieza): cancelar
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)

    // Elemento sigue, buffer sigue conteniéndolo, y referencias no fueron limpiadas
    expect(store.elementos.find(e => e.id === 'ref_target')).toBeTruthy()
    expect(buffer.getBufferItems().some(it => it.originalId === 'ref_target')).toBe(true)
    expect(src.referencias.includes('ref_target')).toBe(true)
    expect(src.vinculos.includes('ref_target')).toBe(true)
    expect(history.historySize.value).toBe(hBefore)

    confirmSpy.mockRestore()
  })

  it('referencias: limpiar y continuar → limpia y borra con snapshot', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()
    const buffer = useCanvasBuffer()

    // Crear objetivo y dos referenciadores
    addElement(store, { id: 'ref_target2', tipo: 'elementos' })
    addElement(store, { id: 'ref_srcA', tipo: 'elementos' })
    addElement(store, { id: 'ref_srcB', tipo: 'elementos' })
    const srcA = store.elementos.find(e => e.id === 'ref_srcA')
    const srcB = store.elementos.find(e => e.id === 'ref_srcB')
    srcA.referencias = ['ref_target2']
    srcB.vinculos = ['ref_target2']

    store.seleccionarElemento('ref_target2')
    buffer.copyToBuffer('ref_target2')

    history.initializeHistory('pre')
    const hBefore = history.historySize.value

    // Secuencia de confirmaciones: 1) limpiar (true), 2) borrar (true)
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)

    // Se limpian referencias y buffer; y se elimina
    expect(store.elementos.find(e => e.id === 'ref_target2')).toBeUndefined()
    expect(srcA.referencias?.includes('ref_target2')).toBeFalsy()
    expect(srcB.vinculos?.includes('ref_target2')).toBeFalsy()
    expect(buffer.getBufferItems().some(it => it.originalId === 'ref_target2')).toBe(false)
    expect(history.historySize.value).toBe(hBefore + 1)

    confirmSpy.mockRestore()
  })

  it('referencias: lista truncada en mensaje (>5) incluye contador', async () => {
    const store = useCanvasStore()
    const { deleteSelected } = useDeleteElement()

    addElement(store, { id: 'ref_target3', tipo: 'elementos' })
    // Crear 7 referenciadores que apunten al target
    for (let i = 1; i <= 7; i++) {
      addElement(store, { id: `src_${i}`, tipo: 'elementos' })
      const s = store.elementos.find(e => e.id === `src_${i}`)
      s.referencias = ['ref_target3']
    }

    store.seleccionarElemento('ref_target3')

    // Capturar mensaje de confirmación para truncado
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation((msg) => {
      // Debe mencionar … (+2 más)
      expect(msg).toMatch(/\(\+2 más\)/)
      // Cancelamos para no continuar
      return false
    })

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)

    confirmSpy.mockRestore()
  })
})
