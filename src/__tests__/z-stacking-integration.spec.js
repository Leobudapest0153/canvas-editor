import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CanvasView from '@/components/CanvasView.vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { errorsPlacement } from '@/validation/placementOrchestrator'

describe('z stacking integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.window = globalThis.window || {}
    window.__toasts = { show: vi.fn() }
  })

  const makeSession = (initial) => ({
    session: {
      toLocal: (p) => p,
      dragBoundFuncLocal: (p) => p,
      toWorld: (p) => p,
      finalizeLocal: (p) => p,
    },
    parent: null,
    initial,
  })

  const makeShape = (pos) => ({
    _pos: pos,
    position(p) {
      if (p) this._pos = p
      return this._pos
    },
  })

  it('reverts when XY and Z overlap', () => {
    const store = useCanvasStore()
    store.elementos = [
      {
        id: 'a',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        ubicacion: 'suelo',
        zBase: 0,
        alto: 100,
      },
      {
        id: 'b',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 20,
        y: 0,
        ubicacion: 'suelo',
        zBase: 50,
        alto: 100,
      },
    ]
    const spy = vi.spyOn(store, 'saveToHistory')
    const wrapper = mount(CanvasView)

    wrapper.vm.innerSessions.set('b', makeSession({ x: 20, y: 0 }))
    const shape = makeShape({ x: 0, y: 0 })

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[1])

    expect(shape.position()).toEqual({ x: 20, y: 0 })
    expect(spy).not.toHaveBeenCalled()
    expect(window.__toasts.show).toHaveBeenCalledWith(
      errorsPlacement.Z_STACK_CONFLICT,
      { type: 'error' },
    )
  })

  it('allows exact Z touch', () => {
    const store = useCanvasStore()
    store.elementos = [
      {
        id: 'a',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        ubicacion: 'suelo',
        zBase: 0,
        alto: 100,
      },
      {
        id: 'b',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 20,
        y: 0,
        ubicacion: 'suelo',
        zBase: 100,
        alto: 100,
      },
    ]
    const wrapper = mount(CanvasView)

    wrapper.vm.innerSessions.set('b', makeSession({ x: 20, y: 0 }))
    const shape = makeShape({ x: 0, y: 0 })

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[1])

    expect(shape.position()).toEqual({ x: 0, y: 0 })
    expect(window.__toasts.show).not.toHaveBeenCalled()
  })

  it('allows when no XY overlap', () => {
    const store = useCanvasStore()
    store.elementos = [
      {
        id: 'a',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        ubicacion: 'suelo',
        zBase: 0,
        alto: 100,
      },
      {
        id: 'b',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 20,
        y: 0,
        ubicacion: 'suelo',
        zBase: 50,
        alto: 100,
      },
    ]
    const wrapper = mount(CanvasView)

    wrapper.vm.innerSessions.set('b', makeSession({ x: 20, y: 0 }))
    const shape = makeShape({ x: 40, y: 0 })

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[1])

    expect(shape.position()).toEqual({ x: 40, y: 0 })
    expect(window.__toasts.show).not.toHaveBeenCalled()
  })
})
