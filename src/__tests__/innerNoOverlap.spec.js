import { describe, it, expect, beforeEach } from 'vitest'
import { makeInnerSession } from '@/composables/useInnerNoOverlap'

const CM = 1

describe('makeInnerSession basic behaviours', () => {
  let parent
  beforeEach(() => {
    parent = {
      id: 'p',
      dimensiones: { ancho: 20, largo: 20, alto: 20 },
      posicion: { x: 0, y: 0 },
      hijos: [],
    }
    global.window = { __GRID_SIZE_PX: 1 }
  })

  it('isValidLocal prevents overlap but allows touching', () => {
    const moving = { id: 'm', dimensiones: { ancho: 5, largo: 5, alto: 5 }, posicion: { x: 5, y: 5 } }
    const sibling = { id: 's', dimensiones: { ancho: 5, largo: 5, alto: 5 }, posicion: { x: 0, y: 0 } }
    const sess = makeInnerSession({ parentEl: parent, movingEl: moving, siblings: [sibling], vista: 'XY', CM_TO_PX: CM })
    expect(sess.isValidLocal({ x: 4, y: 0 })).toBe(false)
    expect(sess.isValidLocal({ x: 5, y: 0 })).toBe(true)
    expect(sess.isValidLocal({ x: 5, y: 15 })).toBe(true)
  })

  it('finalizeLocal snaps back to lastGood when invalid', () => {
    const moving = { id: 'm', dimensiones: { ancho: 5, largo: 5, alto: 5 }, posicion: { x: 0, y: 0 } }
    const sibling = { id: 's', dimensiones: { ancho: 5, largo: 5, alto: 5 }, posicion: { x: 5, y: 0 } }
    const sess = makeInnerSession({ parentEl: parent, movingEl: moving, siblings: [sibling], vista: 'XY', CM_TO_PX: CM })
    const bad = { x: 4, y: 0 }
    const res = sess.finalizeLocal(bad)
    expect(res).toEqual(sess.lastGoodLocal)
    const good = { x: 10, y: 10 }
    const res2 = sess.finalizeLocal(good)
    expect(sess.isValidLocal(res2)).toBe(true)
  })

  it('dragBoundFuncLocal pushes against sibling without exiting bounds', () => {
    const moving = { id: 'm', dimensiones: { ancho: 5, largo: 5, alto: 5 }, posicion: { x: 0, y: 0 } }
    const sibling = { id: 's', dimensiones: { ancho: 5, largo: 5, alto: 5 }, posicion: { x: 5, y: 0 } }
    const sess = makeInnerSession({ parentEl: parent, movingEl: moving, siblings: [sibling], vista: 'XY', CM_TO_PX: CM })
    let next = sess.dragBoundFuncLocal({ x: 3, y: 0 }, { x: 5, y: 0 })
    expect(next.x).toBe(0)
    expect(next.y).toBe(0)
    next = sess.dragBoundFuncLocal({ x: -2, y: 0 }, { x: -5, y: 0 })
    expect(next.x).toBe(0)
  })
})
