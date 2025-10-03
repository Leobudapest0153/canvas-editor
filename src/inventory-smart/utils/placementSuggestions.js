import { CM_TO_PX } from '@/inventory-smart/utils/constants'

const MIN_DIM_CM = 5
const ROUND_PRECISION = 2

function formatNumber(value) {
  if (!Number.isFinite(value)) return 0
  return Number.parseFloat(value.toFixed(ROUND_PRECISION))
}

function computeAreaScale({ widthPx, heightPx, areaBounds }) {
  if (!areaBounds) return 1
  const { minX = 0, minY = 0, maxX = Infinity, maxY = Infinity } = areaBounds
  const availableWidth = Math.max(0, maxX - minX)
  const availableHeight = Math.max(0, maxY - minY)
  let scale = 1
  if (Number.isFinite(availableWidth) && availableWidth > 0 && widthPx > availableWidth) {
    scale = Math.min(scale, (availableWidth - 1) / widthPx)
  }
  if (Number.isFinite(availableHeight) && availableHeight > 0 && heightPx > availableHeight) {
    scale = Math.min(scale, (availableHeight - 1) / heightPx)
  }
  return scale
}

function computeConflictScale({ widthPx, heightPx, conflicts }) {
  if (!Array.isArray(conflicts) || conflicts.length === 0) return 1
  let scale = 1
  for (const conflict of conflicts) {
    const ra = conflict?.ra
    const rb = conflict?.rb
    if (!ra || !rb) continue
    const overlapX = Math.max(0, Math.min(ra.x + ra.w, rb.x + rb.w) - Math.max(ra.x, rb.x))
    const overlapY = Math.max(0, Math.min(ra.y + ra.h, rb.y + rb.h) - Math.max(ra.y, rb.y))
    if (overlapX > 0 && widthPx > 0) {
      scale = Math.min(scale, Math.max(0, (widthPx - overlapX) / widthPx))
    }
    if (overlapY > 0 && heightPx > 0) {
      scale = Math.min(scale, Math.max(0, (heightPx - overlapY) / heightPx))
    }
  }
  return scale
}

function buildDimensionAdjustment({ dimsCm, widthPx, heightPx, areaBounds, conflicts, view }) {
  if (!dimsCm) return null
  if (!Number.isFinite(widthPx) || widthPx <= 0 || !Number.isFinite(heightPx) || heightPx <= 0) {
    return null
  }
  const areaScale = computeAreaScale({ widthPx, heightPx, areaBounds })
  const conflictScale = computeConflictScale({ widthPx, heightPx, conflicts })
  const scale = Math.min(areaScale, conflictScale)
  if (!Number.isFinite(scale) || scale >= 1 || scale <= 0) return null

  const isXZ = view === 'XZ'
  const nextDims = { ...dimsCm }

  const anchoEscalado = Math.max(MIN_DIM_CM, (dimsCm.ancho ?? MIN_DIM_CM) * scale)
  nextDims.ancho = formatNumber(anchoEscalado)

  if (isXZ) {
    const altoEscalado = Math.max(MIN_DIM_CM, (dimsCm.alto ?? MIN_DIM_CM) * scale)
    nextDims.alto = formatNumber(altoEscalado)
  } else {
    const largoEscalado = Math.max(MIN_DIM_CM, (dimsCm.largo ?? MIN_DIM_CM) * scale)
    nextDims.largo = formatNumber(largoEscalado)
  }

  const target = isXZ ? 'ancho y altura' : 'ancho y largo'
  const reduction = formatNumber((1 - scale) * 100)

  return {
    type: 'dimensions',
    title: 'Ajustar dimensiones para que quepa',
    message: `Reducir ${target} en ${reduction}% manteniendo proporción.`,
    newDimensions: nextDims,
    scale,
  }
}

function buildCapacityAdjustment({ element, weightResult }) {
  if (!weightResult || weightResult.valido) return null
  const capacidadMaxima = Number(weightResult.capacidadCarga)
  const pesoActual = Number(weightResult.pesoActual)
  if (!Number.isFinite(capacidadMaxima) || !Number.isFinite(pesoActual)) return null
  const disponible = Math.max(0, capacidadMaxima - pesoActual)
  const actual = Number(element?.capacidadCarga || 0)
  if (!Number.isFinite(actual)) return null
  if (disponible <= 0 || disponible >= actual) return null
  return {
    type: 'capacity',
    title: 'Reducir carga para respetar el límite',
    message: `Ajustar la capacidad consumida del elemento a ${formatNumber(disponible)} kg (disponibles ${formatNumber(disponible)} kg).`,
    property: 'capacidadCarga',
    newValue: formatNumber(disponible),
  }
}

export function buildPlacementSuggestion({ failure }) {
  if (!failure) return null
  if (failure.type === 'weight') {
    const capacityAdjustment = buildCapacityAdjustment({ element: failure.element, weightResult: failure.weightResult })
    if (capacityAdjustment) {
      return {
        reason: failure.message || 'El elemento excede la capacidad permitida.',
        adjustments: [capacityAdjustment],
      }
    }
    return null
  }

  if (failure.type === 'space') {
    const dims = failure.dimsCm
    const widthPx = failure.pixelSize?.width ?? (dims?.ancho ? dims.ancho * CM_TO_PX : 0)
    const heightPx = failure.pixelSize?.height ?? (dims?.largo ? dims.largo * CM_TO_PX : 0)
    const dimensionAdjustment = buildDimensionAdjustment({
      dimsCm: dims,
      widthPx,
      heightPx,
      areaBounds: failure.areaBounds,
      conflicts: failure.conflicts,
      view: failure.view,
    })
    if (dimensionAdjustment) {
      return {
        reason: failure.message || 'No hay espacio suficiente en la posición objetivo.',
        adjustments: [dimensionAdjustment],
      }
    }
    return null
  }

  return null
}

export function applyPlacementSuggestion(element, suggestion) {
  if (!suggestion?.adjustments?.length) return element
  const next = { ...element }
  for (const adj of suggestion.adjustments) {
    if (adj.type === 'dimensions' && adj.newDimensions) {
      const dims = {
        ...(next.dimensiones || {}),
        ...adj.newDimensions,
      }
      next.dimensiones = dims
    }
    if (adj.type === 'capacity' && adj.property) {
      next[adj.property] = adj.newValue
    }
  }
  return next
}

