// usePlantResizeGuard.js
// Guard de redimensionado de planta/bodega con validación y reacomodo automático (shelf packing)

import { CM_TO_PX } from '@/inventory-smart/utils/constants'

/**
 * @typedef {Object} ElementoPlano
 * @property {string} id
 * @property {string=} nombre
 * @property {string=} tipo
 * @property {string} plantaId
 * @property {string|null=} padre
 * @property {boolean=} visible
 * @property {string=} ubicacion
 * @property {{ ancho: number, largo: number, alto?: number }=} dimensiones
 * @property {number=} width
 * @property {number=} height
 * @property {number=} x
 * @property {number=} y
 * @property {{ x: number, y: number, rotation?: number }=} posicion
 * @property {number=} rotation
 * @property {boolean=} decorativo
 */

/**
 * @typedef {Object} SimulateOptions
 * @property {boolean=} rotPerm
 * @property {number=} marginCm
 * @property {number=} gridSizePx
 * @property {number=} utilizationFactor
 * @property {number=} cmToPx
 * @property {(el: ElementoPlano) => boolean=} excludeFilter
 */

/**
 * @typedef {{ id: string, x: number, y: number, rotation: number, width: number, height: number }} Placement
 */

/**
 * @typedef {{ status: 'block', reason: string } | { status: 'ok', reason: string } | { status: 'auto_adjust', reason: string, placements: Placement[] }} SimResult
 */

/**
 * @typedef {() => ({
 *  elements: ElementoPlano[],
 *  gridSizePx: number,
 *  cmToPx?: number,
 *  rotPerm?: boolean,
 *  marginCm?: number,
 *  utilizationFactor?: number,
 *  excludeFilter?: (el: ElementoPlano) => boolean,
 * })} GuardDeps
 */

/**
 * @param {ElementoPlano} el
 */
function getSize(el) {
  const w = el.dimensiones?.ancho ?? el.width ?? 0
  const h = el.dimensiones?.largo ?? el.height ?? 0
  return { w, h }
}

/**
 * Excluir elementos decorativos del suelo (heurística conservadora)
 * @type {(el: ElementoPlano) => boolean}
 */
const defaultExclude = (el) => {
  const isFloor = el.tipo === 'suelo' || /\bsuelo\b/i.test(el.nombre || '')
  return Boolean(el.decorativo && isFloor)
}

/**
 * @param {ElementoPlano} el
 * @param {number} newW
 * @param {number} newH
 * @param {boolean} [rotPerm=true]
 * @param {number} [margin=0]
 */
export function fitsIndividually(el, newW, newH, rotPerm = true, margin = 0) {
  const { w, h } = getSize(el)
  const W = Math.max(0, newW - 2 * margin)
  const H = Math.max(0, newH - 2 * margin)
  if (w <= W && h <= H) return true
  if (!rotPerm) return false

  const hasExplicitRotation = Math.abs(((el.posicion?.rotation ?? el.rotation ?? 0) % 180)) === 90
  if (hasExplicitRotation) {
    return h <= W && w <= H
  }
  return false
}

/**
 * @param {ElementoPlano} el
 */
function areaOf(el) {
  const { w, h } = getSize(el)
  return w * h
}

/**
 * @param {ElementoPlano} a
 * @param {ElementoPlano} b
 */
function byMaxDimDesc(a, b) {
  const sa = getSize(a)
  const sb = getSize(b)
  return Math.max(sa.w, sa.h) > Math.max(sb.w, sb.h) ? -1 : 1
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} gridCm
 */
function snapToGridCM(x, y, gridCm) {
  if (!gridCm || gridCm <= 0) return { x, y }
  const sx = Math.round(x / gridCm) * gridCm
  const sy = Math.round(y / gridCm) * gridCm
  return { x: sx, y: sy }
}

/**
 * @param {ElementoPlano[]} elements
 * @param {{ W: number, H: number }} bounds
 * @param {{ grid?: number, margin?: number, rotPerm?: boolean }} [opts]
 * @returns {Placement[] | null}
 */
export function pack(elements, bounds, opts = {}) {
  const margin = Math.max(0, opts.margin ?? 0)
  const rotPerm = opts.rotPerm !== false
  const gridCm = opts.grid && opts.grid > 0 ? opts.grid : 0

  const innerW = Math.max(0, bounds.W - 2 * margin)
  const innerH = Math.max(0, bounds.H - 2 * margin)

  const sorted = [...elements].sort(byMaxDimDesc)

  let cursorX = 0
  let cursorY = 0
  let shelfHeight = 0
  const placements = []

  for (const el of sorted) {
    const { w, h } = getSize(el)

    let oW = w
    let oH = h
    let rotation = 0

    const fitsAsIs = oW <= innerW && oH <= innerH
    const fitsRot = rotPerm && h <= innerW && w <= innerH

    if (!fitsAsIs && fitsRot) {
      oW = h
      oH = w
      rotation = 90
    }

    if (oW > innerW || oH > innerH) return null

    if (cursorX + oW > innerW + 1e-6) {
      cursorX = 0
      cursorY += shelfHeight + margin
      shelfHeight = 0
    }

    if (cursorY + oH > innerH + 1e-6) {
      return null
    }

    let x = margin + cursorX
    let y = margin + cursorY

    if (gridCm > 0) {
      const snappedX = Math.round(x / gridCm) * gridCm
      const snappedY = Math.round(y / gridCm) * gridCm
      x = Math.max(margin, snappedX)
      y = Math.max(margin, snappedY)
      const maxX = bounds.W - margin - oW
      const maxY = bounds.H - margin - oH
      if (x > maxX + 1e-6 || y > maxY + 1e-6) {
        return null
      }
    }

    placements.push({ id: el.id, x, y, rotation, width: oW, height: oH })

    cursorX = (x - margin) + oW + margin
    shelfHeight = Math.max(shelfHeight, oH)
  }

  for (const p of placements) {
    const right = p.x + p.width
    const bottom = p.y + p.height
    if (p.x < margin - 1e-6 || p.y < margin - 1e-6) return null
    if (right > bounds.W - margin + 1e-6 || bottom > bounds.H - margin + 1e-6) return null
  }

  return placements
}

/**
 * @param {GuardDeps} getDeps
 * @returns {{ simulateResize: (newW: number, newH: number, override?: SimulateOptions) => SimResult }}
 */
export function usePlantResizeGuard(getDeps) {
  function simulateResize(newW, newH, override) {
    const deps = getDeps()
    const cmToPx = (override && override.cmToPx) ?? deps.cmToPx ?? CM_TO_PX
    const gridPx = (override && override.gridSizePx) ?? deps.gridSizePx
    const gridCm = gridPx > 0 ? gridPx / cmToPx : 0
    const margin = Math.max(0, (override && override.marginCm) ?? deps.marginCm ?? 0)
    const rotPerm = (override && override.rotPerm) ?? (deps.rotPerm ?? true)
    const utilization = Math.max(0, Math.min(1, (override && override.utilizationFactor) ?? deps.utilizationFactor ?? 0.9))
    const excludeFilter = (override && override.excludeFilter) ?? deps.excludeFilter ?? defaultExclude

    const all = deps.elements || []
    const candidates = all.filter((el) => {
      const visible = el.visible !== false
      const isRoot = !el.padre
      const onFloor = (el.ubicacion || 'suelo') === 'suelo'
      const excluded = excludeFilter(el)
      return visible && isRoot && onFloor && !excluded
    })

    for (const el of candidates) {
      if (!fitsIndividually(el, newW, newH, rotPerm, margin)) {
        return { status: 'block', reason: 'Un elemento no cabe individualmente con el margen' }
      }
    }

    const areaElems = candidates.reduce((acc, el) => acc + areaOf(el), 0)
    const areaPlanta = Math.max(0, (newW - 2 * margin) * (newH - 2 * margin))
    if (areaElems > areaPlanta * utilization + 1e-6) {
      return { status: 'block', reason: 'Área total de elementos excede la capacidad objetivo' }
    }

    const allInside = candidates.every((el) => {
      const x = (el.posicion && el.posicion.x) ?? el.x ?? 0
      const y = (el.posicion && el.posicion.y) ?? el.y ?? 0
      const rot = (el.posicion && el.posicion.rotation) ?? el.rotation ?? 0
      const { w, h } = getSize(el)
      const oriented = rot % 180 !== 0 ? { w: h, h: w } : { w, h }
      const left = x
      const top = y
      const right = left + oriented.w
      const bottom = top + oriented.h
      return (
        left >= margin - 1e-6 &&
        top >= margin - 1e-6 &&
        right <= newW - margin + 1e-6 &&
        bottom <= newH - margin + 1e-6
      )
    })

    if (allInside) {
      return { status: 'ok', reason: 'Todos los elementos caben sin cambios' }
    }

    const placements = pack(candidates, { W: newW, H: newH }, { grid: gridCm, margin, rotPerm })

    if (!placements) {
      return { status: 'block', reason: 'No se pudo empaquetar todos los elementos en altura' }
    }

    const moved = placements.filter((p) => {
      let found = null
      for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].id === p.id) { found = candidates[i]; break }
      }
      if (!found) return true
      const curX = (found.posicion && found.posicion.x) ?? found.x ?? 0
      const curY = (found.posicion && found.posicion.y) ?? found.y ?? 0
      const curRot = (found.posicion && found.posicion.rotation) ?? found.rotation ?? 0
      const dx = Math.abs(curX - p.x)
      const dy = Math.abs(curY - p.y)
      const norm = (v) => ((v % 360) + 360) % 360
      const drot = Math.abs(norm(curRot) - norm(p.rotation))
      return dx > 1e-3 || dy > 1e-3 || drot > 0
    })

    if (moved.length === 0) {
      return { status: 'ok', reason: 'Distribución actual ya es válida' }
    }

    return { status: 'auto_adjust', reason: `Se reacomodarán ${moved.length} elementos`, placements }
  }

  return { simulateResize }
}

export default usePlantResizeGuard

