export function applyNoFlipResize(node, { minW = 8, minH = 8 } = {}) {
  if (!node) return;
  // calculate new width and height using current scale
  let scaleX = node.scaleX && node.scaleX();
  let scaleY = node.scaleY && node.scaleY();
  if (scaleX == null) scaleX = 1;
  if (scaleY == null) scaleY = 1;

  let width = (node.width ? node.width() : 0) * scaleX;
  let height = (node.height ? node.height() : 0) * scaleY;

  // if width/height negative, adjust position so the dragged handle doesn't cross over
  if (width < 0) {
    node.x(node.x() + width);
    width = Math.abs(width);
  }
  if (height < 0) {
    node.y(node.y() + height);
    height = Math.abs(height);
  }

  // enforce minimum dimensions
  width = Math.max(width, minW);
  height = Math.max(height, minH);

  // apply and reset scale to avoid flip
  node.width && node.width(width);
  node.height && node.height(height);
  node.scaleX && node.scaleX(1);
  node.scaleY && node.scaleY(1);
}

export function clampResizeWithinBounds(node, bounds) {
  if (!node || !bounds) return;
  const { minX = 0, minY = 0, maxX = Infinity, maxY = Infinity } = bounds;
  let x = node.x();
  let y = node.y();
  const width = node.width ? node.width() : 0;
  const height = node.height ? node.height() : 0;

  if (x < minX) x = minX;
  if (y < minY) y = minY;
  if (x + width > maxX) x = maxX - width;
  if (y + height > maxY) y = maxY - height;

  node.x(x);
  node.y(y);
}
