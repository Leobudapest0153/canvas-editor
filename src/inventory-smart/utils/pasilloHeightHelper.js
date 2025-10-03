/**
 * pasilloHeightHelper.js
 * 
 * Utilidad para obtener la altura del contenedor padre de un pasillo.
 * Los pasillos siempre deben tener la misma altura que su contenedor
 * (ya sea una planta o un elemento padre como cuarto o piso).
 */

/**
 * Obtiene la altura del contenedor padre de un elemento pasillo.
 * 
 * @param {Object} options - Opciones
 * @param {Object} options.contextoActual - Contexto actual de navegación {tipo, id}
 * @param {Object} options.elementoPadreId - ID del elemento padre (si existe)
 * @param {Function} options.getPlantaById - Función para obtener planta por ID
 * @param {Function} options.getElementoById - Función para obtener elemento por ID
 * @returns {number|null} - Altura del contenedor en cm, o null si no se encuentra
 */
export function getPasilloContainerHeight({ 
  contextoActual, 
  elementoPadreId,
  getPlantaById, 
  getElementoById 
}) {
  // Si tiene padre directo (está dentro de un elemento), usar el alto del padre
  if (elementoPadreId) {
    const elementoPadre = getElementoById(elementoPadreId)
    const alto = elementoPadre?.dimensiones?.alto
    if (Number.isFinite(alto)) {
      return alto
    }
  }
  
  // Si estamos en una planta o no se encontró el padre, usar alto de la planta
  if (contextoActual?.tipo === 'plantas') {
    const planta = getPlantaById(contextoActual.id)
    const alto = planta?.dimensiones?.alto
    if (Number.isFinite(alto)) {
      return alto
    }
  } else if (contextoActual?.id) {
    // Si estamos dentro de un elemento (cuarto, piso, etc), usar su alto
    const elementoPadre = getElementoById(contextoActual.id)
    const alto = elementoPadre?.dimensiones?.alto
    if (Number.isFinite(alto)) {
      return alto
    }
  }
  
  return null
}

/**
 * Aplica la altura del contenedor a las dimensiones de un pasillo.
 * 
 * @param {Object} pasillo - Elemento de tipo pasillo
 * @param {Object} options - Mismas opciones que getPasilloContainerHeight
 * @returns {Object} - Pasillo con dimensiones actualizadas
 */
export function applyPasilloHeight(pasillo, options) {
  if (!pasillo || pasillo.tipo !== 'pasillos') {
    return pasillo
  }
  
  const alto = getPasilloContainerHeight(options)
  
  if (alto !== null) {
    if (!pasillo.dimensiones) {
      pasillo.dimensiones = { ancho: 0, largo: 0, alto: 0 }
    }
    pasillo.dimensiones.alto = alto
  }
  
  return pasillo
}

export default { getPasilloContainerHeight, applyPasilloHeight }
