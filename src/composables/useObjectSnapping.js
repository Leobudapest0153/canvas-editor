/**
 * Composable para object snapping - detecta alineaciones entre elementos y proporciona snap automático
 * Optimizado para múltiples elementos y extensible a nuevos tipos de shapes
 */

import { ref, computed } from 'vue'

// Configuración del snapping
const SNAP_DISTANCE = 8 // píxeles de tolerancia para snap
const GUIDE_EXTEND = 50 // píxeles que se extienden las guías más allá de los elementos

/**
 * Obtiene los puntos de snap de un elemento (bordes y centro)
 * @param {Object} element - Elemento con x, y, width, height, forma
 * @returns {Object} - Objeto con arrays de líneas horizontales y verticales
 */
function getSnapPoints(element) {
  // Verificar que el elemento tiene las propiedades básicas necesarias
  if (!element || typeof element.x === 'undefined' || typeof element.y === 'undefined' || 
      typeof element.width === 'undefined' || typeof element.height === 'undefined') {
    return {
      verticalLines: [],
      horizontalLines: []
    }
  }
  
  const { x, y, width, height, forma } = element
  
  if (forma === 'circular') {
    const centerX = x + width / 2
    const centerY = y + height / 2
    const radius = Math.min(width, height) / 2
    
    return {
      verticalLines: [
        { x: x, label: 'left' },           // izquierda
        { x: centerX, label: 'center' },   // centro
        { x: x + width, label: 'right' }   // derecha
      ],
      horizontalLines: [
        { y: y, label: 'top' },            // arriba
        { y: centerY, label: 'center' },   // centro
        { y: y + height, label: 'bottom' } // abajo
      ]
    }
  }
  
  // Forma rectangular o por defecto
  const centerX = x + width / 2
  const centerY = y + height / 2
  
  return {
    verticalLines: [
      { x: x, label: 'left' },           // izquierda
      { x: centerX, label: 'center' },   // centro
      { x: x + width, label: 'right' }   // derecha
    ],
    horizontalLines: [
      { y: y, label: 'top' },            // arriba
      { y: centerY, label: 'center' },   // centro
      { y: y + height, label: 'bottom' } // abajo
    ]
  }
}

/**
 * Detecta snap en una posición candidata
 * @param {Object} movingElement - Elemento que se está moviendo
 * @param {Number} candidateX - Posición X candidata
 * @param {Number} candidateY - Posición Y candidata
 * @param {Array} otherElements - Otros elementos para comparar
 * @returns {Object} - Resultado del snap con posición ajustada y guías
 */
function detectSnap(movingElement, candidateX, candidateY, otherElements) {
  // Validar entrada
  if (!movingElement || !Array.isArray(otherElements) || 
      typeof candidateX !== 'number' || typeof candidateY !== 'number') {
    return {
      x: candidateX || 0,
      y: candidateY || 0,
      snappedX: false,
      snappedY: false,
      guides: []
    }
  }
  
  // Crear elemento temporal en la posición candidata
  const tempElement = {
    ...movingElement,
    x: candidateX,
    y: candidateY
  }
  
  const movingPoints = getSnapPoints(tempElement)
  const snapResult = {
    x: candidateX,
    y: candidateY,
    snappedX: false,
    snappedY: false,
    guides: [],
    snapPriorityX: 0, // 0 = no snap, 1 = edge, 2 = center
    snapPriorityY: 0
  }
  
  // Buscar snaps contra otros elementos
  for (const otherElement of otherElements) {
    if (otherElement.id === movingElement.id) continue
    
    const otherPoints = getSnapPoints(otherElement)
    
    // Detectar snap vertical (líneas verticales)
    for (const movingVLine of movingPoints.verticalLines) {
      for (const otherVLine of otherPoints.verticalLines) {
        const distance = Math.abs(movingVLine.x - otherVLine.x)
        
        if (distance <= SNAP_DISTANCE) {
          // Calcular prioridad (center > edge)
          const priority = (movingVLine.label === 'center' || otherVLine.label === 'center') ? 2 : 1
          
          // Solo aplicar si no hay snap o si tiene mayor prioridad
          if (!snapResult.snappedX || priority > snapResult.snapPriorityX) {
            // Calcular el ajuste necesario
            const adjustment = otherVLine.x - movingVLine.x
            snapResult.x = candidateX + adjustment
            snapResult.snappedX = true
            snapResult.snapPriorityX = priority
            
            // Limpiar guías verticales anteriores si hay nueva prioridad
            if (priority > 1) {
              snapResult.guides = snapResult.guides.filter(g => g.type !== 'vertical')
            }
            
            // Crear guía vertical
            const guide = createVerticalGuide(
              otherVLine.x,
              tempElement,
              otherElement,
              movingVLine.label,
              otherVLine.label
            )
            snapResult.guides.push(guide)
          }
        }
      }
    }
    
    // Detectar snap horizontal (líneas horizontales)
    for (const movingHLine of movingPoints.horizontalLines) {
      for (const otherHLine of otherPoints.horizontalLines) {
        const distance = Math.abs(movingHLine.y - otherHLine.y)
        
        if (distance <= SNAP_DISTANCE) {
          // Calcular prioridad (center > edge)
          const priority = (movingHLine.label === 'center' || otherHLine.label === 'center') ? 2 : 1
          
          // Solo aplicar si no hay snap o si tiene mayor prioridad
          if (!snapResult.snappedY || priority > snapResult.snapPriorityY) {
            // Calcular el ajuste necesario
            const adjustment = otherHLine.y - movingHLine.y
            snapResult.y = candidateY + adjustment
            snapResult.snappedY = true
            snapResult.snapPriorityY = priority
            
            // Limpiar guías horizontales anteriores si hay nueva prioridad
            if (priority > 1) {
              snapResult.guides = snapResult.guides.filter(g => g.type !== 'horizontal')
            }
            
            // Crear guía horizontal
            const guide = createHorizontalGuide(
              otherHLine.y,
              tempElement,
              otherElement,
              movingHLine.label,
              otherHLine.label
            )
            snapResult.guides.push(guide)
          }
        }
      }
    }
    
    // Si ya tenemos snap en ambos ejes, no necesitamos buscar más
    if (snapResult.snappedX && snapResult.snappedY) {
      break
    }
  }
  
  return snapResult
}

/**
 * Crea una guía vertical
 */
function createVerticalGuide(x, movingElement, otherElement, movingLabel, otherLabel) {
  const minY = Math.min(
    movingElement.y - GUIDE_EXTEND,
    otherElement.y - GUIDE_EXTEND
  )
  const maxY = Math.max(
    movingElement.y + movingElement.height + GUIDE_EXTEND,
    otherElement.y + otherElement.height + GUIDE_EXTEND
  )
  
  return {
    type: 'vertical',
    x,
    y1: minY,
    y2: maxY,
    movingLabel,
    otherLabel,
    otherElementId: otherElement.id
  }
}

/**
 * Crea una guía horizontal
 */
function createHorizontalGuide(y, movingElement, otherElement, movingLabel, otherLabel) {
  const minX = Math.min(
    movingElement.x - GUIDE_EXTEND,
    otherElement.x - GUIDE_EXTEND
  )
  const maxX = Math.max(
    movingElement.x + movingElement.width + GUIDE_EXTEND,
    otherElement.x + otherElement.width + GUIDE_EXTEND
  )
  
  return {
    type: 'horizontal',
    y,
    x1: minX,
    x2: maxX,
    movingLabel,
    otherLabel,
    otherElementId: otherElement.id
  }
}

/**
 * Hook principal para object snapping
 */
export function useObjectSnapping() {
  const activeGuides = ref([])
  const isSnapping = ref(false)
  
  // Configuración reactiva
  const snapDistance = ref(SNAP_DISTANCE)
  const guideExtend = ref(GUIDE_EXTEND)
  
  /**
   * Ejecuta detección de snap y actualiza guías
   * @param {Object} movingElement - Elemento que se mueve
   * @param {Number} candidateX - Posición X candidata
   * @param {Number} candidateY - Posición Y candidata  
   * @param {Array} otherElements - Otros elementos en el canvas
   * @returns {Object} - Posición final ajustada
   */
  function performSnap(movingElement, candidateX, candidateY, otherElements) {
    if (!movingElement || !otherElements?.length) {
      clearGuides()
      return { x: candidateX, y: candidateY }
    }
    
    const snapResult = detectSnap(movingElement, candidateX, candidateY, otherElements)
    
    // Actualizar guías activas
    activeGuides.value = snapResult.guides
    isSnapping.value = snapResult.snappedX || snapResult.snappedY
    
    return {
      x: snapResult.x,
      y: snapResult.y,
      snappedX: snapResult.snappedX,
      snappedY: snapResult.snappedY
    }
  }
  
  /**
   * Limpia las guías activas
   */
  function clearGuides() {
    activeGuides.value = []
    isSnapping.value = false
  }
  
  /**
   * Establece la distancia de snap
   */
  function setSnapDistance(distance) {
    snapDistance.value = Math.max(1, Math.min(50, distance))
  }
  
  /**
   * Establece la extensión de las guías
   */
  function setGuideExtend(extend) {
    guideExtend.value = Math.max(10, Math.min(200, extend))
  }
  
  // Computed para exponer configuración reactiva
  const config = computed(() => ({
    snapDistance: snapDistance.value,
    guideExtend: guideExtend.value
  }))
  
  return {
    // Estado
    activeGuides: computed(() => activeGuides.value),
    isSnapping: computed(() => isSnapping.value),
    config,
    
    // Métodos
    performSnap,
    clearGuides,
    setSnapDistance,
    setGuideExtend,
    
    // Utilidades para testing/debugging
    getSnapPoints,
    detectSnap
  }
}
