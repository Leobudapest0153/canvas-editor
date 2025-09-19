import { describe, it, expect } from 'vitest'
import { formatLengthCm, formatLengthsCm } from '@/inventory-smart/utils/units'

describe('units formatting', () => {
  it('formatLengthCm: <100cm stays in cm (integer)', () => {
    expect(formatLengthCm(12)).toBe('12cm')
    expect(formatLengthCm(12.4)).toBe('12cm')
    expect(formatLengthCm(12.5)).toBe('13cm')
    expect(formatLengthCm(-5.2)).toBe('-5cm')
  })

  it('formatLengthCm: >=100cm switches to meters with 2 decimals by default', () => {
    expect(formatLengthCm(100)).toBe('1.00m')
    expect(formatLengthCm(129)).toBe('1.29m')
    expect(formatLengthCm(250)).toBe('2.50m')
    expect(formatLengthCm(-345)).toBe('-3.45m')
  })

  it('formatLengthsCm: all <100cm keeps cm with integer rounding', () => {
    expect(formatLengthsCm([12, 9, 45])).toBe('12×9×45cm')
    expect(formatLengthsCm([12.5, 9.4])).toBe('13×9cm')
    expect(formatLengthsCm([-5.4, 0, 10.6])).toBe('-5×0×11cm')
  })

  it('formatLengthsCm: all >=100cm prints in meters with 2 decimals', () => {
    // Cuando todos en metros son enteros exactos, omitir decimales
    expect(formatLengthsCm([200, 100])).toBe('2×1m')
    expect(formatLengthsCm([129, 100, 345])).toBe('1.29×1.00×3.45m')
  })

  it('formatLengthsCm: mixed values uses centimeters for all', () => {
    expect(formatLengthsCm([250, 80])).toBe('250×80cm')
    expect(formatLengthsCm([90, 101, 45])).toBe('90×101×45cm')
  })

  it('formatLengthsCm: respects meterDecimals option when all are >=100cm', () => {
    expect(formatLengthsCm([250, 180], { meterDecimals: 1 })).toBe('2.5×1.8m')
    expect(formatLengthsCm([101], { meterDecimals: 3 })).toBe('1.010m')
  })

  it('formatLengthsCm: empty or invalid arrays', () => {
    expect(formatLengthsCm([])).toBe('')
    // Non-finite values are rendered as empty slots
    expect(formatLengthsCm([NaN, 100])).toBe('×100cm')
    expect(formatLengthsCm([Infinity, 90])).toBe('×90cm')
    expect(formatLengthsCm([undefined, 10])).toBe('×10cm')
  })
})
