/* eslint-env vitest, jsdom */
import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/composables/useCanvasStore'
import usePlacementGuards from '@/composables/usePlacementGuards'
import { CM_TO_PX } from '@/utils/constants'

class DummyTransform {
  point(p) {
    return { x: p.x, y: p.y }
  }
  copy() {
    return new DummyTransform()
  }
  invert() {
    return this
  }
}
class DummyParent {
  getAbsoluteTransform() {
    return new DummyTransform()
  }
}
class DummyNode {
  constructor({ x = 0, y = 0, width = 0, height = 0 } = {}) {
    this._pos = { x, y }
    this.width = width
    this.height = height
    this._dbf = (p) => p
    this._parent = new DummyParent()
    this._events = {}
  }
  getParent() {
    return this._parent
  }
  dragBoundFunc(f) {
    if (typeof f === 'function') this._dbf = f
    return this._dbf
  }
  absolutePosition(p) {
    if (p) this._pos = { x: p.x, y: p.y }
    return { ...this._pos }
  }
  getAbsolutePosition() {
    return { ...this._pos }
  }
  on(evt, handler) {
    this._events[evt] = handler
  }
  off(evt) {
    delete this._events[evt]
  }
}

describe('dev settings', () => {
  it('loads flag from localStorage and persists changes', () => {
    localStorage.setItem('useDragBoundsClamp', 'true')
    setActivePinia(createPinia())
    const store = useCanvasStore()
    expect(store.useDragBoundsClamp).toBe(true)
    store.useDragBoundsClamp = false
    expect(localStorage.getItem('useDragBoundsClamp')).toBe('false')
  })

  it('installDragBounds activates only when flag true', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({ id: 'el', plantaId: 'planta_1', x: 0, y: 0, width: 10, height: 10 })
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const node = new DummyNode({ x: 0, y: 0, width: 10, height: 10 })
    const orig = node.dragBoundFunc()
    guards.installDragBounds(node, 'el')
    expect(node.dragBoundFunc()).toBe(orig)
    store.useDragBoundsClamp = true
    const node2 = new DummyNode({ x: 0, y: 0, width: 10, height: 10 })
    const orig2 = node2.dragBoundFunc()
    guards.installDragBounds(node2, 'el')
    expect(node2.dragBoundFunc()).not.toBe(orig2)
  })
})
