/**
 * useAutoPaste.js
 *
 * Composable para pegar automáticamente elementos del buffer buscando
 * espacios disponibles que cumplan con todas las validaciones.
 *
 * Funcionalidades:
 * - Buscar espacios disponibles automáticamente
 * - Validar dimensiones del área según vista activa (XY/XZ)
 * - Soporte completo para polígonos de plantas con validación de límites
 * - Validar capacidad de peso
 * - Validar compatibilidad de ubicaciones (pared/suelo/etc)
 * - Evitar colisiones con otros elementos
 * - Considerar dimensiones apropiadas (ancho/largo/alto) según contexto
 * - Búsqueda adaptativa: Tamaño de grid adaptado al tamaño del elemento
 * - Caching de validaciones: Matriz de ocupación para filtros rápidos
 * - Respeta límites poligonales de plantas, marcando áreas externas como ocupadas
 * - Inicia búsqueda desde el centroide del polígono para mejor distribución
 */

import { useCanvasStore } from './useCanvasStore'
import { useCanvasBuffer } from './useCanvasBuffer'
import { useWeightValidation } from './useWeightValidation'
import { usePlacementGuards } from './usePlacementGuards'
import { useToast } from './useToast'
import { useLoader } from './useLoader'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { pointInPolygon } from '@/inventory-smart/utils/polygonBounds'
import { polygonInset } from '@/inventory-smart/utils/polygonInset'


export function useAutoPaste(placementSuggestionsSystem = null) {
  const canvasStore = useCanvasStore()
  const buffer = useCanvasBuffer()
  const weightValidation = useWeightValidation()
  const placementGuards = usePlacementGuards()
  const { showToast } = useToast()
  const { startLoading, stopLoading, isOperationInProgress } = useLoader()

  const pasteOffsetStep = { x: 16, y: 16 }
  let lastPasteContextKey = null
  let lastPasteAnchor = null
  let lastOffsetApplied = 0

  /**
   * Calcula el centroide de un polígono
   */
  const calculatePolygonCentroid = (polygon) => {
    if (!polygon || polygon.length === 0) return { x: 0, y: 0 }

    let sumX = 0
    let sumY = 0

    polygon.forEach(point => {
      sumX += point.x
      sumY += point.y
    })

    return {
      x: sumX / polygon.length,
      y: sumY / polygon.length
    }
  }

  /**
   * 4.1.2 Caching de validaciones - Crear matriz de ocupación
   * Crea una matriz optimizada que indica qué áreas están ocupadas
   * considerando las dimensiones apropiadas según la vista activa y polígonos
   */
  const createOccupancyGrid = (areaBounds, neighbors, gridResolution = 10) => {
    // 🛡️ VALIDACIÓN DE SEGURIDAD: Evitar valores inválidos que causen bucles infinitos
    if (!areaBounds ||
        !Number.isFinite(areaBounds.minX) ||
        !Number.isFinite(areaBounds.maxX) ||
        !Number.isFinite(areaBounds.minY) ||
        !Number.isFinite(areaBounds.maxY)) {
      console.error('❌ areaBounds inválido en createOccupancyGrid:', areaBounds)
      return {
        grid: [[false]],
        gridWidth: 1,
        gridHeight: 1,
        gridResolution: 10,
        areaBounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 }
      }
    }

    const areaWidth = areaBounds.maxX - areaBounds.minX
    const areaHeight = areaBounds.maxY - areaBounds.minY

    // 🛡️ VALIDACIÓN: Área debe ser positiva y razonable (máximo 100,000px)
    if (areaWidth <= 0 || areaHeight <= 0 || areaWidth > 100000 || areaHeight > 100000) {
      console.error('❌ Dimensiones de área inválidas:', { areaWidth, areaHeight })
      return {
        grid: [[false]],
        gridWidth: 1,
        gridHeight: 1,
        gridResolution: 10,
        areaBounds
      }
    }

    const gridWidth = Math.ceil(areaWidth / gridResolution)
    const gridHeight = Math.ceil(areaHeight / gridResolution)

    // 🛡️ VALIDACIÓN: Grid no debe exceder 1000x1000 (1 millón de celdas)
    const MAX_GRID_CELLS = 1000000
    if (gridWidth * gridHeight > MAX_GRID_CELLS) {
      console.error('❌ Grid demasiado grande:', { gridWidth, gridHeight, total: gridWidth * gridHeight })
      // Aumentar gridResolution para reducir tamaño del grid
      const newResolution = Math.ceil(Math.sqrt((areaWidth * areaHeight) / MAX_GRID_CELLS))
      return createOccupancyGrid(areaBounds, neighbors, newResolution)
    }

    // Inicializar matriz con false (libre)
    const grid = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false))

    // 🔥 OPTIMIZACIÓN CRÍTICA: Desactivar verificación de polígono en el grid
    // Esta verificación iteraba 10,000+ veces llamando a pointInPolygon() en cada iteración
    // tomando 13 segundos. La verificación de polígono ya se hace en isPositionValid()
    // por lo que esta pre-verificación es redundante y muy costosa.
    if (areaBounds.hasPolygon && areaBounds.insetPolygon) {
      // DESACTIVADO: Esta verificación tomaba 13 segundos
      // La verificación de polígono se hace más tarde en isPositionValid()
      /*
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const worldX = areaBounds.minX + x * gridResolution + gridResolution / 2
          const worldY = areaBounds.minY + y * gridResolution + gridResolution / 2

          // Si este punto de la grid está fuera del polígono, marcarlo como ocupado
          if (!pointInPolygon({ x: worldX, y: worldY }, areaBounds.insetPolygon)) {
            grid[y][x] = true
          }
        }
      }
      */
    }

    // Marcar áreas ocupadas por elementos vecinos
    neighbors.forEach(elemento => {
      // Obtener dimensiones apropiadas según la vista activa
      const elementDimensions = getElementDimensions(elemento)

      const startX = Math.floor((elemento.x - areaBounds.minX) / gridResolution)
      const startY = Math.floor((elemento.y - areaBounds.minY) / gridResolution)
      const endX = Math.ceil((elemento.x + elementDimensions.width - areaBounds.minX) / gridResolution)
      const endY = Math.ceil((elemento.y + elementDimensions.height - areaBounds.minY) / gridResolution)

      // Marcar área ocupada con márgenes de seguridad
      for (let y = Math.max(0, startY - 1); y < Math.min(gridHeight, endY + 1); y++) {
        for (let x = Math.max(0, startX - 1); x < Math.min(gridWidth, endX + 1); x++) {
          grid[y][x] = true
        }
      }
    })

    return { grid, gridWidth, gridHeight, gridResolution, areaBounds }
  }

  /**
   * Verifica si una posición está libre en la matriz de ocupación
   */
  const isOccupiedInGrid = (occupancyGrid, x, y, elementWidth, elementHeight) => {
    const { grid, gridResolution, areaBounds } = occupancyGrid

    const startGridX = Math.floor((x - areaBounds.minX) / gridResolution)
    const startGridY = Math.floor((y - areaBounds.minY) / gridResolution)
    const endGridX = Math.ceil((x + elementWidth - areaBounds.minX) / gridResolution)
    const endGridY = Math.ceil((y + elementHeight - areaBounds.minY) / gridResolution)

    // Verificar si alguna celda en el área está ocupada
    for (let gridY = Math.max(0, startGridY); gridY < Math.min(grid.length, endGridY); gridY++) {
      for (let gridX = Math.max(0, startGridX); gridX < Math.min(grid[0].length, endGridX); gridX++) {
        if (grid[gridY][gridX]) {
          return true // Ocupado
        }
      }
    }

    return false // Libre
  }

  /**
   * Obtiene las dimensiones apropiadas de un elemento según la vista activa
   */
  const getElementDimensions = (elemento) => {
    const vistaActiva = canvasStore.vistaActiva

    if (elemento.dimensiones) {
      if (vistaActiva === 'XY') {
        // Vista desde arriba: ancho=X, largo=Y
        const width = (elemento.dimensiones.ancho || 0) * CM_TO_PX
        const height = (elemento.dimensiones.largo || 0) * CM_TO_PX

        // 🛡️ VALIDACIÓN: Dimensiones deben ser finitas y positivas
        if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
          return { width, height }
        }
      } else if (vistaActiva === 'XZ') {
        // Vista frontal: ancho=X, alto=Y
        const width = (elemento.dimensiones.ancho || 0) * CM_TO_PX
        const height = (elemento.dimensiones.alto || 0) * CM_TO_PX

        // 🛡️ VALIDACIÓN: Dimensiones deben ser finitas y positivas
        if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
          return { width, height }
        }
      }
    }

    // Fallback a width/height si no hay dimensiones
    const width = elemento.width || 50 // Default mínimo de 50px
    const height = elemento.height || 50

    // 🛡️ VALIDACIÓN FINAL: Siempre retornar valores válidos
    return {
      width: Number.isFinite(width) && width > 0 ? width : 50,
      height: Number.isFinite(height) && height > 0 ? height : 50
    }
  }

  /**
   * Obtiene las dimensiones del área disponible en el contexto actual
   * considerando la vista activa (XY o XZ), las dimensiones apropiadas y el polígono de la planta
   */
  const getAreaBounds = (options = {}) => {
    const contexto = canvasStore.contextoActual
    const vistaActiva = canvasStore.vistaActiva
    const canvasAdaptativo = canvasStore.canvasAdaptativo
    const { startPosition = null, viewportSize = null, viewportWorld = null } = options || {}
    let bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    let polygonPoints = null
    let insetPolygon = null

    const isInfiniteFloor =
      contexto?.tipo === 'plantas' && canvasStore.plantaActivaData?.isInfinite === true

    if (isInfiniteFloor) {
      const zoom = canvasStore.zoom || 1
      const panX = canvasStore.panX || 0
      const panY = canvasStore.panY || 0

      const baseRect =
        viewportWorld &&
        Number.isFinite(viewportWorld.minX) &&
        Number.isFinite(viewportWorld.minY) &&
        Number.isFinite(viewportWorld.maxX) &&
        Number.isFinite(viewportWorld.maxY)
          ? viewportWorld
          : (() => {
              const widthScreen = viewportSize?.width ?? canvasAdaptativo?.width ?? 2000
              const heightScreen = viewportSize?.height ?? canvasAdaptativo?.height ?? 2000
              const safeZoom = zoom || 1
              const minX = (-panX) / safeZoom
              const minY = (-panY) / safeZoom
              const widthWorld = (widthScreen || 0) / safeZoom
              const heightWorld = (heightScreen || 0) / safeZoom
              return {
                minX,
                minY,
                maxX: minX + Math.max(1, widthWorld || 0),
                maxY: minY + Math.max(1, heightWorld || 0),
              }
            })()

      let { minX, minY, maxX, maxY } = baseRect

      const spanX = Math.max(1, maxX - minX)
      const spanY = Math.max(1, maxY - minY)
      const padX = Math.max(200, spanX * 0.25)
      const padY = Math.max(200, spanY * 0.25)

      minX -= padX
      maxX += padX
      minY -= padY
      maxY += padY

      if (startPosition) {
        const ensurePadX = Math.max(padX, spanX * 0.5)
        const ensurePadY = Math.max(padY, spanY * 0.5)
        minX = Math.min(minX, startPosition.x - ensurePadX)
        maxX = Math.max(maxX, startPosition.x + ensurePadX)
        minY = Math.min(minY, startPosition.y - ensurePadY)
        maxY = Math.max(maxY, startPosition.y + ensurePadY)
      }

      if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
        minX = -1000
        maxX = 1000
      }

      if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
        minY = -1000
        maxY = 1000
      }

      if (maxX <= minX) {
        const centerX = startPosition?.x ?? (minX + maxX) / 2
        const width = Math.max(spanX, 400)
        minX = centerX - width / 2
        maxX = centerX + width / 2
      }

      if (maxY <= minY) {
        const centerY = startPosition?.y ?? (minY + maxY) / 2
        const height = Math.max(spanY, 400)
        minY = centerY - height / 2
        maxY = centerY + height / 2
      }

      return {
        minX,
        minY,
        maxX,
        maxY,
        polygon: null,
        insetPolygon: null,
        hasPolygon: false,
        mode: 'elastic',
      }
    }

    if (contexto.tipo === 'plantas') {
      const planta = canvasStore.plantaPorId(contexto.id)
      // Intentar obtener el polígono de la planta primero
      if (planta?.poligono && Array.isArray(planta.poligono) && planta.poligono.length > 0) {
        // Los puntos ya están en pixeles, y solo se usa en vista aérea (XY)
        polygonPoints = planta.poligono.map(p => ({
          x: (p.x || 0),
          y: (p.y || 0)
        }))

        if (polygonPoints && polygonPoints.length > 0) {
          // Crear polígono con margen de seguridad (inset)
          insetPolygon = polygonInset(polygonPoints, 5) // 5px de margen

          // Calcular los límites rectangulares del polígono
          const xs = polygonPoints.map(p => p.x)
          const ys = polygonPoints.map(p => p.y)
          bounds.minX = Math.min(...xs)
          bounds.maxX = Math.max(...xs)
          bounds.minY = Math.min(...ys)
          bounds.maxY = Math.max(...ys)
        }
      }
      // Si no hay polígono, usar dimensiones rectangulares
      if (!polygonPoints && planta?.dimensiones) {
        if (vistaActiva === 'XY') {
          // Vista desde arriba: X=ancho, Y=largo
          bounds.maxX = (planta.dimensiones.ancho || 0) * CM_TO_PX
          bounds.maxY = (planta.dimensiones.largo || 0) * CM_TO_PX
        } else if (vistaActiva === 'XZ') {
          // Vista frontal: X=ancho, Y=alto
          bounds.maxX = (planta.dimensiones.ancho || 0) * CM_TO_PX
          bounds.maxY = (planta.dimensiones.alto || 0) * CM_TO_PX
        }
      }
    } else {
      const elemento = canvasStore.elementoPorId(contexto.id)
      if (elemento?.dimensiones) {
        // Usar las dimensiones reales del elemento según la vista
        if (vistaActiva === 'XY') {
          // Vista desde arriba: X=ancho, Y=largo
          bounds.maxX = (elemento.dimensiones.ancho || 0) * CM_TO_PX
          bounds.maxY = (elemento.dimensiones.largo || 0) * CM_TO_PX
        } else if (vistaActiva === 'XZ') {
          // Vista frontal: X=ancho, Y=alto
          bounds.maxX = (elemento.dimensiones.ancho || 0) * CM_TO_PX
          bounds.maxY = (elemento.dimensiones.alto || 0) * CM_TO_PX
        }
      } else if (elemento) {
        // Fallback a width/height si no hay dimensiones
        bounds.maxX = elemento.width || 0
        bounds.maxY = elemento.height || 0
      }
    }

    // Si no se pudieron determinar las dimensiones, usar el canvas adaptativo como límite
    if (bounds.maxX === 0 && bounds.maxY === 0 && canvasAdaptativo) {
      bounds.maxX = canvasAdaptativo.width || 0
      bounds.maxY = canvasAdaptativo.height || 0
    }

    return {
      ...bounds,
      polygon: polygonPoints,
      insetPolygon: insetPolygon,
      hasPolygon: !!polygonPoints && polygonPoints.length > 0,
      mode: 'fixed',
    }
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
      } else {
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
   * Actualizado para ser compatible con el sistema de sugerencias
   */
  const validatePlacement = (elemento, position, areaBounds) => {
    // 1. Verificar compatibilidad de ubicación
    if (!isLocationCompatible(elemento, canvasStore.contextoActual)) {
      return {
        valid: false,
        reason: `Elemento de ${elemento.ubicacion || 'suelo'} no compatible con el contexto actual`,
        canSuggest: false // No se pueden hacer sugerencias para incompatibilidad de ubicación
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
        reason: 'El elemento no cabe en la posición o colisiona con otros elementos',
        canSuggest: true // Se pueden sugerir ajustes de dimensiones
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
          reason: `Excedería el peso máximo soportado por ${resultadoValidacionPeso.exceso || 0} kg`,
          canSuggest: true, // Se pueden sugerir ajustes de peso
          weightExcess: resultadoValidacionPeso.exceso
        }
      }
    } catch (error) {
      console.warn('Error en validación de peso (ignorado):', error.message)
    }

    // 4. Usar los guards de placement para validación crítica
    try {
      const elementoConPosicion = { ...elemento, x: position.x, y: position.y }
      const guardResult = placementGuards.onDragMoveGuard(elementoConPosicion, position)

      if (guardResult && !guardResult.valid) {
        return {
          valid: false,
          reason: guardResult.reason || 'Posición inválida según las reglas de colocación',
          canSuggest: guardResult.canSuggest !== false // Por defecto true a menos que se especifique lo contrario
        }
      }
    } catch (error) {
      console.warn('Error en placement guards:', error.message)
      return {
        valid: false,
        reason: `Error en validación de placement: ${error.message}`,
        canSuggest: false // Errores de validación no permiten sugerencias
      }
    }

    return { valid: true }
  }

  /**
   * Busca automáticamente un espacio disponible para un elemento
   * considerando la vista activa y las dimensiones apropiadas
   */
  const findAvailableSpace = (elemento, areaBounds, startPosition = null) => {
    // 🛡️ VALIDACIÓN DE SEGURIDAD: Verificar areaBounds antes de procesar
    if (!areaBounds ||
        !Number.isFinite(areaBounds.minX) ||
        !Number.isFinite(areaBounds.maxX) ||
        !Number.isFinite(areaBounds.minY) ||
        !Number.isFinite(areaBounds.maxY)) {
      console.error('❌ areaBounds inválido en findAvailableSpace:', areaBounds)
      return { found: false }
    }

    // Obtener dimensiones del elemento según la vista activa
    const elementDimensions = getElementDimensions(elemento)
    const elementWidth = elementDimensions.width
    const elementHeight = elementDimensions.height

    // 🛡️ VALIDACIÓN: Element dimensions deben ser válidas
    if (!Number.isFinite(elementWidth) || !Number.isFinite(elementHeight) ||
        elementWidth <= 0 || elementHeight <= 0) {
      console.error('❌ Dimensiones de elemento inválidas:', { elementWidth, elementHeight })
      return { found: false }
    }

    const areaWidth = areaBounds.maxX - areaBounds.minX
    const areaHeight = areaBounds.maxY - areaBounds.minY

    // 🛡️ VALIDACIÓN: Área debe tener dimensiones válidas
    if (!Number.isFinite(areaWidth) || !Number.isFinite(areaHeight) ||
        areaWidth <= 0 || areaHeight <= 0) {
      console.error('❌ Dimensiones de área inválidas:', { areaWidth, areaHeight })
      return { found: false }
    }

    // Verificar que el elemento pueda caber en el área
    if (elementWidth > areaWidth || elementHeight > areaHeight) {
      return { found: false }
    }

    // Obtener elementos vecinos excluyendo el elemento actual
    const neighbors = canvasStore.elementosVisibles.filter(el => el.id !== elemento.id)

    // 4.1.1 Búsqueda adaptativa - Adaptar el tamaño de la cuadrícula al tamaño del elemento
    const adaptiveGridSize = Math.max(15, Math.min(elementWidth, elementHeight) / 3)
    const gridSize = Math.max(adaptiveGridSize, 20) // Mínimo de 20px para evitar grids muy pequeños

    // 4.1.2 Crear matriz de ocupación para optimizar validaciones
    const occupancyGrid = createOccupancyGrid(areaBounds, neighbors, Math.min(gridSize, 20))

    // Cache de validación de peso (solo validar una vez)
    let pesoValidoCache = null
    const isPesoValido = () => {
      if (pesoValidoCache !== null) return pesoValidoCache

      try {
        const resultadoValidacionPeso = weightValidation.validarPesoElemento(
          elemento,
          canvasStore.contextoActual.id,
          canvasStore.contextoActual.tipo
        )
        pesoValidoCache = resultadoValidacionPeso.valido
      } catch (error) {
        pesoValidoCache = false
      }
      return pesoValidoCache
    }

    // Cache de compatibilidad de ubicación (solo validar una vez)
    const esUbicacionCompatible = isLocationCompatible(elemento, canvasStore.contextoActual)

    // Función optimizada para verificar si una posición es válida
    const isPositionValid = (x, y) => {
      // 1. Verificar primero si estamos dentro del polígono (si existe)
      if (areaBounds.hasPolygon && areaBounds.insetPolygon) {
        // Verificar si las 4 esquinas del rectángulo están dentro del polígono
        const corners = [
          { x, y }, // Esquina superior izquierda
          { x: x + elementWidth, y }, // Esquina superior derecha
          { x, y: y + elementHeight }, // Esquina inferior izquierda
          { x: x + elementWidth, y: y + elementHeight } // Esquina inferior derecha
        ]

        // Si alguna esquina está fuera del polígono, rechazar posición
        const allCornersInside = corners.every(corner =>
          pointInPolygon(corner, areaBounds.insetPolygon)
        )

        if (!allCornersInside) return false
      }

      // 2. Verificación rápida usando matriz de ocupación
      if (isOccupiedInGrid(occupancyGrid, x, y, elementWidth, elementHeight)) {
        return false // Filtro rápido: área ocupada según la matriz
      }

      const position = { x, y }

      // 3. Verificar compatibilidad de ubicación (usa cache)
      if (!esUbicacionCompatible) {
        return false
      }

      // 4. Verificar que esté dentro del área y sin colisiones básicas
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

      // 5. Validar peso máximo (usa cache)
      if (!isPesoValido()) {
        return false
      }

      // 6. Validar placement guards (crítico para elementos de pared)
      try {
        // Crear elemento temporal solo cuando sea necesario
        const elementoTemporal = { ...elemento, x, y }
        const guardResult = placementGuards.onDragMoveGuard(elementoTemporal, position)

        if (guardResult && !guardResult.valid) {
          return false
        }

        return true
      } catch (error) {
        return false
      }
    }

    // Configurar posición inicial considerando polígono si existe
    let initialX, initialY

    if (startPosition) {
      const desiredX = startPosition.x - elementWidth / 2
      const desiredY = startPosition.y - elementHeight / 2
      initialX = Math.max(
        areaBounds.minX,
        Math.min(desiredX, areaBounds.maxX - elementWidth),
      )
      initialY = Math.max(
        areaBounds.minY,
        Math.min(desiredY, areaBounds.maxY - elementHeight),
      )
    } else if (areaBounds.hasPolygon && areaBounds.polygon) {
      // Si hay polígono, intentar usar su centroide como punto inicial
      const centroid = calculatePolygonCentroid(areaBounds.polygon)
      initialX = centroid.x - elementWidth / 2
      initialY = centroid.y - elementHeight / 2

      // Asegurar que la posición inicial esté dentro de los límites
      initialX = Math.max(areaBounds.minX, Math.min(initialX, areaBounds.maxX - elementWidth))
      initialY = Math.max(areaBounds.minY, Math.min(initialY, areaBounds.maxY - elementHeight))
    } else {
      // Fallback: centro del área rectangular
      initialX = Math.floor(areaWidth / 2) + areaBounds.minX
      initialY = Math.floor(areaHeight / 2) + areaBounds.minY
    }

    // Intentar posición inicial
    if (isPositionValid(initialX, initialY)) {
      return {
        found: true,
        position: { x: initialX, y: initialY }
      }
    }

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

    // 🔥 OPTIMIZACIÓN CRÍTICA: Incrementar grid size mínimo de 10px a 40px
    // y limitar iteraciones máximas para evitar bloqueos de 13 segundos
    const smallGridSize = Math.max(40, adaptiveGridSize / 2) // Era 10, ahora 40
    const MAX_ITERATIONS = 5000 // Límite de seguridad
    let iterations = 0

    // 🛡️ VALIDACIÓN: Verificar que smallGridSize no sea 0 o negativo
    if (!Number.isFinite(smallGridSize) || smallGridSize <= 0) {
      console.error('❌ smallGridSize inválido:', smallGridSize)
      return { found: false }
    }

    for (let y = areaBounds.minY; y <= areaBounds.maxY - elementHeight; y += smallGridSize) {
      // 🛡️ VALIDACIÓN: Prevenir bucles infinitos si y no incrementa
      if (!Number.isFinite(y)) {
        console.error('❌ Valor y inválido en búsqueda exhaustiva:', y)
        return { found: false }
      }

      for (let x = areaBounds.minX; x <= areaBounds.maxX - elementWidth; x += smallGridSize) {
        // 🛡️ VALIDACIÓN: Prevenir bucles infinitos si x no incrementa
        if (!Number.isFinite(x)) {
          console.error('❌ Valor x inválido en búsqueda exhaustiva:', x)
          return { found: false }
        }

        iterations++
        if (iterations > MAX_ITERATIONS) {
          console.warn(`⚠️ Búsqueda exhaustiva cancelada después de ${MAX_ITERATIONS} iteraciones`)
          return { found: false }
        }

        if (isPositionValid(x, y)) {
          return {
            found: true,
            position: { x, y }
          }
        }
      }
    }

    return { found: false }
  }

  /**
   * Pega automáticamente el primer elemento del buffer
   */
  const handlePaste = async (options = {}) => {
    // Verificar si ya hay una operación de pegado en progreso
    if (isOperationInProgress('paste')) {
      showToast('Ya hay una operación de pegado en curso. Espera a que termine.', 'warning')
      return false
    }

    let loadingId = null
    const { startPosition: providedStart = null, viewportSize = null, viewportWorld = null } = options || {}

    const contextKey = [
      canvasStore.contextoActual?.tipo || 'unknown',
      canvasStore.contextoActual?.id || 'unknown',
      canvasStore.plantaActiva || 'none',
    ].join(':')

    if (contextKey !== lastPasteContextKey) {
      lastPasteContextKey = contextKey
      lastPasteAnchor = null
      lastOffsetApplied = 0
    }

    const anchor =
      providedStart &&
      Number.isFinite(providedStart.x) &&
      Number.isFinite(providedStart.y)
        ? { x: providedStart.x, y: providedStart.y }
        : null

    let effectiveStart = anchor ? { ...anchor } : null
    let pendingOffsetCount = 0
    const OFFSET_THRESHOLD = 4

    if (anchor && lastPasteAnchor) {
      const dx = anchor.x - lastPasteAnchor.x
      const dy = anchor.y - lastPasteAnchor.y
      const distance = Math.hypot(dx, dy)
      if (distance < OFFSET_THRESHOLD) {
        pendingOffsetCount = lastOffsetApplied + 1
        effectiveStart = {
          x: anchor.x + pasteOffsetStep.x * pendingOffsetCount,
          y: anchor.y + pasteOffsetStep.y * pendingOffsetCount,
        }
      }
    }

    try {
      // Verificar que hay elementos en el buffer
      if (!buffer.hasItems.value) {
        showToast('No hay elementos en el portapapeles para pegar.', 'warning')
        return false
      }

      // Obtener el primer elemento del buffer
      const bufferItems = buffer.getBufferItems()
      const firstItem = bufferItems[0]

      if (!firstItem) {
        showToast('No fue posible leer el elemento del portapapeles.', 'error')
        return false
      }

      const elemento = firstItem.elemento

      // Iniciar loader con descripción específica
      loadingId = startLoading(
        'paste',
        null,
        `Pegando "${elemento.nombre || elemento.tipo}"...`
      )

      if (!loadingId) {
        showToast('No fue posible iniciar la operación de pegado.', 'error')
        return false
      }

      // Micro delay para que el loader se muestre (optimizado de 100ms a 10ms)
      await new Promise(resolve => setTimeout(resolve, 10))

      // Obtener límites del área actual
      const areaBounds = getAreaBounds({
        startPosition: anchor ?? effectiveStart ?? null,
        viewportSize,
        viewportWorld,
      })

      if (
        !Number.isFinite(areaBounds.minX) ||
        !Number.isFinite(areaBounds.maxX) ||
        !Number.isFinite(areaBounds.minY) ||
        !Number.isFinite(areaBounds.maxY)
      ) {
        showToast('No se pudieron determinar los límites del área actual.', 'error')
        return false
      }

      // Buscar espacio disponible
      const spaceResult = findAvailableSpace(
        elemento,
        areaBounds,
        effectiveStart || anchor || null,
      )

      if (!spaceResult.found) {
        const elementType = elemento.ubicacion === 'pared' ? 'de pared' : 'de suelo'
        showToast(
          `No se encontró espacio disponible para ${elementType} "${elemento.nombre || elemento.tipo}". Intenta mover otros elementos o ajustar el tamaño.`,
          'error',{ timeout: 4000 }
        )
        return false
      }

      // Validar la colocación en la posición encontrada
      const validation = validatePlacement(elemento, spaceResult.position, areaBounds)

      if (!validation.valid) {
        // Si hay sistema de sugerencias disponible y la validación permite sugerencias, intentar usarlo
        if (placementSuggestionsSystem && validation.canSuggest) {
          try {
            const success = await placementSuggestionsSystem.tryPlaceWithSuggestions(
              elemento,
              spaceResult.position,
              {
                areaBounds,
                neighbors: canvasStore.elementosVisibles,
                onSuccess: async (adjustedElement, position) => {
                  // Crear nuevo elemento con ajustes usando el buffer
                  const elementoId = buffer.pasteFromBufferWithAdjustments(firstItem.id, position, adjustedElement)
                  if (elementoId) {
                    const nombreElemento = adjustedElement.nombre || adjustedElement.tipo
                    showToast(`"${nombreElemento}" pegado con ajustes automáticos`, 'success', { timeout: 3000 })
                    canvasStore.seleccionarElemento(elementoId)

                    // Actualizar estado de pegado
                    lastPasteAnchor = anchor
                    lastOffsetApplied = pendingOffsetCount
                  }
                },
                onFailure: (reason) => {
                  showToast(`No se pudo pegar: ${reason}`, 'error', { timeout: 4000 })
                },
                autoApply: false // Mostrar modal de sugerencias
              }
            )

            return success
          } catch (error) {
            console.warn('Error en sistema de sugerencias:', error)
            // Continuar con el error original si falla el sistema de sugerencias
          }
        }

        // Si no hay sugerencias disponibles o no se pueden aplicar, mostrar error directo
        showToast(
          `No se pudo pegar: ${validation.reason}`,
          'error', { timeout: 4000 }
        )
        return false
      }

      // Pegar el elemento usando el buffer
      const elementoId = buffer.pasteFromBuffer(firstItem.id, spaceResult.position)

      if (elementoId) {
        const nombreElemento = elemento.nombre || elemento.tipo
        showToast(
          `"${nombreElemento}" pegado correctamente.`,
          'success', { timeout: 3000 }
        )

        // Seleccionar el elemento recién pegado
        canvasStore.seleccionarElemento(elementoId)
        // canvasStore.destacarElemento(elementoId)

        if (anchor) {
          lastPasteAnchor = { ...anchor }
          lastOffsetApplied = pendingOffsetCount
        } else if (effectiveStart) {
          lastPasteAnchor = { ...effectiveStart }
          lastOffsetApplied = pendingOffsetCount
        } else {
          lastPasteAnchor = null
          lastOffsetApplied = 0
        }
        lastPasteContextKey = contextKey

        return true
      } else {
        showToast('Error al pegar el elemento', 'error')
        return false
      }

    } catch (error) {
      showToast(
        `Error al pegar automáticamente: ${error.message}`,
        'error', { timeout: 4000 }
      )
      return false
    } finally {
      // Siempre detener el loader al finalizar
      if (loadingId) {
        stopLoading(loadingId)
      }
    }
  }

  /**
   * Intenta pegar múltiples elementos del buffer automáticamente
   */
  const handlePasteAll = async () => {
    // Verificar si ya hay una operación de pegado en progreso
    if (isOperationInProgress('paste') || isOperationInProgress('pasteAll')) {
      showToast('Ya hay una operación de pegado en progreso', 'warning')
      return
    }

    if (!buffer.hasItems.value) {
      showToast('No hay elementos en el buffer para pegar', 'warning')
      return
    }

    const bufferItems = buffer.getBufferItems()
    let loadingId = null

    try {
      // Iniciar loader para pegado múltiple
      loadingId = startLoading(
        'pasteAll',
        null,
        `Pegando ${bufferItems.length} elementos del buffer...`
      )

      if (!loadingId) {
        showToast('No se puede iniciar operación de pegado múltiple', 'error')
        return
      }

      let successCount = 0
      let failCount = 0

      // Nota: No usamos handlePaste() aquí para evitar múltiples loaders
      // En su lugar, procesamos cada elemento directamente
      for (let i = 0; i < bufferItems.length; i++) {
        const item = bufferItems[i]
        const elemento = item.elemento

        // Actualizar descripción del loader
        const currentLoader = loadingId
        if (currentLoader) {
          stopLoading(currentLoader)
          loadingId = startLoading(
            'pasteAll',
            null,
            `Pegando elemento ${i + 1} de ${bufferItems.length}: "${elemento.nombre || elemento.tipo}"`
          )
        }

        try {
          // Obtener límites del área actual
          const areaBounds = getAreaBounds()

          if (areaBounds.maxX === 0 || areaBounds.maxY === 0) {
            failCount++
            continue
          }

          // Buscar espacio disponible
          const spaceResult = findAvailableSpace(elemento, areaBounds)

          if (!spaceResult.found) {
            failCount++
            continue
          }

          // Validar la colocación
          const validation = validatePlacement(elemento, spaceResult.position, areaBounds)

          if (!validation.valid) {
            failCount++
            continue
          }

          // Pegar el elemento
          const elementoId = buffer.pasteFromBuffer(item.id, spaceResult.position)

          if (elementoId) {
            successCount++
            // Remover del buffer después de pegar exitosamente
            buffer.removeFromBuffer(item.id)
          } else {
            failCount++
          }

        } catch (error) {
          failCount++
        }
      }

      // Mostrar resultados
      if (successCount > 0) {
        showToast(
          `${successCount} elemento(s) pegado(s) automáticamente`,
          'success'
        )
      }

      if (failCount > 0) {
        showToast(
          `${failCount} elemento(s) no pudieron ser pegados`,
          'warning'
        )
      }

    } catch (error) {
      showToast(
        `Error en pegado múltiple: ${error.message}`,
        'error', { timeout: 4000 }
      )
    } finally {
      // Siempre detener el loader al finalizar
      if (loadingId) {
        stopLoading(loadingId)
      }
    }
  }

  return {
    handlePaste,
    handlePasteAll,
    findAvailableSpace,
    validatePlacement,
    isLocationCompatible,
    getAreaBounds,
    getElementDimensions,
    calculatePolygonCentroid,
    // Nuevas funciones de optimización
    createOccupancyGrid,
    isOccupiedInGrid
  }
}
