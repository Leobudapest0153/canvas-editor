import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useCanvasHistory } from '@/inventory-smart/composables/useCanvasHistory'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement'
import { useCanvasBuffer } from '@/inventory-smart/composables/useCanvasBuffer'

const add = (store, el) => store.elementos.push(el)

const makeElement = (id, extra = {}) => ({
  id,
  nombre: id,
  tipo: extra.tipo || 'elementos',
  x: 0, y: 0, width: 10, height: 10,
  plantaId: 'planta_1',
  padre: extra.padre || null,
  hijos: extra.hijos || [],
  visible: true,
  ...extra,
})

describe('deleteCascade optimizada', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    if (typeof window !== 'undefined') {
      window.__dvCanvasDragActive = false
      delete window.__konvaLayer
      delete window.__konvaStage
      delete window.__suspendPaint
    }
  })

  it('(a) snapshot único y batchDraw único', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    // árbol simple: root -> a,b ; a -> a1
    add(store, makeElement('root', { hijos: ['a', 'b'] }))
    add(store, makeElement('a', { padre: 'root', hijos: ['a1'] }))
    add(store, makeElement('b', { padre: 'root' }))
    add(store, makeElement('a1', { padre: 'a' }))

    // batchDraw mock
    const batchDraw = vi.fn()
    window.__konvaLayer = { batchDraw }

    // Espiar snapshot pushes
    const pushSpy = vi.spyOn(history, 'pushState')

    store.seleccionarElemento('root')
    // Confirmaciones: aceptar
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)

    // Un solo snapshot con título de cascada
    expect(pushSpy).toHaveBeenCalledTimes(1)
    expect(pushSpy.mock.calls[0][0]).toContain('Eliminar en cascada')
    // Un solo repaint
    expect(batchDraw).toHaveBeenCalledTimes(1)

    confirmSpy.mockRestore()
  })

  it('(b) undo restaura todo', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    add(store, makeElement('r', { hijos: ['c1', 'c2'] }))
    add(store, makeElement('c1', { padre: 'r' }))
    add(store, makeElement('c2', { padre: 'r' }))

    history.initializeHistory('pre')
    store.seleccionarElemento('r')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)

    // Eliminados
    expect(store.elementos.find(e => e.id === 'r')).toBeUndefined()
    expect(store.elementos.find(e => e.id === 'c1')).toBeUndefined()

    // Undo
    history.undo()
    expect(store.elementos.find(e => e.id === 'r')).toBeTruthy()
    expect(store.elementos.find(e => e.id === 'c1')).toBeTruthy()

    confirmSpy.mockRestore()
  })

  it('(c) rendimiento ~O(n) con N grande', () => {
    const store = useCanvasStore()
    const { deleteCascade } = useDeleteElement()

    // Crear cadena lineal de N nodos (peor caso)
    const N = 1500
    for (let i = 0; i < N; i++) {
      const id = `n${i}`
      const padre = i === 0 ? null : `n${i - 1}`
      const hijos = i < N - 1 ? [`n${i + 1}`] : []
      add(store, makeElement(id, { padre, hijos }))
    }

    const start = Date.now()
    const ok = deleteCascade(['n0'])
    const dur = Date.now() - start

    expect(ok).toBe(true)
    // Expecteable bajo 300ms en entorno de test; ajustable si necesario
    expect(dur).toBeLessThan(300)
    // Se vació el store
    expect(store.elementos.length).toBe(0)
  })

  it('(d) limpia buffer por id al borrar en cascada', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()
    const buffer = useCanvasBuffer()

    add(store, makeElement('p', { hijos: ['h1', 'h2'] }))
    add(store, makeElement('h1', { padre: 'p' }))
    add(store, makeElement('h2', { padre: 'p' }))

    // Copiar hijos al buffer
    buffer.copyToBuffer('h1')
    buffer.copyToBuffer('h2')

    history.initializeHistory('pre')
    store.seleccionarElemento('p')

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(true)

    // Buffer no debe contener referencias a h1/h2
    const ids = buffer.getBufferItems().map(it => it.originalId)
    expect(ids.includes('h1')).toBe(false)
    expect(ids.includes('h2')).toBe(false)

    confirmSpy.mockRestore()
  })

  it('(e) locked en cualquier descendiente bloquea eliminación', async () => {
    const store = useCanvasStore()
    const history = useCanvasHistory()
    const { deleteSelected } = useDeleteElement()

    add(store, makeElement('P', { hijos: ['Q'] }))
    add(store, makeElement('Q', { padre: 'P', locked: true }))

    history.initializeHistory('pre')
    const pushSpy = vi.spyOn(history, 'pushState')

    store.seleccionarElemento('P')
    // Aunque confirm acepte, debe bloquearse por locked
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const ok = await deleteSelected({ withConfirm: true })
    expect(ok).toBe(false)
    expect(pushSpy).not.toHaveBeenCalled()
    // Elementos siguen
    expect(store.elementos.find(e => e.id === 'P')).toBeTruthy()
    expect(store.elementos.find(e => e.id === 'Q')).toBeTruthy()

    confirmSpy.mockRestore()
  })
})

