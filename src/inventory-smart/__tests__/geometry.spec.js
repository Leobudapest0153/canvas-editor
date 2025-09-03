import { describe, it, expect } from 'vitest'
import {
  clampInsideRect,
  rectWithinRect,
  boundedRectDrag,
  isBBoxInsidePolygon,
  safeSnapRect,
} from '@/inventory-smart/utils/geometry'

describe('geometry helpers', () => {
  it('clampInsideRect mantiene el rectángulo dentro del contenedor', () => {
    const W = 200, H = 100
    const w = 50, h = 40
    // Caso dentro
    let pos = clampInsideRect(20, 30, w, h, W, H)
    expect(rectWithinRect(pos.x, pos.y, w, h, W, H)).toBe(true)
    // Caso fuera a la izquierda/arriba
    pos = clampInsideRect(-10, -20, w, h, W, H)
    expect(pos).toEqual({ x: 0, y: 0 })
    // Caso fuera a la derecha/abajo
    pos = clampInsideRect(300, 200, w, h, W, H)
    expect(pos).toEqual({ x: W - w, y: H - h })
  })

  it('boundedRectDrag clampa y hace snap al borde cuando está cerca (rect)', () => {
    const boundary = { type: 'rect', W: 300, H: 200 }
    const w = 60, h = 40
    // Candidato cerca del borde izquierdo (< 4px)
    let res = boundedRectDrag(2, 50, w, h, boundary, 4)
    expect(res.inside).toBe(true)
    expect(res.snapped).toBe(true)
    expect(res.x).toBe(0)
    // Candidato fuera a la derecha: debe quedar clamped
    res = boundedRectDrag(260, 160, w, h, boundary, 4)
    expect(res.inside).toBe(true)
    expect(res.x).toBe(300 - 60)
    expect(res.y).toBe(200 - 40)
  })

  it('isBBoxInsidePolygon detecta dentro/fuera para AABB en polígono', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 150 },
      { x: 0, y: 150 },
    ]
    expect(isBBoxInsidePolygon(10, 10, 50, 40, poly)).toBe(true)
    expect(isBBoxInsidePolygon(-5, 10, 50, 40, poly)).toBe(false)
    expect(isBBoxInsidePolygon(180, 120, 30, 40, poly)).toBe(false) // se sale
  })

  it('safeSnapRect preserva el “tope” entre elementos y no introduce margen con el snap', () => {
    const boundary = { W: 400, H: 300 }
    const w = 100, h = 60
    // Vecino A fijo en x=0..100
    const A = { id: 'A', x: 0, y: 40, width: 100, height: 60 }
    // B está exactamente “topado” a la derecha de A (x=100) y y=40 (no cerca de grilla 50)
    const Bx = 100
    const By = 40

    const snapped = safeSnapRect(Bx, By, w, h, boundary, [A], 50)
    // Debe mantener x=100 (contacto) y no forzar snap en Y por no estar cerca de la grilla
    expect(snapped.x).toBe(100)
    expect(snapped.y).toBe(By)
  })
})
