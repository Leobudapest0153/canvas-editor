import { describe, it, expect } from 'vitest'
import { validateWallPlacement } from '@/utils/placementValidity'

const ALTURA_BODEGA = 300

describe('validateWallPlacement', () => {
  it('requiere zBase mayor a 0', () => {
    const res = validateWallPlacement({ zBase: 0, alto: 50, alturaBodega: ALTURA_BODEGA })
    expect(res.valido).toBe(false)
  })

  it('detecta exceder altura de bodega', () => {
    const res = validateWallPlacement({ zBase: 250, alto: 100, alturaBodega: ALTURA_BODEGA })
    expect(res.valido).toBe(false)
  })

  it('permite cuando zBase + alto es igual a alturaBodega', () => {
    const res = validateWallPlacement({ zBase: 200, alto: 100, alturaBodega: ALTURA_BODEGA })
    expect(res.valido).toBe(true)
  })
})
