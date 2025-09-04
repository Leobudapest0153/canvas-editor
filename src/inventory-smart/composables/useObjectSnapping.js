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
function detectSnap(movingElement, candidateX, candidateY, otherElements, pageBounds, snapDistance = SNAP_DISTANCE) {
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
        
  if (distance <= snapDistance) {
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
        
  if (distance <= snapDistance) {
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

  // Además, detectar snap contra los bordes de la página (si se proporcionan)
  if (pageBounds && (typeof pageBounds.width === 'number') && (typeof pageBounds.height === 'number')) {
    const W = pageBounds.width
    const H = pageBounds.height

    // Crear puntos de borde como objetos comparables
    const pageVLines = [
      { x: 0, label: 'page-left' },
      { x: W, label: 'page-right' },
      { x: W / 2, label: 'page-center' },
    ]

    const pageHLines = [
      { y: 0, label: 'page-top' },
      { y: H, label: 'page-bottom' },
      { y: H / 2, label: 'page-center' },
    ]

    // Vertical page lines
    for (const movingVLine of movingPoints.verticalLines) {
      for (const pV of pageVLines) {
  const distance = Math.abs(movingVLine.x - pV.x)
  if (distance <= snapDistance) {
          const priority = (movingVLine.label === 'center' || pV.label.includes('center')) ? 2 : 1
          if (!snapResult.snappedX || priority > snapResult.snapPriorityX) {
            const adjustment = pV.x - movingVLine.x
            snapResult.x = candidateX + adjustment
            snapResult.snappedX = true
            snapResult.snapPriorityX = priority
            if (priority > 1) snapResult.guides = snapResult.guides.filter(g => g.type !== 'vertical')

            // Crear guía hacia el borde de la página
            const guide = {
              type: 'vertical',
              x: pV.x,
              y1: Math.min(movingElement.y - GUIDE_EXTEND, 0),
              y2: Math.max(movingElement.y + movingElement.height + GUIDE_EXTEND, H),
              movingLabel: movingVLine.label,
              otherLabel: pV.label,
              otherElementId: '__page__'
            }
            snapResult.guides.push(guide)
          }
        }
      }
    }

    // Horizontal page lines
    for (const movingHLine of movingPoints.horizontalLines) {
      for (const pH of pageHLines) {
  const distance = Math.abs(movingHLine.y - pH.y)
  if (distance <= snapDistance) {
          const priority = (movingHLine.label === 'center' || pH.label.includes('center')) ? 2 : 1
          if (!snapResult.snappedY || priority > snapResult.snapPriorityY) {
            const adjustment = pH.y - movingHLine.y
            snapResult.y = candidateY + adjustment
            snapResult.snappedY = true
            snapResult.snapPriorityY = priority
            if (priority > 1) snapResult.guides = snapResult.guides.filter(g => g.type !== 'horizontal')

            const guide = {
              type: 'horizontal',
              y: pH.y,
              x1: Math.min(movingElement.x - GUIDE_EXTEND, 0),
              x2: Math.max(movingElement.x + movingElement.width + GUIDE_EXTEND, W),
              movingLabel: movingHLine.label,
              otherLabel: pH.label,
              otherElementId: '__page__'
            }
            snapResult.guides.push(guide)
          }
        }
      }
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
  function performSnap(movingElement, candidateX, candidateY, otherElements, pageBounds, options = {}) {
    if (!movingElement) {
      clearGuides()
      return { x: candidateX, y: candidateY }
    }

    // Pasar pageBounds a detectSnap; permitir que pageBounds genere guías aun si no hay otros elementos
  // Allow caller to override snap distance (e.g. make XZ more strict)
  const runtimeSnapDistance = (options && typeof options.snapDistance === 'number') ? options.snapDistance : snapDistance.value
  const snapResult = detectSnap(movingElement, candidateX, candidateY, otherElements || [], pageBounds, runtimeSnapDistance)
    
    // Actualizar guías activas
    activeGuides.value = snapResult.guides
    isSnapping.value = snapResult.snappedX || snapResult.snappedY

    // Si se pidió solo mostrar guías, no ajustar la posición final
    if (options && options.allowSnap === false) {
      return {
        x: candidateX,
        y: candidateY,
        snappedX: snapResult.snappedX,
        snappedY: snapResult.snappedY,
      }
    }

    return {
      x: snapResult.x,
      y: snapResult.y,
      snappedX: snapResult.snappedX,
      snappedY: snapResult.snappedY,
    }
  }
  
  /**
   * Limpia las guías activas
   */
  function clearGuides() {
    activeGuides.value = []
    isSnapping.value = false
  }
  
  // Retornar solo lo que se usa externamente (evitar exportar utilidades internas)
  return {
    activeGuides: computed(() => activeGuides.value),
    isSnapping: computed(() => isSnapping.value),
    performSnap,
    clearGuides,
  }
}
