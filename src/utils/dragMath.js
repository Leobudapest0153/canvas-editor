// Fast helpers for lightweight validations during drag

export function clampToAreaFast(x, y, w, h, area) {
  if (!area || area.type !== 'rect') return { x, y }
  const W = area.W || 0
  const H = area.H || 0
  const nx = Math.max(0, Math.min(x, W - w))
  const ny = Math.max(0, Math.min(y, H - h))
  return { x: nx, y: ny }
}

export function computeSnapFast(x, y, grid = 1) {
  if (!grid || grid <= 1) return { x, y }
  const sx = Math.round(x / grid) * grid
  const sy = Math.round(y / grid) * grid
  return { x: sx, y: sy }
}

export function shallowEqualBBox(a, b) {
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

export function throttleEveryNFrames(n = 2) {
  let frame = 0
  return function (fn) {
    return function (...args) {
      frame = (frame + 1) % n
      if (frame !== 0) return
      return fn.apply(this, args)
    }
  }
}

