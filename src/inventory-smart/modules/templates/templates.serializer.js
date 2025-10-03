import { SCHEMA_VERSION_PLANTILLAS } from '@/inventory-smart/utils/constants'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import { validateTemplateDTO, validateTemplatesDTOArray } from './templates.validator.js'

export const exportTemplatesToDTO = (rawTemplates = []) => {
  if (!Array.isArray(rawTemplates)) return []
  return rawTemplates.map((tpl) => {
    const payload = tpl.payload || { rootId: undefined, elements: [] }
    const elements = Array.isArray(payload.elements) ? payload.elements : []
    const root = elements.find((e) => e.id === payload.rootId) || elements[0]
    const nodos = elements.map((el) => ({
      id: el.id,
      tipo: el.tipo || 'elementos',
      nombre: el.nombre,
      dimensiones: el.dimensiones ? { ...el.dimensiones } : undefined,
      // Para plantillas: guardar coordenadas absolutas (los hijos se renderizan en canvas del padre)
      coordenadas: {
        x: typeof el.x === 'number' ? el.x : 0,
        y: typeof el.y === 'number' ? el.y : 0
      },
      canvas: { width: el.width || el.canvas?.width || 0, height: el.height || el.canvas?.height || 0 },
      padre: el.padre || null,
      hijos: Array.isArray(el.hijos) ? el.hijos.slice() : [],
      color: el.color || el.colorBase,
      forma: el.forma,
      ubicacion: el.ubicacion,
      alturaRespectoAlSuelo: el.alturaRespectoAlSuelo,
      capacidadCarga: el.capacidadCarga,
      volumenMaximo: el.volumenMaximo,
      // Nuevo: persistimos metadatos por nodo relevantes para estructura
      meta: el.meta ? { ...el.meta } : undefined,
    }))
    return {
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
        weight: tpl.meta?.weight || root?.capacidadCarga,
        location: tpl.meta?.location || root?.ubicacion,
      },
      estructura: { rootId: payload.rootId || root?.id, nodos },
    }
  })
}

export const importTemplatesFromDTO = (dtos = []) => {
  if (!Array.isArray(dtos) || dtos.length === 0) return { imported: 0, errors: [] }
  const catalog = useCatalogStore()
  const result = { imported: 0, errors: [] }
  const arrValidation = validateTemplatesDTOArray(dtos)
  if (!arrValidation.valid) return { imported: 0, errors: arrValidation.errors }
  for (const dto of dtos) {
    const v = validateTemplateDTO(dto)
    if (!v.valid) { result.errors.push(`Template ${dto?.id || 'sin_id'} inválido: ${v.errors.join('; ')}`); continue }
    try {
      const rootId = dto.estructura.rootId
      const nodos = dto.estructura.nodos
      const root = nodos.find(n => n.id === rootId) || nodos[0]

      const elements = nodos.map(n => ({
        id: n.id,
        tipo: n.tipo,
        nombre: n.nombre,
        dimensiones: n.dimensiones ? { ...n.dimensiones } : undefined,
        // Para plantillas: usar coordenadas absolutas directamente
        // (los hijos se renderizan en canvas del padre, no necesitan ser relativos al root)
        x: n.coordenadas?.x || 0,
        y: n.coordenadas?.y || 0,
        width: n.canvas.width,
        height: n.canvas.height,
        padre: n.padre || null,
        hijos: Array.isArray(n.hijos) ? [...n.hijos] : [],
        color: n.color,
        colorBase: n.color,
        forma: n.forma,
        ubicacion: n.ubicacion,
        alturaRespectoAlSuelo: n.alturaRespectoAlSuelo,
        capacidadCarga: n.capacidadCarga,
        volumenMaximo: n.volumenMaximo,
        // Reconstruir metadatos por nodo (tienePisosGenerados, esPisoInterno, indicePiso, etc.)
        meta: n.meta ? { ...n.meta } : undefined,
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
          depth: dto.meta.depth || root?.dimensiones?.largo || 0,
          height: dto.meta.height || root?.dimensiones?.alto || 0,
          childrenCount: dto.meta.childrenCount ?? Math.max(0, nodos.length - 1),
          weight: dto.meta.weight,
          location: dto.meta.location,
        },
        payload: { rootId, elements },
        notes: dto.notes,
        tags: dto.tags || [],
      }
      const existingIdx = catalog.templates.findIndex(t => t.id === dto.id)
      if (existingIdx !== -1) catalog.templates.splice(existingIdx, 1, templateInternal)
      else catalog.templates.push(templateInternal)
      catalog.saveTemplatesToLocalStorage?.()
      result.imported++
    } catch (e) {
      result.errors.push(`Error procesando template ${dto?.id}: ${e.message}`)
    }
  }
  return result
}
