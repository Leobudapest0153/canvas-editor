import { ensureWallCm, toCmSmart } from './units'

const normalizeWall = (el, bodegaHcm, CM_TO_PX) =>
  ensureWallCm(el, { CM_TO_PX, bodegaHcm })

const rectsIntersect = (a, b) => {
  const ax = Number(a?.x ?? 0)
  const ay = Number(a?.y ?? 0)
  const aw = Number(a?.width ?? 0)
  const ah = Number(a?.height ?? 0)
  const bx = Number(b?.x ?? 0)
  const by = Number(b?.y ?? 0)
  const bw = Number(b?.width ?? 0)
  const bh = Number(b?.height ?? 0)
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay)
}

export const isWallFormValid = (el, bodegaHcm, CM_TO_PX) => {
  const n = normalizeWall(el, bodegaHcm, CM_TO_PX)
  return n.ubic === 'pared' ? n.zBase > 0 && n.alto > 0 : true
}

export const wallZOk = (el, bodegaHcm, CM_TO_PX, eps = 0.5) => {
  const n = normalizeWall(el, bodegaHcm, CM_TO_PX)
  if (n.ubic !== 'pared') return true
  return n.zBase + n.alto <= (Number(bodegaHcm) || 0) + eps
}

export const wallNoZOverlap = (a, b, bodegaHcm, CM_TO_PX, eps = 0.5) => {
  const A = normalizeWall(a, bodegaHcm, CM_TO_PX)
  const B = normalizeWall(b, bodegaHcm, CM_TO_PX)
  if (A.ubic !== 'pared' || B.ubic !== 'pared') return true
  if (!rectsIntersect(a, b)) return true
  const a0 = A.zBase
  const a1 = A.zBase + A.alto
  const b0 = B.zBase
  const b1 = B.zBase + B.alto
  return a1 <= b0 + eps || b1 <= a0 + eps
}

export const wallVsFloorOk = (el, vecSuelo, bodegaHcm, CM_TO_PX, eps = 0.5) => {
  const A = normalizeWall(el, bodegaHcm, CM_TO_PX)
  const ubicSuelo = (vecSuelo?.ubicacion ?? vecSuelo?.metadata?.ubicacion ?? '')
    .toString()
    .toLowerCase()
  if (A.ubic !== 'pared' || ubicSuelo !== 'suelo') return true
  if (!rectsIntersect(el, vecSuelo)) return true
  const sueloH = toCmSmart(vecSuelo?.dimensiones?.alto ?? 0, {
    CM_TO_PX,
    bodegaHcm,
  })
  return A.zBase >= sueloH + eps
}

export const validateWallPlacement = ({ el, all, bodegaH, CM_TO_PX }) => {
  if (!isWallFormValid(el, bodegaH, CM_TO_PX))
    return { ok: false, reason: 'Falta altura respecto al suelo (>0) y alto' }
  if (!wallZOk(el, bodegaH, CM_TO_PX))
    return { ok: false, reason: 'Supera la altura de la bodega' }
  for (const v of all) {
    if (v?.id === el?.id) continue
    if (!wallNoZOverlap(el, v, bodegaH, CM_TO_PX))
      return { ok: false, reason: 'Solape vertical con otra pared' }
    if (!wallVsFloorOk(el, v, bodegaH, CM_TO_PX))
      return { ok: false, reason: 'Altura insuficiente sobre elemento de suelo' }
  }
  return { ok: true }
}

export const debugWall = (el, bodegaHcm, CM_TO_PX) => {
  const n = normalizeWall(el, bodegaHcm, CM_TO_PX)
  return { ubic: n.ubic, zBase: n.zBase, alto: n.alto, bodegaH: Number(bodegaHcm) || 0 }
}
