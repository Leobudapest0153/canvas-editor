import { PRECISION_CM, DECIMAL_PLACES } from './constants'

/**
 * Formats a number to the configured decimal places for centimeters
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (defaults to DECIMAL_PLACES)
 * @returns {number} - The number rounded to the specified decimal places
 */
export const toFixedDecimals = (value, decimals = DECIMAL_PLACES) => {
  if (typeof value !== 'number' || !isFinite(value)) {
    return value
  }
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Rounds a value to the configured precision for centimeters
 * @param {number} valueCm - Value in centimeters
 * @returns {number} - Value rounded to PRECISION_CM
 */
export const toPrecisionCm = (valueCm) => {
  if (typeof valueCm !== 'number' || !isFinite(valueCm)) {
    return valueCm
  }
  return Math.round(valueCm / PRECISION_CM) * PRECISION_CM
}

/**
 * Special function for transformer operations - minimal rounding for smooth UX
 * Only removes floating point errors, preserves user precision
 * @param {number} valueCm - Value in centimeters
 * @returns {number} - Value with minimal precision correction
 */
export const toTransformerPrecision = (valueCm) => {
  if (typeof valueCm !== 'number' || !isFinite(valueCm)) {
    return valueCm
  }
  // Use configured decimal places to maintain consistency with system precision
  const factor = Math.pow(10, DECIMAL_PLACES)
  return Math.round(valueCm * factor) / factor
}
