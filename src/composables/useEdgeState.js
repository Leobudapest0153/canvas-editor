// Estado de borde por id con histéresis y última posición
// API:
// - getEdgeState(id) -> { edgeX:null|'min'|'max', edgeY:null|'min'|'max' }
// - setEdgeState(id, {edgeX, edgeY})
// - resetEdgeState(id)
// - resetAllEdgeState()
// - getLastPos(id) / setLastPos(id, {x,y})

const edgeMap = new Map()
const lastPos = new Map()

export function getEdgeState(id) {
  if (!id) return { edgeX: null, edgeY: null }
  return edgeMap.get(id) || { edgeX: null, edgeY: null }
}

export function setEdgeState(id, next) {
  if (!id) return
  const cur = edgeMap.get(id) || { edgeX: null, edgeY: null }
  edgeMap.set(id, {
    edgeX: next.edgeX !== undefined ? next.edgeX : cur.edgeX,
    edgeY: next.edgeY !== undefined ? next.edgeY : cur.edgeY,
  })
}

export function resetEdgeState(id) {
  if (!id) return
  edgeMap.delete(id)
  lastPos.delete(id)
}

export function resetAllEdgeState() {
  edgeMap.clear()
  lastPos.clear()
}

export function getLastPos(id) {
  if (!id) return null
  return lastPos.get(id) || null
}

export function setLastPos(id, pos) {
  if (!id || !pos) return
  lastPos.set(id, { x: pos.x ?? 0, y: pos.y ?? 0 })
}

