/**
 * codeNameGenerator.js
 *
 * Generación de códigos y nombres por tipo de elemento.
 * - generateCodigo(tipo, ctx)
 * - generateNombre(tipo, ctx)
 *
 * ctx esperado:
 * {
 *   existing: Array<{ codigo?: string, nombre?: string, tipo?: string }>, // existentes del mismo tipo en el alcance (ej. misma planta)
 *   baseName?: string,           // nombre sugerido del catálogo
 *   lastNombre?: string | null,  // último nombre creado (si se controla por orden)
 *   tipoPadre?: string | null,   // opcional
 * }
 */

// Mapa de prefijos por tipo
const TYPE_PREFIX = {
  plantas: 'PLA',
  pasillos: 'PAS',
  cuartos: 'CRT',
  pisos: 'PIS',
  elementos: 'ESP',
  contenedores: 'NVL',
}

function getPrefix(tipo = '') {
  const key = (tipo || '').toLowerCase()
  return TYPE_PREFIX[key] || (key ? key.substring(0, 3).toUpperCase() : 'ELM')
}

// Avanza una etiqueta alfabética estilo Excel: A, B, ..., Z, AA, AB, ...
export function nextAlpha(label) {
  if (!label || typeof label !== 'string') return 'A'
  const up = label.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(up)) return 'A'
  const chars = up.split('')
  let i = chars.length - 1
  while (i >= 0) {
    if (chars[i] !== 'Z') {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1)
      return chars.join('')
    }
    chars[i] = 'A'
    i--
  }
  return 'A' + chars.join('')
}

function pad(num, size = 3) {
  const s = String(num)
  if (s.length >= size) return s
  return '0'.repeat(size - s.length) + s
}

/**
 * Genera un nuevo código único por tipo.
 * Por defecto: PREFIX-### incremental dentro del conjunto existente.
 */
export function generateCodigo(tipo, ctx = {}) {
  const prefix = getPrefix(tipo)
  const existing = Array.isArray(ctx.existing) ? ctx.existing : []

  // Si hay códigos existentes al estilo PREFIX-###, calcular el siguiente
  let maxIdx = 0
  for (const el of existing) {
    const c = (el?.codigo || '').toString()
    const m = c.match(new RegExp(`^${prefix}-(-?\\d+)$`)) // permitir negativos por seguridad
    if (m) {
      const idx = parseInt(m[1], 10)
      if (Number.isFinite(idx) && idx > maxIdx) maxIdx = idx
    }
  }
  const next = maxIdx + 1 || (existing.length + 1)

  // Reglas especiales por tipo
  const tipoKey = (tipo || '').toLowerCase()
  if (tipoKey === 'pasillos') {
    // Para pasillos generar codigo siguiendo alfabetico (A, B, ..., Z, AA, AB, ...)
    const lastCode = inferLastAisleCode(existing)
    return nextAlpha(lastCode)
  }

  return `${prefix}-${pad(next)}`
}

function inferLastAisleCode(existing) {
  // Buscar el último código alfabético (A, B, AA, ...)
  const alphabeticCodes = []
  const re = /^([A-Z]+)$/

  for (const el of existing) {
    const code = (el?.codigo || '').toString().trim().toUpperCase()
    const m = code.match(re)
    if (m && m[1]) {
      alphabeticCodes.push(m[1])
    }
  }

  if (alphabeticCodes.length === 0) return null

  // Ordenar alfabéticamente para encontrar el último
  alphabeticCodes.sort((a, b) => {
    // Primero por longitud, luego alfabéticamente
    if (a.length !== b.length) return a.length - b.length
    return a.localeCompare(b)
  })

  return alphabeticCodes[alphabeticCodes.length - 1]
}

/**
 * Genera nombre por tipo.
 */
export function generateNombre(tipo, ctx = {}) {
  const tipoKey = (tipo || '').toLowerCase()
  const existing = Array.isArray(ctx.existing) ? ctx.existing : []


  // Otros tipos
  if (ctx.baseName && typeof ctx.baseName === 'string') return ctx.baseName
  const base = tipoKey ? (tipoKey.charAt(0).toUpperCase() + tipoKey.slice(1)) : 'Elemento'
  const n = existing.length + 1
  return `${base} ${n}`
}

export default { generateCodigo, generateNombre, nextAlpha }
