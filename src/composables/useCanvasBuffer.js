/**
 * useCanvasBuffer.js
 *
 * Composable para manejar el buffer/clipboard de elementos del canvas.
 *
 * Funcionalidades:
 * - Almacenar elementos temporalmente en buffer
 * - Mover elementos entre plantas
 * - Restaurar elementos a su ubicación original
 * - Drag & drop desde buffer al canvas
 * - Gestión de estado del buffer
 */

import { ref, computed } from 'vue'
import { useCanvasStore } from './useCanvasStore'
import { useWeightValidation } from './useWeightValidation'
import { CM_TO_PX } from '@/utils/constants'
import { useToast } from './useToast'


// Estado global del buffer (singleton)
const bufferItems = ref([])

export const useCanvasBuffer = () => {
  const canvasStore = useCanvasStore()
  const weightValidation = useWeightValidation()
  const { showToast } = useToast()

  // Computed properties
  const hasItems = computed(() => bufferItems.value.length > 0)
  const itemCount = computed(() => bufferItems.value.length)

  /**
   * Crear un item del buffer con metadata de origen
   */
  const createBufferItem = (elemento, sourceInfo = {}) => {
    const currentTimestamp = Date.now()
    return {
      id: `buffer_${currentTimestamp}_${Math.random().toString(36).substr(2, 9)}`,
      originalId: elemento.id,
      elemento: JSON.parse(JSON.stringify(elemento)), // Deep clone
      sourceInfo: {
        plantaId: elemento.plantaId || canvasStore.plantaActiva,
        position: { x: elemento.x, y: elemento.y },
        timestamp: currentTimestamp,
        copiedAt: new Date(currentTimestamp).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        ...sourceInfo,
      },
      addedToBuffer: currentTimestamp,
    }
  }

  /**
   * Clonar elemento con todos sus hijos recursivamente
   * Genera nuevos IDs únicos para evitar conflictos
   * Retorna un objeto con el elemento principal y todos los elementos de la estructura
   */
  const cloneElementWithChildren = (elementoId, offsetX = 0, offsetY = 0) => {
    const elemento = canvasStore.elementoPorId(elementoId)
    if (!elemento) {
      console.warn('⚠️ Elemento no encontrado para clonar:', elementoId)
      return null
    }

    // Mapeo de IDs originales a nuevos IDs y elementos clonados
    const idMapping = new Map()
    const allClonedElements = new Map() // ID clonado -> elemento clonado
    const baseTimestamp = Date.now()
    let counter = 0

    // Función recursiva para clonar un elemento y sus hijos
    const cloneElementRecursive = (elem, parentNewId = null, level = 0) => {
      // Generar nuevo ID único con timestamp incremental y sufijo aleatorio
      const uniqueTimestamp = baseTimestamp + counter
      const randomSuffix = Math.random().toString(36).substr(2, 9)
      const newId = `${elem.tipo || elem.categoria || 'elemento'}_${uniqueTimestamp}_${randomSuffix}`
      idMapping.set(elem.id, newId)
      counter++

      // Clonar el elemento
      const clonedElement = {
        ...JSON.parse(JSON.stringify(elem)), // Deep clone
        id: newId,
        x: elem.x + offsetX,
        y: elem.y + offsetY,
        padre: parentNewId, // Asignar nuevo padre si corresponde
        hijos: [], // Se llenará después con los nuevos IDs
      }

      // Limpiar propiedades que se manejarán según el contexto
      if (level === 0) {
        // Solo para el elemento raíz, limpiar plantaId y padre
        delete clonedElement.plantaId
        clonedElement.padre = null
      }

      // Guardar elemento clonado usando ID clonado como clave
      allClonedElements.set(newId, clonedElement)

      // Si el elemento tiene hijos, clonarlos recursivamente
      if (elem.hijos && elem.hijos.length > 0) {
        console.log(`📋 Clonando ${elem.hijos.length} hijos para ${elem.nombre || elem.tipo}`)

        for (const hijoId of elem.hijos) {
          const hijo = canvasStore.elementoPorId(hijoId)
          if (hijo) {
            const clonedChild = cloneElementRecursive(hijo, newId, level + 1)
            if (clonedChild) {
              clonedElement.hijos.push(clonedChild.id)
            }
          }
        }
      }

      console.log(`📋 Elemento clonado nivel ${level}:`, {
        original: elem.id,
        nuevo: newId,
        nombre: elem.nombre || elem.tipo,
        hijos: clonedElement.hijos.length,
        padre: clonedElement.padre
      })

      return clonedElement
    }    // Iniciar clonado recursivo
    const rootClonedElement = cloneElementRecursive(elemento, null, 0)

    if (rootClonedElement) {
      console.log('📋 Estructura clonada completa:', {
        elementoOriginal: elemento.nombre || elemento.tipo,
        elementosProcesados: idMapping.size,
        mapeoIds: Array.from(idMapping.entries())
      })

      return {
        rootElement: rootClonedElement,
        allElements: allClonedElements,
        idMapping: idMapping
      }
    }

    return null
  }

  /**
   * Agregar elemento al buffer
   */
  const addToBuffer = (elemento, sourceInfo = {}) => {
    if (!elemento) {
      console.warn('⚠️ No se puede agregar elemento vacío al buffer')
      return false
    }

    // Verificar si el elemento ya está en el buffer
    const existingIndex = bufferItems.value.findIndex((item) => item.originalId === elemento.id)

    if (existingIndex !== -1) {
      // Actualizar elemento existente en buffer
      const updatedItem = createBufferItem(elemento, sourceInfo)
      bufferItems.value[existingIndex] = updatedItem
      console.log('📋 Elemento actualizado en buffer:', updatedItem.elemento.nombre)
    } else {
      // Agregar nuevo elemento al buffer
      const bufferItem = createBufferItem(elemento, sourceInfo)
      bufferItems.value.push(bufferItem)
      console.log('📋 Elemento agregado al buffer:', bufferItem.elemento.nombre)
    }

    return true
  }

  /**
   * Copiar estructura completa al buffer (elemento + todos sus hijos recursivamente)
   */
  const copyToBuffer = (elementoId, description = 'Estructura copiada al buffer') => {
    const elemento = canvasStore.elementoPorId(elementoId)
    if (!elemento) {
      console.warn('⚠️ Elemento no encontrado para copiar al buffer:', elementoId)
      return false
    }

    // Clonar la estructura completa
    const clonedStructure = cloneElementWithChildren(elementoId)
    if (!clonedStructure) {
      console.error('⚠️ Error al clonar la estructura del elemento')
      return false
    }

    const sourceInfo = {
      action: 'copied',
      description,
      originalPlanta: elemento.plantaId,
      originalPosition: { x: elemento.x, y: elemento.y },
      isStructure: true, // Marca que es una estructura completa
      childrenCount: elemento.hijos ? elemento.hijos.length : 0,
      allElements: clonedStructure.allElements, // Guardar todos los elementos de la estructura
    }

    const success = addToBuffer(clonedStructure.rootElement, sourceInfo)
    if (success) {
      const totalElements = countElementsInStructure(elemento)
      console.log('📋 Estructura copiada al buffer:', {
        elemento: elemento.nombre || elemento.tipo,
        elementosProcesados: totalElements,
        hijos: elemento.hijos ? elemento.hijos.length : 0
      })

      // Mostrar mensaje de éxito
      if (typeof window !== 'undefined' && window.__toasts?.show) {
          const nombreElemento = elemento.nombre || elemento.tipo
          const mensaje = totalElements > 1
            ? `Estructura "${nombreElemento}" copiada (${totalElements} elementos)`
            : `Elemento "${nombreElemento}" copiado al portapapeles`
          showToast(mensaje, { type: 'info' })
      }
    } else {
      console.error('⚠️ Error al copiar la estructura al buffer')
    }

    return success
  }

  /**
   * Contar elementos en una estructura de forma recursiva
   */
  const countElementsInStructure = (elemento) => {
    let count = 1 // El elemento actual

    if (elemento.hijos && elemento.hijos.length > 0) {
      for (const hijoId of elemento.hijos) {
        const hijo = canvasStore.elementoPorId(hijoId)
        if (hijo) {
          count += countElementsInStructure(hijo)
        }
      }
    }

    return count
  }

  /**
   * Pegar estructura de forma recursiva respetando la jerarquía
   */
  const pasteStructureRecursive = (elementoToPaste, position, allElementsMap, parentId = null) => {
    // Crear el elemento en la posición especificada
    const newElement = {
      ...elementoToPaste,
      x: position.x,
      y: position.y,
      padre: parentId,
      hijos: [] // Reiniciar hijos, se agregarán después
    }

    // Limpiar propiedades que el store manejará
    if (!parentId) {
      // Solo para el elemento raíz
      delete newElement.plantaId
      newElement.padre = null
    }

    // Ajustar dimensiones para contenedores si estamos en un elemento
    if (canvasStore.contextoActual.tipo === 'elementos' && elementoToPaste.tipo === 'contenedores') {
      const elementoPadre = canvasStore.elementoContenedorActual
      if (elementoPadre && elementoPadre.dimensiones && elementoPadre.dimensiones.largo) {
        const largoPadreCm = elementoPadre.dimensiones.largo

        if (!newElement.dimensiones) {
          newElement.dimensiones = {
            ancho: newElement.width ? Math.round(newElement.width / CM_TO_PX) : 10,
            largo: largoPadreCm,
            alto: newElement.height ? Math.round(newElement.height / CM_TO_PX) : 10
          }
        } else {
          newElement.dimensiones.largo = largoPadreCm
        }

        if (canvasStore.vistaActiva === 'XY') {
          newElement.height = largoPadreCm * CM_TO_PX
        }
      }
    }

    let newElementId

    if (!parentId) {
      // Para el elemento raíz, usar agregarElemento normal que respeta el contexto
      newElementId = canvasStore.agregarElemento(newElement)
    } else {
      // Para los hijos, agregar directamente sin depender del contexto
      newElementId = addElementDirectly(newElement, parentId)
    }

    if (!newElementId) {
      console.error('⚠️ Error al agregar elemento al canvas:', newElement)
      return null
    }

    console.log('📋 Elemento agregado:', {
      original: elementoToPaste.id,
      nuevo: newElementId,
      nombre: elementoToPaste.nombre || elementoToPaste.tipo,
      padre: parentId
    })

    // Agregar hijos recursivamente
    if (elementoToPaste.hijos && elementoToPaste.hijos.length > 0) {
      console.log(`📋 Agregando ${elementoToPaste.hijos.length} hijos para ${elementoToPaste.nombre || elementoToPaste.tipo}`)

      for (const hijoId of elementoToPaste.hijos) {
        const hijoElement = allElementsMap.get(hijoId)
        if (hijoElement) {
          // Calcular posición del hijo (mantener posición relativa)
          const childPosition = {
            x: hijoElement.x,
            y: hijoElement.y
          }

          const childNewId = pasteStructureRecursive(hijoElement, childPosition, allElementsMap, newElementId)
          if (childNewId) {
            console.log('📋 Hijo agregado:', {
              padre: elementoToPaste.nombre || elementoToPaste.tipo,
              hijo: hijoElement.nombre || hijoElement.tipo,
              hijoId: childNewId
            })
          }
        } else {
          console.warn('⚠️ Elemento hijo no encontrado en mapa:', hijoId)
        }
      }
    }

    return newElementId
  }

  /**
   * Agregar elemento directamente sin depender del contexto de navegación
   */
  const addElementDirectly = (elemento, parentId) => {
    // Configurar relación padre-hijo
    if (parentId) {
      console.log('📋 addElementDirectly - parentId:', parentId)

      // Buscar el padre directamente en el array de elementos del store
      if (!canvasStore.elementos) {
        console.error('⚠️ canvasStore.elementos es undefined')
        return null
      }

      const padreIndex = canvasStore.elementos.findIndex(el => el.id === parentId)
      if (padreIndex === -1) {
        console.error('⚠️ Padre no encontrado:', parentId)
        return null
      }

      const padre = canvasStore.elementos[padreIndex]

      // Configurar elemento hijo
      elemento.padre = parentId
      elemento.plantaId = padre.plantaId // Hereda la planta del padre

      // Agregar al array de elementos globales
      canvasStore.elementos.push(elemento)

      // Inicializar array de hijos si no existe
      if (!padre.hijos) {
        padre.hijos = []
      }

      // Agregar al array de hijos del padre
      padre.hijos.push(elemento.id)

      console.log('📋 Elemento agregado directamente como hijo:', {
        padre: padre.nombre || padre.tipo,
        hijo: elemento.nombre || elemento.tipo,
        hijoId: elemento.id,
        totalHijos: padre.hijos.length
      })

      return elemento.id
    }

    return null
  }

  /**
   * Regenerar IDs únicos para una estructura antes del pegado
   */
  const regenerateUniqueIds = (allElementsMap) => {
    const newIdMapping = new Map()
    const newElementsMap = new Map()
    const baseTimestamp = Date.now()
    let counter = 0

    // Primero, generar todos los nuevos IDs únicos
    for (const [oldId, element] of allElementsMap) {
      const uniqueTimestamp = baseTimestamp + counter
      const randomSuffix = Math.random().toString(36).substr(2, 9)
      const newId = `${element.tipo || element.categoria || 'elemento'}_${uniqueTimestamp}_${randomSuffix}`
      newIdMapping.set(oldId, newId)
      counter++

      console.log('🔄 ID regenerado:', {
        original: oldId,
        nuevo: newId,
        elemento: element.nombre || element.tipo
      })
    }

    // Luego, crear los elementos con los nuevos IDs y referencias actualizadas
    for (const [oldId, element] of allElementsMap) {
      const newId = newIdMapping.get(oldId)
      const newElement = {
        ...JSON.parse(JSON.stringify(element)), // Deep clone
        id: newId,
        hijos: element.hijos ? element.hijos.map(hijoId => newIdMapping.get(hijoId)).filter(Boolean) : [],
        padre: element.padre ? newIdMapping.get(element.padre) : null
      }

      newElementsMap.set(newId, newElement)
    }

    return { newElementsMap, newIdMapping }
  }

  /**
   * Pegar estructura completa desde buffer al canvas actual
   */
  const pasteFromBuffer = (bufferItemId, position = { x: 100, y: 100 }) => {
    const bufferItem = bufferItems.value.find((item) => item.id === bufferItemId)
    if (!bufferItem) {
      console.warn('⚠️ Item no encontrado en buffer:', bufferItemId)
      return false
    }

    const { elemento, sourceInfo } = bufferItem

    // Validar peso máximo para el elemento principal
    const resultadoValidacionPeso = weightValidation.validarPesoElemento(
      elemento,
      canvasStore.contextoActual.id,
      canvasStore.contextoActual.tipo
    )

    if (!resultadoValidacionPeso.valido) {
      console.warn('⚠️ No se puede pegar: excedería el peso máximo soportado', resultadoValidacionPeso)

      if (typeof window !== 'undefined' && window.__toasts?.show) {
        showToast(
          `No se puede pegar: excedería el peso máximo soportado por ${resultadoValidacionPeso.exceso} kg`,
          { type: 'error', timeout: 3000 }
        )
      }

      return false
    }

    // Verificar si es una estructura con elementos hijos
    if (sourceInfo.isStructure && sourceInfo.allElements) {
      console.log('📋 Pegando estructura completa con', sourceInfo.allElements.size, 'elementos')

      // REGENERAR IDs únicos para cada pegado
      const { newElementsMap, newIdMapping } = regenerateUniqueIds(sourceInfo.allElements)

      // Obtener el elemento raíz con el nuevo ID
      const originalRootId = elemento.id
      const newRootId = newIdMapping.get(originalRootId)
      const newRootElement = newElementsMap.get(newRootId)

      if (!newRootElement) {
        console.error('⚠️ Error al regenerar IDs para el elemento raíz')
        return false
      }

      // Pegar la estructura de forma recursiva, respetando la jerarquía
      const rootElementId = pasteStructureRecursive(newRootElement, position, newElementsMap)

      if (rootElementId) {
        console.log('📋 Estructura completa pegada con nuevos IDs únicos:', {
          elementoRaiz: elemento.nombre || elemento.tipo,
          nuevoId: rootElementId,
          elementosRegenerados: newElementsMap.size
        })

        // Mostrar mensaje de éxito para estructura
        if (typeof window !== 'undefined' && window.__toasts?.show) {
          const nombreElemento = elemento.nombre || elemento.tipo
          const totalElements = newElementsMap.size
          const mensaje = totalElements > 1
            ? `Estructura "${nombreElemento}" pegada (${totalElements} elementos)`
            : `Elemento "${nombreElemento}" pegado correctamente`
          showToast(mensaje, { type: 'info' })
        }

        return rootElementId
      }

      return false
    } else {
      // Pegar elemento simple (sin hijos) - generar nuevo ID único
      const uniqueTimestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substr(2, 9)
      const newId = `${elemento.tipo || elemento.categoria || 'elemento'}_${uniqueTimestamp}_${randomSuffix}`

      const newElement = {
        ...elemento,
        id: newId, // Asignar nuevo ID único
        x: position.x,
        y: position.y,
      }      // Limpiar propiedades que el store manejará
      delete newElement.plantaId
      delete newElement.padre

      const finalElementId = canvasStore.agregarElemento(newElement)

      if (finalElementId) {
        console.log('📋 Elemento simple pegado desde buffer con nuevo ID único:', {
          original: elemento.id,
          nuevo: finalElementId,
          nombre: elemento.nombre || elemento.tipo
        })

        // Mostrar mensaje de éxito para elemento simple
        if (typeof window !== 'undefined' && window.__toasts?.show) {
          const nombreElemento = elemento.nombre || elemento.tipo
          showToast(`Elemento "${nombreElemento}" pegado correctamente`, { type: 'info' })
        }

        return finalElementId
      }
    }

    return false
  }

  /**
   * Remover elemento del buffer
   */
  const removeFromBuffer = (bufferItemId) => {
    const index = bufferItems.value.findIndex((item) => item.id === bufferItemId)
    if (index !== -1) {
      const removedItem = bufferItems.value.splice(index, 1)[0]
      console.log('🗑️ Elemento removido del buffer:', removedItem.elemento.nombre)
      return true
    }
    return false
  }

  /**
   * Limpiar todo el buffer
   */
  const clearBuffer = () => {
    const count = bufferItems.value.length
    bufferItems.value = []
    console.log(`🗑️ Buffer limpiado - ${count} elementos removidos`)
  }

  /**
   * Obtener elemento del buffer por ID
   */
  const getBufferItem = (bufferItemId) => {
    return bufferItems.value.find((item) => item.id === bufferItemId)
  }

  /**
   * Obtener todos los elementos del buffer
   */
  const getBufferItems = () => {
    return bufferItems.value
  }

  /**
   * Verificar si un elemento está en el buffer
   */
  const isInBuffer = (elementoId) => {
    return bufferItems.value.some((item) => item.originalId === elementoId)
  }

  /**
   * Obtener información para debug
   */
  const getBufferInfo = () => {
    return {
      items: bufferItems.value.map((item) => ({
        id: item.id,
        originalId: item.originalId,
        nombre: item.elemento.nombre,
        tipo: item.elemento.tipo,
        sourceAction: item.sourceInfo.action,
        sourcePlanta: item.sourceInfo.plantaId,
        addedAt: new Date(item.addedToBuffer).toLocaleString(),
      })),
      count: itemCount.value,
      hasItems: hasItems.value,
    }
  }

  return {
    // Estado
    bufferItems: computed(() =>
      [...bufferItems.value].sort((a, b) => b.addedToBuffer - a.addedToBuffer)
    ),
    hasItems,
    itemCount,

    // Métodos principales
    addToBuffer,
    copyToBuffer,
    pasteFromBuffer,
    removeFromBuffer,
    clearBuffer,

    // Métodos de consulta
    getBufferItem,
    getBufferItems,
    isInBuffer,
    getBufferInfo,
  }
}
