// utils/colorPalette.js
// Genera rampas de color 50–950 similares a Tailwind usando el espacio de color OKLCH
// para transiciones perceptualmente uniformes con control simple de gamut.

// ---------- Utilidades HEX/RGB ----------
function normalizeHex(hex) {
  let h = String(hex).trim().replace(/^#/, '').toLowerCase()
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (h.length !== 6) throw new Error('HEX inválido: ' + hex)
  return '#' + h
}

function hexToRgb(hex) {
  const h = normalizeHex(hex).slice(1)
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return { r, g, b }
}

function rgbToHex({ r, g, b }) {
  const toByte = (v) => {
    const n = Math.round(Math.min(1, Math.max(0, v)) * 255)
    return n.toString(16).padStart(2, '0')
  }
  return '#' + toByte(r) + toByte(g) + toByte(b)
}

// ---------- sRGB <-> lineal ----------
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

// ---------- RGB <-> OKLab ----------
// Implementación basada en https://bottosson.github.io/posts/oklab/
function rgbToOklab({ r, g, b }) {
  // sRGB -> lineal
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)

  // lineal RGB -> LMS
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  return { L, a, b: b2 }
}

function oklabToRgb({ L, a, b }) {
  const l_ = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m_ = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s_ = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3)

  const rl = +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
  const gl = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
  const bl = +0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_

  const r = linearToSrgb(rl)
  const g = linearToSrgb(gl)
  const b2 = linearToSrgb(bl)
  return { r, g, b: b2 }
}

// ---------- OKLab <-> OKLCH ----------
function oklabToOklch({ L, a, b }) {
  const C = Math.sqrt(a * a + b * b)
  let h = (Math.atan2(b, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { L, C, h }
}

function oklchToOklab({ L, C, h }) {
  const hr = (h * Math.PI) / 180
  const a = Math.cos(hr) * C
  const b = Math.sin(hr) * C
  return { L, a, b }
}

// ---------- Gamut y helpers ----------
function inGamut(rgb) {
  return (
    rgb.r >= 0 &&
    rgb.r <= 1 &&
    rgb.g >= 0 &&
    rgb.g <= 1 &&
    rgb.b >= 0 &&
    rgb.b <= 1 &&
    Number.isFinite(rgb.r) &&
    Number.isFinite(rgb.g) &&
    Number.isFinite(rgb.b)
  )
}

function oklchToHexSafe(oklch) {
  // Reduce cromaticidad si sale de gamut
  let L = Math.min(1, Math.max(0, oklch.L))
  let C = Math.max(0, oklch.C)
  const h = ((oklch.h % 360) + 360) % 360

  for (let i = 0; i < 14; i++) {
    const lab = oklchToOklab({ L, C, h })
    const rgb = oklabToRgb(lab)
    if (inGamut(rgb)) return rgbToHex(rgb)
    C *= 0.92 // desaturar progresivamente
  }
  // Si sigue fuera, clamp final
  const lab = oklchToOklab({ L, C: 0, h })
  return rgbToHex(oklabToRgb(lab))
}

// ---------- Generación de paleta ----------
// Offsets de Lightness alrededor del 500 (en OKL) inspirados en rampas tipo Tailwind
const LIGHTNESS_OFFSETS = {
  50: +0.3,
  100: +0.24,
  200: +0.17,
  300: +0.11,
  400: +0.06,
  500: +0.0,
  600: -0.06,
  700: -0.12,
  800: -0.18,
  900: -0.24,
  950: -0.32,
}

// Factores de cromaticidad relativos al 500 (tiende a bajar en extremos)
const CHROMA_FACTORS = {
  50: 0.18,
  100: 0.25,
  200: 0.38,
  300: 0.55,
  400: 0.78,
  500: 1.0,
  600: 1.05,
  700: 1.05,
  800: 0.92,
  900: 0.8,
  950: 0.65,
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x))
}

export function generatePalette(hex) {
  try {
    const baseHex = normalizeHex(hex)
    const rgb = hexToRgb(baseHex)
    const oklab = rgbToOklab(rgb)
    const base = oklabToOklch(oklab)

    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
    const result = []

    for (const step of steps) {
      if (step === 500) {
        // Garantizar que 500 sea EXACTAMENTE el color inicial
        result.push({ step, hex: baseHex })
        continue
      }
      const dL = LIGHTNESS_OFFSETS[step]
      // Centrar alrededor del L del color base, con límites razonables
      let L = clamp01(base.L + dL)

      // Ajuste de cromaticidad; conserva el matiz del color base
      let C = Math.max(0, base.C) * (CHROMA_FACTORS[step] ?? 1)

      // Evitar cromas demasiado altos que típicamente salen de gamut
      // Escala adaptativa por la luminosidad (menor C en luces/sombras extremas)
      const lightEdge = Math.max(0, 1 - Math.abs(0.66 - L) * 2) // campana centrada ~0.66
      C = C * (0.75 + 0.25 * lightEdge)

      const hexOut = oklchToHexSafe({ L, C, h: base.h })
      result.push({ step, hex: hexOut })
    }
    return result
  } catch (e) {
    // Fallback extremadamente simple por error: regresar el color base en todos los steps
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
    const baseHex = normalizeHex(hex)
    return steps.map((step) => ({ step, hex: baseHex }))
  }
}
