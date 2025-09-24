// Mapa centralizado de etiquetas de campos para mostrar en UI de historial y otros módulos
// Añade aquí cualquier nuevo campo que deba tener una etiqueta amigable en español

export const FIELD_LABELS = {
  // Comunes
  id: 'ID',
  plantaId: 'Planta',
  nombre: 'Nombre',
  descripcion: 'Descripción',
  tipo: 'Tipo',
  categoria: 'Categoría',
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
 */
export function getFieldLabel(path) {
  if (!path) return ''
  if (FIELD_LABELS[path]) return FIELD_LABELS[path]
  // Fallback: separar camelCase / puntos y capitalizar
  const last = String(path).split('.').pop()
  const withSpaces = last.replace(/([a-z])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}
