export function clampRectToBounds(pos, size, bounds) {
  const x = Math.min(Math.max(pos.x, bounds.minX), bounds.maxX - size.w)
  const y = Math.min(Math.max(pos.y, bounds.minY), bounds.maxY - size.h)
  return { x, y }
}
export function overlap(a, b, eps = 0.5) {
  return (
    a.x + a.w - eps > b.x &&
    b.x + b.w - eps > a.x &&
    a.y + a.h - eps > b.y &&
    b.y + b.h - eps > a.y
  )
}
