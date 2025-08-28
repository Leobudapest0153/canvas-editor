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

  const location = parseNumber(coalesce(candidate, element, locationKeys))
  const zBase = parseNumber(coalesce(candidate, element, zBaseKeys))
  const height = parseNumber(coalesce(candidate, element, heightKeys))

  return { location, zBase, height }
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
