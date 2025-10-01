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
  let maxRightPx = -Infinity
  let maxBottomPx = -Infinity
  let widthBoundById = null
  let lengthBoundById = null

  for (const h of hijos) {
    const x = Number(h.x) || 0
    const y = Number(h.y) || 0
    const w = Number(h.width) || 0
    const ht = Number(h.height) || 0

    const right = x + w
    const bottom = y + ht

    if (right > maxRightPx) { maxRightPx = right; widthBoundById = h.id }
    if (bottom > maxBottomPx) { maxBottomPx = bottom; lengthBoundById = h.id }
  }

  const minAnchoCm = Number.isFinite(maxRightPx) ? Math.ceil(maxRightPx / CM_TO_PX) : null
  const minLargoCm = Number.isFinite(maxBottomPx) ? Math.ceil(maxBottomPx / CM_TO_PX) : null

  // Requisito mínimo en altura (cm)
  let minAltoCm = null
  let heightBoundById = null
  for (const h of hijos) {
    const alto = Number(h?.dimensiones?.alto)
    if (Number.isFinite(alto) && (minAltoCm == null || alto > minAltoCm)) {
      minAltoCm = alto
      heightBoundById = h.id
    }
  }

  // Requisito mínimo de capacidad (kg)
  let minCapacidad = null
  let capacityCount = 0
  for (const h of hijos) {
    const c = Number(h?.capacidadCarga)
    if (Number.isFinite(c)) {
      minCapacidad = (minCapacidad || 0) + c
      capacityCount += 1
    }
  }

  // Comparar contra propuestos
  const pAncho = Number(proposed.anchoCm)
  const pLargo = Number(proposed.largoCm)
  const pAlto = Number(proposed.altoCm)
  const pCap = Number(proposed.capacidadCarga)

  const anchoOk = !Number.isFinite(pAncho) || !Number.isFinite(minAnchoCm) ? true : pAncho >= minAnchoCm
  const largoOk = !Number.isFinite(pLargo) || !Number.isFinite(minLargoCm) ? true : pLargo >= minLargoCm
  const altoOk = !Number.isFinite(pAlto) || !Number.isFinite(minAltoCm) ? true : pAlto >= minAltoCm
  const capacidadOk = !Number.isFinite(pCap) || !Number.isFinite(minCapacidad) ? true : pCap >= minCapacidad

  const ok = anchoOk && largoOk && altoOk && capacidadOk

  if (ok) return {
    ok: true,
    minAnchoCm, minLargoCm, minAltoCm, minCapacidad,
    widthBoundById, lengthBoundById, heightBoundById, capacityCount,
  }

  const out = {
    ok: false,
    minAnchoCm, minLargoCm, minAltoCm, minCapacidad,
    widthBoundById, lengthBoundById, heightBoundById, capacityCount,
  }
  return out
}
