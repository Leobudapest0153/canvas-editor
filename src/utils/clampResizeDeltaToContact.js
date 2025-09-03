import { mtdAgainstSet } from '@/utils/collision'

export function clampResizeDeltaToContact(rect, delta, neighbors) {
  const candidate = {
    x: rect.x + delta.dx,
    y: rect.y + delta.dy,
    width: rect.width + delta.dw,
    height: rect.height + delta.dh,
  }
  const mtd = mtdAgainstSet(candidate, neighbors)
  const out = { ...delta }
  if (mtd.dx) {
    if (delta.dw !== 0) out.dw -= mtd.dx
    if (delta.dx !== 0) out.dx -= mtd.dx
  }
  if (mtd.dy) {
    if (delta.dh !== 0) out.dh -= mtd.dy
    if (delta.dy !== 0) out.dy -= mtd.dy
  }
  return out
}

export default clampResizeDeltaToContact
