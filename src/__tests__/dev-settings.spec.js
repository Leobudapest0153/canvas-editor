/* eslint-env vitest, jsdom */
import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import usePlacementGuards from '@/composables/usePlacementGuards'
import { CM_TO_PX } from '@/utils/constants'

class DummyTransform {
  point(p) { return { x: p.x, y: p.y } }
  copy() { return new DummyTransform() }
  invert() { return this }
}
class DummyParent {
  getAbsoluteTransform() { return new DummyTransform() }
}
class DummyNode {
  constructor({ x = 0, y = 0, width = 0, height = 0 } = {}) {
    this._pos = { x, y }
    this.width = width
    this.height = height
    this._dbf = (p) => p
    this._events = {}
    this._parent = new DummyParent()
  }
  getParent() { return this._parent }
  dragBoundFunc(f) { if (typeof f === 'function') this._dbf = f; return this._dbf }
  absolutePosition(p) { if (p) this._pos = { x: p.x, y: p.y }; return { ...this._pos } }
  getAbsolutePosition() { return { ...this._pos } }
  on(evt, handler) { this._events[evt] = handler }
  off(evt) { delete this._events[evt] }
}

describe('dev settings', () => {
  it('persists useDragBoundsClamp in localStorage', async () => {
    localStorage.setItem('useDragBoundsClamp', 'true')
    setActivePinia(createPinia())
    const store = useCanvasStore()
    expect(store.useDragBoundsClamp).toBe(true)
    store.useDragBoundsClamp = false
    await nextTick()
    expect(localStorage.getItem('useDragBoundsClamp')).toBe('false')
  })

  it('installDragBounds only binds when flag true', () => {
    setActivePinia(createPinia())
    localStorage.removeItem('useDragBoundsClamp')
    const store = useCanvasStore()
    store.contextoNavegacion = { tipo: 'plantas', id: 'planta_1', path: [] }
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Suelo',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 10,
      elevacion: { zBase: 0, altura: 10 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const node = new DummyNode({ x: 0, y: 0, width: 10, height: 10 })
    const before = node.dragBoundFunc()
    guards.installDragBounds(node, 'a')
    expect(node.dragBoundFunc()).toBe(before)
    store.useDragBoundsClamp = true
    const node2 = new DummyNode({ x: 0, y: 0, width: 10, height: 10 })
    const before2 = node2.dragBoundFunc()
    guards.installDragBounds(node2, 'a')
    expect(node2.dragBoundFunc()).not.toBe(before2)
  })
})
