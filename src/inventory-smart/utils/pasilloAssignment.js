import { CM_TO_PX } from '@/inventory-smart/utils/constants'

/**
 * Algoritmo de asignación de pasillos
 * -----------------------------------
 * 1. Construimos un “rayo” que representa la cara orientada del elemento.
 * 2. Evaluamos todos los pasillos dentro del scope actual midiendo solape, distancia y alineación.
 * 3. Aplicamos empates en cascada para obtener un resultado determinista (solape > distancia >
 *    alineación > prioridad de negocio > alineación al centro > distancia al centro > id).
 *
 * La idea es maximizar la sección visible compartida con el elemento y documentar los criterios
 * para facilitar futuras extensiones sin dependencias implícitas.
 */
export const PASILLO_ASSIGNMENT_DEFAULTS = {
  axisOverlapTolerancePx: 8,
  gapTolerancePx: 6,
  distanceEpsilonPx: 0.25,
  overlapEpsilonPx: 0.5,
  alignmentEpsilonDeg: 1,
  axisCenterEpsilonPx: 0.5,
  priorityEpsilon: 1e-3,
  maxRayLengthPx: Infinity,
}

const ORIENTATION_SET = new Set([0, 90, 180, 270])

export const normalizeOrientation = (value) => {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return 0
  const normalized = ((raw % 360) + 360) % 360
  if (ORIENTATION_SET.has(normalized)) return normalized
  return 0
}

const toFinite = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

// Obtiene dimensiones en píxeles cuando sólo contamos con valores en centímetros.
const fallbackDimension = (element, key) => {
  const dims = element?.dimensiones || {}
  if (dims[key] != null && Number.isFinite(Number(dims[key]))) {
    return Number(dims[key]) * CM_TO_PX
  }
  return 0
}

// Normaliza bounding boxes en píxeles para elementos/pasillos aunque falten atributos de Konva.
const extractBounds = (element) => {
  if (!element) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  const x = toFinite(element.x)
  const y = toFinite(element.y)
  let width = toFinite(element.width)
  let height = toFinite(element.height)

  if (width <= 0) {
    width = fallbackDimension(element, 'ancho') || fallbackDimension(element, 'largo')
  }
  if (height <= 0) {
    height =
      fallbackDimension(element, 'largo') ||
      fallbackDimension(element, 'ancho') ||
      fallbackDimension(element, 'alto')
  }

  return {
    x,
    y,
    width: Math.max(0, width),
    height: Math.max(0, height),
  }
}

const normalizeAngle = (value) => {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return null
  const normalized = ((raw % 360) + 360) % 360
  return normalized
}

// Permite comparar ejes ignorando el sentido (0° y 180° son equivalentes, igual 90° y 270°).
const normalizeAxisAngle = (value) => {
  const ang = normalizeAngle(value)
  if (ang == null) return null
  const folded = ang % 180
  return folded >= 90 ? 180 - folded : folded
}

const FACE_AXIS_FOR_ORIENTATION = {
  0: 0,
  180: 0,
  90: 90,
  270: 90,
}

// Heurística best-effort: intenta deducir el eje “principal” del pasillo sin depender de un único campo.
const inferPasilloAxisAngle = (pasillo, bounds) => {
  if (!pasillo) return bounds.width >= bounds.height ? 0 : 90

  const orientationCandidates = [
    pasillo.orientacion,
    pasillo.orientation,
    pasillo.rotation,
    pasillo.rotacion,
    pasillo.angulo,
    pasillo.angle,
    pasillo?.posicion?.orientacion,
    pasillo?.posicion?.rotation,
  ]

  for (const candidate of orientationCandidates) {
    const axis = normalizeAxisAngle(candidate)
    if (axis != null) return axis
  }

  const stringCandidates = [pasillo.direccion, pasillo.sentido, pasillo.tipo, pasillo.forma]
  for (const candidate of stringCandidates) {
    if (typeof candidate !== 'string') continue
    const lowered = candidate.toLowerCase()
    if (lowered.includes('horizontal')) return 0
    if (lowered.includes('vertical')) return 90
  }

  return bounds.width >= bounds.height ? 0 : 90
}

const PRIORITY_LABELS = new Map([
  ['principal', 0],
  ['main', 0],
  ['primario', 0],
  ['primary', 0],
  ['secundario', 1],
  ['secondary', 1],
  ['secundaria', 1],
  ['auxiliar', 2],
  ['auxiliary', 2],
])

// Traduce diferentes representaciones de prioridad (número, booleano, string) a un valor comparable.
const normalizePriorityValue = (value) => {
  if (value == null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) return null
    if (PRIORITY_LABELS.has(trimmed)) {
      return PRIORITY_LABELS.get(trimmed)
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (typeof value === 'boolean') {
    return value ? 0 : 1
  }

  return null
}

// Busca en distintos campos una etiqueta de prioridad sin forzar un contrato rígido con backend.
const resolveBusinessPriority = (pasillo) => {
  if (!pasillo) return null

  const priorityCandidates = [
    pasillo.prioridad,
    pasillo.priority,
    pasillo.priorityLevel,
    pasillo.nivelPrioridad,
    pasillo.importancia,
    pasillo.importance,
    pasillo?.metadata?.prioridad,
    pasillo?.metadata?.priority,
    pasillo?.meta?.prioridad,
    pasillo?.meta?.priority,
  ]

  for (const candidate of priorityCandidates) {
    const normalized = normalizePriorityValue(candidate)
    if (normalized != null) return normalized
  }

  return null
}

// Compara prioridades controlando valores nulos y tolerancias para evitar saltos por ruido.
const comparePriorities = (bestPriority, currentPriority, epsilon) => {
  const bestValue = normalizePriorityValue(bestPriority)
  const currentValue = normalizePriorityValue(currentPriority)

  if (bestValue == null && currentValue == null) return 0
  if (bestValue == null) return -1
  if (currentValue == null) return 1

  if (currentValue + epsilon < bestValue) return -1
  if (bestValue + epsilon < currentValue) return 1
  return 0
}

// Construye la franja frontal que usaremos para proyectar solapes contra los pasillos.
const buildRay = (bounds, orientation, settings) => {
  const pad = settings.axisOverlapTolerancePx ?? 0
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }

  const faceAxisAngle = FACE_AXIS_FOR_ORIENTATION[orientation] ?? 0
  const orthAxis = faceAxisAngle === 0 ? 'x' : 'y'

  if (orientation === 90) {
    return {
      axis: 'x',
      direction: 1,
      start: bounds.x + bounds.width,
      orthMin: bounds.y - pad,
      orthMax: bounds.y + bounds.height + pad,
      elementCenter: center,
      faceAxisAngle,
      orthAxis,
    }
  }

  if (orientation === 180) {
    return {
      axis: 'y',
      direction: -1,
      start: bounds.y,
      orthMin: bounds.x - pad,
      orthMax: bounds.x + bounds.width + pad,
      elementCenter: center,
      faceAxisAngle,
      orthAxis,
    }
  }

  if (orientation === 270) {
    return {
      axis: 'x',
      direction: -1,
      start: bounds.x,
      orthMin: bounds.y - pad,
      orthMax: bounds.y + bounds.height + pad,
      elementCenter: center,
      faceAxisAngle,
      orthAxis,
    }
  }

  return {
    axis: 'y',
    direction: 1,
    start: bounds.y + bounds.height,
    orthMin: bounds.x - pad,
    orthMax: bounds.x + bounds.width + pad,
    elementCenter: center,
    faceAxisAngle,
    orthAxis,
  }
}

// Calcula las métricas necesarias (solape, distancias, alineaciones, prioridad) para un pasillo.
const computeHit = (ray, pasillo, pasilloBounds, settings) => {
  const axis = ray.axis
  const dir = ray.direction
  const gapTolerance = settings.gapTolerancePx ?? 0
  const axisTol = settings.axisOverlapTolerancePx ?? 0

  const pasilloAxisMin = axis === 'x' ? pasilloBounds.x : pasilloBounds.y
  const pasilloAxisMax =
    axis === 'x' ? pasilloBounds.x + pasilloBounds.width : pasilloBounds.y + pasilloBounds.height
  const pasilloOrthMin = axis === 'x' ? pasilloBounds.y : pasilloBounds.x
  const pasilloOrthMax =
    axis === 'x' ? pasilloBounds.y + pasilloBounds.height : pasilloBounds.x + pasilloBounds.width

  const overlap = Math.min(ray.orthMax, pasilloOrthMax) - Math.max(ray.orthMin, pasilloOrthMin)
  if (overlap < -axisTol) return null

  let distance
  if (dir > 0) {
    const startsAhead = pasilloAxisMin >= ray.start - gapTolerance
    const overlapsForward = pasilloAxisMax > ray.start + gapTolerance
    if (!startsAhead && !overlapsForward) return null
    const rawDistance = pasilloAxisMin - ray.start
    distance = rawDistance <= gapTolerance ? 0 : rawDistance
  } else {
    const startsAhead = pasilloAxisMax <= ray.start + gapTolerance
    const overlapsForward = pasilloAxisMin < ray.start - gapTolerance
    if (!startsAhead && !overlapsForward) return null
    const rawDistance = ray.start - pasilloAxisMax
    distance = rawDistance <= gapTolerance ? 0 : rawDistance
  }

  if (distance < -gapTolerance) return null
  const maxRay = settings.maxRayLengthPx ?? Infinity
  if (distance > maxRay) return null

  const pasilloCenter = {
    x: pasilloBounds.x + pasilloBounds.width / 2,
    y: pasilloBounds.y + pasilloBounds.height / 2,
  }
  const centerDistance = Math.hypot(
    pasilloCenter.x - ray.elementCenter.x,
    pasilloCenter.y - ray.elementCenter.y,
  )

  const visibleLength = Math.max(0, overlap)
  if (visibleLength <= 0 && overlap < 0) return null

  const faceCenterCoord = ray.orthAxis === 'x' ? ray.elementCenter.x : ray.elementCenter.y
  const pasilloCenterCoord = ray.orthAxis === 'x' ? pasilloCenter.x : pasilloCenter.y
  const axisCenterDelta = Math.abs(pasilloCenterCoord - faceCenterCoord)

  const pasilloAxisAngle = inferPasilloAxisAngle(pasillo, pasilloBounds)
  const faceAxisAngle = ray.faceAxisAngle
  const rawDiff = Math.abs((pasilloAxisAngle ?? 0) - faceAxisAngle) % 180
  const alignmentDelta = rawDiff > 90 ? 180 - rawDiff : rawDiff

  const businessPriority = resolveBusinessPriority(pasillo)

  return {
    distance,
    centerDistance,
    visibleLength,
    axisCenterDelta,
    alignmentDelta,
    businessPriority,
  }
}

export const resolvePasilloAssignment = ({ element, pasillos, config = {} }) => {
  if (!element || !Array.isArray(pasillos) || pasillos.length === 0) return null
  const settings = { ...PASILLO_ASSIGNMENT_DEFAULTS, ...config }
  const orientation = normalizeOrientation(element.orientacion)
  const elementBounds = extractBounds(element)
  if (elementBounds.width <= 0 || elementBounds.height <= 0) return null

  const ray = buildRay(elementBounds, orientation, settings)
  if (!ray) return null

  let best = null
  for (const candidate of pasillos) {
    if (!candidate || candidate.id == null || candidate.id === element.id) continue
    const bounds = extractBounds(candidate)
    if (bounds.width <= 0 || bounds.height <= 0) continue
    const hit = computeHit(ray, candidate, bounds, settings)
    if (!hit) continue

    const current = {
      id: candidate.id,
      distance: hit.distance,
      centerDistance: hit.centerDistance,
      visibleLength: hit.visibleLength,
      axisCenterDelta: hit.axisCenterDelta,
      alignmentDelta: hit.alignmentDelta,
      businessPriority: hit.businessPriority,
      pasillo: candidate,
    }

    if (!best) {
      best = current
      continue
    }

  // 1) Priorizar el pasillo que comparte la mayor longitud de “fachada” visible.
  const overlapDiff = current.visibleLength - best.visibleLength
    if (overlapDiff > settings.overlapEpsilonPx) {
      best = current
      continue
    }
    if (overlapDiff < -settings.overlapEpsilonPx) {
      continue
    }

  // 2) Si el solape empata, elegimos el más cercano en la dirección frontal.
  const distanceDiff = best.distance - current.distance
    if (distanceDiff > settings.distanceEpsilonPx) {
      best = current
      continue
    }
    if (distanceDiff < -settings.distanceEpsilonPx) {
      continue
    }

  // 3) Recompensar al pasillo cuyo eje está mejor alineado con la cara del elemento.
  const alignmentDiff = best.alignmentDelta - current.alignmentDelta
    if (alignmentDiff > settings.alignmentEpsilonDeg) {
      best = current
      continue
    }
    if (alignmentDiff < -settings.alignmentEpsilonDeg) {
      continue
    }

  // 4) Si la prioridad de negocio indica un pasillo principal/auxiliar, respetarla.
  const priorityComparison = comparePriorities(
      best.businessPriority,
      current.businessPriority,
      settings.priorityEpsilon,
    )
    if (priorityComparison < 0) {
      best = current
      continue
    }
    if (priorityComparison > 0) {
      continue
    }

  // 5) Empate geométrico: mantener la trayectoria más centrada respecto al elemento.
  const axisCenterDiff = best.axisCenterDelta - current.axisCenterDelta
    if (axisCenterDiff > settings.axisCenterEpsilonPx) {
      best = current
      continue
    }
    if (axisCenterDiff < -settings.axisCenterEpsilonPx) {
      continue
    }

  // 6) Último check geométrico: distancia euclidiana entre centros.
  const centerDiff = best.centerDistance - current.centerDistance
    if (centerDiff > settings.distanceEpsilonPx) {
      best = current
      continue
    }
    if (centerDiff < -settings.distanceEpsilonPx) {
      continue
    }

  // 7) Determinismo total: si todo lo demás empata usar el id.
  const bestId = String(best.id)
    const currentId = String(current.id)
    if (currentId < bestId) {
      best = current
    }
  }

  return best
}
