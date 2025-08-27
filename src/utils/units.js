export function toCmSmart(value, { CM_TO_PX, bodegaHcm }) {
  const v = Number(value || 0)
  if (!v) return 0
  if (
    (bodegaHcm && v > bodegaHcm * 0.9 && v <= bodegaHcm * CM_TO_PX * 1.2) ||
    (CM_TO_PX && v % CM_TO_PX === 0 && v / CM_TO_PX <= bodegaHcm * 1.2)
  )
    return Math.round(v / CM_TO_PX)
  return v
}

export function ensureWallCm(el, { CM_TO_PX, bodegaHcm }) {
  const ubic = (el?.ubicacion ?? el?.metadata?.ubicacion ?? '')
    .toString()
    .toLowerCase()
  const zRaw =
    el?.alturaRespectoAlSuelo ??
    el?.alturaRespectoSuelo ??
    el?.elevacion?.zBase ??
    0
  const hRaw = el?.dimensiones?.alto ?? el?.altura ?? 0
  const zBase = toCmSmart(zRaw, { CM_TO_PX, bodegaHcm })
  const alto = toCmSmart(hRaw, { CM_TO_PX, bodegaHcm })
  return { ubic, zBase, alto }
}
