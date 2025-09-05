import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import type { TemplateDTO, TemplateNodeDTO } from './templates.validator'

/**
 * Exporta las plantillas del estado a su representación DTO
 */
export function exportTemplatesToDTO(stateTemplates: any[]): TemplateDTO[] {
  if (!Array.isArray(stateTemplates)) return []

  return stateTemplates.map((raw) => {
    const tpl = raw?._custom?.value ?? raw
    const elements: any[] = Array.isArray(tpl.payload?.elements)
      ? tpl.payload.elements
      : []
    const rootId: string = tpl.payload?.rootId || elements[0]?.id || ''
    const nodos = toRelativeLayout(elements, rootId)
    const preview = guessPreviewBBox(elements, rootId)
    const categoria = elements[0]?.categoria ?? null

    return {
      id: tpl.id,
      nombre: tpl.name,
      descripcion: tpl.descripcion ?? null,
      categoria,
      tags: tpl.tags || [],
      version: '1.0.0',
      meta: tpl.meta,
      preview: { bbox: preview },
      payload: {
        root: rootId,
        layout: { mode: 'relative', origin: 'rootTopLeft' },
        nodos,
      },
      auditoria: { createdAt: tpl.createdAt, updatedAt: tpl.updatedAt },
    }
  })
}

/**
 * Importa plantillas desde DTO y hace upsert en el store
 */
export function importTemplatesFromDTO(dtos: TemplateDTO[] | undefined): void {
  if (!Array.isArray(dtos) || dtos.length === 0) return
  const catalog = useCatalogStore()
  dtos.forEach((dto) => {
    const layoutMode = dto.payload.layout.mode
    const elements = dto.payload.nodos.map((n) => {
      const baseX = layoutMode === 'relative' ? n.offsets?.dx || 0 : n.x || 0
      const baseY = layoutMode === 'relative' ? n.offsets?.dy || 0 : n.y || 0
      return {
        id: n.id,
        tipo: n.tipo,
        categoria: n.categoria,
        nombre: n.nombre,
        dimensiones: n.dimensiones,
        x: baseX,
        y: baseY,
        width: n.canvas?.width ?? n.dimensiones.ancho,
        height: n.canvas?.height ?? n.dimensiones.alto,
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
        hijos: n.hijos,
        padre: n.padre,
        etiquetas: n.etiquetas,
      }
    })

    const normalized = {
      id: dto.id,
      name: dto.nombre,
      createdAt: dto.auditoria.createdAt,
      updatedAt: dto.auditoria.updatedAt,
      meta: dto.meta,
      payload: { rootId: dto.payload.root, elements },
      tags: dto.tags,
    }

    const idx = catalog.templates.value.findIndex((t) => t.id === dto.id)
    if (idx !== -1) {
      catalog.templates.value[idx] = normalized
    } else {
      catalog.templates.value.push(normalized)
    }
  })
  catalog.saveTemplatesToLocalStorage?.()
}

/**
 * Convierte un conjunto de nodos a layout relativo respecto al root
 */
export function toRelativeLayout(elements: any[], rootId: string): TemplateNodeDTO[] {
  const root = elements.find((e) => e.id === rootId) || { x: 0, y: 0 }
  return elements.map((e) => {
    const node: TemplateNodeDTO = {
      id: e.id,
      tipo: e.tipo,
      categoria: e.categoria,
      nombre: e.nombre,
      dimensiones: e.dimensiones,
      offsets: { dx: (e.x || 0) - (root.x || 0), dy: (e.y || 0) - (root.y || 0) },
      canvas: { width: e.width || e.dimensiones?.ancho || 0, height: e.height || e.dimensiones?.alto || 0 },
      color: e.color,
      colorBase: e.colorBase,
      forma: e.forma,
      ubicacion: e.ubicacion,
      alturaRespectoAlSuelo: e.alturaRespectoAlSuelo,
      pesoMaximo: e.pesoMaximo,
      volumenMaximo: e.volumenMaximo,
      dimensionLock: e.dimensionLock,
      systemTypeKey: e.systemTypeKey,
      uso: e.uso,
      descripcion: e.descripcion,
      contenedores: e.contenedores,
      hijos: e.hijos || [],
      padre: e.padre ?? null,
      etiquetas: e.etiquetas || [],
    }
    return node
  })
}

/**
 * Intenta obtener un bbox de previsualización
 */
export function guessPreviewBBox(
  elements: any[],
  rootId: string
): { width: number; height: number } {
  const root = elements.find((e) => e.id === rootId)
  if (root && typeof root.width === 'number' && typeof root.height === 'number') {
    return { width: root.width, height: root.height }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  elements.forEach((e) => {
    const x = e.x || 0
    const y = e.y || 0
    const w = e.width || 0
    const h = e.height || 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  })
  if (minX === Infinity) return { width: 0, height: 0 }
  return { width: maxX - minX, height: maxY - minY }
}
