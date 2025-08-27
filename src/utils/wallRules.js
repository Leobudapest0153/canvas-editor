import { ensureWallCm, toCmSmart } from './units'

const normalizeWall = (el, bodegaHcm, CM_TO_PX) =>
  ensureWallCm(el, { CM_TO_PX, bodegaHcm })

const getBox = (el, CM_TO_PX) => {
  const w =
    el?.width ??
    (el?.dimensiones?.ancho ? el.dimensiones.ancho * (CM_TO_PX || 1) : 0)
  const h =
    el?.height ??
    (el?.dimensiones?.largo ? el.dimensiones.largo * (CM_TO_PX || 1) : 0)
  return {
    x: Number(el?.x ?? 0),
    y: Number(el?.y ?? 0),
    width: Number(w),
    height: Number(h),
  }
}

const boxesIntersect = (a, b, CM_TO_PX) => {
  const A = getBox(a, CM_TO_PX)
  const B = getBox(b, CM_TO_PX)
  return (
    A.x < B.x + B.width &&
    A.x + A.width > B.x &&
    A.y < B.y + B.height &&
    A.y + A.height > B.y
  )
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
  if (!boxesIntersect(a, b, CM_TO_PX)) return true
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
  if (!boxesIntersect(el, vecSuelo, CM_TO_PX)) return true
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
