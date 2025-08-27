export function polygonInset(poly, eps = 1) {
  if (!Array.isArray(poly) || poly.length < 3) return []
  const n = poly.length
  const normals = Array.from({ length: n }, () => ({ x: 0, y: 0 }))
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const ex = b.x - a.x
    const ey = b.y - a.y
    const len = Math.hypot(ex, ey) || 1
    const nx = ey / len
    const ny = -ex / len
    normals[i].x += nx
    normals[i].y += ny
    normals[(i + 1) % n].x += nx
    normals[(i + 1) % n].y += ny
  }
  const inset = []
  for (let i = 0; i < n; i++) {
    const v = poly[i]
    const nrm = normals[i]
    const len = Math.hypot(nrm.x, nrm.y) || 1
    inset.push({ x: v.x + (nrm.x / len) * eps, y: v.y + (nrm.y / len) * eps })
  }
  return inset
}
