import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { usePlacementGuards } from '@/composables/usePlacementGuards'

let CanvasView

const mountWithElements = async (elements) => {
  const store = useCanvasStore()
  store.elementos = elements
  if (!CanvasView) {
    CanvasView = (await import('@/components/CanvasView.vue')).default
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
      return {
        getAbsoluteTransform: () => ({
          copy() {
            return this
          },
          invert() {
            return this
          },
          point(p) {
            return { ...p }
          },
        }),
      }
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
    globalThis.window = globalThis.window || {}
    window.__toasts = { show: vi.fn() }
    CanvasView = null
  })

  it('suelo-suelo: el nodo nunca entra en el vecino durante drag', async () => {
    const { store } = await mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'rack',
        width: 50,
        height: 50,
        x: 0,
        y: 0,
        zBase: 0,
        alto: 100,
        ubicacion: 'Suelo',
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'rack',
        width: 50,
        height: 50,
        x: 60,
        y: 0,
        zBase: 0,
        alto: 100,
        ubicacion: 'Suelo',
      },
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
    expect(window.__toasts.show).not.toHaveBeenCalled()
  })

  it('pared-pared coplanar: clamp evita solape', async () => {
    const { store } = await mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'wall',
        width: 50,
        height: 50,
        x: 0,
        y: 0,
        zBase: 100,
        alto: 50,
        ubicacion: 'Pared',
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'wall',
        width: 50,
        height: 50,
        x: 60,
        y: 0,
        zBase: 100,
        alto: 50,
        ubicacion: 'Pared',
      },
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
    expect(window.__toasts.show).not.toHaveBeenCalled()
  })

  it('distinto tipo o distinta altura: no bloquea, permite solape en XY', async () => {
    const guards = usePlacementGuards()

    // distinto tipo
    let { store } = await mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'rack',
        width: 50,
        height: 50,
        x: 0,
        y: 0,
        zBase: 0,
        alto: 0,
        ubicacion: 'Suelo',
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'forklift',
        width: 50,
        height: 50,
        x: 60,
        y: 0,
        zBase: 0,
        alto: 0,
        ubicacion: 'Suelo',
      },
    ])
    let shape = makeShapeStub(60, 0)
    guards.onDragStartGuard(shape, store.elementos[1])
    let bound = shape.dragBoundFunc()
    let local = bound({ x: 40, y: 0 })
    shape.position(local)
    expect(shape.position().x).toBe(40)
    guards.onDragEndGuard(
      store.elementos[1],
      { x: shape.position().x, y: shape.position().y },
      { revert: () => shape.position({ x: 60, y: 0 }) },
    )
    expect(shape.position().x).toBe(40)
    expect(window.__toasts.show).not.toHaveBeenCalled()

    // distinta altura
    window.__toasts.show.mockClear()
    ;({ store } = await mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'rack',
        width: 50,
        height: 50,
        x: 0,
        y: 0,
        zBase: 0,
        alto: 100,
        ubicacion: 'Suelo',
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'rack',
        width: 50,
        height: 50,
        x: 60,
        y: 0,
        zBase: 150,
        alto: 100,
        ubicacion: 'Suelo',
      },
    ]))
    shape = makeShapeStub(60, 0)
    guards.onDragStartGuard(shape, store.elementos[1])
    bound = shape.dragBoundFunc()
    local = bound({ x: 40, y: 0 })
    shape.position(local)
    expect(shape.position().x).toBe(40)
    guards.onDragEndGuard(
      store.elementos[1],
      { x: shape.position().x, y: shape.position().y },
      { revert: () => shape.position({ x: 60, y: 0 }) },
    )
    expect(shape.position().x).toBe(40)
    expect(window.__toasts.show).not.toHaveBeenCalled()
  })

  it('tope exacto se permite sin gap', async () => {
    const { store } = await mountWithElements([
      {
        id: 'A',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'rack',
        width: 50,
        height: 50,
        x: 0,
        y: 0,
        zBase: 0,
        alto: 100,
        ubicacion: 'Suelo',
      },
      {
        id: 'B',
        plantaId: 'planta_1',
        tipo: 'elementos',
        typeId: 'rack',
        width: 50,
        height: 50,
        x: 60,
        y: 0,
        zBase: 0,
        alto: 100,
        ubicacion: 'Suelo',
      },
    ])
    const shape = makeShapeStub(60, 0)
    const guards = usePlacementGuards()
    guards.onDragStartGuard(shape, store.elementos[1])
    const bound = shape.dragBoundFunc()
    const local = bound({ x: 50, y: 0 })
    shape.position(local)
    expect(shape.position().x).toBe(50)
    guards.onDragEndGuard(
      store.elementos[1],
      { x: shape.position().x, y: shape.position().y },
      { revert: () => shape.position({ x: 60, y: 0 }) },
    )
    expect(shape.position().x).toBe(50)
    expect(window.__toasts.show).not.toHaveBeenCalled()
  })
})

