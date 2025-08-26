import { describe, it, expect } from 'vitest'
import { pointInPolygon, clampRectToPolygon } from '@/utils/polygonBounds'

describe('polygonBounds utilities', () => {
  it('pointInPolygon works for convex and concave polygons', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false)

    const concave = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 5, y: 5 },
      { x: 0, y: 10 },
    ]
    expect(pointInPolygon({ x: 2, y: 2 }, concave)).toBe(true)
    expect(pointInPolygon({ x: 7, y: 7 }, concave)).toBe(false)
  })

  it('clampRectToPolygon snaps rectangle to polygon edge', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]
    const rect = { x: 95, y: 40, width: 20, height: 20 }
    const clamped = clampRectToPolygon(rect, poly)
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(100)
    expect(clamped.x).toBe(80)
  })
})
