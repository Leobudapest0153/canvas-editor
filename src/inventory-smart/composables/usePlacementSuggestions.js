/**
 * usePlacementSuggestions.js
 *
 * Composable para calcular sugerencias de ajuste automático cuando un elemento
 * no puede ser colocado debido a restricciones de espacio o capacidad.
 *
 * Responsabilidades:
 * - Calcular ajustes de dimensiones manteniendo proporción
 * - Calcular ajustes de capacidad consumida (peso efectivo)
 * - Validar si los ajustes propuestos son viables
 * - Nunca modificar entidades padre (piso/cuarto/planta)
 *
 * Flujo:
 * 1. Detectar fallo de validación con razón específica
 * 2. Calcular opciones de ajuste viables
 * 3. Retornar sugerencias con nuevos valores propuestos
 * 4. Si no hay opciones viables, retornar null
 */

import { useCanvasStore } from './useCanvasStore'
import { useWeightValidation } from './useWeightValidation'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import {
  validateHeightWithinWarehouse,
  validateZStacking,
  resolveCoplanarNeighbors,
} from '@/inventory-smart/validation/placementOrchestrator'

export function usePlacementSuggestions() {
  const canvasStore = useCanvasStore()
  const weightValidation = useWeightValidation()

  /**
   * Calcula el ratio de aspecto del elemento
   */
  const calculateAspectRatio = (elemento) => {
    const dims = elemento.dimensiones || {}
    const ancho = Number(dims.ancho || 0)
    const largo = Number(dims.largo || 0)
    const alto = Number(dims.alto || 0)

    return {
      xy: ancho > 0 && largo > 0 ? ancho / largo : 1,
      xz: ancho > 0 && alto > 0 ? ancho / alto : 1,
      yz: largo > 0 && alto > 0 ? largo / alto : 1,
    }
  }

  /**
   * Calcula dimensiones ajustadas que caben en el espacio disponible
   * manteniendo la proporción del elemento
   */
  const calculateDimensionAdjustment = (elemento, position, availableSpace, reason) => {
    const dims = elemento.dimensiones || {}
    const originalAncho = Number(dims.ancho || 0)
    const originalLargo = Number(dims.largo || 0)
    const originalAlto = Number(dims.alto || 0)



    if (originalAncho <= 0 || originalLargo <= 0 || originalAlto <= 0) {
      console.log('   ❌ Dimensiones inválidas, retornando null')
      return null // No se pueden ajustar dimensiones inválidas
    }

    const aspectRatio = calculateAspectRatio(elemento)
    const neighbors = canvasStore.elementosVisibles.filter(el => el.id !== elemento.id)


    // Calcular el centro del elemento original usando la posición de entrada
    // La posición que llega es la esquina superior izquierda para el elemento original
    const originalWidth = originalAncho * CM_TO_PX
    const originalHeight = originalLargo * CM_TO_PX
    const centerX = position.x + originalWidth / 2
    const centerY = position.y + originalHeight / 2


    // Determinar qué dimensiones necesitan ajuste según la razón
    let targetAncho = originalAncho
    let targetLargo = originalLargo
    let targetAlto = originalAlto

    // Intentar reducir dimensiones en incrementos del 10% hasta encontrar un ajuste válido
    for (let reduction = 0.9; reduction >= 0.3; reduction -= 0.1) {
      // Ajustar según el tipo de conflicto
      if (reason.includes('colisiona') || reason.includes('espacio')) {
        // Reducir ancho y largo manteniendo proporción XY
        targetAncho = Math.floor(originalAncho * reduction)
        targetLargo = Math.floor(originalLargo * reduction)
      }

      if (reason.includes('altura') || reason.includes('Conflicto de altura')) {
        // Reducir altura
        targetAlto = Math.floor(originalAlto * reduction)
      }



      // Recalcular posición para mantener el elemento centrado en el mismo punto
      const adjustedWidth = targetAncho * CM_TO_PX
      const adjustedHeight = targetLargo * CM_TO_PX
      const adjustedPosition = {
        x: centerX - adjustedWidth / 2,
        y: centerY - adjustedHeight / 2,
      }


      // Validar si las nuevas dimensiones funcionan
      const testElement = {
        ...elemento,
        x: adjustedPosition.x,
        y: adjustedPosition.y,
        dimensiones: {
          ancho: targetAncho,
          largo: targetLargo,
          alto: targetAlto,
        },
      }

      // Verificar colocación válida (sin colisiones)
      const placementCheck = isPlacementValid({
        pos: adjustedPosition,
        movingEl: testElement,
        neighbors,
        areaBounds: availableSpace,
        CM_TO_PX,
        epsPx: 0.5,
      })


      if (!placementCheck) continue

      // Verificar explícitamente que el elemento esté completamente dentro de los límites
      const elementRight = adjustedPosition.x + adjustedWidth
      const elementBottom = adjustedPosition.y + adjustedHeight
      const withinBounds =
        adjustedPosition.x >= availableSpace.minX &&
        adjustedPosition.y >= availableSpace.minY &&
        elementRight <= availableSpace.maxX &&
        elementBottom <= availableSpace.maxY

      if (!withinBounds) continue

      // Verificar altura dentro de bodega
      const planta = canvasStore.plantaPorId(canvasStore.plantaActiva)
      const ctx = {
        alturaBodega: planta?.dimensiones?.alto || 0,
        isInfinite: planta?.isInfinite === true,
      }

      const heightCheck = validateHeightWithinWarehouse(testElement, {}, ctx)
      if (!heightCheck.valid) continue

      // Verificar stacking Z
      const coplanarNeighbors = resolveCoplanarNeighbors(testElement, neighbors)
      const stackCheck = validateZStacking(testElement, {}, coplanarNeighbors, {}, ctx)
      if (!stackCheck.valid) continue

      // Si pasó todas las validaciones, retornar ajuste

      return {
        ancho: targetAncho,
        largo: targetLargo,
        alto: targetAlto,
        originalAncho,
        originalLargo,
        originalAlto,
        reductionPercent: Math.round((1 - reduction) * 100),
      }
    }


    return null // No se encontró ajuste viable
  }

  /**
   * Calcula ajuste de capacidad consumida (peso efectivo)
   * útil para elementos con nivel de llenado variable
   */
  const calculateWeightAdjustment = (elemento, padreId, padreType, excessWeight) => {
    const capacidadActual = Number(elemento.capacidadCarga || 0)
    const pesoUsoActual = Number(elemento.uso?.peso || 0)

    if (capacidadActual <= 0 || excessWeight <= 0) {
      return null // No hay ajuste posible
    }

    // Calcular cuánto peso puede reducirse
    const pesoDisponible = weightValidation.calcularPesoDisponible(padreId, padreType)

    if (!pesoDisponible || !pesoDisponible.limiteDePeso || pesoDisponible.modoInfinito) {
      return null // No hay límite de peso o está en modo infinito
    }

    // Calcular nuevo peso máximo que permitiría la colocación
    const nuevaCapacidad = Math.max(0, capacidadActual - excessWeight)

    // Verificar que el nuevo peso no sea menor que el uso actual
    if (nuevaCapacidad < pesoUsoActual) {
      return null // No se puede reducir por debajo del uso actual
    }

    // Calcular porcentaje de reducción
    const reductionPercent = Math.round(((capacidadActual - nuevaCapacidad) / capacidadActual) * 100)

    return {
      capacidadOriginal: capacidadActual,
      capacidadAjustada: nuevaCapacidad,
      reductionPercent,
      excesoEliminado: excessWeight,
    }
  }

  /**
   * Genera sugerencias de ajuste para un elemento que no puede ser colocado
   *
   * @param {Object} elemento - Elemento que se intenta colocar
   * @param {Object} position - Posición deseada {x, y}
   * @param {Object} validationResult - Resultado de la validación fallida
   * @param {Object} availableSpace - Espacio disponible (bounds)
   * @returns {Object|null} Sugerencias de ajuste o null si no hay opciones viables
   */
  const generatePlacementSuggestions = (elemento, position, validationResult, availableSpace) => {
    if (!validationResult || validationResult.valid) {
      return null // No hay error, no se necesitan sugerencias
    }

    const reason = validationResult.reason || ''
    const suggestions = {
      dimensionAdjustment: null,
      weightAdjustment: null,
      hasViableOptions: false,
    }

    // 1. Intentar ajuste de dimensiones si el problema es de espacio/colisión/altura
    if (
      reason.includes('colisiona') ||
      reason.includes('espacio') ||
      reason.includes('altura') ||
      reason.includes('Conflicto de altura') ||
      reason.includes('excede')
    ) {
      const dimAdjust = calculateDimensionAdjustment(elemento, position, availableSpace, reason)
      if (dimAdjust) {
        suggestions.dimensionAdjustment = dimAdjust
        suggestions.hasViableOptions = true
      }
    }

    // 2. Intentar ajuste de peso si el problema es de capacidad
    if (reason.includes('peso') || reason.includes('Excedería')) {
      // Extraer exceso de peso del mensaje si está disponible
      const excessMatch = reason.match(/(\d+(?:\.\d+)?)\s*kg/)
      const excessWeight = excessMatch ? parseFloat(excessMatch[1]) : 0

      if (excessWeight > 0) {
        const weightAdjust = calculateWeightAdjustment(
          elemento,
          canvasStore.contextoActual.id,
          canvasStore.contextoActual.tipo,
          excessWeight
        )

        if (weightAdjust) {
          suggestions.weightAdjustment = weightAdjust
          suggestions.hasViableOptions = true
        }
      }
    }

    return suggestions.hasViableOptions ? suggestions : null
  }

  /**
   * Aplica los ajustes sugeridos a un elemento
   *
   * @param {Object} elemento - Elemento original
   * @param {Object} suggestions - Sugerencias calculadas
   * @returns {Object} Elemento con ajustes aplicados
   */
  const applySuggestedAdjustments = (elemento, suggestions) => {
    const adjusted = { ...elemento }

    // Aplicar ajuste de dimensiones
    if (suggestions.dimensionAdjustment) {
      adjusted.dimensiones = {
        ...adjusted.dimensiones,
        ancho: suggestions.dimensionAdjustment.ancho,
        largo: suggestions.dimensionAdjustment.largo,
        alto: suggestions.dimensionAdjustment.alto,
      }
    }

    // Aplicar ajuste de peso
    if (suggestions.weightAdjustment) {
      adjusted.capacidadCarga = suggestions.weightAdjustment.capacidadAjustada
    }

    return adjusted
  }

  return {
    generatePlacementSuggestions,
    applySuggestedAdjustments,
    calculateDimensionAdjustment,
    calculateWeightAdjustment,
  }
}
