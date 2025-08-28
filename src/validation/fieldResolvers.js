export function resolveVerticalProps(element = {}, candidate = {}) {
  const locationKeys = ['ubicacion', 'ubic', 'location']
  const zBaseKeys = ['zBase', 'alturaRespectoAlSuelo', 'z_base', 'baseZ']
  const heightKeys = ['alto', 'altura', 'height', 'heightCm']

  const coalesce = (cand, el, keys) => {
    for (const k of keys) {
      if (cand && cand[k] != null) return cand[k]
    }
    for (const k of keys) {
      if (el && el[k] != null) return el[k]
    }
    return null
  }

  const parseNumber = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  let ubic = coalesce(candidate, element, locationKeys)
  if (typeof ubic === 'string') {
    const lower = ubic.toLowerCase()
    if (lower === 'suelo' || lower === 'floor') ubic = 'Suelo'
    else if (lower === 'pared' || lower === 'wall') ubic = 'Pared'
  }

  let zBaseCm = parseNumber(coalesce(candidate, element, zBaseKeys))

  let altoCm = parseNumber(
    candidate?.dimensiones?.alto ??
      element?.dimensiones?.alto ??
      coalesce(candidate, element, heightKeys),
  )

  if (ubic === 'Suelo' && zBaseCm == null) zBaseCm = 0

  return { ubic, zBaseCm, altoCm }
}

export function resolveTypeId(element = {}, candidate = {}) {
  const typeKeys = ['typeId', 'tipo', 'class', 'kind']

  const coalesce = (cand, el, keys) => {
    for (const k of keys) {
      if (cand && cand[k] != null) return cand[k]
    }
    for (const k of keys) {
      if (el && el[k] != null) return el[k]
    }
    return null
  }

  const v = coalesce(candidate, element, typeKeys)
  return v != null ? String(v) : null
}
