import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CanvasView from '@/inventory-smart/components/CanvasView.vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { ToastSymbol } from '@/inventory-smart/plugins/toast'
import { errorsPlacement } from '@/inventory-smart/validation/placementOrchestrator'

describe('z stacking integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const toastMock = { toasts: { value: [] }, show: vi.fn(), remove: vi.fn(), clearAll: vi.fn(), maxToasts: 5 }
    config.global.provide = { ...(config.global.provide || {}), [ToastSymbol]: toastMock }
  })

  const mountWithElements = (elements) => {
    const store = useCanvasStore()
    store.elementos = elements
    return { store, wrapper: mount(CanvasView) }
  }

  it('reverts drag when XY and Z overlap', () => {
    const { store, wrapper } = mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        zBase: 0,
        alto: 100,
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 20,
        y: 0,
        zBase: 50,
        alto: 100,
      },
    ])

    wrapper.vm.innerSessions.set('B', {
      session: {
        toLocal: (p) => p,
        dragBoundFuncLocal: (p) => p,
        toWorld: (p) => p,
        finalizeLocal: (p) => p,
      },
      parent: null,
      initial: { x: 20, y: 0 },
    })

    const spy = vi.spyOn(store, 'saveToHistory')

    const shape = {
      _pos: { x: 0, y: 0 },
      position(pos) {
        if (pos) this._pos = pos
        return this._pos
      },
    }

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[1])

    expect(shape.position()).toEqual({ x: 20, y: 0 })
    expect(spy).not.toHaveBeenCalled()
  expect(config.global.provide[ToastSymbol].show).toHaveBeenCalledWith(
      errorsPlacement.Z_STACK_CONFLICT,
      { type: 'error' },
    )
  })

  it('allows drag when Z just touches', () => {
    const { store, wrapper } = mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        zBase: 0,
        alto: 100,
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 20,
        y: 0,
        zBase: 100,
        alto: 100,
      },
    ])

    wrapper.vm.innerSessions.set('B', {
      session: {
        toLocal: (p) => p,
        dragBoundFuncLocal: (p) => p,
        toWorld: (p) => p,
        finalizeLocal: (p) => p,
      },
      parent: null,
      initial: { x: 20, y: 0 },
    })

    const shape = {
      _pos: { x: 0, y: 0 },
      position(pos) {
        if (pos) this._pos = pos
        return this._pos
      },
    }

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[1])

    expect(shape.position()).toEqual({ x: 0, y: 0 })
  expect(config.global.provide[ToastSymbol].show).not.toHaveBeenCalled()
  })

  it('allows drag when XY does not overlap', () => {
    const { store, wrapper } = mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        zBase: 0,
        alto: 100,
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 20,
        y: 0,
        zBase: 50,
        alto: 100,
      },
    ])

    wrapper.vm.innerSessions.set('B', {
      session: {
        toLocal: (p) => p,
        dragBoundFuncLocal: (p) => p,
        toWorld: (p) => p,
        finalizeLocal: (p) => p,
      },
      parent: null,
      initial: { x: 20, y: 0 },
    })

    const shape = {
      _pos: { x: 40, y: 0 },
      position(pos) {
        if (pos) this._pos = pos
        return this._pos
      },
    }

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[1])

    expect(shape.position()).toEqual({ x: 40, y: 0 })
  expect(config.global.provide[ToastSymbol].show).not.toHaveBeenCalled()
  })
})
