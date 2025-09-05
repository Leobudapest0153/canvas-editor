import { SCHEMA_VERSION_PLANTILLAS } from '@/inventory-smart/utils/constants'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import { validateTemplateDTO, validateTemplatesDTOArray } from './templates.validator'

// Tipado ligero (evitar dependencia global)
export interface TemplateDTO {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  notes?: string
  tags?: string[]
  schemaVersion: number
  meta: {
    elementType: string
    width: number
    height: number
    depth: number
    childrenCount: number
    weight?: number
    location?: string
  }
  estructura: {
    rootId: string
    nodos: Array<{
      id: string
      tipo: string
      categoria?: string
      nombre?: string
      dimensiones?: { ancho: number; largo: number; alto: number }
      offsets: { dx: number; dy: number }
      canvas: { width: number; height: number }
      padre?: string | null
      hijos?: string[]
      color?: string
      forma?: string
      ubicacion?: string
      alturaRespectoAlSuelo?: number
      pesoMaximo?: number
      volumenMaximo?: number
    }>
  }
}

// EXPORTACIÓN ------------------------------------------------------------
export const exportTemplatesToDTO = (rawTemplates: any[] = []): TemplateDTO[] => {
  if (!Array.isArray(rawTemplates)) return []
  return rawTemplates.map((tpl) => {
    const payload = tpl.payload || { rootId: undefined, elements: [] }
    const elements: any[] = Array.isArray(payload.elements) ? payload.elements : []
    const root = elements.find((e) => e.id === payload.rootId) || elements[0]
    const rootX = root?.x || 0
    const rootY = root?.y || 0

    const nodos = elements.map((el) => ({
      id: el.id,
      tipo: el.tipo || 'elementos',
      categoria: el.categoria,
      nombre: el.nombre,
      dimensiones: el.dimensiones ? { ...el.dimensiones } : undefined,
      offsets: { dx: (el.x || 0) - rootX, dy: (el.y || 0) - rootY },
      canvas: { width: el.width || el.canvas?.width || 0, height: el.height || el.canvas?.height || 0 },
      padre: el.padre || null,
      hijos: Array.isArray(el.hijos) ? el.hijos.slice() : [],
      color: el.color || el.colorBase,
      forma: el.forma,
      ubicacion: el.ubicacion,
      alturaRespectoAlSuelo: el.alturaRespectoAlSuelo,
      pesoMaximo: el.pesoMaximo,
      volumenMaximo: el.volumenMaximo,
    }))

    const dto: TemplateDTO = {
      id: tpl.id,
      name: tpl.name,
      createdAt: tpl.createdAt,
      updatedAt: tpl.updatedAt,
      notes: tpl.notes,
      tags: tpl.tags || [],
      schemaVersion: SCHEMA_VERSION_PLANTILLAS,
      meta: {
        elementType: tpl.meta?.elementType || root?.tipo || '',
        width: tpl.meta?.width || root?.dimensiones?.ancho || 0,
        height: tpl.meta?.height || root?.dimensiones?.alto || 0,
        depth: tpl.meta?.depth || root?.dimensiones?.largo || 0,
        childrenCount: tpl.meta?.childrenCount ?? Math.max(0, nodos.length - 1),
        weight: tpl.meta?.weight || root?.pesoMaximo,
        location: tpl.meta?.location || root?.ubicacion,
      },
      estructura: {
        rootId: payload.rootId || root?.id,
        nodos,
      },
    }
    return dto
  })
}

// IMPORTACIÓN ------------------------------------------------------------
export const importTemplatesFromDTO = (dtos: TemplateDTO[] = []) => {
  if (!Array.isArray(dtos) || dtos.length === 0) return { imported: 0, errors: [] }
  const catalog = useCatalogStore()
  const result = { imported: 0, errors: [] as string[] }

  const arrValidation = validateTemplatesDTOArray(dtos)
  if (!arrValidation.valid) {
    return { imported: 0, errors: arrValidation.errors }
  }

  for (const dto of dtos) {
    const v = validateTemplateDTO(dto)
    if (!v.valid) {
      result.errors.push(`Template ${dto?.id || 'sin_id'} inválido: ${v.errors.join('; ')}`)
      continue
    }

    try {
      const rootId = dto.estructura.rootId
      const nodos = dto.estructura.nodos
      const root = nodos.find((n) => n.id === rootId) || nodos[0]

      // Reconstruir elementos (normalizamos root en 0,0)
      const elements = nodos.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        categoria: n.categoria,
        nombre: n.nombre,
        dimensiones: n.dimensiones ? { ...n.dimensiones } : undefined,
        x: n.offsets.dx, // root en 0,0
        y: n.offsets.dy,
        width: n.canvas.width,
        height: n.canvas.height,
        padre: n.padre || null,
        hijos: Array.isArray(n.hijos) ? [...n.hijos] : [],
        color: n.color,
        colorBase: n.color,
        forma: n.forma,
        ubicacion: n.ubicacion,
        alturaRespectoAlSuelo: n.alturaRespectoAlSuelo,
        pesoMaximo: n.pesoMaximo,
        volumenMaximo: n.volumenMaximo,
      }))

      const now = new Date().toISOString()
      const templateInternal = {
        id: dto.id,
        name: dto.name,
        createdAt: dto.createdAt || now,
        updatedAt: now,
        meta: {
          elementType: dto.meta.elementType || root?.tipo || '',
          width: dto.meta.width || root?.dimensiones?.ancho || 0,
            // depth -> largo
          depth: dto.meta.depth || root?.dimensiones?.largo || 0,
          height: dto.meta.height || root?.dimensiones?.alto || 0,
          childrenCount: dto.meta.childrenCount ?? Math.max(0, nodos.length - 1),
          weight: dto.meta.weight,
          location: dto.meta.location,
        },
        payload: {
          rootId: rootId,
          elements,
        },
        notes: dto.notes,
        tags: dto.tags || [],
      }

      // Upsert por id
      const existingIdx = catalog.templates.findIndex((t) => t.id === dto.id)
      if (existingIdx !== -1) {
        catalog.templates.splice(existingIdx, 1, templateInternal)
      } else {
        catalog.templates.push(templateInternal)
      }
      catalog.saveTemplatesToLocalStorage?.()
      result.imported++
    } catch (e: any) {
      result.errors.push(`Error procesando template ${dto?.id}: ${e.message}`)
    }
  }

  return result
}

