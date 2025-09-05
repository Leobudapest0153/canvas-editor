export type TemplateNodeDTO = {
  id: string
  tipo: 'elementos' | 'contenedores'
  categoria: string
  nombre?: string
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
  meta: {
    elementType: string
    width: number
    height: number
    depth: number
    childrenCount: number
    weight: number
    location: string
  }
  preview: { bbox: { width: number; height: number } }
  payload: {
    root: string
    layout: { mode: 'relative' | 'absoluteSnapshot'; origin?: string }
    nodos: TemplateNodeDTO[]
  }
  auditoria: { createdAt: string; updatedAt: string }
}

/**
 * Valida el array de plantillas y lanza error descriptivo si es inválido
 */
export function assertValidTemplatesDTO(data: any): TemplateDTO[] {
  if (!Array.isArray(data)) {
    throw new Error('plantillasCatalogo debe ser un array')
  }

  data.forEach((tpl, index) => {
    if (!tpl || typeof tpl !== 'object') {
      throw new Error(`Template ${index + 1} inválido`)
    }
    if (!tpl.id || typeof tpl.id !== 'string') {
      throw new Error(`Template ${index + 1}: id requerido`)
    }
    if (!tpl.nombre || typeof tpl.nombre !== 'string') {
      throw new Error(`Template ${tpl.id}: nombre requerido`)
    }
    if (!tpl.payload || typeof tpl.payload !== 'object') {
      throw new Error(`Template ${tpl.id}: payload requerido`)
    }
    if (!Array.isArray(tpl.payload.nodos)) {
      throw new Error(`Template ${tpl.id}: payload.nodos debe ser un array`)
    }
    if (!tpl.payload.nodos.find((n: any) => n.id === tpl.payload.root)) {
      throw new Error(`Template ${tpl.id}: payload.root no encontrado en nodos`)
    }
    const mode = tpl.payload.layout?.mode
    tpl.payload.nodos.forEach((n: any) => {
      if (!n.id || typeof n.id !== 'string') {
        throw new Error(`Template ${tpl.id}: nodo sin id`)
      }
      if (!['elementos', 'contenedores'].includes(n.tipo)) {
        throw new Error(`Template ${tpl.id}: nodo ${n.id} tipo inválido`)
      }
      const dims = n.dimensiones
      if (!dims || typeof dims.ancho !== 'number' || dims.ancho <= 0 || typeof dims.largo !== 'number' || dims.largo <= 0 || typeof dims.alto !== 'number' || dims.alto <= 0) {
        throw new Error(`Template ${tpl.id}: nodo ${n.id} dimensiones inválidas`)
      }
      if (mode === 'relative') {
        if (!n.offsets || typeof n.offsets.dx !== 'number' || typeof n.offsets.dy !== 'number') {
          throw new Error(`Template ${tpl.id}: nodo ${n.id} requiere offsets`)
        }
      } else if (mode === 'absoluteSnapshot') {
        if (typeof n.x !== 'number' || typeof n.y !== 'number') {
          throw new Error(`Template ${tpl.id}: nodo ${n.id} requiere x,y`)
        }
      }
    })
  })

  return data as TemplateDTO[]
}
