import { describe, it, expect } from 'vitest'
import { resolvePasilloAssignment } from '@/inventory-smart/utils/pasilloAssignment.js'

describe('resolvePasilloAssignment', () => {
  it('prefiere el pasillo con mayor solape proyectado aunque otro esté más cerca', () => {
    const element = {
      id: 'el-1',
      orientacion: 0,
      x: 100,
      y: 100,
      width: 80,
      height: 80,
    }
    const pasillos = [
      { id: 'pas-far', x: 90, y: 260, width: 100, height: 60 },
      { id: 'pas-close', x: 95, y: 220, width: 90, height: 60 },
    ]
    // Aunque "pas-close" está más cerca, "pas-far" cubre más fachada, por lo que debe ganar.
    const match = resolvePasilloAssignment({ element, pasillos })
    expect(match?.id).toBe('pas-far')
  })

  it('desempata por distancia al centro', () => {
    const element = {
      id: 'el-2',
      orientacion: 0,
      x: 120,
      y: 100,
      width: 60,
      height: 60,
    }
    const pasillos = [
      { id: 'pas-centro-lejos', x: 40, y: 200, width: 60, height: 60 },
      { id: 'pas-centro-cerca', x: 140, y: 200, width: 60, height: 60 },
    ]
    const match = resolvePasilloAssignment({ element, pasillos })
    expect(match?.id).toBe('pas-centro-cerca')
  })

  it('desempata por mayor solapamiento frontal cuando la distancia es igual', () => {
    const element = {
      id: 'el-4',
      orientacion: 0,
      x: 100,
      y: 100,
      width: 80,
      height: 80,
    }
    const pasillos = [
      { id: 'pas-overlap-menor', x: 150, y: 220, width: 40, height: 60 },
      { id: 'pas-overlap-mayor', x: 90, y: 220, width: 100, height: 60 },
    ]
    const match = resolvePasilloAssignment({ element, pasillos })
    expect(match?.id).toBe('pas-overlap-mayor')
  })

  it('desempata por id cuando la distancia es idéntica', () => {
    const element = {
      id: 'el-3',
      orientacion: 0,
      x: 100,
      y: 100,
      width: 80,
      height: 80,
    }
    const pasillos = [
      { id: 'pasillo-2', x: 95, y: 220, width: 90, height: 60 },
      { id: 'pasillo-1', x: 95, y: 220, width: 90, height: 60 },
    ]
    const match = resolvePasilloAssignment({ element, pasillos })
    expect(match?.id).toBe('pasillo-1')
  })
})
