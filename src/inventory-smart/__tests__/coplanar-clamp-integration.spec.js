import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import * as orchestrator from '@/inventory-smart/validation/placementOrchestrator'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { errorsPlacement } from '@/inventory-smart/validation/placementOrchestrator'
import { ToastSymbol } from '@/inventory-smart/plugins/toast'
import { usePlacementGuards } from '@/inventory-smart/composables/usePlacementGuards'

let CanvasView

const mountWithElements = async (elements) => {
  const store = useCanvasStore()
  store.elementos = elements
  if (!CanvasView) {
    CanvasView = (await import('@/inventory-smart/components/CanvasView.vue')).default
  }
  const wrapper = mount(CanvasView)
  return { store, wrapper }
}

const makeShapeStub = (x, y) => {
  return {
    _abs: { x, y },
    dragBoundFunc(fn) {
      if (fn) this._bound = fn
      return this._bound
    },
    getParent() {
      return { getAbsoluteTransform: () => ({ copy() { return this }, invert() { return this }, point(p) { return { ...p } } }) }
    },
    getAbsolutePosition() {
      return { ...this._abs }
    },
    setAbsolutePosition(pos) {
      this._abs = { ...pos }
    },
    position(pos) {
      if (pos) this._abs = { ...pos }
      return { ...this._abs }
    },
  }
}

describe('coplanar hard clamp', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const toastMock = { toasts: { value: [] }, show: vi.fn(), remove: vi.fn(), clearAll: vi.fn(), maxToasts: 5 }
    config.global.provide = { ...(config.global.provide || {}), [ToastSymbol]: toastMock }
    CanvasView = null
  })

  it('suelo-suelo coplanar: clamp evita solape en vivo', async () => {
    const { store, wrapper } = await mountWithElements([
      { id: 'A', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 0, y: 0, zBase: 0, alto: 100, ubicacion: 'Suelo' },
      { id: 'B', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 60, y: 0, zBase: 0, alto: 100, ubicacion: 'Suelo' },
    ])
    const shape = makeShapeStub(60, 0)
    const guards = usePlacementGuards()
    guards.onDragStartGuard(shape, store.elementos[1])
    const bound = shape.dragBoundFunc()
    const local = bound({ x: 40, y: 0 })
    shape.position(local)
    expect(shape.position().x).toBe(50)
    guards.onDragEndGuard(
      store.elementos[1],
      { x: shape.position().x, y: shape.position().y },
      { revert: () => shape.position({ x: 60, y: 0 }) },
    )
    expect(shape.position().x).toBe(50)
  expect(config.global.provide[ToastSymbol].show).not.toHaveBeenCalled()
  })

  it('pared-pared coplanar: clamp evita solape', async () => {
    const { store, wrapper } = await mountWithElements([
      { id: 'A', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 0, y: 0, zBase: 100, alto: 50, ubicacion: 'Pared' },
      { id: 'B', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 60, y: 0, zBase: 100, alto: 50, ubicacion: 'Pared' },
    ])
    const shape = makeShapeStub(60, 0)
    const guards = usePlacementGuards()
    guards.onDragStartGuard(shape, store.elementos[1])
    const bound = shape.dragBoundFunc()
    const local = bound({ x: 40, y: 0 })
    shape.position(local)
    expect(shape.position().x).toBe(50)
    guards.onDragEndGuard(
      store.elementos[1],
      { x: shape.position().x, y: shape.position().y },
      { revert: () => shape.position({ x: 60, y: 0 }) },
    )
    expect(shape.position().x).toBe(50)
  expect(config.global.provide[ToastSymbol].show).not.toHaveBeenCalled()
  })

  it('alturas diferentes: sin clamp en vivo y Z-stacking revierte', async () => {
    const { store, wrapper } = await mountWithElements([
      { id: 'A', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 0, y: 0, zBase: 0, alto: 100, ubicacion: 'Suelo' },
      { id: 'B', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 60, y: 0, zBase: 50, alto: 100, ubicacion: 'Suelo' },
    ])
    const shape = makeShapeStub(60, 0)
    const guards = usePlacementGuards()
    guards.onDragStartGuard(shape, store.elementos[1])
    const bound = shape.dragBoundFunc()
    const local = bound({ x: 40, y: 0 })
    shape.position(local)
    expect(shape.position().x).toBe(40) // no clamp
    guards.onDragEndGuard(
      store.elementos[1],
      { x: shape.position().x, y: shape.position().y },
      { revert: () => shape.position({ x: 60, y: 0 }) },
    )
    expect(shape.position().x).toBe(60)
    expect(config.global.provide[ToastSymbol].show).toHaveBeenCalledWith(
      errorsPlacement.Z_STACK_CONFLICT,
      { type: 'error' },
    )
  })

  it('calcula vecinos coplanares solo una vez', async () => {
    const spy = vi.spyOn(orchestrator, 'resolveCoplanarNeighbors')
    const { store, wrapper } = await mountWithElements([
      { id: 'A', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 0, y: 0, zBase: 0, alto: 100, ubicacion: 'Suelo' },
      { id: 'B', plantaId: 'planta_1', tipo: 'elementos', width: 50, height: 50, x: 60, y: 0, zBase: 0, alto: 100, ubicacion: 'Suelo' },
    ])
    const shape = makeShapeStub(60, 0)
    const guards = usePlacementGuards()
    guards.onDragStartGuard(shape, store.elementos[1])
    const bound = shape.dragBoundFunc()
    bound({ x: 55, y: 0 })
    bound({ x: 54, y: 0 })
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

