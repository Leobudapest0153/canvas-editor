/* eslint-env vitest, jsdom */
import { describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/composables/useCanvasStore'
const showError = vi.fn()
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ showError }) }))
import usePlacementGuards from '@/composables/usePlacementGuards'
import { CM_TO_PX } from '@/utils/constants'
import { errorsPlacement } from '@/utils/errorsPlacement'

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
    this._events = {}
    this._parent = new DummyParent()
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
  fire(evt) {
    if (this._events[evt]) this._events[evt]()
  }
}

describe('placement guards integration', () => {
  it('drag de elemento Suelo no dispara ZBASE_REQUIRED', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Suelo',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('drag de elemento Pared con zBase válido no dispara error', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 10, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('elemento con alturaRespectoAlSuelo no dispara ZBASE_REQUIRED', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alturaRespectoAlSuelo: 10,
      alto: 100,
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('elemento con z_base pasa sin errores', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      z_base: 15,
      alto: 100,
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('candidate sin zBase pero con element.zBase válido pasa', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 10, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({
      ...store.elementos[0],
      elevacion: { altura: 100 },
      x: 5,
      y: 5,
      start: { x: 0, y: 0 },
    })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('falla cuando zBase <= 0', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 0, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(false)
    expect(res.code).toBe('ZBASE_REQUIRED')
    expect(spyUpdate).toHaveBeenCalledWith('a', { x: 0, y: 0 })
    expect(showError).toHaveBeenCalledWith(errorsPlacement.ZBASE_REQUIRED)
  })
  it('reviertes y no guardas cuando hay colisión vertical', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push(
      {
        id: 'a',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 0, altura: 100 },
      },
      {
        id: 'b',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 20,
        y: 0,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 50, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    showError.mockClear()
    store.elementos[1].x = 0
    const res = guards.onDragEndGuard({ ...store.elementos[1], start: { x: 20, y: 0 } })
    expect(res.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('b', { x: 20, y: 0 })
    expect(spySave).not.toHaveBeenCalled()
    expect(showError).toHaveBeenCalledWith(errorsPlacement.Z_STACKING_COLLISION)
  })

  it('reviertes y no guardas si altura excede en drag end', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 250, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 10, y: 10, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('a', { x: 0, y: 0 })
    expect(spySave).not.toHaveBeenCalled()
    expect(showError).toHaveBeenCalledWith(errorsPlacement.HEIGHT_EXCEEDS_WAREHOUSE)
  })

  it('permite drag end válido dentro de altura', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 100, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 10, y: 10, start: { x: 0, y: 0 } })
    if (res.valid) {
      store.saveToHistory('drag end')
    }
    expect(spySave).toHaveBeenCalled()
  })

  it('reviertes resize cuando altura excede', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 250, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    const res = guards.onTransformEndGuard({ ...store.elementos[0], width: 20, height: 20, start: { x: 0, y: 0, width: 10, height: 10 } })
    expect(res.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('a', { x: 0, y: 0, width: 10, height: 10 })
    expect(showError).toHaveBeenCalledWith(errorsPlacement.HEIGHT_EXCEEDS_WAREHOUSE)
  })

  it('permite resize válido dentro de altura', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 100, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const res = guards.onTransformEndGuard({ ...store.elementos[0], width: 20, height: 20, start: { x: 0, y: 0, width: 10, height: 10 } })
    expect(res.valid).toBe(true)
  })

  it('apilar estantes permite tocar pero no solapar', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push(
      {
        id: 'a',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 0, altura: 100 },
      },
      {
        id: 'b',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 20,
        y: 0,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 100, altura: 100 },
      },
      {
        id: 'c',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 40,
        y: 0,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 150, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    showError.mockClear()
    store.elementos[1].x = 0
    const resB = guards.onDragEndGuard({ ...store.elementos[1], start: { x: 20, y: 0 } })
    if (resB.valid) store.saveToHistory('drag b')
    expect(resB.valid).toBe(true)
    expect(spySave).toHaveBeenCalledTimes(1)
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    store.elementos[2].x = 0
    const resC = guards.onDragEndGuard({ ...store.elementos[2], start: { x: 40, y: 0 } })
    expect(resC.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('c', { x: 40, y: 0 })
    expect(showError).toHaveBeenCalledWith(errorsPlacement.Z_STACKING_COLLISION)
    expect(spySave).toHaveBeenCalledTimes(1)
  })

  it('tope en drag entre elementos de pared', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push(
      {
        id: 'a',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'pared',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        dimensiones: { alto: 100 },
        alturaRespectoAlSuelo: 10,
      },
      {
        id: 'b',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'pared',
        x: 20,
        y: 0,
        width: 10,
        height: 10,
        dimensiones: { alto: 100 },
        alturaRespectoAlSuelo: 10,
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    showError.mockClear()

    const moveRes = guards.onDragMoveGuard({ ...store.elementos[1], x: 8, y: 0 })
    expect(moveRes.reason).toBe('Z_STACK_CONFLICT')
    expect(moveRes.corrected.x).toBe(10)

    store.elementos[1].x = moveRes.corrected.x
    const endRes = guards.onDragEndGuard({ ...store.elementos[1], start: { x: 20, y: 0 } })
    if (endRes.valid) store.saveToHistory('drag b')
    expect(endRes.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
    expect(spySave).toHaveBeenCalledTimes(1)

    store.elementos[1].x = 8
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    const endResBad = guards.onDragEndGuard({ ...store.elementos[1], start: { x: 20, y: 0 } })
    expect(endResBad.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('b', { x: 20, y: 0 })
    expect(showError).toHaveBeenCalledWith(errorsPlacement.Z_STACKING_COLLISION)
    expect(spySave).toHaveBeenCalledTimes(1)
  })

  it('tope entre pared y suelo', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push(
      {
        id: 'floor',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Suelo',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        alto: 100,
        elevacion: { zBase: 0, altura: 100 },
      },
      {
        id: 'wall',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 40,
        y: 5,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 50, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    showError.mockClear()

    const moveRes = guards.onDragMoveGuard({ ...store.elementos[1], x: 10, y: 5 })
    expect(moveRes.reason).toBe('Z_STACK_CONFLICT')
    expect(moveRes.corrected.x).toBe(20)

    store.elementos[1].x = moveRes.corrected.x
    const endRes = guards.onDragEndGuard({ ...store.elementos[1], start: { x: 40, y: 0 } })
    if (endRes.valid) store.saveToHistory('drag wall')
    expect(endRes.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
    expect(spySave).toHaveBeenCalledTimes(1)
  })

  it('flag off: no clamp during drag', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push(
      {
        id: 'floor',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Suelo',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        alto: 100,
        elevacion: { zBase: 0, altura: 100 },
      },
      {
        id: 'wall',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 40,
        y: 5,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 50, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const node = new DummyNode({ x: 40, y: 5, width: 10, height: 10 })
    guards.installDragBounds(node, 'wall')

    const next = node.dragBoundFunc()({ x: 10, y: 5 })
    node.absolutePosition(next)
    expect(node.getAbsolutePosition().x).toBe(10)
  })

  it('flag on: clamp prevents entering neighbor', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.useDragBoundsClamp = true
    store.elementos.push(
      {
        id: 'floor',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Suelo',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        alto: 100,
        elevacion: { zBase: 0, altura: 100 },
      },
      {
        id: 'wall',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Pared',
        x: 40,
        y: 5,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 50, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const node = new DummyNode({ x: 40, y: 5, width: 10, height: 10 })
    guards.installDragBounds(node, 'wall')

    let next = node.dragBoundFunc()({ x: 10, y: 5 })
    node.absolutePosition(next)
    expect(node.getAbsolutePosition().x).toBe(20)
    next = node.dragBoundFunc()({ x: 10, y: 5 })
    node.absolutePosition(next)
    expect(node.getAbsolutePosition().x).toBe(20)
  })

  it('dragend snaps or reverts when snapping invalid', () => {
    // Snap inside safe area
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.useDragBoundsClamp = true
    store.gridSize = 50
    store.elementos.push({
      id: 'wall',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'Suelo',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      alto: 100,
      elevacion: { zBase: 0, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const node = new DummyNode({ x: 0, y: 0, width: 10, height: 10 })
    guards.installDragBounds(node, 'wall')
    let next = node.dragBoundFunc()({ x: 63, y: 0 })
    node.absolutePosition(next)
    showError.mockClear()
    const resSnap = guards.onDragEndGuard({ ...store.elementos[0], x: node.getAbsolutePosition().x, y: 0, start: { x: 0, y: 0 } })
    node.fire('dragend')
    expect(resSnap.valid).toBe(true)
    expect(store.elementos[0].x).toBe(50)
    expect(showError).not.toHaveBeenCalled()

    // Snap invalid -> revert
    setActivePinia(createPinia())
    const store2 = useCanvasStore()
    store2.useDragBoundsClamp = true
    store2.gridSize = 50
    store2.elementos.push(
      {
        id: 'wall',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Suelo',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 0, altura: 100 },
      },
      {
        id: 'neighbor',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'Suelo',
        x: 100,
        y: 0,
        width: 10,
        height: 10,
        alto: 100,
        elevacion: { zBase: 0, altura: 100 },
      },
    )
    const guards2 = usePlacementGuards({ store: store2, alturaBodega: 500, CM_TO_PX })
    const node2 = new DummyNode({ x: 0, y: 0, width: 10, height: 10 })
    guards2.installDragBounds(node2, 'wall')
    next = node2.dragBoundFunc()({ x: 96, y: 0 })
    node2.absolutePosition(next)
    showError.mockClear()
    const resRevert = guards2.onDragEndGuard({ ...store2.elementos[0], x: node2.getAbsolutePosition().x, y: 0, start: { x: 0, y: 0 } })
    node2.fire('dragend')
    expect(resRevert.valid).toBe(true)
    expect(store2.elementos[0].x).toBe(0)
    expect(showError).not.toHaveBeenCalled()
  })

  it('neighbors computed once on dragstart', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.useDragBoundsClamp = true
    store.elementos.push(
      { id: 'a', plantaId: 'planta_1', tipo: 'elementos', ubicacion: 'Suelo', x: 0, y: 0, width: 10, height: 10, alto: 100 },
      { id: 'b', plantaId: 'planta_1', tipo: 'elementos', ubicacion: 'Suelo', x: 40, y: 0, width: 10, height: 10, alto: 100 },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const node = new DummyNode({ x: 0, y: 0, width: 10, height: 10 })
    const spy = vi.spyOn(Array.prototype, 'filter')
    guards.installDragBounds(node, 'a')
    const afterInstall = spy.mock.calls.length
    node.dragBoundFunc()({ x: 5, y: 0 })
    node.dragBoundFunc()({ x: 6, y: 0 })
    expect(spy.mock.calls.length).toBe(afterInstall)
    spy.mockRestore()
  })
})
