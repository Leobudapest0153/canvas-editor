// Utilidad de límites con histéresis en los bordes
// - candidate: { x, y } posición candidata (top-left) en coords de mundo
// - el: elemento del modelo { id, width, height, forma? }
// - areaBounds: { minX, minY, maxX, maxY } límites en coords de mundo (bbox del área)
// - opts: { epsEnter=0.25, epsExit=0.75 }
// Devuelve: { pos: {x,y}, hitX: boolean, hitY: boolean }

import { getEdgeState, setEdgeState, getLastPos, setLastPos } from '@/inventory-smart/composables/useEdgeState'

export function applyEdgeConstraint(candidate, el, areaBounds, opts = {}) {
  const { epsEnter = 0.25, epsExit = 0.75 } = opts || {}
  const id = el?.id
  const w = Math.max(0, el?.width || 0)
  const h = Math.max(0, el?.height || 0)

  // BBox de modelo (sin stroke ni sombras) ya es axis-aligned y en coords de mundo
  let x = candidate?.x ?? 0
  let y = candidate?.y ?? 0

  const minX = areaBounds?.minX ?? 0
  const minY = areaBounds?.minY ?? 0
  const maxX = areaBounds?.maxX ?? 0
  const maxY = areaBounds?.maxY ?? 0

  // Clamp puro al área, basado en bbox del modelo
  let clampedX
  let clampedY
  if (w <= (maxX - minX)) {
    clampedX = Math.max(minX, Math.min(x, maxX - w))
  } else {
    // Si el elemento es más grande que el área en X, fijar en minX
    clampedX = minX
  }
  if (h <= (maxY - minY)) {
    clampedY = Math.max(minY, Math.min(y, maxY - h))
  } else {
    // Si el elemento es más grande que el área en Y, fijar en minY
    clampedY = minY
  }

  // Distancias a bordes (>= 0 si dentro)
  const dLeft = Math.max(0, (clampedX - minX))
  const dTop = Math.max(0, (clampedY - minY))
  const dRight = Math.max(0, (maxX - (clampedX + w)))
  const dBottom = Math.max(0, (maxY - (clampedY + h)))

  // Histéresis por eje usando estado por id
  let { edgeX = null, edgeY = null } = getEdgeState(id)

  // Velocidad aproximada (signo) según último frame
  const last = getLastPos(id)
  const vx = last ? clampedX - last.x : 0
  const vy = last ? clampedY - last.y : 0

  // Eje X: entrar/salir
  if (edgeX === null) {
    if (dLeft <= epsEnter) edgeX = 'min'
    else if (dRight <= epsEnter) edgeX = 'max'
  } else if (edgeX === 'min') {
    // Salida si nos alejamos (vx > 0) o si superamos banda de salida
    if (vx > 0 || dLeft >= epsExit) edgeX = null
  } else if (edgeX === 'max') {
    if (vx < 0 || dRight >= epsExit) edgeX = null
  }

  // Eje Y: entrar/salir
  if (edgeY === null) {
    if (dTop <= epsEnter) edgeY = 'min'
    else if (dBottom <= epsEnter) edgeY = 'max'
  } else if (edgeY === 'min') {
    if (vy > 0 || dTop >= epsExit) edgeY = null
  } else if (edgeY === 'max') {
    if (vy < 0 || dBottom >= epsExit) edgeY = null
  }

  // hitX/hitY indican contacto real con el borde (clamp aplicado)
  const hitX = (clampedX !== x) || (edgeX === 'min' && dLeft <= epsEnter) || (edgeX === 'max' && dRight <= epsEnter)
  const hitY = (clampedY !== y) || (edgeY === 'min' && dTop <= epsEnter) || (edgeY === 'max' && dBottom <= epsEnter)

  // Actualizar estado y última posición para cálculo de velocidad en el próximo frame
  setEdgeState(id, { edgeX, edgeY })
  setLastPos(id, { x: clampedX, y: clampedY })

  return { pos: { x: clampedX, y: clampedY }, hitX, hitY }
}

// Finalización: clamp → snap → re-clamp para rectángulos
export function finalizeRectClampSnapReclamp(x, y, w, h, areaBounds, gridSize = 50) {
  const minX = areaBounds?.minX ?? 0
  const minY = areaBounds?.minY ?? 0
  const maxX = areaBounds?.maxX ?? 0
  const maxY = areaBounds?.maxY ?? 0

  // clamp inicial
  let cx = Math.max(minX, Math.min(x, maxX - w))
  let cy = Math.max(minY, Math.min(y, maxY - h))

  // snap (solo si gridSize > 0)
  let sx = cx
  let sy = cy
  if (typeof gridSize === 'number' && gridSize > 0) {
    sx = Math.round(cx / gridSize) * gridSize
    sy = Math.round(cy / gridSize) * gridSize
  }

  // re-clamp
  cx = Math.max(minX, Math.min(sx, maxX - w))
  cy = Math.max(minY, Math.min(sy, maxY - h))

  return { x: cx, y: cy }
}
