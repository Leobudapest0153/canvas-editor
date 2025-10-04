import { useCatalogStore } from '@/inventory-smart/stores/catalog'

// Exporta solo items con payload estructurado y catalogKind distinto de 'template'
// IMPORTANTE: Solo exporta items creados por el usuario (source='user'), no los predefinidos
export const exportCatalogItemsToDTO = (items = []) => {
  if (!Array.isArray(items)) return []
  return items
    .filter(i =>
      i &&
      i.payload &&
      i.payload.rootId &&
      Array.isArray(i.payload.elements) &&
      i.catalogKind &&
      i.catalogKind !== 'template' &&
      i.props?.source === 'user' // Solo items creados por el usuario
    )
    .map((i) => {
      const payload = i.payload
      const elements = payload.elements
      const root = elements.find(e => e.id === payload.rootId) || elements[0]
      const nodos = elements.map(el => ({
        id: el.id,
        tipo: el.tipo || 'elementos',
        nombre: el.nombre,
        dimensiones: el.dimensiones ? { ...el.dimensiones } : undefined,
        // Para catálogo: guardar coordenadas absolutas (los hijos se renderizan en canvas del padre)
        coordenadas: {
          x: typeof el.x === 'number' ? el.x : 0,
          y: typeof el.y === 'number' ? el.y : 0
        },
        canvas: { width: el.width || el.canvas?.width || 0, height: el.height || el.canvas?.height || 0 },
        padre: el.padre || null,
        hijos: Array.isArray(el.hijos) ? [...el.hijos] : [],
        color: el.color || el.colorBase,
        colorBase: el.colorBase || el.color,
        forma: el.forma,
        ubicacion: el.ubicacion,
        orientacion: el.orientacion,
        alturaRespectoAlSuelo: el.alturaRespectoAlSuelo,
        capacidadCarga: el.capacidadCarga,
        volumenMaximo: el.volumenMaximo,
        meta: el.meta ? { ...el.meta } : undefined,
      }))
      return {
        id: i.id,
        nombre: i.nombre,
        descripcion: i.descripcion,
        catalogKind: i.catalogKind,
        tipo: i.tipo,
        color: i.color || i.colorBase,
        colorBase: i.colorBase || i.color,
        icono: i.icono,
        tags: i.tags || [],
        meta: { ...(i.meta || {}), childrenCount: i.meta?.childrenCount ?? Math.max(0, nodos.length - 1) },
        estructura: { rootId: payload.rootId || root?.id, nodos },
      }
    })
}

// Importa y reconstruye items estructurados en catalog.items
export const importCatalogItemsFromDTO = (dtos = []) => {
  if (!Array.isArray(dtos) || dtos.length === 0) {
    return { imported: 0, errors: [] }
  }
  const catalog = useCatalogStore()
  const result = { imported: 0, errors: [] }
  for (const dto of dtos) {
    try {
      if (!dto || !dto.estructura || !Array.isArray(dto.estructura.nodos) || !dto.estructura.rootId) {
        result.errors.push(`DTO inválido para item ${dto?.id || 'sin_id'}`)
        continue
      }
      const { rootId, nodos } = dto.estructura
      const rootNode = nodos.find(n => n.id === rootId) || nodos[0]
      const elements = nodos.map(n => ({
        id: n.id,
        tipo: n.tipo,
        nombre: n.nombre,
        dimensiones: n.dimensiones ? { ...n.dimensiones } : undefined,
        // Para catálogo: usar coordenadas absolutas directamente
        // (los hijos se renderizan en canvas del padre, no necesitan ser relativos al root)
        x: n.coordenadas?.x || 0,
        y: n.coordenadas?.y || 0,
        width: Number.isFinite(n.canvas?.width) ? n.canvas.width : undefined,
        height: Number.isFinite(n.canvas?.height) ? n.canvas.height : undefined,
        padre: n.padre || null,
        hijos: Array.isArray(n.hijos) ? [...n.hijos] : [],
        color: n.color ?? n.colorBase,
        colorBase: n.colorBase ?? n.color,
        forma: n.forma,
        ubicacion: n.ubicacion,
        orientacion: n.orientacion,
        alturaRespectoAlSuelo: n.alturaRespectoAlSuelo,
        capacidadCarga: n.capacidadCarga,
        volumenMaximo: n.volumenMaximo,
        meta: n.meta ? { ...n.meta } : undefined,
      }))
      const item = {
        id: dto.id,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        catalogKind: dto.catalogKind,
        tipo: dto.tipo,
        color: dto.color || dto.colorBase,
        colorBase: dto.colorBase || dto.color,
        icono: dto.icono,
        tags: dto.tags || [],
        meta: dto.meta || {},
        // Rellenar campos top-level usados en el UI a partir del root
        dimensiones: rootNode?.dimensiones ? { ...rootNode.dimensiones } : undefined,
        forma: rootNode?.forma,
        ubicacion: rootNode?.ubicacion,
        orientacion: rootNode?.orientacion,
        capacidadCarga: rootNode?.capacidadCarga,
        payload: { rootId, elements },
        props: {
          system: true,
          catalogVisible: true,
          source: 'user' // Marcar como creado por usuario al importar
        },
      }
      const idx = catalog.items.findIndex(i => i.id === item.id)
      if (idx !== -1) catalog.items.splice(idx, 1, item)
      else catalog.items.push(item)
      result.imported++
    } catch (e) {
      result.errors.push(`Error importando item ${dto?.id}: ${e.message}`)
    }
  }
  return result
}
