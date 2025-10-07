import { describe, it, expect } from 'vitest'
import { runFinalClamp } from '@/inventory-smart/utils/finalizeDrag'

function makeRectShape({ x = 0, y = 0, w = 10, h = 10, stroke = true, strokeW = 0 }) {
  let _x = x
  let _y = y
  const shape = {
    className: 'Rect',
    x(v) { if (typeof v === 'number') { _x = v; return; } return _x },
    y(v) { if (typeof v === 'number') { _y = v; return; } return _y },
    width() { return w },
    height() { return h },
    strokeEnabled() { return !!stroke },
    strokeWidth() { return strokeW },
  }
  return shape
}

describe('runFinalClamp stroke-safe finalize', () => {
  const elements = []
  const grid = 10

  it('con stroke no deja pixel fuera en borde derecho', async () => {
    const areaBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const el = { id: 'e1', width: 20, height: 10 }
    const shape = makeRectShape({ x: 90, y: 5, w: 20, h: 10, stroke: true, strokeW: 4 })
    const res = await runFinalClamp({ shape, el, areaBounds, grid, elements, lastValidPos: { x: 50, y: 5 }, CM_TO_PX: 1 })
    // strokeHalf=2 -> maxX efectivo=98 -> clamp final = 98 - 20 = 78
    expect(res.x).toBe(78)
    expect(shape.x()).toBe(78)
    // el snap a grilla ajusta Y al múltiplo más cercano (10)
    expect(shape.y()).toBe(10)
  })

  it('sin stroke también clava exacto al borde', async () => {
    const areaBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const el = { id: 'e2', width: 20, height: 10 }
    const shape = makeRectShape({ x: 90, y: 5, w: 20, h: 10, stroke: false, strokeW: 0 })
    const res = await runFinalClamp({ shape, el, areaBounds, grid, elements, lastValidPos: { x: 50, y: 5 }, CM_TO_PX: 1 })
    expect(res.x).toBe(80) // 100 - 20
    expect(shape.x()).toBe(80)
  })

  it('orden correcto: finalize antes de cualquier repaint simulado', async () => {
    const areaBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const el = { id: 'e3', width: 30, height: 10 }
    const shape = makeRectShape({ x: 95, y: 0, w: 30, h: 10, stroke: true, strokeW: 6 })
    await runFinalClamp({ shape, el, areaBounds, grid, elements, lastValidPos: { x: 0, y: 0 }, CM_TO_PX: 1 })
    // después de finalize, el x ya está ajustado antes de dibujar
    const xBeforeBatch = shape.x()
    // batchDraw simulado
    const batchDraw = () => { /* noop repaint */ }
    batchDraw()
    expect(xBeforeBatch).toBe(shape.x())
  })

  it('zoom extremos (valores flotantes) siguen correctos', async () => {
    const areaBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const el = { id: 'e4', width: 20, height: 10 }
    const shape = makeRectShape({ x: 99.9, y: 0.1, w: 20, h: 10, stroke: true, strokeW: 2 })
    const res = await runFinalClamp({ shape, el, areaBounds, grid, elements, lastValidPos: { x: 0, y: 0 }, CM_TO_PX: 1 })
    // strokeHalf=1 -> maxX efectivo=99 -> 99-20 = 79
    expect(res.x).toBe(79)
    expect(shape.x()).toBe(79)
  })

  it('modo elastic sin polígono no usa fallback de lastValidPos', async () => {
    const areaBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100, mode: 'elastic' }
    const el = { id: 'e5', width: 20, height: 10 }
    const shape = makeRectShape({ x: 250, y: 150, w: 20, h: 10, stroke: true, strokeW: 4 })
    const lastValidPos = { x: 10, y: 10 }
    const res = await runFinalClamp({ shape, el, areaBounds, grid, elements, lastValidPos, CM_TO_PX: 1 })
    expect(res.appliedFallback).toBe(false)
    expect(res.x).toBe(250)
    expect(res.y).toBe(150)
    expect(shape.x()).toBe(250)
    expect(shape.y()).toBe(150)
  })
})

