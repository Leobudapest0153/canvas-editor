/**
 * Formats a number to 2 decimal places
 * @param {number} value - The number to format
 * @returns {number} - The number rounded to 2 decimal places
 */
export const toTwoDecimals = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};
