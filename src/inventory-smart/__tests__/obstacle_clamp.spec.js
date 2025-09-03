import { describe, it, expect } from 'vitest'
import { resolveBlockingOverlap } from '@/inventory-smart/utils/obstacleClamp'

const areaBounds = { minX: 0, minY: 0, maxX: 200, maxY: 200 }

describe('resolveBlockingOverlap', () => {
  it('separa un solape simple (suelo–suelo) hacia el eje de menor penetración', () => {
    const movingEl = { id: 'A', x: 10, y: 10, width: 50, height: 40, ubicacion: 'suelo' }
    const neighbor = { id: 'B', x: 50, y: 10, width: 50, height: 40, ubicacion: 'suelo' }
    const candidate = { x: 30, y: 10 } // Solapa 20px en X si A está en 30..80 vs B 50..100

    const res = resolveBlockingOverlap({ candidate, movingEl, neighbors: [neighbor], areaBounds })
    // Debe empujar hacia la izquierda (eje X menor) y quedarse en y
    expect(res.y).toBe(10)
    // x final debería ser 30 - 30 = 0 (contacto exacto)
    expect(Math.round(res.x)).toBe(0)
  })

  it('no proyecta componente que empuje fuera al estar en minX; permite MTD hacia adentro', () => {
    const movingEl = { id: 'A', x: 0, y: 10, width: 50, height: 40, ubicacion: 'suelo' }
    const neighbor = { id: 'B', x: -20, y: 10, width: 30, height: 40, ubicacion: 'suelo' }
    const candidate = { x: 0, y: 10 } // pegado al borde minX

    const res = resolveBlockingOverlap({ candidate, movingEl, neighbors: [neighbor], areaBounds })
    // Debe moverse hacia +X (10px) para despegar del vecino sin salir del área
    expect(res.x).toBe(10)
    expect(res.y).toBe(10)
  })

  it('respeta strokePx reduciendo el área efectiva (stroke-safe clamp)', () => {
    const movingEl = { id: 'A', x: 180, y: 180, width: 30, height: 30, ubicacion: 'suelo' }
    const candidate = { x: 180, y: 180 }
    const res = resolveBlockingOverlap({ candidate, movingEl, neighbors: [], areaBounds, strokePx: 10 })
    // Bounds shrink por 5px en cada lado => max top-left = (maxX-5 - w, maxY-5 - h) = (165,165)
    expect(res.x).toBe(165)
    expect(res.y).toBe(165)
  })
})
