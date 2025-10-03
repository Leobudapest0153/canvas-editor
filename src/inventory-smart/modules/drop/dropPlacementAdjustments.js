const SCALE_STEPS = [
  0.95,
  0.9,
  0.85,
  0.8,
  0.75,
  0.7,
  0.65,
  0.6,
  0.55,
  0.5,
  0.45,
  0.4,
  0.35,
  0.3,
]

const DEFAULT_DECIMALS = 2

const roundValue = (value, decimals = DEFAULT_DECIMALS) => {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const cloneElement = (element = {}) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(element)
  }
  return JSON.parse(JSON.stringify(element))
}

export function applyElementOverrides(element = {}, overrides = {}) {
  const clone = cloneElement(element)
  if (!overrides) return clone

  if (Object.prototype.hasOwnProperty.call(overrides, 'capacidadCarga')) {
    clone.capacidadCarga = overrides.capacidadCarga
  }

  if (overrides?.uso && typeof overrides.uso === 'object') {
    clone.uso = { ...(clone.uso || {}), ...overrides.uso }
  }

  if (overrides?.dimensiones && typeof overrides.dimensiones === 'object') {
    clone.dimensiones = { ...(clone.dimensiones || {}), ...overrides.dimensiones }
  }

  if (Object.prototype.hasOwnProperty.call(overrides, 'alturaRespectoAlSuelo')) {
    clone.alturaRespectoAlSuelo = overrides.alturaRespectoAlSuelo
  }

  return clone
}

const hasFiniteDimension = (value) => Number.isFinite(value) && value > 0

const toScaledDimensions = (dims = {}, factor = 1) => {
  const { ancho, largo, alto } = dims
  const scaled = {}
  if (hasFiniteDimension(ancho)) scaled.ancho = roundValue(ancho * factor)
  if (hasFiniteDimension(largo)) scaled.largo = roundValue(largo * factor)
  if (hasFiniteDimension(alto)) scaled.alto = roundValue(alto * factor)
  return scaled
}

const determineWeightField = (element = {}) => {
  if (hasFiniteDimension(element.capacidadCarga)) return 'capacidadCarga'
  const pesoUso = element?.uso?.peso
  if (hasFiniteDimension(pesoUso)) return 'uso.peso'
  return null
}

const resolveAvailableCapacity = (details = {}, element = {}) => {
  const available = Number(details.capacidadCarga ?? details.pesoMaximo ?? 0) -
    Number(details.pesoActual ?? 0)
  if (!Number.isFinite(available) || available <= 0) return null
  const field = determineWeightField(element)
  if (!field) return null
  const current = field === 'capacidadCarga'
    ? Number(element.capacidadCarga ?? 0)
    : Number(element?.uso?.peso ?? 0)
  if (!Number.isFinite(current) || available >= current) return null
  return { available: roundValue(available), field, current }
}

export function generateDropSuggestions({ element, failure, runProbe }) {
  if (!element || !failure || typeof runProbe !== 'function') return null

  const result = {
    overrides: {},
    capacity: null,
    dimension: null,
    reason: failure.reason,
  }

  if (failure.reason === 'weight' && failure.details?.weight) {
    const capacityInfo = resolveAvailableCapacity(failure.details.weight, element)
    if (capacityInfo) {
      const overrides =
        capacityInfo.field === 'capacidadCarga'
          ? { capacidadCarga: capacityInfo.available }
          : { uso: { peso: capacityInfo.available } }
      const probe = runProbe(overrides)
      if (probe?.ok) {
        result.overrides = { ...result.overrides, ...overrides }
        result.capacity = {
          newValue: capacityInfo.available,
          field: capacityInfo.field,
          previous: capacityInfo.current,
          unit: 'kg',
        }
        return result
      }
    }
    return null
  }

  if (failure.reason === 'bounds') {
    const baseDims = failure.details?.dimsCm || element?.dimensiones
    if (baseDims && (hasFiniteDimension(baseDims.ancho) || hasFiniteDimension(baseDims.largo))) {
      for (const factor of SCALE_STEPS) {
        if (!Number.isFinite(factor) || factor >= 1) continue
        const scaled = toScaledDimensions(baseDims, factor)
        if (!Object.keys(scaled).length) continue
        const probe = runProbe({ dimensiones: scaled })
        if (probe?.ok) {
          result.overrides = { ...result.overrides, dimensiones: scaled }
          result.dimension = {
            scale: factor,
            newDims: probe.dimsCm || scaled,
            original: baseDims,
          }
          return result
        }
      }
    }
  }

  return null
}
