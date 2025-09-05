import { useCatalogStore } from '@/inventory-smart/stores/catalog'

export type TemplateNodeDTO = {
  id: string
  tipo: 'elementos' | 'contenedores'
  categoria: string
  nombre: string
  dimensiones: { ancho: number; largo: number; alto: number }
  offsets?: { dx: number; dy: number }
  x?: number
  y?: number
  canvas?: { width: number; height: number }
  color?: string
  colorBase?: string
  forma?: string
  ubicacion?: string
  alturaRespectoAlSuelo?: number
  pesoMaximo?: number
  volumenMaximo?: number
  dimensionLock?: boolean
  systemTypeKey?: string
  uso?: { volumen: number; peso: number }
  descripcion?: string
  contenedores?: string[]
  hijos: string[]
  padre: string | null
  etiquetas: string[]
}

export type TemplateDTO = {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  tags: string[]
  version: '1.0.0'
  meta: any
  preview: { bbox: { width: number; height: number } }
  payload: {
    root: string
    layout: { mode: 'relative' | 'absoluteSnapshot'; origin: 'rootTopLeft' }
    nodos: TemplateNodeDTO[]
  }
  auditoria: { createdAt: string; updatedAt: string }
}

export function exportTemplatesToDTO(stateTemplates: any[]): TemplateDTO[] {
  if (!Array.isArray(stateTemplates)) return []
  return stateTemplates.map((raw) => {
    const tpl = JSON.parse(JSON.stringify(raw))
    const elements = tpl.payload?.elements || []
    const rootId = tpl.payload?.rootId
    return {
      id: tpl.id,
      nombre: tpl.name,
      descripcion: tpl.notes ?? null,
      categoria: elements[0]?.categoria ?? null,
      tags: tpl.tags || [],
      version: '1.0.0',
      meta: tpl.meta || {},
      preview: { bbox: guessPreviewBBox(elements, rootId) },
      payload: {
        root: rootId,
        layout: { mode: 'relative', origin: 'rootTopLeft' },
        nodos: toRelativeLayout(elements, rootId),
      },
      auditoria: { createdAt: tpl.createdAt, updatedAt: tpl.updatedAt },
    }
  })
}

export function importTemplatesFromDTO(dtos: TemplateDTO[] | undefined): void {
  if (!Array.isArray(dtos)) return
  const catalog = useCatalogStore()
  dtos.forEach((dto) => {
    const layoutMode = dto.payload?.layout?.mode || 'relative'
    const elements = dto.payload.nodos.map((n) => {
      const x =
        layoutMode === 'relative' ? n.offsets?.dx ?? 0 : n.x ?? 0
      const y =
        layoutMode === 'relative' ? n.offsets?.dy ?? 0 : n.y ?? 0
      return {
        id: n.id,
        nombre: n.nombre,
        tipo: n.tipo,
        categoria: n.categoria,
        dimensiones: n.dimensiones,
        x,
        y,
        canvas: n.canvas,
        color: n.color,
        colorBase: n.colorBase,
        forma: n.forma,
        ubicacion: n.ubicacion,
        alturaRespectoAlSuelo: n.alturaRespectoAlSuelo,
        pesoMaximo: n.pesoMaximo,
        volumenMaximo: n.volumenMaximo,
        dimensionLock: n.dimensionLock,
        systemTypeKey: n.systemTypeKey,
        uso: n.uso,
        descripcion: n.descripcion,
        contenedores: n.contenedores,
        hijos: n.hijos || [],
        padre: n.padre ?? null,
        etiquetas: n.etiquetas || [],
      }
    })
    const template = {
      id: dto.id,
      name: dto.nombre,
      createdAt: dto.auditoria?.createdAt,
      updatedAt: dto.auditoria?.updatedAt,
      meta: dto.meta,
      payload: { rootId: dto.payload.root, elements },
      notes: dto.descripcion ?? undefined,
      tags: dto.tags || [],
    }
    const idx = catalog.templates.findIndex((t) => t.id === template.id)
    if (idx !== -1) {
      catalog.templates[idx] = template
    } else {
      catalog.templates.push(template)
    }
  })
  catalog.saveTemplatesToLocalStorage()
}

export function toRelativeLayout(
  elements: any[],
  rootId: string,
): TemplateNodeDTO[] {
  const root = elements.find((e) => e.id === rootId) || { x: 0, y: 0 }
  return elements.map((el) => {
    const node: TemplateNodeDTO = {
      id: el.id,
      tipo: el.tipo || 'elementos',
      categoria: el.categoria || '',
      nombre: el.nombre || '',
      dimensiones: {
        ancho: el.dimensiones?.ancho || 0,
        largo: el.dimensiones?.largo || 0,
        alto: el.dimensiones?.alto || 0,
      },
      offsets: {
        dx: (el.x || 0) - (root.x || 0),
        dy: (el.y || 0) - (root.y || 0),
      },
      canvas: el.width || el.height ? { width: el.width, height: el.height } : undefined,
      color: el.color,
      colorBase: el.colorBase,
      forma: el.forma,
      ubicacion: el.ubicacion,
      alturaRespectoAlSuelo: el.alturaRespectoAlSuelo,
      pesoMaximo: el.pesoMaximo,
      volumenMaximo: el.volumenMaximo,
      dimensionLock: el.dimensionLock,
      systemTypeKey: el.systemTypeKey,
      uso: el.uso,
      descripcion: el.descripcion,
      contenedores: el.contenedores,
      hijos: el.hijos || [],
      padre: el.padre ?? null,
      etiquetas: el.etiquetas || [],
    }
    return node
  })
}

export function guessPreviewBBox(
  elements: any[],
  rootId: string,
): { width: number; height: number } {
  const root = elements.find((e) => e.id === rootId)
  if (root && root.width && root.height) {
    return { width: root.width, height: root.height }
  }
  if (elements.length > 0) {
    return {
      width: elements[0].width || 100,
      height: elements[0].height || 100,
    }
  }
  return { width: 100, height: 100 }
}

