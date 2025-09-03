import { describe, it, expect } from 'vitest'
import { pointInPolygon, clampRectToPolygon } from '@/inventory-smart/utils/polygonBounds'
import { polygonInset } from '@/inventory-smart/utils/polygonInset'

describe('polygonBounds utils', () => {
  it('pointInPolygon works with convex and concave polygons', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ]
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
    expect(pointInPolygon({ x: -1, y: 5 }, square)).toBe(false)

    const concave = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 5, y: 5 },
      { x: 0, y: 10 }
    ]
    expect(pointInPolygon({ x: 6, y: 6 }, concave)).toBe(true)
    expect(pointInPolygon({ x: 4, y: 8 }, concave)).toBe(false)
  })

  it('clampRectToPolygon projects rectangle to nearest edge', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ]
    const rect = { x: -20, y: 10, width: 10, height: 10 }
    const c = clampRectToPolygon(rect, poly)
    expect(c.x).toBe(0)
    expect(c.y).toBe(10)
  })

  it('polygonInset keeps dragged rect inside', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ]
    const inset = polygonInset(poly, 1)
    const rect = { x: -5, y: 50, width: 10, height: 10 }
    const c = clampRectToPolygon(rect, inset)
    const inside = pointInPolygon({ x: c.x + 5, y: c.y + 5 }, inset)
    expect(inside).toBe(true)
  })
})
