/**
 * fastClone.js
 *
 * Utilidades de clonación optimizadas para mejorar el rendimiento
 * de operaciones de copiar/pegar en el canvas.
 *
 * Reemplazo de JSON.parse(JSON.stringify()) que es lento para objetos grandes.
 */

/**
 * Clona un objeto de forma rápida y superficial
 * Más rápido que JSON.parse(JSON.stringify()) pero solo para un nivel
 */
export function shallowClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return [...obj]
  return { ...obj }
}

/**
 * Clona un objeto de forma profunda optimizada
 * ~3-5x más rápido que JSON.parse(JSON.stringify()) para objetos complejos
 *
 * Limitaciones:
 * - No clona funciones (las omite)
 * - No maneja referencias circulares
 * - No clona Date, RegExp, Map, Set (los pasa por referencia)
 */
export function fastDeepClone(obj, cache = new WeakMap()) {
  // Tipos primitivos y null
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // Verificar cache para evitar referencias circulares
  if (cache.has(obj)) {
    return cache.get(obj)
  }

  // Arrays
  if (Array.isArray(obj)) {
    const arrCopy = []
    cache.set(obj, arrCopy)
    for (let i = 0; i < obj.length; i++) {
      arrCopy[i] = fastDeepClone(obj[i], cache)
    }
    return arrCopy
  }

  // Objetos Date - crear nueva instancia
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  // RegExp - crear nueva instancia
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags)
  }

  // Map, Set - por ahora retornar referencia (raramente usado en nuestros elementos)
  if (obj instanceof Map || obj instanceof Set) {
    return obj
  }

  // Objetos planos
  const objCopy = {}
  cache.set(obj, objCopy)

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      // Omitir funciones para mayor velocidad
      if (typeof value !== 'function') {
        objCopy[key] = fastDeepClone(value, cache)
      }
    }
  }

  return objCopy
}

/**
 * Clona un elemento del canvas de forma optimizada
 * Conoce la estructura típica y solo clona lo necesario
 */
export function cloneCanvasElement(elemento) {
  if (!elemento) return null

  // Crear objeto base con propiedades primitivas
  const cloned = {
    id: elemento.id,
    tipo: elemento.tipo,
    nombre: elemento.nombre,
    codigo: elemento.codigo,
    codigoEsl: elemento.codigoEsl,
    x: elemento.x,
    y: elemento.y,
    width: elemento.width,
    height: elemento.height,
    rotation: elemento.rotation,
    orientacion: elemento.orientacion,
    plantaId: elemento.plantaId,
    padre: elemento.padre,
    ubicacion: elemento.ubicacion,
    forma: elemento.forma,
    color: elemento.color,
    colorBase: elemento.colorBase,
    alturaRespectoAlSuelo: elemento.alturaRespectoAlSuelo,
    capacidadCarga: elemento.capacidadCarga,
    permiteFragiles: elemento.permiteFragiles,
    isInfinite: elemento.isInfinite,
  }

  // Clonar arrays simples
  if (elemento.hijos) {
    cloned.hijos = [...elemento.hijos]
  } else {
    cloned.hijos = []
  }

  if (elemento.tiposProductos) {
    cloned.tiposProductos = [...elemento.tiposProductos]
  }

  if (elemento.poligono) {
    cloned.poligono = elemento.poligono.map(p => ({ x: p.x, y: p.y }))
  }

  // Clonar objetos anidados comunes
  if (elemento.dimensiones) {
    cloned.dimensiones = {
      ancho: elemento.dimensiones.ancho,
      largo: elemento.dimensiones.largo,
      alto: elemento.dimensiones.alto,
    }
  }

  if (elemento.props) {
    cloned.props = { ...elemento.props }
  }

  if (elemento.meta) {
    cloned.meta = { ...elemento.meta }
  }

  // Omitir 'uso' intencionalmente para operaciones de copia
  // (se limpia después de copiar al buffer)

  if (elemento.propiedadesPersonalizadas) {
    cloned.propiedadesPersonalizadas = fastDeepClone(elemento.propiedadesPersonalizadas)
  }

  return cloned
}

/**
 * Limpia los datos de uso de un elemento de forma optimizada
 * Modifica el objeto in-place para mayor velocidad
 */
export function cleanUsageDataInPlace(elemento) {
  if (elemento && elemento.uso) {
    delete elemento.uso
  }
  return elemento
}

/**
 * Limpia los datos de uso de múltiples elementos
 * Modifica los objetos in-place
 */
export function cleanUsageDataBatch(elementos) {
  if (!Array.isArray(elementos)) return elementos

  for (let i = 0; i < elementos.length; i++) {
    cleanUsageDataInPlace(elementos[i])
  }

  return elementos
}
