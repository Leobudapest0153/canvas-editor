import { describe, it, expect } from 'vitest'
import { resolveAutoGrowthPlacement } from '@/inventory-smart/utils/autoGrowthPlacement'

const baseElement = {
  id: 'elemento_1',
  x: 100,
  y: 100,
  width: 100,
  height: 80,
  forma: 'rectangular',
  orientacion: 90,
  ubicacion: 'suelo',
}

const areaBounds = {
  minX: 0,
  minY: 0,
  maxX: 500,
  maxY: 500,
  polygon: null,
}

describe('resolveAutoGrowthPlacement', () => {
  it('mantiene el anclaje primario cuando hay espacio suficiente', () => {
    const neighbors = [
      { id: 'n1', x: 260, y: 90, width: 40, height: 120 },
    ]

    const result = resolveAutoGrowthPlacement({
      element: baseElement,
      newWidth: 140,
      newHeight: 80,
      areaBounds,
      neighbors,
      vista: 'XY',
    })

  expect(result.applied).toBe(false)
  expect(result.x).toBeCloseTo(baseElement.x)
  })

  it('cambia hacia el lado opuesto cuando el primario no tiene espacio', () => {
    const neighbors = [
      { id: 'n1', x: 205, y: 90, width: 40, height: 120 },
    ]

    const result = resolveAutoGrowthPlacement({
      element: baseElement,
      newWidth: 160,
      newHeight: 80,
      areaBounds,
      neighbors,
      vista: 'XY',
    })

    expect(result.applied).toBe(true)
    expect(result.x).toBeCloseTo(40)
  })

  it('balancea desde el centro cuando hay espacio en ambos lados', () => {
    const element = { ...baseElement, orientacion: 0 }
    const neighbors = [
      { id: 'n1', x: 10, y: 90, width: 40, height: 120 },
      { id: 'n2', x: 360, y: 90, width: 40, height: 120 },
    ]

    const result = resolveAutoGrowthPlacement({
      element,
      newWidth: 160,
      newHeight: 80,
      areaBounds,
      neighbors,
      vista: 'XY',
    })

    expect(result.applied).toBe(true)
    expect(result.x).toBeCloseTo(70)
  })

  it('ajusta el eje vertical según preferencia', () => {
    const element = { ...baseElement, orientacion: 0 }
    const neighbors = [
      { id: 'n1', x: 80, y: 210, width: 120, height: 40 },
    ]

    const result = resolveAutoGrowthPlacement({
      element,
      newWidth: 120,
      newHeight: 160,
      areaBounds,
      neighbors,
      vista: 'XY',
    })

    expect(result.applied).toBe(true)
    expect(result.y).toBeLessThanOrEqual(40)
  })

  it('retorna sin aplicar cuando no existe espacio disponible', () => {
    const neighbors = [
      { id: 'n1', x: 200, y: 90, width: 80, height: 120 },
      { id: 'n2', x: 20, y: 90, width: 80, height: 120 },
    ]

    const result = resolveAutoGrowthPlacement({
      element: baseElement,
      newWidth: 200,
      newHeight: 120,
      areaBounds,
      neighbors,
      vista: 'XY',
    })

    expect(result.applied).toBe(false)
  })
})
