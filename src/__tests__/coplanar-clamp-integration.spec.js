import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import CanvasView from '@/components/CanvasView.vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { usePlacementGuards } from '@/composables/usePlacementGuards'
import * as orchestrator from '@/validation/placementOrchestrator'
import { errorsPlacement } from '@/validation/placementOrchestrator'

function makeShape(x, y) {
  const t = {
    point: (p) => ({ x: p.x, y: p.y }),
    copy() {
      return { point: this.point, copy: this.copy, invert: this.invert }
    },
    invert() {
      return { point: this.point, copy: this.copy, invert: this.invert }
    },
  }
  return {
    _pos: { x, y },
    position(pos) {
      if (pos) this._pos = { ...pos }
      return { ...this._pos }
    },
    getAbsolutePosition() {
      return { ...this._pos }
    },
    dragBoundFunc(fn) {
      this._dragBound = fn
    },
    getParent() {
      return { getAbsoluteTransform: () => t }
    },
    _dragBound: (p) => p,
  }
}

describe('coplanar hard clamp', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.window = globalThis.window || {}
    window.__toasts = { show: vi.fn() }
  })

  const setup = (elements) => {
    const store = useCanvasStore()
    store.elementos = elements
    mount(CanvasView)
    const guards = usePlacementGuards()
    return { store, guards }
  }

  it('floor-floor neighbors clamp during drag and compute neighbors once', () => {
    const elements = [
      { id: 'A', plantaId: 'planta_1', tipo: 'elementos', width: 10, height: 10, x: 0, y: 0, zBase: 0, alto: 100 },
      { id: 'B', plantaId: 'planta_1', tipo: 'elementos', width: 10, height: 10, x: 20, y: 0, zBase: 0, alto: 100 },
    ]
    const { store, guards } = setup(elements)
    const moving = store.elementos[1]
    const shape = makeShape(20, 0)
    const spy = vi.spyOn(orchestrator, 'resolveCoplanarNeighbors')
    guards.onDragStartGuard(moving, shape)
    expect(spy).toHaveBeenCalledTimes(1)
    let pos = shape._dragBound({ x: 5, y: 0 })
    shape.position(pos)
    expect(shape.getAbsolutePosition().x).toBe(10)
    pos = shape._dragBound({ x: 12, y: 0 })
    shape.position(pos)
    expect(shape.getAbsolutePosition().x).toBe(12)
    expect(spy).toHaveBeenCalledTimes(1)
    const res = guards.onDragEndGuard(moving, shape.getAbsolutePosition(), { shape })
    expect(res.valid).toBe(true)
  })

  it('wall-wall neighbors clamp similarly', () => {
    const elements = [
      { id: 'A', plantaId: 'planta_1', tipo: 'elementos', width: 10, height: 10, x: 0, y: 0, zBase: 100, alto: 50, ubicacion: 'pared' },
      { id: 'B', plantaId: 'planta_1', tipo: 'elementos', width: 10, height: 10, x: 20, y: 0, zBase: 100, alto: 50, ubicacion: 'pared' },
    ]
    const { store, guards } = setup(elements)
    const moving = store.elementos[1]
    const shape = makeShape(20, 0)
    guards.onDragStartGuard(moving, shape)
    let pos = shape._dragBound({ x: 5, y: 0 })
    shape.position(pos)
    expect(shape.getAbsolutePosition().x).toBe(10)
    const res = guards.onDragEndGuard(moving, shape.getAbsolutePosition(), { shape })
    expect(res.valid).toBe(true)
  })

  it('different heights do not clamp but revert on z-stack', () => {
    const elements = [
      { id: 'A', plantaId: 'planta_1', tipo: 'elementos', width: 10, height: 10, x: 0, y: 0, zBase: 0, alto: 100 },
      { id: 'B', plantaId: 'planta_1', tipo: 'elementos', width: 10, height: 10, x: 20, y: 0, zBase: 50, alto: 100 },
    ]
    const { store, guards } = setup(elements)
    const moving = store.elementos[1]
    const shape = makeShape(20, 0)
    guards.onDragStartGuard(moving, shape)
    const pos = shape._dragBound({ x: 5, y: 0 })
    shape.position(pos)
    expect(shape.getAbsolutePosition().x).toBe(5)
    const res = guards.onDragEndGuard(moving, shape.getAbsolutePosition(), { shape })
    expect(res.valid).toBe(false)
    expect(shape.getAbsolutePosition().x).toBe(20)
    expect(window.__toasts.show).toHaveBeenCalledWith(errorsPlacement.Z_STACK_CONFLICT, { type: 'error' })
  })
})
