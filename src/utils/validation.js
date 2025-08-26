export function isWallFormValid(el) {
  if (!el || el.ubicacion !== 'pared') return true
  const zBase = Number(el.alturaRespectoAlSuelo)
  const alto = Number(el?.dimensiones?.alto)
  if (!Number.isFinite(zBase) || zBase <= 0) return false
  if (!Number.isFinite(alto) || alto <= 0) return false
  return true
}

export default { isWallFormValid }
