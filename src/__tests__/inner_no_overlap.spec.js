import { describe, it, expect, beforeEach } from 'vitest'
import { makeInnerSession } from '@/composables/useInnerNoOverlap'

beforeEach(() => {
  if (typeof window !== 'undefined') window.__GRID_SIZE_PX = 1
})

describe('inner session utils', () => {
  const CM_TO_PX = 1
  const makeSession = () => {
    const parent = {
      dimensiones: { ancho: 10, largo: 10, alto: 5 },
      posicion: { x: 0, y: 0 }
    }
    const sibling = {
      id: 'S',
      dimensiones: { ancho: 5, largo: 5, alto: 5 },
      posicion: { x: 0, y: 0 }
    }
    const moving = {
      id: 'M',
      dimensiones: { ancho: 5, largo: 5, alto: 5 },
      posicion: { x: 5, y: 0 }
    }
    return makeInnerSession({
      parentEl: parent,
      movingEl: moving,
      siblings: [sibling, moving],
      vista: 'XY',
      CM_TO_PX
    })
  }

  it('isValidLocal detects overlap but allows touching boundaries', () => {
    const session = makeSession()
    expect(session.isValidLocal({ x: 5, y: 0 })).toBe(true)
    expect(session.isValidLocal({ x: 4.4, y: 0 })).toBe(false)
  })

  it('finalizeLocal snaps back to lastGoodLocal on invalid drop', () => {
    const session = makeSession()
    const bad = session.finalizeLocal({ x: 4, y: 0 })
    expect(bad.x).toBe(session.lastGoodLocal.x)
    const good = session.finalizeLocal({ x: 2, y: 0 })
    expect(good.x).toBe(2)
  })

  it('dragBoundFuncLocal keeps shape against sibling edge', () => {
    const session = makeSession()
    const res = session.dragBoundFuncLocal({ x: 4, y: 0 }, session.lastGoodLocal, { x: -5, y: 0 })
    expect(res.x).toBe(5)
    expect(res.y).toBe(0)
  })
})
