export function applyNoFlipResize(node, { minW = 8, minH = 8, anchor = '' } = {}) {
  if (!node) return { x: 0, y: 0, width: 0, height: 0 }

  const width = node.width()
  const height = node.height()
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  let x = node.x()
  let y = node.y()

  let newW = width * scaleX
  let newH = height * scaleY

  let left = x
  let right = x + newW
  let top = y
  let bottom = y + newH

  if (newW < 0) {
    ;[left, right] = [right, left]
    newW = Math.abs(newW)
  }

  if (newH < 0) {
    ;[top, bottom] = [bottom, top]
    newH = Math.abs(newH)
  }

  if (newW < minW) {
    if (anchor.includes('left')) {
      left = right - minW
    } else {
      right = left + minW
    }
    newW = minW
  }

  if (newH < minH) {
    if (anchor.includes('top')) {
      top = bottom - minH
    } else {
      bottom = top + minH
    }
    newH = minH
  }

  x = left
  y = top

  node.x(x)
  node.y(y)
  node.width(newW)
  node.height(newH)
  node.scaleX(1)
  node.scaleY(1)

  return { x, y, width: newW, height: newH }
}

export function clampResizeWithinBounds(node, bounds = {}, opts = {}) {
  const { minX = -Infinity, minY = -Infinity, maxX = Infinity, maxY = Infinity } = bounds
  const state = applyNoFlipResize(node, opts)
  let { x, y, width, height } = state

  if (x < minX) x = minX
  if (y < minY) y = minY
  if (x + width > maxX) x = maxX - width
  if (y + height > maxY) y = maxY - height

  node.x(x)
  node.y(y)
  node.width(width)
  node.height(height)

  return { x, y, width, height }
}
