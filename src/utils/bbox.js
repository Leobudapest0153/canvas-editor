import { CM_TO_PX } from '@/utils/constants'

export function dimsCmFor(el = {}) {
  const d = el.dimensiones || {}
  if (el.forma === 'circular') {
    const diam = d.ancho ?? d.diametro ?? 0
    return { w_cm: diam, h_cm: diam }
  }
  const ancho = d.ancho ?? 0
  const prof = d.largo ?? d.prof ?? 0
  return { w_cm: ancho, h_cm: prof }
}

export function bboxPxFor(el = {}) {
  const { w_cm, h_cm } = dimsCmFor(el)
  return { width: w_cm * CM_TO_PX, height: h_cm * CM_TO_PX }
}
