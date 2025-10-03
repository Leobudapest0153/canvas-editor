import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { pxToCm, formatLengthsCm } from '@/inventory-smart/utils/units'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'

const MIN_SCALE = 0.5
const SCALE_STEP = 0.1

function roundCm(value) {
  if (!Number.isFinite(value)) return value
  return Math.max(0, Math.round(value * 10) / 10)
}

function mapDimsFromView(element = {}, vista = 'XY', widthCm, heightCm) {
  const dims = { ...(element.dimensiones || {}) }
  if (vista === 'XY') {
    dims.ancho = roundCm(widthCm)
    dims.largo = roundCm(heightCm)
  } else if (vista === 'XZ') {
    dims.ancho = roundCm(widthCm)
    dims.alto = roundCm(heightCm)
  } else {
    dims.largo = roundCm(widthCm)
    dims.alto = roundCm(heightCm)
  }
  return dims
}

function dimsArrayForView(dims = {}, vista = 'XY') {
  if (vista === 'XY') return [dims.ancho, dims.largo]
  if (vista === 'XZ') return [dims.ancho, dims.alto]
  return [dims.largo, dims.alto]
}

function computeDimensionSuggestion({
  element,
  candidate,
  areaBounds,
  neighbors = [],
  vista = 'XY',
  cmPerPx = 1,
}) {
  if (!candidate) return null
  const { width: baseWidth, height: baseHeight } = candidate
  if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return null
  if (baseWidth <= 0 || baseHeight <= 0) return null

  let scale = 0.95
  while (scale >= MIN_SCALE) {
    const scaledWidth = baseWidth * scale
    const scaledHeight = baseHeight * scale
    if (scaledWidth < 4 || scaledHeight < 4) break

    const movingEl = {
      ...candidate,
      width: scaledWidth,
      height: scaledHeight,
    }

    const fits = isPlacementValid({
      pos: { x: candidate.x, y: candidate.y },
      movingEl,
      neighbors,
      areaBounds,
      CM_TO_PX,
      epsPx: 0.5,
    })

    if (fits) {
      const widthCm = pxToCm(scaledWidth, cmPerPx)
      const heightCm = pxToCm(scaledHeight, cmPerPx)
      const dimsCm = mapDimsFromView(element, vista, widthCm, heightCm)
      const formatted = formatLengthsCm(dimsArrayForView(dimsCm, vista))
      const reduction = Math.round((1 - scale) * 100)
      return {
        type: 'dimensions',
        summary: `Dimensiones propuestas: ${formatted}`,
        description: reduction > 0
          ? `Reduce el tamaño ${reduction}% manteniendo la proporción actual.`
          : 'Mantiene la proporción original del elemento.',
        scale,
        dimsCm,
      }
    }

    scale = Math.round((scale - SCALE_STEP) * 100) / 100
  }

  return null
}

function computeCapacitySuggestion(element = {}, weightResult = null) {
  if (!weightResult || !weightResult.limiteDePeso) return null
  const currentCapacity = Number(element.capacidadCarga)
  if (!Number.isFinite(currentCapacity) || currentCapacity <= 0) return null
  const exceso = Number(weightResult.exceso || 0)
  if (!Number.isFinite(exceso) || exceso <= 0) return null
  const suggestedCapacity = Math.max(0, currentCapacity - exceso)
  if (suggestedCapacity >= currentCapacity) return null

  const delta = suggestedCapacity - currentCapacity
  const deltaText = delta < 0 ? `Reducir ${Math.abs(Math.round(delta))}kg para respetar el límite disponible.` : ''

  return {
    type: 'capacity',
    summary: `Nueva capacidad máxima: ${Math.round(suggestedCapacity)}kg`,
    description: deltaText,
    capacityKg: Math.round(suggestedCapacity * 100) / 100,
  }
}

export function generatePlacementSuggestions({
  reason,
  element,
  candidate,
  areaBounds,
  neighbors,
  vista,
  cmPerPx,
  weightResult,
}) {
  const suggestions = []
  if ((reason === 'bounds' || reason === 'collision') && candidate && areaBounds) {
    const dimension = computeDimensionSuggestion({
      element,
      candidate,
      areaBounds,
      neighbors,
      vista,
      cmPerPx,
    })
    if (dimension) suggestions.push(dimension)
  }

  if (reason === 'weight' && weightResult) {
    const capacity = computeCapacitySuggestion(element, weightResult)
    if (capacity) suggestions.push(capacity)
  }

  return suggestions
}

export function applyPlacementAdjustments(element, suggestions = []) {
  if (!element) return element
  const draft = {
    ...element,
    dimensiones: { ...(element.dimensiones || {}) },
    uso: element.uso ? { ...element.uso } : element.uso,
  }

  for (const suggestion of suggestions) {
    if (suggestion?.type === 'dimensions' && suggestion.dimsCm) {
      draft.dimensiones = { ...draft.dimensiones }
      for (const [key, value] of Object.entries(suggestion.dimsCm)) {
        if (Number.isFinite(value)) draft.dimensiones[key] = value
      }
    }

    if (suggestion?.type === 'capacity' && Number.isFinite(suggestion.capacityKg)) {
      draft.capacidadCarga = suggestion.capacityKg
      if (draft.uso && Number.isFinite(draft.uso.peso)) {
        draft.uso.peso = Math.min(draft.uso.peso, suggestion.capacityKg)
      }
    }
  }

  return draft
}

export default {
  generatePlacementSuggestions,
  applyPlacementAdjustments,
}
