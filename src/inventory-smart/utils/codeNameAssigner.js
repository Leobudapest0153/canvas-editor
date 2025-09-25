import { generateCodigo, generateNombre } from '@/inventory-smart/utils/codeNameGenerator.js'

// Devuelve el conjunto de existentes en el mismo "alcance": mismo tipo y (si aplica) misma planta
export function scopeForElement(elemento, allElements = []) {
  const tipoKey = (elemento?.tipo || '').toLowerCase()
  const plantaId = elemento?.plantaId
  console.log('Element scope:', { tipoKey, plantaId })
  return (Array.isArray(allElements) ? allElements : []).filter((el) => {
    if ((el?.tipo || '').toLowerCase() !== tipoKey) return false
    if (plantaId && el?.plantaId) return el.plantaId === plantaId
    return true
  })
}

// Asigna codigo y, en el caso de pasillos, también nombre. Para otros tipos, respeta nombre existente.
export function assignCodigoNombre(elemento, allElements = [], opts = {}) {
  if (!elemento || typeof elemento !== 'object') return elemento
  const tipoKey = (elemento?.tipo || '').toLowerCase()
  const existing = scopeForElement(elemento, allElements)
  // const preserve = opts?.preserveExistingCode === true

  // Pasillos: siempre regenerar nombre y código según secuencia alfabética
  // if (tipoKey === 'pasillos') {
  //   if (preserve && elemento.codigo) {
  //     // Preservar código (y nombre si existe)
  //     return elemento
  //   }
  //   const nombre = generateNombre(tipoKey, { existing })
  //   // Clonar existing y simular que ya existe 'nombre' para que el próximo código sea la siguiente letra
  //   const codigo = generateCodigo(tipoKey, { existing })
  //   elemento.nombre = nombre
  //   elemento.codigo = codigo
  //   return elemento
  // }

  // Otros tipos: generar código; si resetName, regenerar nombre genérico
  if (opts?.resetName) {
    try {
      elemento.nombre = generateNombre(tipoKey, { existing, baseName: undefined })
    } catch { /* ignore name regeneration errors */ }
  }
  if (opts?.regenerateCode) {
    elemento.codigo = generateCodigo(tipoKey, { existing, baseName: elemento?.nombre })
  } else if (!elemento.codigo) {
    elemento.codigo = generateCodigo(tipoKey, { existing, baseName: elemento?.nombre })
  }
  return elemento
}

export default { scopeForElement, assignCodigoNombre }
