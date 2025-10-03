import { toPrecisionCm } from '@/inventory-smart/utils/fixedDimensions'
import { formatLengthsCm } from '@/inventory-smart/utils/units'

const MIN_SIZE_PX = 10
const TOLERANCE_PX = 0.5
const WEIGHT_DECIMALS = 2

function rectLineOverlap(rangeStart, rangeEnd, value) {
  return value > rangeStart && value < rangeEnd
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function roundWeight(value) {
  if (!isFiniteNumber(value)) return value
  const factor = Math.pow(10, WEIGHT_DECIMALS)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function buildDimensionFields({
  vista,
  original,
  updated,
}) {
  const fields = []
  const labels = {
    ancho: 'Ancho',
    largo: vista === 'XZ' ? 'Profundidad' : 'Largo',
    alto: 'Alto',
  }
  for (const key of ['ancho', 'largo', 'alto']) {
    const from = original[key]
    const to = updated[key]
    if (!isFiniteNumber(from) || !isFiniteNumber(to)) continue
    if (Math.abs(from - to) < 1e-3) continue
    fields.push({
      key,
      label: labels[key],
      from: toPrecisionCm(from),
      to: toPrecisionCm(to),
      unit: 'cm',
    })
  }
  return fields
}

export function buildCapacitySuggestion({ element, validationResult }) {
  if (!element) return null
  const current = Number(element.capacidadCarga || 0)
  const available = Number(validationResult?.capacidadCarga ?? 0) - Number(validationResult?.pesoActual ?? 0)
  if (!isFiniteNumber(current) || !isFiniteNumber(available)) return null
  if (available <= 0) return null
  if (available + 1e-6 >= current) return null
  const minUsage = Number(element?.uso?.peso ?? 0)
  if (available < minUsage) return null

  const suggested = roundWeight(Math.max(minUsage, available))
  if (!isFiniteNumber(suggested) || suggested <= 0) return null

  return {
    id: 'capacity-adjustment',
    type: 'capacity',
    message: 'Reducir la capacidad del elemento para respetar el límite disponible.',
    summary: [
      {
        label: 'Capacidad de carga',
        from: roundWeight(current),
        to: suggested,
        unit: 'kg',
      },
    ],
    patch: {
      capacidadCarga: suggested,
      uso: element?.uso?.peso > suggested ? { peso: suggested } : undefined,
    },
  }
}

export function buildDimensionSuggestion({
  element,
  vista,
  pointer,
  areaBounds,
  neighbors,
  dimsPx,
  dimsCm,
  maintainAspect = false,
}) {
  if (!element || !pointer || !dimsPx || !dimsCm || !areaBounds) return null
  const width = Number(dimsPx.width || 0)
  const height = Number(dimsPx.height || 0)
  if (width <= 0 || height <= 0) return null

  let leftLimit = areaBounds.minX ?? 0
  let rightLimit = areaBounds.maxX ?? (leftLimit + width)
  let topLimit = areaBounds.minY ?? 0
  let bottomLimit = areaBounds.maxY ?? (topLimit + height)

  const centerX = pointer.x
  const centerY = pointer.y

  const effectiveNeighbors = Array.isArray(neighbors) ? neighbors : []
  for (const n of effectiveNeighbors) {
    const nx = Number(n?.x)
    const ny = Number(n?.y)
    const nw = Number(n?.width || 0)
    const nh = Number(n?.height || 0)
    if (!isFiniteNumber(nx) || !isFiniteNumber(ny) || !isFiniteNumber(nw) || !isFiniteNumber(nh)) continue
    const left = nx
    const right = nx + nw
    const top = ny
    const bottom = ny + nh

    if (rectLineOverlap(top - TOLERANCE_PX, bottom + TOLERANCE_PX, centerY)) {
      if (right <= centerX) {
        leftLimit = Math.max(leftLimit, right)
      } else if (left >= centerX) {
        rightLimit = Math.min(rightLimit, left)
      }
    }

    if (rectLineOverlap(left - TOLERANCE_PX, right + TOLERANCE_PX, centerX)) {
      if (bottom <= centerY) {
        topLimit = Math.max(topLimit, bottom)
      } else if (top >= centerY) {
        bottomLimit = Math.min(bottomLimit, top)
      }
    }
  }

  const availableWidth = Math.max(0, rightLimit - leftLimit)
  const availableHeight = Math.max(0, bottomLimit - topLimit)

  const widthScale = width > 0 ? Math.min(1, availableWidth / width) : 1
  const heightScale = height > 0 ? Math.min(1, availableHeight / height) : 1

  let newWidth = width
  let newHeight = height

  if (maintainAspect) {
    const aspectScale = Math.min(widthScale, heightScale)
    if (aspectScale < 1) {
      newWidth = Math.max(MIN_SIZE_PX, width * aspectScale)
      newHeight = Math.max(MIN_SIZE_PX, height * aspectScale)
    }
  } else {
    if (widthScale < 1) newWidth = Math.max(MIN_SIZE_PX, width * widthScale)
    if (heightScale < 1) newHeight = Math.max(MIN_SIZE_PX, height * heightScale)
  }

  if (Math.abs(newWidth - width) < TOLERANCE_PX && Math.abs(newHeight - height) < TOLERANCE_PX) {
    return null
  }

  const widthRatio = width > 0 ? newWidth / width : 1
  const heightRatio = height > 0 ? newHeight / height : 1

  const original = {
    ancho: Number(dimsCm.ancho),
    largo: Number(dimsCm.largo),
    alto: Number(dimsCm.alto),
  }

  const updated = { ...original }
  if (vista === 'XY') {
    if (isFiniteNumber(updated.ancho)) updated.ancho = toPrecisionCm(updated.ancho * widthRatio)
    if (isFiniteNumber(updated.largo)) updated.largo = toPrecisionCm(updated.largo * heightRatio)
  } else if (vista === 'XZ') {
    if (isFiniteNumber(updated.ancho)) updated.ancho = toPrecisionCm(updated.ancho * widthRatio)
    if (isFiniteNumber(updated.alto)) updated.alto = toPrecisionCm(updated.alto * heightRatio)
  } else {
    if (isFiniteNumber(updated.largo)) updated.largo = toPrecisionCm(updated.largo * widthRatio)
    if (isFiniteNumber(updated.alto)) updated.alto = toPrecisionCm(updated.alto * heightRatio)
  }

  const fields = buildDimensionFields({ vista, original, updated })
  if (!fields.length) return null

  const values = [updated.ancho, updated.largo, updated.alto].filter(isFiniteNumber)
  const formattedValues = values.filter((v) => isFiniteNumber(v) && v > 0)
  const formatted = formattedValues.length ? formatLengthsCm(formattedValues) : ''

  return {
    id: 'dimension-adjustment',
    type: 'dimensions',
    message: formatted
      ? `Reducir dimensiones propuestas a ${formatted} para encajar en el espacio disponible.`
      : 'Reducir dimensiones para encajar en el espacio disponible.',
    summary: fields,
    patch: {
      dimensiones: updated,
      width: newWidth,
      height: newHeight,
    },
    maintainAspect,
  }
}

export function applyPlacementSuggestions(element, suggestions = []) {
  const next = structuredClone(element)
  if (!Array.isArray(suggestions)) return next

  for (const suggestion of suggestions) {
    if (!suggestion?.patch) continue
    if (suggestion.type === 'dimensions') {
      const dimsPatch = suggestion.patch.dimensiones || {}
      next.dimensiones = {
        ...(next.dimensiones || {}),
        ...dimsPatch,
      }
      if (isFiniteNumber(suggestion.patch.width)) next.width = suggestion.patch.width
      if (isFiniteNumber(suggestion.patch.height)) next.height = suggestion.patch.height
    } else if (suggestion.type === 'capacity') {
      if (isFiniteNumber(suggestion.patch.capacidadCarga)) {
        next.capacidadCarga = suggestion.patch.capacidadCarga
      }
      if (suggestion.patch.uso && typeof suggestion.patch.uso === 'object') {
        next.uso = { ...(next.uso || {}), ...suggestion.patch.uso }
      }
    }
  }

  return next
}

export function describePlacementFailure(reason) {
  if (reason === 'weight') return 'El elemento excede la capacidad disponible.'
  if (reason === 'bounds') return 'El elemento no cabe en la posición seleccionada.'
  return 'No se pudo colocar el elemento.'
}

export default {
  buildCapacitySuggestion,
  buildDimensionSuggestion,
  applyPlacementSuggestions,
  describePlacementFailure,
}
