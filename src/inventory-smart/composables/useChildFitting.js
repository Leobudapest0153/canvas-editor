import { CM_TO_PX } from '@/inventory-smart/utils/constants'

/**
 * Verifica si, al reducir dimensiones/capacidad de un piso, aún caben todos sus hijos.
 * - parent: elemento padre (piso) que se está editando
 * - proposed: { anchoCm, largoCm, altoCm, capacidadCarga }
 * - elements: arreglo completo de elementos del canvas
 *
 * Retorna:
 * { ok: boolean, minAnchoCm?, minLargoCm?, minAltoCm?, minCapacidad? }
 */
export function checkChildrenFit(parent, proposed, elements) {
  if (!parent || !proposed || !elements) return { ok: true }

  const parentX = Number(parent.x) || 0
  const parentY = Number(parent.y) || 0

  const hijosIds = Array.isArray(parent.hijos) ? parent.hijos : []
  if (hijosIds.length === 0) {
    // Sin hijos, no hay restricción adicional
    return { ok: true }
  }

  const hijos = hijosIds
    .map((id) => elements.find((e) => e && e.id === id))
    .filter(Boolean)

  if (hijos.length === 0) return { ok: true }

  // Requisitos mínimos por XY (en px)
  let maxRightPx = 0
  let maxBottomPx = 0

  for (const h of hijos) {
    const x = Number(h.x) || 0
    const y = Number(h.y) || 0
    const w = Number(h.width) || 0
    const ht = Number(h.height) || 0

    const right = x + w
    const bottom = y + ht

    if (right > maxRightPx) maxRightPx = right
    if (bottom > maxBottomPx) maxBottomPx = bottom
  }

  // Requisitos mínimos en cm para el padre, considerando su anclaje en (parentX, parentY)
  // Según definición para este flujo, usamos las coordenadas máximas absolutas
  // como requisito mínimo (no restamos el offset del padre)
  const minAnchoCm = Math.ceil(maxRightPx / CM_TO_PX)
  const minLargoCm = Math.ceil(maxBottomPx / CM_TO_PX)

  // Requisito mínimo en altura (cm)
  const minAltoCm = hijos.reduce((acc, h) => {
    const alto = Number(h?.dimensiones?.alto) || 0
    return Math.max(acc, alto)
  }, 0)

  // Requisito mínimo de capacidad (kg)
  const minCapacidad = hijos.reduce((acc, h) => {
    const c = Number(h?.capacidadCarga) || 0
    return acc + c
  }, 0)

  // Comparar contra propuestos
  const anchoOk = !Number.isFinite(Number(proposed.anchoCm))
    ? true
    : Number(proposed.anchoCm) >= minAnchoCm
  const largoOk = !Number.isFinite(Number(proposed.largoCm))
    ? true
    : Number(proposed.largoCm) >= minLargoCm
  const altoOk = !Number.isFinite(Number(proposed.altoCm))
    ? true
    : Number(proposed.altoCm) >= minAltoCm
  const capacidadOk = !Number.isFinite(Number(proposed.capacidadCarga))
    ? true
    : Number(proposed.capacidadCarga) >= minCapacidad

  const ok = anchoOk && largoOk && altoOk && capacidadOk

  if (ok) return { ok: true }

  const out = { ok: false }
  if (!anchoOk) out.minAnchoCm = minAnchoCm
  if (!largoOk) out.minLargoCm = minLargoCm
  if (!altoOk) out.minAltoCm = minAltoCm
  if (!capacidadOk) out.minCapacidad = minCapacidad

  return out
}
