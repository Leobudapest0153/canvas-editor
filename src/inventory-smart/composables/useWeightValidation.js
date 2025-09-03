/**
 * useWeightValidation.js
 *
 * Composable para validaciones de peso máximo teórico soportado en la jerarquía planta > elemento > contenedor.
 *
 * IMPORTANTE: Este sistema trabaja con pesos máximos teóricos, no con pesos físicos reales.
 * - Para plantas: 'pesoMaximoSoportado' es el peso máximo que puede soportar.
 * - Para elementos: 'pesoMaximo' es la capacidad de carga teórica, no su peso físico real.
 *
 * Responsabilidades:
 * - Calcular el peso máximo teórico total de elementos hijos dentro de un contenedor
 * - Validar si un nuevo elemento puede ser agregado sin exceder el peso máximo soportado
 * - Verificar si una colección de elementos excede el peso máximo teórico
 */

import { computed } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore.js'

export function useWeightValidation() {
  const canvasStore = useCanvasStore()

  /**
   * Calcula el peso máximo teórico total de todos los elementos hijos directos de un contenedor/elemento/planta
   *
   * NOTA: Este método suma los pesos máximos teóricos (capacidad de carga) de cada elemento,
   * no el peso físico real de cada elemento. Es decir, suma lo que cada elemento puede soportar,
   * no lo que cada elemento pesa en sí mismo.
   *
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre ('plantas', 'elementos', 'contenedores')
   * @param {Object} options - Opciones adicionales
   * @param {boolean} options.recursive - Si es true, calcula recursivamente el peso de todos los descendientes
   * @returns {number} Peso máximo teórico total en kg
   */
  const calcularPesoTotal = (padreId, padreType, { recursive = false } = {}) => {
    let pesoTotal = 0

    // Obtener todos los elementos hijos directos
    let elementosHijos = []

    if (padreType === 'plantas') {
      // Obtener elementos directos de la planta (sin padre)
      elementosHijos = canvasStore.elementos.filter(
        el => el.plantaId === padreId && !el.padre
      )
    } else {
      // Obtener elementos que tienen como padre este elemento/contenedor
      const padre = canvasStore.elementoPorId(padreId)
      if (padre && padre.hijos) {
        elementosHijos = padre.hijos
          .map(hijoId => canvasStore.elementoPorId(hijoId))
          .filter(hijo => hijo !== undefined) // Filtrar elementos indefinidos
      }
    }

    // Sumar el peso máximo de cada elemento hijo directo
    elementosHijos.forEach(elemento => {
      const pesoElemento = Number(elemento.pesoMaximo || 0)

      if (!isNaN(pesoElemento)) {
        pesoTotal += pesoElemento

        // Si es recursivo, agregar también el peso de sus hijos
        if (recursive && elemento.hijos && elemento.hijos.length > 0) {
          pesoTotal += calcularPesoTotal(elemento.id, elemento.tipo, { recursive })
        }
      }
    })

    return pesoTotal
  }

  /**
   * Verifica si un elemento puede ser agregado sin exceder el peso máximo soportado
   *
   * NOTA: Esta validación se basa en el peso máximo teórico (pesoMaximo) de cada elemento,
   * que representa su capacidad de carga, no el peso físico real del elemento.
   *
   * @param {Object} nuevoElemento - Elemento que se intenta agregar
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre ('plantas', 'elementos', 'contenedores')
   * @returns {Object} { valido: boolean, pesoActual: number, pesoMaximo: number, exceso: number }
   */
  const validarPesoElemento = (nuevoElemento, padreId, padreType) => {
    // Obtener el peso del nuevo elemento
    const pesoNuevoElemento = Number(nuevoElemento.pesoMaximo || 0)

    // Calcular el peso actual total
    const pesoActualTotal = calcularPesoTotal(padreId, padreType)

    // Peso total después de agregar el nuevo elemento
    const pesoTotalFinal = pesoActualTotal + pesoNuevoElemento

    // Obtener el peso máximo soportado del padre
    let pesoMaximoSoportado = 0

    if (padreType === 'plantas') {
      const planta = canvasStore.plantaPorId(padreId)
      pesoMaximoSoportado = planta?.pesoMaximoSoportado || 0
    } else {
      const padre = canvasStore.elementoPorId(padreId)
      pesoMaximoSoportado = padre?.pesoMaximo || 0
    }

    // Si el peso máximo es 0 o no está definido, no hay límite
    if (pesoMaximoSoportado === 0) {
      return {
        valido: true,
        pesoActual: pesoActualTotal,
        pesoNuevo: pesoNuevoElemento,
        pesoTotal: pesoTotalFinal,
        pesoMaximo: pesoMaximoSoportado,
        exceso: 0,
        limiteDePeso: false,
      }
    }

    // Verificar si el peso total excede el máximo soportado
    const excesoDePeso = Math.max(0, pesoTotalFinal - pesoMaximoSoportado)
    const esValido = pesoTotalFinal <= pesoMaximoSoportado

    return {
      valido: esValido,
      pesoActual: pesoActualTotal,
      pesoNuevo: pesoNuevoElemento,
      pesoTotal: pesoTotalFinal,
      pesoMaximo: pesoMaximoSoportado,
      exceso: excesoDePeso,
      limiteDePeso: true,
    }
  }

  /**
   * Verifica si el elemento actual seleccionado puede ser movido a un nuevo padre
   * sin exceder el peso máximo soportado
   *
   * @param {string} destinoPadreId - ID del elemento/planta destino
   * @param {string} destinoTipo - Tipo del destino ('plantas', 'elementos', 'contenedores')
   * @returns {Object} { valido: boolean, pesoActual: number, pesoMaximo: number, exceso: number }
   */
  const validarMovimientoElemento = (destinoPadreId, destinoTipo) => {
    // Obtener el elemento seleccionado
    const elementoMovido = canvasStore.elementoSeleccionadoCompleto

    if (!elementoMovido) {
      return { valido: true, limiteDePeso: false }
    }

    // Verificar si el elemento ya está en este padre (en ese caso no habría cambio de peso)
    if (
      (destinoTipo === 'plantas' && elementoMovido.plantaId === destinoPadreId && !elementoMovido.padre) ||
      (elementoMovido.padre === destinoPadreId)
    ) {
      return { valido: true, limiteDePeso: false }
    }

    // Validar el peso como si se agregara un nuevo elemento
    return validarPesoElemento(elementoMovido, destinoPadreId, destinoTipo)
  }

  /**
   * Calcula el peso máximo teórico soportado disponible que queda en un contenedor/elemento/planta
   *
   * NOTA: Este cálculo se basa en la capacidad de carga teórica (pesoMaximo) de cada elemento,
   * no en el peso físico real de los elementos. La capacidad disponible representa cuánto peso teórico
   * adicional puede soportar el contenedor según la suma de las capacidades de carga de los elementos
   * que ya contiene.
   *
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre ('plantas', 'elementos', 'contenedores')
   * @returns {Object} { disponible: number, usado: number, maximo: number, porcentajeUsado: number }
   */
  const calcularPesoDisponible = (padreId, padreType) => {
    // Obtener el peso máximo soportado del padre
    let pesoMaximoSoportado = 0

    if (padreType === 'plantas') {
      const planta = canvasStore.plantaPorId(padreId)
      pesoMaximoSoportado = planta?.pesoMaximoSoportado || 0
    } else {
      const padre = canvasStore.elementoPorId(padreId)
      pesoMaximoSoportado = padre?.pesoMaximo || 0
    }

    // Si el peso máximo es 0 o no está definido, capacidad ilimitada
    if (pesoMaximoSoportado === 0) {
      return {
        disponible: Infinity,
        usado: 0,
        maximo: 0,
        porcentajeUsado: 0,
        limiteDePeso: false,
      }
    }

    // Calcular el peso actual usado
    const pesoUsado = calcularPesoTotal(padreId, padreType)

    // Calcular el peso disponible
    const pesoDisponible = Math.max(0, pesoMaximoSoportado - pesoUsado)

    // Calcular el porcentaje usado
    const porcentajeUsado = pesoMaximoSoportado > 0
      ? Math.min(100, (pesoUsado / pesoMaximoSoportado) * 100)
      : 0

    return {
      disponible: pesoDisponible,
      usado: pesoUsado,
      maximo: pesoMaximoSoportado,
      porcentajeUsado,
      limiteDePeso: true,
    }
  }

  /**
   * Determina si el contexto actual tiene un límite de peso
   */
  const contextoActualTieneLimiteDePeso = computed(() => {
    const { tipo, id } = canvasStore.contextoActual

    if (tipo === 'plantas') {
      const planta = canvasStore.plantaPorId(id)
      return planta && planta.pesoMaximoSoportado > 0
    } else {
      const elemento = canvasStore.elementoPorId(id)
      return elemento && elemento.pesoMaximo > 0
    }
  })

  /**
   * Información de peso para el contexto actual
   */
  const infoPesoContextoActual = computed(() => {
    const { tipo, id } = canvasStore.contextoActual
    return calcularPesoDisponible(id, tipo)
  })

  return {
    calcularPesoTotal,
    validarPesoElemento,
    validarMovimientoElemento,
    calcularPesoDisponible,
    contextoActualTieneLimiteDePeso,
    infoPesoContextoActual
  }
}
