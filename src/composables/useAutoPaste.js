/**
 * useAutoPaste.js
 *
 * Composable para pegar automáticamente elementos del buffer buscando
 * espacios disponibles que cumplan con todas las validaciones.
 *
 * Funcionalidades:
 * - Buscar espacios disponibles automáticamente
 * - Validar dimensiones del área
 * - Validar capacidad de peso
 * - Validar compatibilidad de ubicaciones (pared/suelo/etc)
 * - Evitar colisiones con otros elementos
 */

import { useCanvasStore } from './useCanvasStore'
import { useCanvasBuffer } from './useCanvasBuffer'
import { useWeightValidation } from './useWeightValidation'
import { usePlacementGuards } from './usePlacementGuards'
import { useToast } from './useToast'
import { nudgePlace } from '@/utils/geometry'
import { detectConflictsFor } from '@/utils/collision'
import { isPlacementValid } from '@/utils/isPlacementValid'
import { CM_TO_PX } from '@/utils/constants'

export function useAutoPaste() {
  const canvasStore = useCanvasStore()
  const buffer = useCanvasBuffer()
  const weightValidation = useWeightValidation()
  const placementGuards = usePlacementGuards()
  const { showToast } = useToast()

  /**
   * Obtiene las dimensiones del área disponible en el contexto actual
   */
  const getAreaBounds = () => {
    const contexto = canvasStore.contextoActual
    let bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }

    if (contexto.tipo === 'plantas') {
      const planta = canvasStore.plantaPorId(contexto.id)
      if (planta?.dimensiones) {
        bounds.maxX = (planta.dimensiones.ancho || 0) * CM_TO_PX
        bounds.maxY = (planta.dimensiones.largo || 0) * CM_TO_PX
      }
    } else if (contexto.tipo === 'elementos' || contexto.tipo === 'contenedores') {
      const elemento = canvasStore.elementoPorId(contexto.id)
      if (elemento) {
        bounds.maxX = elemento.width || 0
        bounds.maxY = elemento.height || 0
      }
    }

    return bounds
  }

  /**
   * Verifica si un elemento puede ser colocado en el contexto actual
   * considerando la compatibilidad de ubicaciones
   */
  const isLocationCompatible = (elemento, contexto) => {
    const elementUbic = elemento.ubicacion || 'suelo'

    // Elementos de pared solo pueden ir en contextos que soporten pared
    if (elementUbic === 'pared') {
      // Si estamos en una planta, verificar que tenga paredes
      if (contexto.tipo === 'plantas') {
        return true // Las plantas pueden tener elementos de pared
      }

      // Si estamos dentro de un elemento, verificar que el padre soporte pared
      if (contexto.tipo === 'elementos' || contexto.tipo === 'contenedores') {
        const elementoPadre = canvasStore.elementoPorId(contexto.id)
        const padreUbic = elementoPadre?.ubicacion || 'suelo'

        // Pared puede ir en pared o en suelo (como pared interior)
        return padreUbic === 'pared' || padreUbic === 'suelo'
      }
    }

    // Elementos de suelo pueden ir en cualquier contexto
    if (elementUbic === 'suelo') {
      return true
    }

    // Otros tipos de ubicación por defecto son compatibles
    return true
  }

  /**
   * Valida si un elemento puede ser pegado en una posición específica
   */
  const validatePlacement = (elemento, position, areaBounds) => {
    // 1. Verificar compatibilidad de ubicación
    if (!isLocationCompatible(elemento, canvasStore.contextoActual)) {
      return {
        valid: false,
        reason: `Elemento de ${elemento.ubicacion || 'suelo'} no compatible con el contexto actual`
      }
    }

    // 2. Verificar que quepa en el área
    if (!isPlacementValid({
      pos: position,
      movingEl: elemento,
      neighbors: canvasStore.elementosVisibles.filter(el => el.id !== elemento.id),
      areaBounds,
      CM_TO_PX,
      epsPx: 0.5
    })) {
      return {
        valid: false,
        reason: 'El elemento no cabe en la posición o colisiona con otros elementos'
      }
    }

    // 3. Validar peso máximo
    try {
      const resultadoValidacionPeso = weightValidation.validarPesoElemento(
        elemento,
        canvasStore.contextoActual.id,
        canvasStore.contextoActual.tipo
      )

      if (!resultadoValidacionPeso.valido) {
        return {
          valid: false,
          reason: `Excedería el peso máximo soportado por ${resultadoValidacionPeso.exceso || 0} kg`
        }
      }
    } catch (error) {
      console.warn('⚠️ Error en validación de peso (ignorado):', error.message)
    }

    // 4. Usar los guards de placement para validación crítica
    try {
      const elementoConPosicion = { ...elemento, x: position.x, y: position.y }
      const guardResult = placementGuards.onDragMoveGuard(elementoConPosicion, position)

      if (guardResult && !guardResult.valid) {
        return {
          valid: false,
          reason: guardResult.reason || 'Posición inválida según las reglas de colocación'
        }
      }
    } catch (error) {
      console.warn('⚠️ Error en placement guards:', error.message)
      return {
        valid: false,
        reason: `Error en validación de placement: ${error.message}`
      }
    }

    return { valid: true }
  }

  /**
   * Busca automáticamente un espacio disponible para un elemento
   */
  const findAvailableSpace = (elemento, areaBounds, startPosition = null) => {
    const elementWidth = elemento.width || 0
    const elementHeight = elemento.height || 0
    const areaWidth = areaBounds.maxX - areaBounds.minX
    const areaHeight = areaBounds.maxY - areaBounds.minY

    console.log('🔍 Buscando espacio para:', {
      elemento: elemento.nombre || elemento.tipo,
      ubicacion: elemento.ubicacion || 'suelo',
      dimensiones: { width: elementWidth, height: elementHeight },
      area: { width: areaWidth, height: areaHeight }
    })

    // Verificar que el elemento pueda caber en el área
    if (elementWidth > areaWidth || elementHeight > areaHeight) {
      console.warn('🚫 Elemento demasiado grande para el área disponible')
      return { found: false }
    }

    // Obtener elementos vecinos excluyendo el elemento actual
    const neighbors = canvasStore.elementosVisibles.filter(el => el.id !== elemento.id)    // Función para verificar si una posición es válida
    const isPositionValid = (x, y) => {
      const position = { x, y }

      // Crear elemento temporal con la nueva posición
      const elementoTemporal = { ...elemento, x, y }

      // 1. Verificar compatibilidad de ubicación
      if (!isLocationCompatible(elemento, canvasStore.contextoActual)) {
        return false
      }

      // 2. Verificar que esté dentro del área y sin colisiones básicas
      if (!isPlacementValid({
        pos: position,
        movingEl: elemento,
        neighbors,
        areaBounds,
        CM_TO_PX,
        epsPx: 0.5
      })) {
        return false
      }

      // 3. Validar peso máximo
      try {
        const resultadoValidacionPeso = weightValidation.validarPesoElemento(
          elemento,
          canvasStore.contextoActual.id,
          canvasStore.contextoActual.tipo
        )

        if (!resultadoValidacionPeso.valido) {
          return false
        }
      } catch (error) {
        // Si falla la validación de peso, considerar inválido
        return false
      }

      // 4. Validar placement guards (crítico para elementos de pared)
      try {
        const guardResult = placementGuards.onDragMoveGuard(elementoTemporal, position)

        if (guardResult && !guardResult.valid) {
          // Para debugging, logear solo en casos específicos
          if (elemento.ubicacion === 'pared') {
            console.log('🚫 Placement guard failed for wall element:', {
              position,
              reason: guardResult.reason,
              element: elemento.nombre || elemento.tipo
            })
          }
          return false
        }

        return true
      } catch (error) {
        console.warn('⚠️ Error en placement guards durante búsqueda:', error.message)
        return false
      }
    }    // Configurar posición inicial (centro del área si no se especifica)
    let initialX = Math.floor(areaWidth / 2) + areaBounds.minX
    let initialY = Math.floor(areaHeight / 2) + areaBounds.minY

    if (startPosition) {
      initialX = Math.max(areaBounds.minX, Math.min(startPosition.x, areaBounds.maxX - elementWidth))
      initialY = Math.max(areaBounds.minY, Math.min(startPosition.y, areaBounds.maxY - elementHeight))
    }

    // Intentar posición inicial
    if (isPositionValid(initialX, initialY)) {
      return {
        found: true,
        position: { x: initialX, y: initialY }
      }
    }

    // Búsqueda sistemática en grid
    const gridSize = 25 // Tamaño de la grilla
    const maxRadius = Math.max(areaWidth, areaHeight) / gridSize

    // Búsqueda en espiral desde el centro
    for (let radius = 1; radius <= maxRadius; radius++) {
      const step = gridSize
      const currentRadius = radius * step

      // Generar puntos en espiral alrededor de la posición inicial
      const spiralPoints = []

      // Arriba
      for (let i = -radius; i <= radius; i++) {
        const x = initialX + i * step
        const y = initialY - currentRadius
        if (x >= areaBounds.minX && x <= areaBounds.maxX - elementWidth &&
            y >= areaBounds.minY && y <= areaBounds.maxY - elementHeight) {
          spiralPoints.push({ x, y })
        }
      }

      // Derecha
      for (let i = -radius + 1; i <= radius; i++) {
        const x = initialX + currentRadius
        const y = initialY + i * step
        if (x >= areaBounds.minX && x <= areaBounds.maxX - elementWidth &&
            y >= areaBounds.minY && y <= areaBounds.maxY - elementHeight) {
          spiralPoints.push({ x, y })
        }
      }

      // Abajo
      for (let i = radius - 1; i >= -radius; i--) {
        const x = initialX + i * step
        const y = initialY + currentRadius
        if (x >= areaBounds.minX && x <= areaBounds.maxX - elementWidth &&
            y >= areaBounds.minY && y <= areaBounds.maxY - elementHeight) {
          spiralPoints.push({ x, y })
        }
      }

      // Izquierda
      for (let i = radius - 1; i >= -radius + 1; i--) {
        const x = initialX - currentRadius
        const y = initialY + i * step
        if (x >= areaBounds.minX && x <= areaBounds.maxX - elementWidth &&
            y >= areaBounds.minY && y <= areaBounds.maxY - elementHeight) {
          spiralPoints.push({ x, y })
        }
      }

      // Probar cada punto en esta distancia
      for (const point of spiralPoints) {
        if (isPositionValid(point.x, point.y)) {
          return {
            found: true,
            position: { x: point.x, y: point.y }
          }
        }
      }
    }

    // Si no encuentra espacio en espiral, intentar búsqueda exhaustiva en grid más pequeño
    console.log('🔍 Búsqueda espiral sin éxito, intentando búsqueda exhaustiva...')

    const smallGridSize = 15
    let attempts = 0
    for (let y = areaBounds.minY; y <= areaBounds.maxY - elementHeight; y += smallGridSize) {
      for (let x = areaBounds.minX; x <= areaBounds.maxX - elementWidth; x += smallGridSize) {
        attempts++
        if (isPositionValid(x, y)) {
          console.log(`✅ Espacio encontrado en búsqueda exhaustiva después de ${attempts} intentos:`, { x, y })
          return {
            found: true,
            position: { x, y }
          }
        }
      }
    }

    console.warn(`🚫 No se encontró espacio disponible en toda el área después de ${attempts} intentos`)
    console.warn('🔍 Detalles del fallo:', {
      elemento: elemento.nombre || elemento.tipo,
      ubicacion: elemento.ubicacion || 'suelo',
      dimensiones: { width: elementWidth, height: elementHeight },
      areaBounds,
      vecinos: neighbors.length
    })
    return { found: false }
  }

  /**
   * Pega automáticamente el primer elemento del buffer
   */
  const handlePaste = async () => {
    try {
      // Verificar que hay elementos en el buffer
      if (!buffer.hasItems.value) {
        showToast('No hay elementos en el buffer para pegar', { type: 'warning' })
        return false
      }

      // Obtener el primer elemento del buffer
      const bufferItems = buffer.getBufferItems()
      const firstItem = bufferItems[0]

      if (!firstItem) {
        showToast('No se pudo obtener el elemento del buffer', { type: 'error' })
        return false
      }

      const elemento = firstItem.elemento

      // Obtener límites del área actual
      const areaBounds = getAreaBounds()

      if (areaBounds.maxX === 0 || areaBounds.maxY === 0) {
        showToast('No se pueden determinar los límites del área actual', { type: 'error' })
        return false
      }

      console.log('🔍 Iniciando pegado automático:', {
        elemento: elemento.nombre || elemento.tipo,
        ubicacion: elemento.ubicacion || 'suelo',
        contexto: canvasStore.contextoActual,
        areaBounds,
        dimensiones: { width: elemento.width, height: elemento.height }
      })

      // Buscar espacio disponible
      const spaceResult = findAvailableSpace(elemento, areaBounds)

      if (!spaceResult.found) {
        const elementType = elemento.ubicacion === 'pared' ? 'de pared' : 'de suelo'
        showToast(
          `No se encontró espacio disponible para elemento ${elementType} "${elemento.nombre || elemento.tipo}"`,
          { type: 'error', timeout: 4000 }
        )
        return false
      }

      console.log('✅ Espacio encontrado:', spaceResult.position)

      // Validar la colocación en la posición encontrada
      const validation = validatePlacement(elemento, spaceResult.position, areaBounds)

      if (!validation.valid) {
        showToast(
          `No se puede pegar: ${validation.reason}`,
          { type: 'error', timeout: 4000 }
        )
        return false
      }

      // Pegar el elemento usando el buffer
      const elementoId = buffer.pasteFromBuffer(firstItem.id, spaceResult.position)

      if (elementoId) {
        const nombreElemento = elemento.nombre || elemento.tipo
        showToast(
          `"${nombreElemento}" pegado automáticamente`,
          { type: 'success', timeout: 3000 }
        )

        // Seleccionar el elemento recién pegado
        canvasStore.seleccionarElemento(elementoId)

        console.log('✅ Elemento pegado exitosamente:', {
          elementoId,
          posicion: spaceResult.position,
          nombre: nombreElemento
        })

        return true
      } else {
        showToast('Error al pegar el elemento', { type: 'error' })
        return false
      }

    } catch (error) {
      console.error('❌ Error en pegado automático:', error)
      showToast(
        `Error al pegar automáticamente: ${error.message}`,
        { type: 'error', timeout: 4000 }
      )
      return false
    }
  }

  /**
   * Intenta pegar múltiples elementos del buffer automáticamente
   */
  const handlePasteAll = async () => {
    if (!buffer.hasItems.value) {
      showToast('No hay elementos en el buffer para pegar', { type: 'warning' })
      return
    }

    const bufferItems = buffer.getBufferItems()
    let successCount = 0
    let failCount = 0

    for (const item of bufferItems) {
      const success = await handlePaste()
      if (success) {
        successCount++
        // Remover del buffer después de pegar exitosamente
        buffer.removeFromBuffer(item.id)
      } else {
        failCount++
      }
    }

    if (successCount > 0) {
      showToast(
        `${successCount} elemento(s) pegado(s) automáticamente`,
        { type: 'success' }
      )
    }

    if (failCount > 0) {
      showToast(
        `${failCount} elemento(s) no pudieron ser pegados`,
        { type: 'warning' }
      )
    }
  }

  return {
    handlePaste,
    handlePasteAll,
    findAvailableSpace,
    validatePlacement,
    isLocationCompatible,
    getAreaBounds
  }
}
