export const normalizeWall = (el) => {
  const ubic = (el?.ubicacion ?? el?.metadata?.ubicacion ?? '')
    .toString()
    .toLowerCase()
  const zBase = Number(
    el?.alturaRespectoAlSuelo ?? el?.alturaRespectoSuelo ?? el?.elevacion?.zBase ?? 0,
  )
  const alto = Number(el?.dimensiones?.alto ?? el?.altura ?? 0)
  return { ubic, zBase, alto }
}

export const isWallFormValid = (el) => {
  const n = normalizeWall(el)
  return n.ubic === 'pared' ? n.zBase > 0 && n.alto > 0 : true
}

export const wallZOk = (el, bodegaH, eps = 0.5) => {
  const n = normalizeWall(el)
  if (n.ubic !== 'pared') return true
  return n.zBase + n.alto <= (Number(bodegaH) || 0) + eps
}

export const wallNoZOverlap = (a, b, eps = 0.5) => {
  const A = normalizeWall(a)
  const B = normalizeWall(b)
  if (A.ubic !== 'pared' || B.ubic !== 'pared') return true
  const a0 = A.zBase
  const a1 = A.zBase + A.alto
  const b0 = B.zBase
  const b1 = B.zBase + B.alto
  return a1 <= b0 + eps || b1 <= a0 + eps
}

export const wallVsFloorOk = (el, vecSuelo, eps = 0.5) => {
  const A = normalizeWall(el)
  const ubicSuelo = (vecSuelo?.ubicacion ?? vecSuelo?.metadata?.ubicacion ?? '')
    .toString()
    .toLowerCase()
  if (A.ubic !== 'pared' || ubicSuelo !== 'suelo') return true
  const sueloH = Number(vecSuelo?.dimensiones?.alto ?? 0)
  return A.zBase >= sueloH + eps
}

export const validateWallPlacement = ({ el, all, bodegaH }) => {
  if (!isWallFormValid(el))
    return { ok: false, reason: 'Falta altura respecto al suelo (>0) y alto' }
  if (!wallZOk(el, bodegaH))
    return { ok: false, reason: 'Supera la altura de la bodega' }
  for (const v of all) {
    if (v?.id === el?.id) continue
    if (!wallNoZOverlap(el, v))
      return { ok: false, reason: 'Solape vertical con otra pared' }
    if (!wallVsFloorOk(el, v))
      return { ok: false, reason: 'Altura insuficiente sobre elemento de suelo' }
  }
  return { ok: true }
}

export const debugWall = (el, bodegaH) => {
  const n = normalizeWall(el)
  return { ubic: n.ubic, zBase: n.zBase, alto: n.alto, bodegaH: Number(bodegaH) || 0 }
}

