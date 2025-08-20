// usePlantResizeGuard.ts
// Guard de redimensionado de planta/bodega con validación y reacomodo automático (shelf packing)
// Nota: El proyecto usa JS, pero Vite/Vitest soportan .ts vía esbuild sin configuración adicional.

import { CM_TO_PX } from '@/utils/constants'

export type ElementoPlano = {
  id: string
  nombre?: string
  tipo?: string
  categoria?: string
  plantaId: string
  padre?: string | null
  visible?: boolean
  ubicacion?: string
  // dimensiones en cm
  dimensiones?: { ancho: number; largo: number; alto?: number }
  // tamaño actual legacy en cm
  width?: number
  height?: number
  // posición actual en cm
  x?: number
  y?: number
  posicion?: { x: number; y: number; rotation?: number }
  rotation?: number
  decorativo?: boolean
}

export type SimulateOptions = {
  rotPerm?: boolean
  marginCm?: number
  gridSizePx?: number
  utilizationFactor?: number // p.ej. 0.9
  cmToPx?: number
  excludeFilter?: (el: ElementoPlano) => boolean
}

export type Placement = { id: string; x: number; y: number; rotation: number; width: number; height: number }

export type SimResult =
  | { status: 'block'; reason: string }
  | { status: 'ok'; reason: string }
  | { status: 'auto_adjust'; reason: string; placements: Placement[] }

export type GuardDeps = () => {
  elements: ElementoPlano[]
  gridSizePx: number
  cmToPx?: number
  rotPerm?: boolean
  marginCm?: number
  utilizationFactor?: number
  excludeFilter?: (el: ElementoPlano) => boolean
}

const defaultExclude: NonNullable<SimulateOptions['excludeFilter']> = (el) => {
  // Excluir elementos decorativos del suelo (heurística conservadora)
  const isFloor = el.tipo === 'suelo' || /\bsuelo\b/i.test(el.nombre || '')
  return Boolean(el.decorativo && isFloor)
}

function getSize(el: ElementoPlano) {
  const w = el.dimensiones?.ancho ?? el.width ?? 0
  const h = el.dimensiones?.largo ?? el.height ?? 0
  return { w, h }
}

export function fitsIndividually(
  el: ElementoPlano,
  newW: number,
  newH: number,
  rotPerm = true,
  margin = 0,
): boolean {
  const { w, h } = getSize(el)
  const W = Math.max(0, newW - 2 * margin)
  const H = Math.max(0, newH - 2 * margin)
  if (w <= W && h <= H) return true
  if (rotPerm && h <= W && w <= H) return true
  return false
}

function areaOf(el: ElementoPlano) {
  const { w, h } = getSize(el)
  return w * h
}

function byMaxDimDesc(a: ElementoPlano, b: ElementoPlano) {
  const sa = getSize(a)
  const sb = getSize(b)
  return Math.max(sa.w, sa.h) > Math.max(sb.w, sb.h) ? -1 : 1
}

function snapToGridCM(x: number, y: number, gridCm: number) {
  if (!gridCm || gridCm <= 0) return { x, y }
  const sx = Math.round(x / gridCm) * gridCm
  const sy = Math.round(y / gridCm) * gridCm
  return { x: sx, y: sy }
}

export function pack(
  elements: ElementoPlano[],
  bounds: { W: number; H: number },
  opts: { grid?: number; margin?: number; rotPerm?: boolean } = {},
): Placement[] | null {
  const margin = Math.max(0, opts.margin ?? 0)
  const rotPerm = opts.rotPerm !== false
  const gridCm = opts.grid && opts.grid > 0 ? opts.grid : 0

  const innerW = Math.max(0, bounds.W - 2 * margin)
  const innerH = Math.max(0, bounds.H - 2 * margin)

  // Orden determinista
  const sorted = [...elements].sort(byMaxDimDesc)

  let cursorX = 0
  let cursorY = 0
  let shelfHeight = 0
  const placements: Placement[] = []

  for (const el of sorted) {
    const { w, h } = getSize(el)

    // Seleccionar orientación que mejor aprovecha ancho de estante
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

    // Si no cabe individualmente dentro del inner box, abortar
    if (oW > innerW || oH > innerH) return null

    // Saltar a siguiente fila si no cabe en la actual
    if (cursorX + oW > innerW + 1e-6) {
      cursorX = 0
      cursorY += shelfHeight + margin
      shelfHeight = 0
    }

    // Verificar overflow vertical
    if (cursorY + oH > innerH + 1e-6) {
      return null
    }

    // Calcular posición absoluta con margen perimetral
    let x = margin + cursorX
    let y = margin + cursorY

    // Snap a grilla en cm (alineada al margen)
    if (gridCm > 0) {
      const sx = Math.round((x - margin) / gridCm) * gridCm + margin
      const sy = Math.round((y - margin) / gridCm) * gridCm + margin
      x = Math.max(margin, sx)
      y = Math.max(margin, sy)
    }

    placements.push({ id: el.id, x, y, rotation, width: oW, height: oH })

    // Avanzar cursor y altura de estante
    cursorX = (x - margin) + oW + margin
    shelfHeight = Math.max(shelfHeight, oH)
  }

  // Validación final de perímetro
  for (const p of placements) {
    const right = p.x + p.width
    const bottom = p.y + p.height
    if (p.x < margin - 1e-6 || p.y < margin - 1e-6) return null
    if (right > bounds.W - margin + 1e-6 || bottom > bounds.H - margin + 1e-6) return null
  }

  return placements
}

export function usePlantResizeGuard(getDeps: GuardDeps) {
  function simulateResize(newW: number, newH: number, override?: SimulateOptions): SimResult {
    const deps = getDeps()
    const cmToPx = override?.cmToPx ?? deps.cmToPx ?? CM_TO_PX
    const gridPx = override?.gridSizePx ?? deps.gridSizePx
    const gridCm = gridPx > 0 ? gridPx / cmToPx : 0
    const margin = Math.max(0, override?.marginCm ?? deps.marginCm ?? 0)
    const rotPerm = override?.rotPerm ?? (deps.rotPerm ?? true)
    const utilization = Math.max(
      0,
      Math.min(1, override?.utilizationFactor ?? deps.utilizationFactor ?? 0.9),
    )
    const excludeFilter = override?.excludeFilter ?? deps.excludeFilter ?? defaultExclude

    // Elementos candidatos: visibles, en suelo, de nivel raíz, no excluidos
    const all = deps.elements || []
    const candidates = all.filter((el) => {
      const visible = el.visible !== false
      const isRoot = !el.padre
      const onFloor = (el.ubicacion || 'suelo') === 'suelo'
      const excluded = excludeFilter(el)
      return visible && isRoot && onFloor && !excluded
    })

    // 1) Chequeo individual
    for (const el of candidates) {
      if (!fitsIndividually(el, newW, newH, rotPerm, margin)) {
        return { status: 'block', reason: 'Un elemento no cabe individualmente con el margen' }
      }
    }

    // 2) Chequeo de área
    const areaElems = candidates.reduce((acc, el) => acc + areaOf(el), 0)
    const areaPlanta = Math.max(0, (newW - 2 * margin) * (newH - 2 * margin))
    if (areaElems > areaPlanta * utilization + 1e-6) {
      return { status: 'block', reason: 'Área total de elementos excede la capacidad objetivo' }
    }

    // Verificar si disposición actual cabe sin cambios
    const allInside = candidates.every((el) => {
      const x = el.posicion?.x ?? el.x ?? 0
      const y = el.posicion?.y ?? el.y ?? 0
      const rot = el.posicion?.rotation ?? el.rotation ?? 0
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

    // 3) Intentar empaquetado por estantes
    const placements = pack(
      candidates,
      { W: newW, H: newH },
      { grid: gridCm, margin, rotPerm },
    )

    if (!placements) {
      return { status: 'block', reason: 'No se pudo empaquetar todos los elementos en altura' }
    }

    // Determinar si hay cambios vs disposición actual
    const moved = placements.filter((p) => {
      // Buscar elemento por id sin usar Array.find para compatibilidad con lib ES5
      let el = null as any
      for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].id === p.id) {
          el = candidates[i]
          break
        }
      }
      if (!el) return true
      const curX = el.posicion?.x ?? el.x ?? 0
      const curY = el.posicion?.y ?? el.y ?? 0
      const curRot = el.posicion?.rotation ?? el.rotation ?? 0
      const dx = Math.abs(curX - p.x)
      const dy = Math.abs(curY - p.y)
      const norm = (v: number) => ((v % 360) + 360) % 360
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
