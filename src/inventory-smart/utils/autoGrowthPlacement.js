import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'

const EPS = 0.01
const POSITION_EPS = 0.5

const clampNonNegative = (value) => (Number.isFinite(value) ? Math.max(0, value) : 0)

const normalizeOrientation = (value) => {
  const allowed = [0, 90, 180, 270]
  const raw = Number(value)
  if (!Number.isFinite(raw)) return 0
  const normalized = ((raw % 360) + 360) % 360
  if (allowed.includes(normalized)) return normalized
  return 0
}

const getAxisPreferences = (orientation) => {
  if (orientation === 90) {
    return { x: 'positive', y: 'center' }
  }
  if (orientation === 270) {
    return { x: 'negative', y: 'center' }
  }
  if (orientation === 180) {
    return { x: 'center', y: 'negative' }
  }
  // Default 0°: frente hacia abajo
  return { x: 'center', y: 'positive' }
}

const overlapsOnAxis = (startA, sizeA, startB, sizeB) => {
  return startA < startB + sizeB && startA + sizeA > startB
}

const computeAxisSpaces = ({ axis, element, neighbors, areaBounds }) => {
  const start = axis === 'x' ? element.x : element.y
  const size = axis === 'x' ? element.width : element.height
  const orthoStart = axis === 'x' ? element.y : element.x
  const orthoSize = axis === 'x' ? element.height : element.width

  const minKey = axis === 'x' ? 'minX' : 'minY'
  const maxKey = axis === 'x' ? 'maxX' : 'maxY'

  let positive = Number.isFinite(areaBounds?.[maxKey])
    ? areaBounds[maxKey] - (start + size)
    : Infinity
  let negative = Number.isFinite(areaBounds?.[minKey])
    ? start - areaBounds[minKey]
    : Infinity

  const orthoKeyStart = axis === 'x' ? 'y' : 'x'
  const orthoKeySize = axis === 'x' ? 'height' : 'width'
  const axisKeyStart = axis === 'x' ? 'x' : 'y'
  const axisKeySize = axis === 'x' ? 'width' : 'height'

  for (const neighbor of neighbors) {
    if (!neighbor) continue
    const neighborOrthoStart = neighbor[orthoKeyStart] ?? 0
    const neighborOrthoSize = neighbor[orthoKeySize] ?? 0
    if (!overlapsOnAxis(orthoStart, orthoSize, neighborOrthoStart, neighborOrthoSize)) continue

    const neighborStart = neighbor[axisKeyStart] ?? 0
    const neighborSize = neighbor[axisKeySize] ?? 0

    // Vecinos hacia el lado positivo (derecha/abajo)
    if (neighborStart >= start + size) {
      positive = Math.min(positive, neighborStart - (start + size))
    }

    // Vecinos hacia el lado negativo (izquierda/arriba)
    if (neighborStart + neighborSize <= start) {
      negative = Math.min(negative, start - (neighborStart + neighborSize))
    }
  }

  return {
    positive: clampNonNegative(positive),
    negative: clampNonNegative(negative),
  }
}

const approxEqual = (a, b, tol = POSITION_EPS) => Math.abs(a - b) <= tol

const dedupeCandidates = (candidates) => {
  const result = []
  for (const cand of candidates) {
    if (!result.some((r) => approxEqual(r.pos, cand.pos))) {
      result.push(cand)
    }
  }
  return result
}

const buildAxisCandidates = ({
  axis,
  element,
  newSize,
  areaBounds,
  neighbors,
  preference,
}) => {
  const currentSize = axis === 'x' ? element.width : element.height
  const start = axis === 'x' ? element.x : element.y
  const delta = newSize - currentSize
  const { positive, negative } = computeAxisSpaces({ axis, element, neighbors, areaBounds })

  const candidates = []
  const addCandidate = (pos, mode, priority = 1) => {
    if (!Number.isFinite(pos)) return
    candidates.push({ pos, mode, priority })
  }

  if (Math.abs(delta) <= EPS) {
    addCandidate(start, 'keep', 3)
    return { candidates, positive, negative }
  }

  if (delta < 0) {
    addCandidate(start, 'shrink', 4)
    return { candidates, positive, negative }
  }

  const halfDelta = delta / 2
  const positiveEnough = positive >= delta - EPS
  const negativeEnough = negative >= delta - EPS
  const centerPossible = positive >= halfDelta - EPS && negative >= halfDelta - EPS

  if (preference === 'center') {
    if (centerPossible) {
      addCandidate(start - halfDelta, 'center', 5)
    }
    const fallbackDir = positive >= negative ? 'positive' : 'negative'
    if (fallbackDir === 'positive') {
      addCandidate(start, 'primary', positiveEnough ? 4 : 2)
      addCandidate(start - delta, 'opposite', negativeEnough ? 3 : 1)
    } else {
      addCandidate(start - delta, 'primary', negativeEnough ? 4 : 2)
      addCandidate(start, 'opposite', positiveEnough ? 3 : 1)
    }
  } else if (preference === 'positive') {
    addCandidate(start, 'primary', positiveEnough ? 5 : 2)
    addCandidate(start - delta, 'opposite', negativeEnough ? 3 : 1)
    if (centerPossible) {
      addCandidate(start - halfDelta, 'center', 4)
    }
  } else if (preference === 'negative') {
    addCandidate(start - delta, 'primary', negativeEnough ? 5 : 2)
    addCandidate(start, 'opposite', positiveEnough ? 3 : 1)
    if (centerPossible) {
      addCandidate(start - halfDelta, 'center', 4)
    }
  }

  return { candidates: dedupeCandidates(candidates), positive, negative }
}

const sortCombos = (element, combos) => {
  return combos
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      const shiftA = Math.abs(a.x - element.x) + Math.abs(a.y - element.y)
      const shiftB = Math.abs(b.x - element.x) + Math.abs(b.y - element.y)
      if (Math.abs(shiftA - shiftB) > POSITION_EPS) return shiftA - shiftB
      // Prefer combos que mantengan modos primarios si prioridad igual
      const primaryScore = (combo) =>
        (combo.xMode === 'primary' ? 1 : 0) + (combo.yMode === 'primary' ? 1 : 0)
      return primaryScore(b) - primaryScore(a)
    })
}

export const resolveAutoGrowthPlacement = ({
  element,
  newWidth,
  newHeight,
  areaBounds,
  neighbors = [],
  vista = 'XY',
}) => {
  if (!element) return { applied: false }
  const orientation = normalizeOrientation(element.orientacion)
  const axisPreferences = getAxisPreferences(orientation)

  const widthPlan = buildAxisCandidates({
    axis: 'x',
    element,
    newSize: newWidth,
    areaBounds,
    neighbors,
    preference: axisPreferences.x,
  })

  const shouldHandleY = vista === 'XY'
  const heightPlan = shouldHandleY
    ? buildAxisCandidates({
        axis: 'y',
        element,
        newSize: newHeight,
        areaBounds,
        neighbors,
        preference: axisPreferences.y,
      })
    : { candidates: [{ pos: element.y, mode: 'keep', priority: 3 }] }

  const combos = []
  for (const xCand of widthPlan.candidates) {
    for (const yCand of heightPlan.candidates) {
      combos.push({
        x: xCand.pos,
        y: yCand.pos,
        xMode: xCand.mode,
        yMode: yCand.mode,
        priority: xCand.priority + yCand.priority,
      })
    }
  }

  const orderedCombos = sortCombos(element, combos)
  for (const combo of orderedCombos) {
    const candidate = {
      ...element,
      x: combo.x,
      y: combo.y,
      width: newWidth,
      height: newHeight,
    }

    const movingEl = element.forma === 'circular'
      ? {
          ...candidate,
          width: Math.min(newWidth, newHeight),
          height: Math.min(newWidth, newHeight),
        }
      : candidate

    const valid = isPlacementValid({
      pos: { x: candidate.x, y: candidate.y },
      movingEl,
      neighbors,
      areaBounds,
      CM_TO_PX,
      epsPx: 0.5,
    })

    if (valid) {
      const applied = !approxEqual(candidate.x, element.x) || !approxEqual(candidate.y, element.y)
      return {
        applied,
        x: candidate.x,
        y: candidate.y,
        xMode: combo.xMode,
        yMode: combo.yMode,
      }
    }
  }

  return { applied: false }
}

export default resolveAutoGrowthPlacement
