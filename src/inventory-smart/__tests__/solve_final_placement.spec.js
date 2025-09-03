import { describe, it, expect } from 'vitest'
import { resolveFinalByIntervals } from '@/inventory-smart/utils/finalIntervals'

const area = { minX: 0, minY: 0, maxX: 200, maxY: 100 }

const makeEl = (id, x, y, w, h) => ({ id, x, y, width: w, height: h, ubicacion: 'suelo' })

describe('resolveFinalByIntervals - finalize sin solapes ni desbordes', () => {
  it('(1) sin corredor entre borde y vecino (gap < anchoB) => vuelve a lastValidPos', () => {
    // vecino A pegado al borde izquierdo creando pasillo insuficiente (< ancho B)
    const A = makeEl('A', 60, 0, 60, 100) // ocupa de x=60..120, full alto
    const B = makeEl('B', 0, 30, 80, 40) // ancho 80 no cabe en gap [0..60]
    // candidato intentando entrar en el pasillo
    const candidate = { x: 10, y: 30 }
    const lastValidPos = { x: 20, y: 10 }
    const lastVelocity = { x: 15, y: 0 } // predom x

    const res = resolveFinalByIntervals({
      candidate,
      movingEl: { ...B },
      neighbors: [A],
      areaBounds: area,
      grid: 10,
      CM_TO_PX: 1,
      lastValidPos,
      lastVelocity,
      strokePx: 0,
      marginPx: 0,
    })

    expect(res.x).toBe(lastValidPos.x)
    expect(res.y).toBe(lastValidPos.y)
  })

  it('(2) con corredor suficiente => queda entre borde y A sin solape', () => {
    const A = makeEl('A', 140, 0, 60, 100) // deja pasillo 0..140
    const B = makeEl('B', 0, 30, 80, 40)
    // candidato cerca del A, solapando inicialmente
    const candidate = { x: 90, y: 30 } // 90..170 solapa con A (140..200)

    const res = resolveFinalByIntervals({
      candidate,
      movingEl: { ...B },
      neighbors: [A],
      areaBounds: area,
      grid: 10,
      CM_TO_PX: 1,
      lastValidPos: { x: 0, y: 0 },
      lastVelocity: { x: 10, y: 0 },
      strokePx: 0,
      marginPx: 0,
    })

    // Debe colocarse justo pegado al A por la izquierda: x = A.x - B.width = 140 - 80 = 60
    expect(res.x).toBe(60)
    expect(res.y).toBe(30)
  })

  it('(3) tras snap-to-grid no reaparece solape', () => {
    // Construir caso donde el snap podría empujar hacia el vecino si no se revalida
    const A = makeEl('A', 100, 0, 60, 100)
    const B = makeEl('B', 0, 30, 40, 40)
    // candidato cercano para que el snap hacia 80 cause potencial solape si no se revalida
    const candidate = { x: 65, y: 30 }

    const res = resolveFinalByIntervals({
      candidate,
      movingEl: { ...B },
      neighbors: [A],
      areaBounds: area,
      grid: 20, // snap a 60, 80, 100...
      CM_TO_PX: 1,
      lastValidPos: { x: 20, y: 30 },
      lastVelocity: { x: 10, y: 0 },
      strokePx: 0,
      marginPx: 0,
    })

    // Validar que no solape a A (A:100..160). Si res.x + 40 <= 100 => no solapa.
    expect(res.x + B.width).toBeLessThanOrEqual(A.x)
    // Debe terminar en 60 u 80, pero sin solape: 60 es válido (80 sería re-proyectado)
    expect([60, 80]).toContain(res.x)
  })

  it('(4) stroke>0 y coords flotantes (zoom extremos) => no hay píxeles fuera', () => {
    const A = makeEl('A', 150.2, 10.5, 30.6, 60.4)
    const B = makeEl('B', 0, 0, 25.3, 25.3)
    const candidate = { x: 180.9, y: 70.7 } // cerca del borde

    const strokePx = 6 // strokeHalf=3
    const res = resolveFinalByIntervals({
      candidate,
      movingEl: { ...B },
      neighbors: [A],
      areaBounds: area,
      grid: 10,
      CM_TO_PX: 1,
      lastValidPos: { x: 0, y: 0 },
      lastVelocity: { x: 0, y: -5 },
      strokePx,
      marginPx: 0,
    })

    const strokeHalf = strokePx / 2
    const maxXTopLeft = (area.maxX - strokeHalf) - B.width
    const maxYTopLeft = (area.maxY - strokeHalf) - B.height
    expect(res.x).toBeLessThanOrEqual(maxXTopLeft + 1e-6)
    expect(res.y).toBeLessThanOrEqual(maxYTopLeft + 1e-6)
    expect(res.x).toBeGreaterThanOrEqual(area.minX + strokeHalf - 1e-6)
    expect(res.y).toBeGreaterThanOrEqual(area.minY + strokeHalf - 1e-6)
  })
})
