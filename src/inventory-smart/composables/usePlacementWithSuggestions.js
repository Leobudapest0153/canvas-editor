/**
 * usePlacementWithSuggestions.js
 *
 * Composable que integra el sistema de validación existente con el sistema
 * de sugerencias automáticas. Coordina el flujo UX completo:
 *
 * 1. Intenta colocar elemento normalmente
 * 2. Si falla, calcula sugerencias de ajuste
 * 3. Muestra modal de sugerencias si hay opciones viables
 * 4. Aplica ajustes si el usuario acepta
 * 5. Muestra alerta final si no hay opciones
 */

import { ref } from 'vue'
import { useCanvasStore } from './useCanvasStore'
import { usePlacementSuggestions } from './usePlacementSuggestions'
import { useWeightValidation } from './useWeightValidation'
import { usePlacementGuards } from './usePlacementGuards'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'

export function usePlacementWithSuggestions() {
  const canvasStore = useCanvasStore()
  const suggestionSystem = usePlacementSuggestions()
  const weightValidation = useWeightValidation()
  const placementGuards = usePlacementGuards()

  // Estado del modal de sugerencias
  const showSuggestionsModal = ref(false)
  const currentSuggestions = ref(null)
  const currentElement = ref(null)
  const currentPosition = ref(null)
  const currentReason = ref('')
  const pendingCallback = ref(null)

  /**
   * Valida si un elemento puede ser colocado en una posición
   * Retorna objeto con valid, reason, y suggestions (si aplica)
   */
  const validatePlacement = (elemento, position, neighbors, areaBounds) => {
    // 1. Verificar dimensiones y colisiones básicas
    const placementCheck = isPlacementValid({
      pos: position,
      movingEl: elemento,
      neighbors,
      areaBounds,
      CM_TO_PX,
      epsPx: 0.5,
    })

    if (!placementCheck) {
      return {
        valid: false,
        reason: 'El elemento no cabe en la posición o colisiona con otros elementos',
        canSuggest: true,
      }
    }

    // 2. Validar peso máximo
    try {
      const resultadoValidacionPeso = weightValidation.validarPesoElemento(
        elemento,
        canvasStore.contextoActual.id,
        canvasStore.contextoActual.tipo
      )

      if (!resultadoValidacionPeso.valido) {
        return {
          valid: false,
          reason: `Excedería el peso máximo soportado por ${resultadoValidacionPeso.exceso || 0} kg`,
          canSuggest: true,
          weightExcess: resultadoValidacionPeso.exceso,
        }
      }
    } catch (error) {
      console.warn('Error en validación de peso:', error.message)
    }

    // 3. Usar placement guards para validación crítica
    try {
      const elementoConPosicion = { ...elemento, x: position.x, y: position.y }
      const guardResult = placementGuards.onDragMoveGuard(elementoConPosicion, position)

      if (guardResult && !guardResult.valid) {
        return {
          valid: false,
          reason: guardResult.reason || 'Posición inválida según las reglas de colocación',
          canSuggest: guardResult.canSuggest !== false, // Por defecto true
        }
      }
    } catch (error) {
      console.warn('Error en placement guards:', error.message)
      return {
        valid: false,
        reason: `Error en validación: ${error.message}`,
        canSuggest: false,
      }
    }

    return { valid: true }
  }

  /**
   * Intenta colocar un elemento con soporte para sugerencias automáticas
   *
   * @param {Object} elemento - Elemento a colocar
   * @param {Object} position - Posición {x, y}
   * @param {Object} options - Opciones adicionales
   * @param {Object} options.areaBounds - Bounds del área disponible
   * @param {Array} options.neighbors - Elementos vecinos
   * @param {Function} options.onSuccess - Callback a ejecutar si la colocación es exitosa
   * @param {Function} options.onFailure - Callback a ejecutar si la colocación falla definitivamente
   * @param {Boolean} options.autoApply - Si true, aplica primera sugerencia sin mostrar modal
   * @returns {Promise<boolean>} True si se colocó o se mostró modal de sugerencias
   */
  const tryPlaceWithSuggestions = async (elemento, position, options = {}) => {
    const {
      areaBounds = null,
      neighbors = null,
      onSuccess = null,
      onFailure = null,
      autoApply = false, // Si true, aplica primera sugerencia sin mostrar modal
    } = options

    // Obtener vecinos si no se proporcionaron
    const elementNeighbors = neighbors || canvasStore.elementosVisibles.filter(el => el.id !== elemento.id)

    // Obtener área disponible si no se proporcionó
    const availableSpace = areaBounds || {
      minX: 0,
      minY: 0,
      maxX: (canvasStore.plantaActivaData?.dimensiones?.ancho || 1000) * CM_TO_PX,
      maxY: (canvasStore.plantaActivaData?.dimensiones?.largo || 1000) * CM_TO_PX,
    }



    // 1. Validar colocación
    const validationResult = validatePlacement(elemento, position, elementNeighbors, availableSpace)

    // Si es válido, ejecutar callback de éxito
    if (validationResult.valid) {
      if (onSuccess) {
        await onSuccess(elemento, position)
      }
      return true
    }

    // 2. Si no es válido pero puede tener sugerencias, calcularlas
    if (validationResult.canSuggest) {
      const suggestions = suggestionSystem.generatePlacementSuggestions(
        elemento,
        position,
        validationResult,
        availableSpace
      )

      // Si hay sugerencias viables
      if (suggestions && suggestions.hasViableOptions) {
        // Si autoApply está activo, aplicar directamente
        if (autoApply) {
          const adjustedElement = suggestionSystem.applySuggestedAdjustments(elemento, suggestions)
          if (onSuccess) {
            await onSuccess(adjustedElement, position)
          }
          return true
        }

        // Mostrar modal de sugerencias
        return new Promise((resolve) => {
          currentSuggestions.value = suggestions
          currentElement.value = elemento
          currentPosition.value = position
          currentReason.value = validationResult.reason
          showSuggestionsModal.value = true

          // Guardar callbacks
          pendingCallback.value = {
            onSuccess: async (adjustedElement, adjustedPosition) => {
              if (onSuccess) {
                await onSuccess(adjustedElement, adjustedPosition)
              }
              resolve(true)
            },
            onCancel: () => {
              if (onFailure) {
                onFailure(validationResult.reason)
              }
              resolve(false)
            },
          }
        })
      }
    }

    // 3. No hay sugerencias viables, ejecutar callback de fallo
    if (onFailure) {
      onFailure(validationResult.reason)
    }
    return false
  }

  /**
   * Maneja la aceptación de sugerencias desde el modal
   */
  const handleAcceptSuggestions = async (suggestions) => {


    showSuggestionsModal.value = false

    if (!currentElement.value || !suggestions) {
      console.warn('⚠️ [SUGGESTIONS-2] No hay elemento o sugerencias, abortando')
      return
    }

    // Aplicar ajustes al elemento
    const adjustedElement = suggestionSystem.applySuggestedAdjustments(
      currentElement.value,
      suggestions
    )


    // Recalcular posición centrada con las nuevas dimensiones
    // La posición original era la esquina superior izquierda calculada para centrar el elemento original
    // Ahora necesitamos ajustar para mantener el centro en el mismo punto con las nuevas dimensiones
    const originalDims = currentElement.value.dimensiones || {}
    const adjustedDims = adjustedElement.dimensiones || {}

    const originalWidth = (originalDims.ancho || 100) * CM_TO_PX
    const originalHeight = (originalDims.largo || 60) * CM_TO_PX
    const adjustedWidth = (adjustedDims.ancho || 100) * CM_TO_PX
    const adjustedHeight = (adjustedDims.largo || 60) * CM_TO_PX



    // Calcular el centro del elemento original
    const originalCenterX = currentPosition.value.x + originalWidth / 2
    const originalCenterY = currentPosition.value.y + originalHeight / 2


    // Calcular nueva posición (esquina superior izquierda) para mantener el mismo centro
    const adjustedPosition = {
      x: originalCenterX - adjustedWidth / 2,
      y: originalCenterY - adjustedHeight / 2,
    }


    // Ejecutar callback de éxito con la posición ajustada
    if (pendingCallback.value?.onSuccess) {
  await pendingCallback.value.onSuccess(adjustedElement, adjustedPosition)
    }

    // Limpiar estado
    resetSuggestionsState()
  }

  /**
   * Maneja la cancelación de sugerencias desde el modal
   */
  const handleCancelSuggestions = () => {
    showSuggestionsModal.value = false

    // Ejecutar callback de cancelación
    if (pendingCallback.value?.onCancel) {
      pendingCallback.value.onCancel()
    }

    // Limpiar estado
    resetSuggestionsState()
  }

  /**
   * Limpia el estado del sistema de sugerencias
   */
  const resetSuggestionsState = () => {
    currentSuggestions.value = null
    currentElement.value = null
    currentPosition.value = null
    currentReason.value = ''
    pendingCallback.value = null
  }

  return {
    // Estado del modal
    showSuggestionsModal,
    currentSuggestions,
    currentElement,
    currentReason,

    // Métodos principales
    tryPlaceWithSuggestions,
    validatePlacement,

    // Handlers del modal
    handleAcceptSuggestions,
    handleCancelSuggestions,

    // Utilidades
    resetSuggestionsState,
  }
}
