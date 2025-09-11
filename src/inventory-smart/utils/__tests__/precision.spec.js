import { describe, it, expect } from 'vitest'
import {
  correctPrecision,
  correctCoordinates,
  correctDimensions,
  correctTransformValues,
  calculatePrecisionDifferences,
  PRECISION_PIXELS
} from '../precision.js'

describe('precision utilities', () => {
  describe('correctPrecision', () => {
    it('should correct floating point precision errors', () => {
      const impreciseValue = 100.00000000001
      const corrected = correctPrecision(impreciseValue)
      expect(corrected).toBe(100)
    })

    it('should handle edge cases gracefully', () => {
      expect(correctPrecision(NaN)).toBeNaN()
      expect(correctPrecision(Infinity)).toBe(Infinity)
      expect(correctPrecision(-Infinity)).toBe(-Infinity)
      expect(correctPrecision('not a number')).toBe('not a number')
    })

    it('should preserve exact values', () => {
      expect(correctPrecision(100)).toBe(100)
      expect(correctPrecision(0)).toBe(0)
      expect(correctPrecision(-50.5)).toBe(-50.5)
    })
  })

  describe('correctCoordinates', () => {
    it('should correct both x and y coordinates', () => {
      const result = correctCoordinates(100.00000000001, 200.00000000002)
      expect(result).toEqual({ x: 100, y: 200 })
    })
  })

  describe('correctDimensions', () => {
    it('should correct both width and height', () => {
      const result = correctDimensions(150.00000000001, 250.00000000002)
      expect(result).toEqual({ width: 150, height: 250 })
    })
  })

  describe('correctTransformValues', () => {
    it('should correct all transform properties', () => {
      const transform = {
        x: 100.00000000001,
        y: 200.00000000002,
        width: 150.00000000001,
        height: 250.00000000002,
        rotation: 45.00000000001
      }

      const result = correctTransformValues(transform)

      expect(result).toEqual({
        x: 100,
        y: 200,
        width: 150,
        height: 250,
        rotation: 45
      })
    })

    it('should preserve non-transform properties', () => {
      const transform = {
        x: 100.00000000001,
        y: 200.00000000002,
        id: 'test-element',
        type: 'rectangle',
        otherProp: 'value'
      }

      const result = correctTransformValues(transform)

      expect(result).toEqual({
        x: 100,
        y: 200,
        id: 'test-element',
        type: 'rectangle',
        otherProp: 'value'
      })
    })

    it('should handle missing transform properties', () => {
      const transform = { x: 100.00000000001 }
      const result = correctTransformValues(transform)
      expect(result).toEqual({ x: 100 })
    })
  })

  describe('calculatePrecisionDifferences', () => {
    it('should calculate differences correctly', () => {
      const original = {
        x: 100.00000000001,
        y: 200.00000000002,
        width: 150.00000000001,
        height: 250.00000000002
      }

      const corrected = {
        x: 100,
        y: 200,
        width: 150,
        height: 250
      }

      const differences = calculatePrecisionDifferences(original, corrected)

      expect(differences.deltaX).toBeCloseTo(0.00000000001)
      expect(differences.deltaY).toBeCloseTo(0.00000000002)
      expect(differences.deltaWidth).toBeCloseTo(0.00000000001)
      expect(differences.deltaHeight).toBeCloseTo(0.00000000002)
    })

    it('should handle missing properties', () => {
      const original = { x: 100.1 }
      const corrected = { y: 200.2 }
      const differences = calculatePrecisionDifferences(original, corrected)
      expect(Object.keys(differences)).toHaveLength(0)
    })
  })

  describe('PRECISION_PIXELS constant', () => {
    it('should be exported and have expected value', () => {
      expect(PRECISION_PIXELS).toBe(1000000)
    })
  })
})
