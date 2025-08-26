/**
 * Calcula el punto del segmento de pared más cercano a p.
 * @param {Array<{x:number,y:number}>} poly - Polígono de la planta.
 * @param {{x:number,y:number}} p - Punto a proyectar.
 * @returns {{x:number,y:number,segment:number}}
 */
export function nearestWallPoint(poly = [], p = { x: 0, y: 0 }) {
  if (!Array.isArray(poly) || poly.length < 2) return { x: p.x, y: p.y, segment: -1 }
  let best = { x: p.x, y: p.y, segment: 0 }
  let minDist = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const apx = p.x - a.x
    const apy = p.y - a.y
    const abx = b.x - a.x
    const aby = b.y - a.y
    const ab2 = abx * abx + aby * aby || 1
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
    const proj = { x: a.x + abx * t, y: a.y + aby * t }
    const d = (proj.x - p.x) ** 2 + (proj.y - p.y) ** 2
    if (d < minDist) {
      minDist = d
      best = { x: proj.x, y: proj.y, segment: i }
    }
  }
  return best
}

/**
 * Snapea una posición para que quede pegada a la pared más cercana.
 * @param {{x:number,y:number}} pos - Top-left del elemento.
 * @param {{width:number,height:number}} size - Tamaño del elemento.
 * @param {Array<{x:number,y:number}>} poly - Polígono de la planta.
 * @returns {{x:number,y:number}}
 */
export function attachToWall(pos, size, poly = []) {
  if (!pos || !size) return pos
  const center = { x: pos.x + size.width / 2, y: pos.y + size.height / 2 }
  const closest = nearestWallPoint(poly, center)
  const dir = { x: center.x - closest.x, y: center.y - closest.y }
  const len = Math.hypot(dir.x, dir.y) || 1
  const nx = dir.x / len
  const ny = dir.y / len
  const newCenter = {
    x: closest.x + nx * (size.width / 2),
    y: closest.y + ny * (size.height / 2),
  }
  return { x: newCenter.x - size.width / 2, y: newCenter.y - size.height / 2 }
}

export default { nearestWallPoint, attachToWall }
