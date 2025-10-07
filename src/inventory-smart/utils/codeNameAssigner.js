import { generateCodigo, generateNombre } from '@/inventory-smart/utils/codeNameGenerator.js'

// Devuelve el conjunto de existentes en el mismo "alcance": mismo tipo y (si aplica) misma planta
export function scopeForElement(elemento, allElements = []) {
  const tipoKey = (elemento?.tipo || '').toLowerCase()
  const plantaId = elemento?.plantaId
  return (Array.isArray(allElements) ? allElements : []).filter((el) => {
    if ((el?.tipo || '').toLowerCase() !== tipoKey) return false
    if (plantaId && el?.plantaId) return el.plantaId === plantaId
    return true
  })
}

export function assignCodigoNombre(elemento, allElements = [], opts = {}) {
  if (!elemento || typeof elemento !== 'object') return elemento
  const tipoKey = (elemento?.tipo || '').toLowerCase()
  const existing = scopeForElement(elemento, allElements)

  // Generar o regenerar código
  if (opts?.regenerateCode) {
    elemento.codigo = generateCodigo(tipoKey, { existing, baseName: elemento?.nombre })
  } else if (!elemento.codigo) {
    elemento.codigo = generateCodigo(tipoKey, { existing, baseName: elemento?.nombre })
  }

  // Para pasillos: siempre reasignar nombre basado en el código

  if (opts?.resetName) {
    try {
      if (tipoKey === 'pasillos' && elemento.codigo) {
        elemento.nombre = `Pasillo ${elemento.codigo}`
      } else {
        // Para otros tipos, solo regenerar si se solicita explícitamente
        elemento.nombre = generateNombre(tipoKey, { existing, baseName: undefined })
      }
    } catch {
      console.warn('No se pudo regenerar nombre para', elemento)
    }
  } else if (!elemento.nombre) {
    // Si no tiene nombre, generar uno
    try {
      elemento.nombre = generateNombre(tipoKey, { existing, baseName: undefined })
    } catch {
      elemento.nombre = tipoKey ? `${tipoKey} 1` : 'Elemento 1'
    }
  }

  return elemento
}

export default { scopeForElement, assignCodigoNombre }
