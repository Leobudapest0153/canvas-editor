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

// Formatea un valor en centímetros a texto compacto según magnitud.
// Ejemplos: 129 -> '1.29m', 12 -> '12cm', -5 -> '-5cm', 0 -> '0cm'
export const formatLengthCm = (valueCm, { meterDecimals = 2 } = {}) => {
  if (!Number.isFinite(valueCm)) return ''
  const sign = valueCm < 0 ? '-' : ''
  const abs = Math.abs(valueCm)
  if (abs >= 100) {
    const meters = abs / 100
    const factor = Math.pow(10, meterDecimals)
    const rounded = Math.round(meters * factor) / factor
    return `${sign}${rounded.toFixed(meterDecimals)}m`
  }
  const cmInt = Math.round(abs)
  return `${sign}${cmInt}cm`
}

// Formatear varios valores a texto compacto, separados por '×' y con unidad al final.
// Ejemplos: (120, 80, 45) -> '120×80×45cm', (250, 100) -> '250×100cm', (200, 100) -> '2×1m'
export const formatLengthsCm = (valuesCm, options = {}) => {
  if (!Array.isArray(valuesCm) || valuesCm.length === 0) return ''

  const { meterDecimals = 2 } = options

  // Usar metros solo si TODOS los valores son finitos y >= 100cm
  const useMeters = valuesCm.every((v) => Number.isFinite(v) && Math.abs(v) >= 100)

  if (useMeters) {
    // Si todos los valores en metros son enteros exactos, mostrar sin decimales
    const allIntegerMeters = valuesCm.every((v) => Number.isFinite(v) && Number.isInteger(v / 100))

    if (allIntegerMeters) {
      const formattedIntM = valuesCm.map((v) => (Number.isFinite(v) ? (v / 100).toString() : ''))
      return `${formattedIntM.join('×')}m`
    }

    const factor = Math.pow(10, meterDecimals)
    const formattedM = valuesCm.map((v) => {
      if (!Number.isFinite(v)) return ''
      const meters = v / 100
      const rounded = Math.round(meters * factor) / factor
      return rounded.toFixed(meterDecimals)
    })
    return `${formattedM.join('×')}m`
  }

  // Caso todos en centímetros: redondeo a entero como formatLengthCm
  const formattedCm = valuesCm.map((v) => {
    if (!Number.isFinite(v)) return ''
    const sign = v < 0 ? '-' : ''
    const abs = Math.abs(v)
    const cmInt = Math.round(abs)
    return `${sign}${cmInt}`
  })
  return `${formattedCm.join('×')}cm`
}

export default { cmToPx, pxToCm, fmtCm, formatLengthCm, formatLengthsCm }
