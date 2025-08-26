export function polygonInset(poly, eps = 1) {
  if (!Array.isArray(poly) || poly.length < 3) return []
  // Determine orientation via signed area
  let area = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    area += (a.x ?? a[0]) * (b.y ?? b[1]) - (b.x ?? b[0]) * (a.y ?? a[1])
  }
  const ccw = area > 0

  const normals = new Array(poly.length).fill(0).map(() => ({ x: 0, y: 0 }))
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ax = a.x ?? a[0]
    const ay = a.y ?? a[1]
    const bx = b.x ?? b[0]
    const by = b.y ?? b[1]
    const dx = bx - ax
    const dy = by - ay
    // Outward normal depends on orientation
    let nx, ny
    if (ccw) {
      nx = -dy
      ny = dx
    } else {
      nx = dy
      ny = -dx
    }
    const len = Math.hypot(nx, ny) || 1
    nx /= len
    ny /= len
    normals[i].x += nx
    normals[i].y += ny
    normals[(i + 1) % poly.length].x += nx
    normals[(i + 1) % poly.length].y += ny
  }

  const inset = poly.map((p, i) => {
    const nx = normals[i].x
    const ny = normals[i].y
    const len = Math.hypot(nx, ny) || 1
    const ux = nx / len
    const uy = ny / len
    const x = (p.x ?? p[0]) + ux * eps
    const y = (p.y ?? p[1]) + uy * eps
    return { x, y }
  })
  return inset
}
