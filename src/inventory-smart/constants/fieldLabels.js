// Mapa centralizado de etiquetas de campos para mostrar en UI de historial y otros módulos
// Añade aquí cualquier nuevo campo que deba tener una etiqueta amigable en español

import {
  DEFAULT_TIPOS_ESPACIO,
  DEFAULT_TIPOS_CUARTO,
  DEFAULT_TIPOS_CONTENEDOR,
  DEFAULT_TIPOS_PISO,
} from '../utils/constants'

/**
 * Obtiene el nombre amigable de un tipo desde DEFAULT_TIPOS_ESPACIO
 */
const getTipoNombre = (tipoId) => {
  let tipo = DEFAULT_TIPOS_ESPACIO.find((t) => t.id === tipoId)
  if (tipo) return tipo.nombre
  // Buscar en tipos específicos
  tipo = DEFAULT_TIPOS_CUARTO.find((t) => t.id === tipoId)
  if (tipo) return tipo.nombre
  tipo = DEFAULT_TIPOS_CONTENEDOR.find((t) => t.id === tipoId)
  if (tipo) return tipo.nombre
  tipo = DEFAULT_TIPOS_PISO.find((t) => t.id === tipoId)
  if (tipo) return tipo.nombre
  return tipo ? tipo.nombre : tipoId
}

export const FIELD_LABELS = {
  // Comunes
  id: 'ID',
  plantaId: 'Planta',
  nombre: 'Nombre',
  descripcion: 'Descripción',
  tipo: 'Tipo',
  categoria: 'Tipo',
  codigo: 'Código',
  codigoEsl: 'Código ESL',

  // Propiedades geométricas/estructurales
  dimensiones: 'Dimensiones',
  alturaRespectoAlSuelo: 'Altura respecto al suelo',
  orientacion: 'Orientación',
  hijos: 'Hijos',

  // Capacidades
  capacidadCargaSoportado: 'Capacidad de carga soportada',

  // Alternativos que pueden aparecer en otros diffs
  width: 'Ancho',
  height: 'Alto',
  depth: 'Profundidad',
  weight: 'Peso',
  capacity: 'Capacidad',
  floors: 'Pisos',
}

/**
 * Devuelve una etiqueta para un path de campo; usa el mapa central y si no existe, genera una
 * etiqueta simple basada en el path (camelCase → Palabras Con Espacios)
 * @param {string} path - El path del campo
 * @param {object} context - Contexto adicional (ej. tipo de elemento)
 */
export function getFieldLabel(path, context = {}) {
  if (!path) return ''

  // Casos especiales contextuales
  if (path === 'hijos' && context.tipo) {
    if (context.tipo === 'cuartos') return 'Pisos'
    if (context.tipo === 'elementos') return 'Niveles'
  }

  if (FIELD_LABELS[path]) return FIELD_LABELS[path]

  // Fallback: separar camelCase / puntos y capitalizar
  const last = String(path).split('.').pop()
  const withSpaces = last.replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

/**
 * Formatea un valor de tipo usando DEFAULT_TIPOS_ESPACIO para mostrar nombre amigable
 */
export function formatTipoValue(tipoId) {
  return getTipoNombre(tipoId)
}
