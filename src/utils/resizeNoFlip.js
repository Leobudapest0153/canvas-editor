export function applyNoFlipResize(node, { minW = 8, minH = 8 } = {}) {
  if (!node) return { x: 0, y: 0, width: 0, height: 0 }
  const width = typeof node.width === 'function' ? node.width() : 0
  const height = typeof node.height === 'function' ? node.height() : 0
  const scaleX = typeof node.scaleX === 'function' ? node.scaleX() : 1
  const scaleY = typeof node.scaleY === 'function' ? node.scaleY() : 1

  let newWidth = Math.abs(width * scaleX)
  let newHeight = Math.abs(height * scaleY)
  if (newWidth < minW) newWidth = minW
  if (newHeight < minH) newHeight = minH

  let x = typeof node.x === 'function' ? node.x() : 0
  let y = typeof node.y === 'function' ? node.y() : 0

  if (scaleX < 0) {
    x = x + width * scaleX - newWidth
  }
  if (scaleY < 0) {
    y = y + height * scaleY - newHeight
  }

  if (typeof node.x === 'function') node.x(x)
  if (typeof node.y === 'function') node.y(y)
  if (typeof node.width === 'function') node.width(newWidth)
  if (typeof node.height === 'function') node.height(newHeight)
  if (typeof node.scaleX === 'function') node.scaleX(1)
  if (typeof node.scaleY === 'function') node.scaleY(1)

  return { x, y, width: newWidth, height: newHeight }
}

export function clampResizeWithinBounds(node, bounds = {}, opts = {}) {
  const { minX = -Infinity, minY = -Infinity, maxX = Infinity, maxY = Infinity } = bounds
  const state = applyNoFlipResize(node, opts)
  let { x, y, width, height } = state

  if (x < minX) x = minX
  if (y < minY) y = minY
  if (x + width > maxX) x = maxX - width
  if (y + height > maxY) y = maxY - height

  if (typeof node.x === 'function') node.x(x)
  if (typeof node.y === 'function') node.y(y)
  if (typeof node.width === 'function') node.width(width)
  if (typeof node.height === 'function') node.height(height)

  return { x, y, width, height }
}
