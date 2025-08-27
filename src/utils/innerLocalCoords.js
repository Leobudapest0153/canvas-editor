// Coord. locales robustas: si hijos vienen absolutos resta origen del contenedor; si ya son locales, no-op
export function toLocal(pos, parent) {
  const px = pos?.x || 0,
    py = pos?.y || 0
  const ox = parent?.posicion?.x || 0,
    oy = parent?.posicion?.y || 0
  const looksLocal = px >= -1 && py >= -1 && px <= (parent.__wPx || 1) + 1 && py <= (parent.__hPx || 1) + 1
  return looksLocal ? { x: px, y: py } : { x: px - ox, y: py - oy }
}
export function toWorld(pos, parent) {
  const px = pos?.x || 0,
    py = pos?.y || 0
  const ox = parent?.posicion?.x || 0,
    oy = parent?.posicion?.y || 0
  const looksLocal = px >= -1 && py >= -1 && px <= (parent.__wPx || 1) + 1 && py <= (parent.__hPx || 1) + 1
  return looksLocal ? { x: px, y: py } : { x: px + ox, y: py + oy }
}
