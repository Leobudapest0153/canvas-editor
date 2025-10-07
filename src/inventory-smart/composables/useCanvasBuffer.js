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

import { ref, computed, watch } from 'vue'
import { useCanvasStore } from './useCanvasStore'
import { useWeightValidation } from './useWeightValidation'
import { buildStructureFromCanvasElement, instantiateStructureOnCanvas } from '@/inventory-smart/composables/useStructureManager'
import { limpiarDatosUso, limpiarDatosUsoEstructura } from '@/inventory-smart/composables/useSimulateProducts'
import { useToast } from './useToast'
import { fastDeepClone, cloneCanvasElement, cleanUsageDataInPlace } from '@/inventory-smart/utils/fastClone'

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
    const originalId = sourceInfo.originalElementId || elemento.id

    // Limpiar datos de uso antes de guardar en el buffer (optimizado)
    const elementoLimpio = cloneCanvasElement(elemento)
    cleanUsageDataInPlace(elementoLimpio)

    return {
      id: `buffer_${currentTimestamp}_${Math.random().toString(36).substr(2, 9)}`,
      originalId,
      elemento: elementoLimpio, // Ya está clonado, no necesita JSON.parse(JSON.stringify())
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

  // Delegar la serialización de estructuras al StructureManager
  const serializeElementForTemplate = (elementoId, offsetX = 0, offsetY = 0) => {
    const struct = buildStructureFromCanvasElement(canvasStore, elementoId, { offsetX, offsetY })
    if (!struct) return null
    // Adaptar a la forma antes usada por el buffer para no romper tests/consumidores
    const all = new Map(struct.payload.elements.map(e => [e.id, e]))
    return { rootElement: struct.root, allElements: all, idMapping: new Map() }
  }

  /**
   * Agregar elemento al buffer
   */
  const addToBuffer = (elemento, sourceInfo = {}) => {
    if (!elemento) {
      console.warn('No se puede agregar elemento vacío al buffer')
      return false
    }

    // Verificar si el elemento ya está en el buffer
    const existingIndex = bufferItems.value.findIndex((item) => item.originalId === elemento.id)

    if (existingIndex !== -1) {
      // Actualizar elemento existente en buffer
      const updatedItem = createBufferItem(elemento, sourceInfo)
      bufferItems.value[existingIndex] = updatedItem
    } else {
      // Agregar nuevo elemento al buffer
      const bufferItem = createBufferItem(elemento, sourceInfo)
      bufferItems.value.push(bufferItem)
    }

    return true
  }

  /**
   * Copiar estructura completa al buffer (elemento + todos sus hijos recursivamente)
   */
  const copyToBuffer = (elementoId, description = 'Estructura copiada al buffer') => {
    const elemento = canvasStore.elementoPorId(elementoId)
    if (!elemento) {
      console.warn('Elemento no encontrado para copiar al buffer:', elementoId)
      return false
    }

    if (['cuartos', 'elementos'].includes(canvasStore.contextoActual.tipo)) {
      showToast('No puede copiar elementos desde este contexto', 'warn');
      return;
    }

    // Clonar la estructura completa
    const clonedStructure = serializeElementForTemplate(elementoId)
    if (!clonedStructure) {
      console.error('Error al clonar la estructura del elemento')
      return false
    }

    // Limpiar datos de uso de todos los elementos de la estructura antes de guardarla en el buffer
    // Optimizado: hacer limpieza in-place en lugar de clonar
    let cleanedAllElementsMap = clonedStructure.allElements
    try {
      // Optimización: limpiar in-place es mucho más rápido
      const elementsArray = Array.from(clonedStructure.allElements.values())
      for (let i = 0; i < elementsArray.length; i++) {
        cleanUsageDataInPlace(elementsArray[i])
      }
      cleanedAllElementsMap = new Map(elementsArray.map(e => [e.id, e]))
    } catch (e) {
      // Fallback defensivo: eliminar "uso" a mano si algo falla
      cleanedAllElementsMap = new Map(
        Array.from(clonedStructure.allElements.values()).map(e => {
          delete e.uso
          return [e.id, e]
        })
      )
    }

    const sourceInfo = {
      action: 'copied',
      description,
      originalPlanta: elemento.plantaId,
      originalPosition: { x: elemento.x, y: elemento.y },
      isStructure: true, // Marca que es una estructura completa
      childrenCount: elemento.hijos ? elemento.hijos.length : 0,
      allElements: cleanedAllElementsMap, // Guardar todos los elementos (sin datos de uso)
      originalElementId: elemento.id,
    }

    const success = addToBuffer(clonedStructure.rootElement, sourceInfo)
    if (success) {
      const totalElements = countElementsInStructure(elemento)
      const nombreElemento = elemento.nombre || elemento.tipo
      const mensaje = totalElements > 1
        ? `Estructura "${nombreElemento}" copiada (${totalElements} elementos)`
        : `Elemento "${nombreElemento}" copiado al portapapeles`
      showToast(mensaje, 'info')
    } else {
      console.error('Error al copiar la estructura al buffer')
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
   * Pegar estructura completa desde buffer al canvas actual
   */
  const pasteFromBuffer = (bufferItemId, position = { x: 100, y: 100 }) => {
    const bufferItem = bufferItems.value.find((item) => item.id === bufferItemId)
    if (!bufferItem) {
      console.warn('Item no encontrado en buffer:', bufferItemId)
      return false
    }

    const { elemento, sourceInfo } = bufferItem

    // Si es pasillo, ajustar alto al de la planta destino antes de validar
    let elementoForValidation = elemento
    try {
      if ((elemento?.tipo || '').toLowerCase() === 'pasillos') {
        const planta = canvasStore.plantaPorId(canvasStore.plantaActiva)
        const altoPlanta = planta?.dimensiones?.alto
        const dims = { ...(elemento.dimensiones || {}) }
        if (Number.isFinite(altoPlanta)) dims.alto = altoPlanta
        elementoForValidation = { ...elemento, dimensiones: dims }
      }
    } catch { /* ignore */ }

    // Validar peso máximo para el elemento principal
    const resultadoValidacionPeso = weightValidation.validarPesoElemento(
      elementoForValidation,
      canvasStore.contextoActual.id,
      canvasStore.contextoActual.tipo
    )

    if (!resultadoValidacionPeso.valido) {
      showToast(
        `No se puede pegar: excedería el peso máximo soportado por ${resultadoValidacionPeso.exceso} kg`,
        'error', { timeout: 3000 }
      )
      return false
    }

    // Verificar si es una estructura con elementos hijos
    if (sourceInfo.isStructure && sourceInfo.allElements) {
      // Optimizado: usar cloneCanvasElement en lugar de JSON.parse(JSON.stringify())
      const elements = Array.from(sourceInfo.allElements.values())
      const clonedElements = new Array(elements.length)

      for (let i = 0; i < elements.length; i++) {
        const cloned = cloneCanvasElement(elements[i])
        cleanUsageDataInPlace(cloned)
        clonedElements[i] = cloned
      }

      const payload = {
        rootId: elemento.id,
        elements: clonedElements,
      }
      const rootElementId = instantiateStructureOnCanvas(canvasStore, payload, position)
      if (rootElementId) {
        const nombreElemento = elemento.nombre || elemento.tipo
        const totalElements = payload.elements.length
        const mensaje = totalElements > 1
          ? `Estructura "${nombreElemento}" pegada (${totalElements} elementos)`
          : `Elemento "${nombreElemento}" pegado correctamente`
        showToast(mensaje, 'info')
        return rootElementId
      }
      return false
    } else {
  // Pegar elemento simple (sin hijos) - generar nuevo ID único
      const uniqueTimestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substr(2, 9)
      const newId = `${elemento.tipo || 'elemento'}_${uniqueTimestamp}_${randomSuffix}`

      // Forzar altura de pasillos según planta destino
      let elementoToInsert = { ...elemento, id: newId }
      try {
        if ((elemento?.tipo || '').toLowerCase() === 'pasillos') {
          const planta = canvasStore.plantaPorId(canvasStore.plantaActiva)
          const altoPlanta = planta?.dimensiones?.alto
          const dims = { ...(elementoToInsert.dimensiones || {}) }
          if (Number.isFinite(altoPlanta)) dims.alto = altoPlanta
          elementoToInsert = { ...elementoToInsert, dimensiones: dims }
        }
      } catch { /* ignore */ }

      const newElement = {
        ...elementoToInsert,
        id: newId, // Asignar nuevo ID único
        x: position.x,
        y: position.y,
      }
      // Si es pasillo, permitir que el store genere el nombre alfabético
      if ((elemento?.tipo || '').toLowerCase() === 'pasillos') {
        delete newElement.nombre
      }
      // Limpiar propiedades que el store manejará
      delete newElement.plantaId
      delete newElement.padre

      const finalElementId = canvasStore.agregarElemento(newElement, { preserveExistingCode: false, resetName: false, regenerateCode: true })

      if (finalElementId) {
        const nombreElemento = elemento.nombre || elemento.tipo
        showToast(`Elemento "${nombreElemento}" pegado correctamente`, 'info')
        return finalElementId
      }
    }

    return false
  }

  /**
   * Pegar estructura desde un payload serializado (plantillas)
   */
  const pasteFromSerialized = (payload, position = { x: 100, y: 100 }) => {
    if (!payload || !payload.rootId || !Array.isArray(payload.elements)) {
      console.warn('Payload de plantilla inválido')
      return false
    }
    // Limpiar datos de uso si vienen presentes en la plantilla
    const cleanedPayload = {
      ...payload,
      elements: payload.elements.map(e => {
        const copy = { ...e }
        delete copy.uso
        return copy
      })
    }
    return instantiateStructureOnCanvas(canvasStore, cleanedPayload, position)
  }

  /**
   * Remover elemento del buffer
   */
  const removeFromBuffer = (bufferItemId) => {
    const index = bufferItems.value.findIndex((item) => item.id === bufferItemId)
    if (index !== -1) {
      const removedItem = bufferItems.value.splice(index, 1)[0]
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
    // Retornar siempre los elementos más recientes primero
    return [...bufferItems.value].sort((a, b) => b.addedToBuffer - a.addedToBuffer)
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

  /**
   * Pegar estructura completa desde buffer al canvas actual con ajustes aplicados
   */
  const pasteFromBufferWithAdjustments = (bufferItemId, position = { x: 100, y: 100 }, adjustedElement) => {
    const bufferItem = bufferItems.value.find((item) => item.id === bufferItemId)
    if (!bufferItem) {
      console.warn('Item no encontrado en buffer:', bufferItemId)
      return false
    }

    const { elemento, sourceInfo } = bufferItem

    // Aplicar ajustes al elemento
    const elementoAjustado = {
      ...elemento,
      dimensiones: adjustedElement.dimensiones || elemento.dimensiones,
      capacidadCarga: adjustedElement.capacidadCarga || elemento.capacidadCarga
    }

    // Verificar si es una estructura con elementos hijos
    if (sourceInfo.isStructure && sourceInfo.allElements) {
      // Para estructuras, aplicar ajustes al elemento raíz
      const elements = Array.from(sourceInfo.allElements.values())
      const clonedElements = new Array(elements.length)

      for (let i = 0; i < elements.length; i++) {
        let cloned = cloneCanvasElement(elements[i])

        // Si es el elemento raíz, aplicar ajustes
        if (cloned.id === elemento.id) {
          cloned = {
            ...cloned,
            dimensiones: adjustedElement.dimensiones || cloned.dimensiones,
            capacidadCarga: adjustedElement.capacidadCarga || cloned.capacidadCarga
          }
        }

        cleanUsageDataInPlace(cloned)
        clonedElements[i] = cloned
      }

      const payload = {
        rootId: elemento.id,
        elements: clonedElements,
      }
      const rootElementId = instantiateStructureOnCanvas(canvasStore, payload, position)
      if (rootElementId) {
        const nombreElemento = elementoAjustado.nombre || elementoAjustado.tipo
        const totalElements = payload.elements.length
        const mensaje = totalElements > 1
          ? `Estructura "${nombreElemento}" pegada con ajustes (${totalElements} elementos)`
          : `Elemento "${nombreElemento}" pegado con ajustes`
        showToast(mensaje, 'info')
        return rootElementId
      }
      return false
    } else {
      // Pegar elemento simple con ajustes aplicados
      const uniqueTimestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substr(2, 9)
      const newId = `${elementoAjustado.tipo || elementoAjustado.categoria || 'elemento'}_${uniqueTimestamp}_${randomSuffix}`

      // Aplicar ajustes especiales para pasillos si es necesario
      let elementoToInsert = { ...elementoAjustado, id: newId }
      try {
        if ((elementoAjustado?.tipo || '').toLowerCase() === 'pasillos') {
          const planta = canvasStore.plantaPorId(canvasStore.plantaActiva)
          const altoPlanta = planta?.dimensiones?.alto
          const dims = { ...elementoToInsert.dimensiones }
          if (Number.isFinite(altoPlanta)) dims.alto = altoPlanta
          elementoToInsert = { ...elementoToInsert, dimensiones: dims }
        }
      } catch { /* ignore */ }

      const newElement = {
        ...elementoToInsert,
        id: newId,
        x: position.x,
        y: position.y,
      }

      // Si es pasillo, permitir que el store genere el nombre alfabético
      if ((elementoAjustado?.tipo || '').toLowerCase() === 'pasillos') {
        delete newElement.nombre
      }

      // Limpiar propiedades que el store manejará
      delete newElement.plantaId
      delete newElement.padre

      const finalElementId = canvasStore.agregarElemento(newElement, { preserveExistingCode: false, resetName: false, regenerateCode: true })

      if (finalElementId) {
        const nombreElemento = elementoAjustado.nombre || elementoAjustado.tipo
        showToast(`Elemento "${nombreElemento}" pegado con ajustes`, 'info')
        return finalElementId
      }
    }

    return false
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
    pasteFromBufferWithAdjustments,
    pasteFromSerialized,
    removeFromBuffer,
    clearBuffer,

    // Métodos de consulta
    getBufferItem,
    getBufferItems,
    isInBuffer,
    getBufferInfo,

    // Utilidades
    serializeElementForTemplate,
  }
}
