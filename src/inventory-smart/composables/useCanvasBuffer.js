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
import { buildStructureFromCanvasElement, instantiateStructureOnCanvas } from '@/inventory-smart/composables/useStructureManager'
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
    const clonedStructure = serializeElementForTemplate(elementoId)
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
      const nombreElemento = elemento.nombre || elemento.tipo
      const mensaje = totalElements > 1
        ? `Estructura "${nombreElemento}" copiada (${totalElements} elementos)`
        : `Elemento "${nombreElemento}" copiado al portapapeles`
      showToast(mensaje, 'info')
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
   * NUEVO: Incluye lógica especial para elementos con pisos generados automáticamente
   */
  // Reemplazar pegado recursivo por la función centralizada
  const pasteStructureRecursive = (elementoToPaste, position, allElementsMap, parentId = null) => {
    const payload = { rootId: elementoToPaste.id, elements: Array.from(allElementsMap.values()) }
    return instantiateStructureOnCanvas(canvasStore, payload, position)
  }

  /**
   * Regenera las posiciones de los pisos internos cuando se instancia una plantilla
   * con un elemento que tiene pisos generados automáticamente
   */
  // Ya no es necesario: la regeneración de pisos la gestiona instantiateStructureOnCanvas
  const regenerarPisosEnPlantilla = () => {}

  /**
   * Agregar elemento directamente sin depender del contexto de navegación
   */
  // Ya no se expone inserción directa; lo maneja instantiateStructureOnCanvas
  const addElementDirectly = () => null

  /**
   * Regenerar IDs únicos para una estructura antes del pegado
   */
  // Regeneración de IDs ahora la realiza instantiateStructureOnCanvas internamente
  const regenerateUniqueIds = (allElementsMap) => ({ newElementsMap: allElementsMap, newIdMapping: new Map() })

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
      console.warn('⚠️ No se puede pegar: excedería el peso máximo soportado', resultadoValidacionPeso)
      showToast(
        `No se puede pegar: excedería el peso máximo soportado por ${resultadoValidacionPeso.exceso} kg`,
        'error', { timeout: 3000 }
      )
      return false
    }

    // Verificar si es una estructura con elementos hijos
    if (sourceInfo.isStructure && sourceInfo.allElements) {
      console.log('📋 Pegando estructura completa con', sourceInfo.allElements.size, 'elementos')
      const payload = {
        rootId: elemento.id,
        elements: Array.from(sourceInfo.allElements.values()).map(e => ({ ...JSON.parse(JSON.stringify(e)) })),
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
      const newId = `${elemento.tipo || elemento.categoria || 'elemento'}_${uniqueTimestamp}_${randomSuffix}`

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

      const finalElementId = canvasStore.agregarElemento(newElement, { preserveExistingCode: false, resetName: true, regenerateCode: true })

      if (finalElementId) {
        console.log('📋 Elemento simple pegado desde buffer con nuevo ID único:', {
          original: elemento.id,
          nuevo: finalElementId,
          nombre: elemento.nombre || elemento.tipo
        })
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
      console.warn('⚠️ Payload de plantilla inválido')
      return false
    }
    return instantiateStructureOnCanvas(canvasStore, payload, position)
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
