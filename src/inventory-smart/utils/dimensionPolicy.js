/**
 * dimensionPolicy.js
 *
 * Política central de dimensiones por eje basada en escala del padre.
 * - Reusa constantes y conversiones existentes.
 * - Aplica snap a grilla y clamps de min/max por tipo.
 */

import { DIMENSIONS, CM_TO_PX, GRID_SIZE, PRECISION_CM } from '@/inventory-smart/utils/constants'
import { toPrecisionCm } from './fixedDimensions'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

/**
 * Aplica redondeo a grilla actual en cm, usando el tamaño de grilla en píxeles.
 * round(cm) => round((cm*px/cm)/gridPx)*gridPx / (px/cm)
 */
const roundSnapCm = (cm, gridPx = GRID_SIZE) => {
  if (!gridPx || gridPx <= 0) return toPrecisionCm(cm)
  const px = cm * CM_TO_PX
  const snappedPx = Math.round(px / gridPx) * gridPx
  return toPrecisionCm(snappedPx / CM_TO_PX)
}

/**
 * Obtiene factor por eje para un tipo (o default).
 */
const getAxisFactor = (typeKey) => {
  return DIMENSIONS.axisScaleByType?.[typeKey] || DIMENSIONS.axisScaleDefault || { x: 0.2, y: 0.2, z: 0.2 }
}

/**
 * Obtiene límites min/max por tipo (o un fallback razonable).
 */
const getMinMax = (typeKey) => {
  const fallback = { min: { w: 10, h: 10, d: 10 }, max: { w: 10000, h: 10000, d: 10000 } }
  return DIMENSIONS.minMax?.[typeKey] || fallback
}

/**
 * Calcula dimensiones por eje a partir de la escala del padre.
 * parentDims en cm: { w, h, d } => {ancho, largo, alto} en cm.
 */
export function computeDimsByAxisScale(typeKey, parentDims, opts = {}) {
  const { snap = true, gridPx = GRID_SIZE } = opts
  if (!parentDims || !Number.isFinite(parentDims.w) || !Number.isFinite(parentDims.h) || !Number.isFinite(parentDims.d)) {
    return null
  }

  const factor = getAxisFactor(typeKey)
  const limits = getMinMax(typeKey)

  let w = parentDims.w * (Number(factor.x) || 0.2)
  let h = parentDims.h * (Number(factor.y) || 0.2)
  let d = parentDims.d * (Number(factor.z) || 0.2)

  if (snap) {
    w = roundSnapCm(w, gridPx)
    h = roundSnapCm(h, gridPx)
    d = roundSnapCm(d, gridPx)
  }

  w = clamp(w, limits.min.w, limits.max.w)
  h = clamp(h, limits.min.h, limits.max.h)
  d = clamp(d, limits.min.d, limits.max.d)

  return { ancho: toPrecisionCm(w), largo: toPrecisionCm(h), alto: toPrecisionCm(d) }
}

/**
 * Convierte un objeto de dimensiones en cm a tamaño canvas (px) según vista.
 * - XY: width=ancho, height=largo
 * - XZ: width=ancho, height=alto
 */
export function toCanvasSizePx(dimensionesCm, vista = 'XY') {
  if (!dimensionesCm) return { width: 0, height: 0 }
  const anchoPx = toPrecisionCm(dimensionesCm.ancho || 0) * CM_TO_PX
  const largoPx = toPrecisionCm(dimensionesCm.largo || 0) * CM_TO_PX
  const altoPx = toPrecisionCm(dimensionesCm.alto || 0) * CM_TO_PX
  if (vista === 'XZ') {
    return { width: anchoPx, height: altoPx }
  }
  return { width: anchoPx, height: largoPx }
}

