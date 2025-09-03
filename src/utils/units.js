export const cmToPx = (valueCm, cmPerPx) => {
  return valueCm / cmPerPx
}

export const pxToCm = (valuePx, cmPerPx) => {
  return valuePx * cmPerPx
}

export const fmtCm = (valueCm, { decimals = 1 } = {}) => {
  const factor = Math.pow(10, decimals)
  const rounded = Math.round(valueCm * factor) / factor
  return `${rounded.toFixed(decimals)} cm`
}

export default { cmToPx, pxToCm, fmtCm }
