export function isWallFormValid(el) {
  if (!el || el.ubicacion !== 'pared') return true
  const altura = Number(el.alturaRespectoSuelo ?? el.alturaRespectoAlSuelo)
  const alto = Number(el.dimensiones?.alto)
  return altura > 0 && !Number.isNaN(altura) && alto > 0 && !Number.isNaN(alto)
}

export default { isWallFormValid }
