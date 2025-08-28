export function resolveVerticalProps(element = {}, candidate = {}) {
  const pick = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null) return v
    }
    return null
  }
  const ubic = pick(
    candidate.ubicacion,
    element.ubicacion,
    candidate.ubic,
    element.ubic,
    candidate.location,
    element.location,
  )
  const rawZ = pick(
    candidate.zBase,
    candidate.elevacion?.zBase,
    element.zBase,
    element.elevacion?.zBase,
    candidate.alturaRespectoAlSuelo,
    element.alturaRespectoAlSuelo,
    candidate.z_base,
    element.z_base,
    candidate.baseZ,
    element.baseZ,
  )
  const rawAlto = pick(
    candidate.alto,
    candidate.elevacion?.altura,
    element.alto,
    element.elevacion?.altura,
    candidate.altura,
    element.altura,
    candidate.heightCm,
    element.heightCm,
    candidate.height,
    element.height,
  )
  const zBaseCm = rawZ != null ? parseFloat(rawZ) : null
  const altoCm = rawAlto != null ? parseFloat(rawAlto) : null
  return {
    ubic,
    zBaseCm: Number.isNaN(zBaseCm) ? null : zBaseCm,
    altoCm: Number.isNaN(altoCm) ? null : altoCm,
  }
}

export default { resolveVerticalProps }
