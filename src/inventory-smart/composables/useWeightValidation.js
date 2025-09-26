/**
 * useWeightValidation.js
 *
 * Composable para validaciones de peso en la jerarquía planta > elemento > contenedor.
 * Soporta dos tipos de validación:
 *
 * 1. VALIDACIÓN TEÓRICA (por defecto):
 *    - Basada en capacidades máximas (capacidadCarga)
 *    - Útil para planificación y límites estructurales
 *    - Evita configuraciones físicamente imposibles
 *
 * 2. VALIDACIÓN REAL:
 *    - Basada en uso actual (uso.peso)
 *    - Útil para operaciones diarias y consistencia de datos
 *    - Refleja el estado actual del sistema
 *
 * IMPORTANTE:
 * - Para plantas: 'capacidadCargaSoportado' es el peso máximo que puede soportar.
 * - Para elementos: 'capacidadCarga' es la capacidad de carga teórica, no su peso físico real.
 * - Para uso real: 'uso.peso' representa el peso actual utilizado en kg.
 *
 * Responsabilidades:
 * - Calcular pesos teóricos y reales de elementos hijos
 * - Validar si nuevos elementos pueden ser agregados
 * - Verificar consistencia entre capacidad y uso
 * - Proporcionar información de capacidad disponible
 */

import { computed } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore.js'

export function useWeightValidation() {
  const canvasStore = useCanvasStore()
  const isInfinitePlant = computed(() => canvasStore.estaEnPlanta && canvasStore.plantaActivaData?.isInfinite === true)

  /**
   * Calcula el peso máximo teórico total de todos los elementos hijos directos de un contenedor/elemento/planta
   *
   * NOTA: Este método suma los pesos máximos teóricos (capacidad de carga) de cada elemento,
   * no el peso físico real de cada elemento. Es decir, suma lo que cada elemento puede soportar,
   * no lo que cada elemento pesa en sí mismo.
   *
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre ('plantas', 'cuartos', 'pisos', 'elementos', 'contenedores')
   * @param {Object} options - Opciones adicionales
   * @param {boolean} options.recursive - Si es true, calcula recursivamente el peso de todos los descendientes
   * @param {string} options.excluirElementoId - ID del elemento a excluir del cálculo (útil al editar)
   * @returns {number} Peso máximo teórico total en kg
   */
  const calcularPesoTotal = (padreId, padreType, { recursive = false, excluirElementoId = null } = {}) => {
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
      // Excluir el elemento especificado si se proporciona
      if (excluirElementoId && elemento.id === excluirElementoId) {
        return // Saltar este elemento
      }

      const pesoElemento = Number(elemento.capacidadCarga || 0)

      if (!isNaN(pesoElemento)) {
        pesoTotal += pesoElemento

        // Si es recursivo, agregar también el peso de sus hijos
        if (recursive && elemento.hijos && elemento.hijos.length > 0) {
          pesoTotal += calcularPesoTotal(elemento.id, elemento.tipo, { recursive, excluirElementoId })
        }
      }
    })

    return pesoTotal
  }

  /**
   * Calcula el peso real total (uso actual) de todos los elementos hijos directos de un contenedor/elemento/planta
   *
   * NOTA: Este método suma solo los pesos reales usados (uso.peso) de cada elemento hijo directo,
   * SIN recursión, ya que se asume que el uso.peso de cada elemento ya incluye el peso de sus hijos.
   *
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre ('plantas', 'cuartos', 'pisos', 'elementos', 'contenedores')
   * @param {Object} options - Opciones adicionales (recursive se ignora para peso real)
   * @param {boolean} options.recursive - IGNORADO: El peso real no necesita recursión
   * @param {string} options.excluirElementoId - ID del elemento a excluir del cálculo (útil al editar)
   * @returns {number} Peso real total en kg
   */
  const calcularPesoRealTotal = (padreId, padreType, { recursive = false, excluirElementoId = null } = {}) => {
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

    // Sumar SOLO el peso real usado de cada elemento hijo directo
    // NO sumamos recursivamente porque uso.peso ya incluye el peso de los hijos
    elementosHijos.forEach(elemento => {
      // Excluir el elemento especificado si se proporciona
      if (excluirElementoId && elemento.id === excluirElementoId) {
        return // Saltar este elemento
      }

      const pesoElemento = Number(elemento.uso?.peso || 0)

      if (!isNaN(pesoElemento)) {
        pesoTotal += pesoElemento
        // NO agregamos recursión aquí porque uso.peso ya considera los hijos
      }
    })

    return pesoTotal
  }

  /**
   * Valida que el peso máximo teórico de un elemento no sea menor a su uso real actual
   *
   * @param {Object} elemento - Elemento a validar
   * @param {number} nuevoPesoMaximo - Nuevo peso máximo propuesto
   * @returns {Object} { valido: boolean, pesoUsoReal: number, capacidadCargaPropuesto: number, diferencia: number }
   */
  const validarPesoMaximoVsUsoReal = (elemento, nuevoPesoMaximo) => {
    // Obtener el peso real usado del elemento
    const pesoUsoReal = Number(elemento.uso?.peso || 0)
    const capacidadCargaPropuesto = Number(nuevoPesoMaximo || 0)

    // El peso máximo no puede ser menor al uso real actual
    const esValido = capacidadCargaPropuesto >= pesoUsoReal

    return {
      valido: esValido,
      pesoUsoReal,
      capacidadCargaPropuesto,
      diferencia: pesoUsoReal - capacidadCargaPropuesto,
      mensaje: esValido
        ? 'El peso máximo es válido'
        : `El peso máximo (${capacidadCargaPropuesto}kg) no puede ser menor al uso real actual (${pesoUsoReal}kg)`
    }
  }

  /**
   * Verifica si un elemento puede ser agregado sin exceder el peso máximo soportado
   *
   * NOTA: Esta validación puede ser teórica (capacidad máxima) o real (uso actual) según configuración.
   *
   * @param {Object} nuevoElemento - Elemento que se intenta agregar o editar
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre ('plantas', 'cuartos', 'pisos', 'elementos', 'contenedores')
   * @param {Object} options - Opciones de validación
   * @param {boolean} options.validacionTeorica - Si true, valida capacidad teórica máxima. Si false, valida solo uso real
   * @param {boolean} options.strict - Alias para validacionTeorica (mantiene compatibilidad)
   * @param {boolean} options.esEdicion - Si true, excluye el elemento actual del cálculo (para evitar doble conteo al editar)
   * @returns {Object} { valido: boolean, pesoActual: number, capacidadCarga: number, exceso: number }
   */
  const validarPesoElemento = (nuevoElemento, padreId, padreType, options = {}) => {
    // Normalizar opciones (permitir tanto 'strict' como 'validacionTeorica' por compatibilidad)
    const { validacionTeorica = options.strict ?? true, esEdicion = false } = options

    // Obtener el peso del nuevo elemento
    const pesoNuevoElemento = validacionTeorica
      ? Number(nuevoElemento.capacidadCarga || 0)  // Capacidad teórica
      : Number(nuevoElemento.uso?.peso || 0)   // Uso real

    // Calcular el peso actual total según el tipo de validación
    // Si es edición, excluir el elemento actual para evitar doble conteo
    const excluirElementoId = esEdicion ? nuevoElemento.id : null

    const pesoActualTotal = validacionTeorica
      ? calcularPesoTotal(padreId, padreType, { excluirElementoId })              // Suma capacidades teóricas
      : calcularPesoRealTotal(padreId, padreType, { excluirElementoId })          // Suma usos reales

    // Peso total después de agregar el nuevo elemento
    const pesoTotalFinal = pesoActualTotal + pesoNuevoElemento

    if (isInfinitePlant.value) {
      return {
        valido: true,
        pesoActual: pesoActualTotal,
        pesoNuevo: pesoNuevoElemento,
        pesoTotal: pesoTotalFinal,
        pesoMaximo: 0,
        exceso: 0,
        limiteDePeso: false,
        modoInfinito: true,
      }
    }

    // Obtener el peso máximo soportado del padre
    let capacidadCargaSoportado = 0

    if (padreType === 'plantas') {
      const planta = canvasStore.plantaPorId(padreId)
      capacidadCargaSoportado = planta?.capacidadCargaSoportado || 0
    } else {
      const padre = canvasStore.elementoPorId(padreId)
      capacidadCargaSoportado = padre?.capacidadCarga || 0
    }

    // Si el peso máximo es 0 o no está definido, no hay límite
    if (capacidadCargaSoportado === 0) {
      return {
        valido: true,
        pesoActual: pesoActualTotal,
        pesoNuevo: pesoNuevoElemento,
        pesoTotal: pesoTotalFinal,
        capacidadCarga: capacidadCargaSoportado,
        exceso: 0,
        limiteDePeso: false,
      }
    }

    // Verificar si el peso total excede el máximo soportado
    const excesoDePeso = Math.max(0, pesoTotalFinal - capacidadCargaSoportado)
    const esValido = pesoTotalFinal <= capacidadCargaSoportado

    return {
      valido: esValido,
      pesoActual: pesoActualTotal,
      pesoNuevo: pesoNuevoElemento,
      pesoTotal: pesoTotalFinal,
      capacidadCarga: capacidadCargaSoportado,
      exceso: excesoDePeso,
      limiteDePeso: true,
    }
  }

  /**
   * Calcula el peso máximo teórico soportado disponible que queda en un contenedor/elemento/planta
   *
   * NOTA: Este cálculo puede ser teórico (capacidad máxima) o real (uso actual) según configuración.
   *
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre ('plantas', 'cuartos', 'pisos', 'elementos', 'contenedores')
   * @param {Object} options - Opciones de cálculo
   * @param {boolean} options.validacionTeorica - Si true, calcula basado en capacidad teórica. Si false, en uso real
   * @returns {Object} { disponible: number, usado: number, maximo: number, porcentajeUsado: number }
   */
  const calcularPesoDisponible = (padreId, padreType, options = {}) => {
    const { validacionTeorica = true } = options
    // Calcular el peso actual usado
    const pesoUsado = validacionTeorica
      ? calcularPesoTotal(padreId, padreType)
      : calcularPesoRealTotal(padreId, padreType)

    if (isInfinitePlant.value) {
      return {
        disponible: Infinity,
        usado: pesoUsado,
        maximo: 0,
        porcentajeUsado: 0,
        limiteDePeso: false,
        modoInfinito: true,
      }
    }

    // Obtener el peso máximo soportado del padre
    let capacidadCargaSoportado = 0

    if (padreType === 'plantas') {
      const planta = canvasStore.plantaPorId(padreId)
      capacidadCargaSoportado = planta?.capacidadCargaSoportado || 0
    } else {
      const padre = canvasStore.elementoPorId(padreId)
      capacidadCargaSoportado = padre?.capacidadCarga || 0
    }

    // Si el peso máximo es 0 o no está definido, capacidad ilimitada
    if (capacidadCargaSoportado === 0) {
      return {
        disponible: Infinity,
        usado: pesoUsado,
        maximo: 0,
        porcentajeUsado: 0,
        limiteDePeso: false,
      }
    }

    // Calcular el peso disponible
    const pesoDisponible = Math.max(0, capacidadCargaSoportado - pesoUsado)

    // Calcular el porcentaje usado
    const porcentajeUsado = capacidadCargaSoportado > 0
      ? Math.min(100, (pesoUsado / capacidadCargaSoportado) * 100)
      : 0

    return {
      disponible: pesoDisponible,
      usado: pesoUsado,
      maximo: capacidadCargaSoportado,
      porcentajeUsado,
      limiteDePeso: true,
    }
  }

  /**
   * Valida que la capacidad máxima de un elemento sea suficiente para soportar a todos sus hijos
   *
   * @param {Object} elemento - Elemento a validar
   * @param {number} nuevoPesoMaximo - Nueva capacidad máxima propuesta
   * @returns {Object} { valido: boolean, pesoHijos: number, capacidadCargaPropuesto: number, deficit: number }
   */
  const validarCapacidadVsHijos = (elemento, nuevoPesoMaximo) => {
    const capacidadCargaPropuesto = Number(nuevoPesoMaximo || 0)

    // Si no hay límite de peso, siempre es válido
    if (capacidadCargaPropuesto === 0) {
      return {
        valido: true,
        pesoHijos: 0,
        capacidadCargaPropuesto,
        deficit: 0,
        sinLimite: true
      }
    }

    // Calcular peso total de hijos
    const pesoHijos = elemento.hijos && elemento.hijos.length > 0
      ? calcularPesoTotal(elemento.id, elemento.tipo)
      : 0

    // Verificar si la capacidad es suficiente
    const esValido = pesoHijos <= capacidadCargaPropuesto
    const deficit = Math.max(0, pesoHijos - capacidadCargaPropuesto)

    return {
      valido: esValido,
      pesoHijos,
      capacidadCargaPropuesto,
      deficit,
      sinLimite: false,
      mensaje: esValido
        ? 'La capacidad es suficiente para los elementos que contiene'
        : `La capacidad máxima (${capacidadCargaPropuesto}kg) es insuficiente para el máximo que pueden soportar los hijos (${pesoHijos}kg). Falta: ${deficit.toFixed(2)}kg.`
    }
  }

  /**
   * Función helper que valida tanto el peso teórico como el uso real
   * Útil para casos donde necesitas ambas validaciones
   *
   * @param {Object} elemento - Elemento a validar
   * @param {string} padreId - ID del elemento/planta padre
   * @param {string} padreType - Tipo del padre
   * @param {Object} options - Opciones adicionales
   * @param {boolean} options.esEdicion - Si true, indica que se está editando el elemento (excluye del cálculo)
   * @returns {Object} { validacionTeorica: Object, validacionReal: Object, ambasValidas: boolean }
   */
  const validarPesoCompleto = (elemento, padreId, padreType, options = {}) => {
    const { esEdicion = false } = options

    const validacionTeorica = validarPesoElemento(elemento, padreId, padreType, { validacionTeorica: true, esEdicion })
    const validacionReal = validarPesoElemento(elemento, padreId, padreType, { validacionTeorica: false, esEdicion })

    return {
      validacionTeorica,
      validacionReal,
      ambasValidas: validacionTeorica.valido && validacionReal.valido,
      tipoValidacion: {
        teorica: validacionTeorica.valido,
        real: validacionReal.valido
      }
    }
  }

  /**
   * Determina si el contexto actual tiene un límite de peso
   */
  const contextoActualTieneLimiteDePeso = computed(() => {
    const { tipo, id } = canvasStore.contextoActual

    if (isInfinitePlant.value) return false

    if (tipo === 'plantas') {
      const planta = canvasStore.plantaPorId(id)
      return planta && planta.capacidadCargaSoportado > 0
    } else {
      const elemento = canvasStore.elementoPorId(id)
      return elemento && elemento.capacidadCarga > 0
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
    calcularPesoRealTotal,
    validarPesoElemento,
    validarPesoCompleto,
    validarCapacidadVsHijos,
    calcularPesoDisponible,
    validarPesoMaximoVsUsoReal,
    contextoActualTieneLimiteDePeso,
    infoPesoContextoActual
  }
}
