export function mapDimsByView(el, vista) {
  const a = el?.dimensiones?.ancho || 0,
    b = el?.dimensiones?.largo || 0,
    h = el?.dimensiones?.alto || 0
  if (vista === 'XY') return { wCm: a, hCm: b }
  if (vista === 'XZ') return { wCm: a, hCm: h }
  return { wCm: b, hCm: h } // ZY
}
