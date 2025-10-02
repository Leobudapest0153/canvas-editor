/**
 * useStructureManager.js
 *
 * Punto único para manejar:
 * - Estructuración (serializar) de elementos con hijos
 * - Desestructuración/instanciación (pegar) de estructuras en el canvas
 * - Construcción de entradas de catálogo unificadas (plantillas, cuartos, espacios)
 */

import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { cloneCanvasElement } from '@/inventory-smart/utils/fastClone'
import { generateCodigo, generateNombre } from '@/inventory-smart/utils/codeNameGenerator.js'
import { assignCodigoNombre } from '@/inventory-smart/utils/codeNameAssigner.js'

const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

/**
 * Crea una estructura desde datos de formulario (AgregarCuarto/Espacio)
 * No realiza efectos (no inserta en stores); retorna estructura y metadatos.
 */
export function buildStructureFromForm(form) {
  if (!form || typeof form !== 'object') throw new Error('Formulario inválido')
  const { modo, datosGenerales, dimensiones, pisosNiveles } = form
  if (!modo || !datosGenerales || !dimensiones || !Array.isArray(pisosNiveles)) {
    throw new Error('Formulario incompleto')
  }

  const toCm = (m) => Math.round(Number(m || 0) * 100)
  const dimsCm = {
    ancho: toCm(dimensiones.ancho),
    largo: toCm(dimensiones.largo),
    alto: toCm(dimensiones.alto),
  }

  const rootId = uid(modo === 'cuarto' ? 'cuarto' : 'espacio')
  const root = {
    id: rootId,
    nombre: datosGenerales.nombre,
    tipo: modo === 'cuarto' ? 'cuartos' : 'elementos',
    categoria: datosGenerales.tipoSeleccionado || (modo === 'cuarto' ? 'cuartos' : 'elementos'),
    forma: dimensiones.forma,
    orientacion: datosGenerales.orientacion,
    color: datosGenerales.color || '#3B82F6',
    colorBase: datosGenerales.color || '#3B82F6',
    dimensiones: dimsCm,
    capacidadCarga: Number(dimensiones.capacidadCarga) || 0,
    ubicacion: modo === 'cuarto' ? 'suelo' : datosGenerales.ubicacion,
    descripcion: datosGenerales.descripcion || '',
    icono: modo === 'cuarto' ? 'home' : 'box',
    hijos: [],
    // Altura respecto al suelo (solo aplica a espacios en pared). Convertir m→cm
    ...(modo === 'espacio' && datosGenerales.ubicacion === 'pared' && Number.isFinite(Number(datosGenerales.alturaRespectoAlSuelo))
      ? { alturaRespectoAlSuelo: Math.round(Number(datosGenerales.alturaRespectoAlSuelo) * 100) }
      : {}),
    // Metadata que indica que al instanciar debe regenerar pisos
    meta: { tienePisosGenerados: true },
    // Calcular width/height directamente para evitar problemas de serialización
    width: dimsCm.ancho * CM_TO_PX,
    height: dimsCm.largo * CM_TO_PX, // cuartos/espacios usan vista XY (largo->height)
    // Se sobrescribe al pegar
    x: 0,
    y: 0,
  }

  // Hijos: pisos/niveles — calcular posiciones básicas para evitar superposición
  const children = []
  pisosNiveles.forEach((p, idx) => {
    // Determinar tipo y categoría según si es cuarto o espacio
    const esEspacio = modo === 'espacio'
    const childType = esEspacio ? 'contenedores' : 'pisos'
    const childCategory = esEspacio ? 'nivel' : 'piso'
    const childId = uid(esEspacio ? 'nivel' : 'piso')

    children.push({
      id: childId,
      nombre: p.nombre || `${modo === 'cuarto' ? 'Piso' : 'Nivel'} ${idx + 1}`,
      tipo: childType,
      categoria: childCategory,
      padre: rootId,
      color: root.color,
      colorBase: root.colorBase,
      // Asignar posiciones básicas para que no se superpongan al serializar/deserializar
      x: 0, // Centro del padre
      y: idx * 50, // Separación vertical entre pisos
      dimensiones: {
        ancho: toCm(p.ancho),
        largo: toCm(p.largo),
        alto: toCm(p.alto),
      },
      width: toCm(p.ancho) * CM_TO_PX,
      height: toCm(p.alto) * CM_TO_PX, // pisos/niveles usan vista XZ (alto->height)
      capacidadCarga: Number(p.capacidadCarga) || 0,
      tiposProductos: Array.isArray(p.tiposProductos) ? p.tiposProductos.slice() : [],
      tipoZona: p.tipoZona,
      permiteFragiles: !!p.permiteFragiles,
      props: { catalogVisible: false },
      // Metadatos diferentes según tipo
      meta: esEspacio
        ? { esNivelInterno: true, indiceNivel: idx + 1 }
        : { esPisoInterno: true, indicePiso: idx + 1 },
    })
    root.hijos.push(childId)
  })

  return {
    root,
    payload: { rootId, elements: [root, ...children] },
    meta: {
      kind: modo === 'cuarto' ? 'room' : 'space',
      childrenCount: children.length,
    },
  }
}

/**
 * Construye una entrada de catálogo unificada a partir de una estructura.
 * No inserta en stores; sólo devuelve el objeto listo para push en catálogo.
 */
export function toCatalogItemFromStructure({
  name,
  description,
  tags = [],
  structure,
  kind = 'template',
  color,
}) {
  if (!structure?.payload?.rootId) throw new Error('Estructura inválida')
  const root = structure.payload.elements.find((e) => e.id === structure.payload.rootId) || structure.root
  const id = uid(kind === 'template' ? 'tpl' : kind === 'room' ? 'room' : kind === 'space' ? 'space' : 'cat')
  return {
    id,
    nombre: name || root?.nombre || 'Entrada',
    tipo: root?.tipo || 'elementos',
    categoria: root?.categoria,
    forma: root?.forma,
    orientacion: root?.orientacion,
    color: color || root?.color || root?.colorBase || '#3B82F6',
    colorBase: color || root?.colorBase || root?.color || '#3B82F6',
    dimensiones: { ...(root?.dimensiones || {}) },
    capacidadCarga: root?.capacidadCarga || 0,
    ubicacion: root?.ubicacion || 'suelo',
    descripcion: description || root?.descripcion || '',
    icono: root?.icono || 'box',
    props: { system: true, catalogVisible: true },
    catalogKind: kind, // 'template' | 'room' | 'space' | 'item'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    payload: structure.payload, // estructura completa para instanciación
    meta: {
      ...(root?.meta || {}),
      tienePisosGenerados: !!(root?.meta?.tienePisosGenerados || structure.meta?.childrenCount > 0),
      childrenCount: structure.meta?.childrenCount ?? (Array.isArray(root?.hijos) ? root.hijos.length : 0),
      source: kind,
    },
    tags,
  }
}

/**
 * Convierte un item de catálogo (con payload de estructura) en datos de formulario
 * para ser editado con AgregarCuartoModal.vue
 */
export function toFormFromCatalogItem(item) {
  const fromCm = (cm) => (Number.isFinite(cm) ? Number(cm) / 100 : null)

  // Caso 1: item con payload de estructura
  if (item?.payload?.rootId && Array.isArray(item?.payload?.elements)) {
    const elems = item.payload.elements
    const root = elems.find((e) => e.id === item.payload.rootId) || elems[0]
    if (!root) return null
    const modo = root.tipo === 'cuartos' ? 'cuarto' : 'espacio'

    const datosGenerales = {
      nombre: root.nombre || item.nombre || '',
      color: root.color || root.colorBase || item.color || '#3B82F6',
      tipoSeleccionado: root.categoria || '',
      descripcion: root.descripcion || item.descripcion || '',
      orientacion: root.orientacion || '',
      ubicacion: modo === 'espacio' ? (root.ubicacion || item.ubicacion || '') : '',
      // Si es espacio en pared, exponer alturaRespectoAlSuelo en metros
      ...(modo === 'espacio' && (root.ubicacion || item.ubicacion) === 'pared'
        ? { alturaRespectoAlSuelo: fromCm(root.alturaRespectoAlSuelo ?? item.alturaRespectoAlSuelo) }
        : {}),
    }

    const d = root.dimensiones || {}
    const dimensiones = {
      forma: root.forma || '',
      largo: fromCm(d.largo),
      alto: fromCm(d.alto),
      ancho: fromCm(d.ancho),
      capacidadCarga: Number(root.capacidadCarga ?? root.pesoMaximo) || 0,
    }

    // Recuperar pisos/niveles internos, en orden por índice
    const childIds = Array.isArray(root.hijos) ? root.hijos : []
    const childElems = childIds
      .map((hid) => elems.find((e) => e.id === hid))
      .filter((h) => h && (h.meta?.esPisoInterno || h.meta?.esNivelInterno))
      .sort((a, b) => {
        const ia = a.meta?.indicePiso || a.meta?.indiceNivel || 0
        const ib = b.meta?.indicePiso || b.meta?.indiceNivel || 0
        return ia - ib
      })

    const pisosNiveles = childElems.map((c, idx) => {
      const cd = c.dimensiones || {}
      return {
        id: idx + 1,
        nombre: c.nombre || `${modo === 'cuarto' ? 'Piso' : 'Nivel'} ${idx + 1}`,
        largo: fromCm(cd.largo),
        alto: fromCm(cd.alto),
        ancho: fromCm(cd.ancho),
        capacidadCarga: Number(c.capacidadCarga) || 0,
        tiposProductos: Array.isArray(c.tiposProductos) ? c.tiposProductos.slice() : [],
        tipoZona: c.tipoZona || 'almacenaje',
        permiteFragiles: !!c.permiteFragiles,
        _touched: { tiposProductos: false, tipoZona: false, nombre: false },
      }
    })

    return { modo, datosGenerales, dimensiones, pisosNiveles }
  }

  // Caso 2: item sin payload (fallback) — construir formulario mínimo
  if (item && typeof item === 'object') {
    const modo = (item.tipo === 'cuartos') ? 'cuarto' : 'espacio'
    const d = item.dimensiones || {}
    const datosGenerales = {
      nombre: item.nombre || '',
      color: item.color || item.colorBase || '#3B82F6',
      tipoSeleccionado: item.categoria || '',
      descripcion: item.descripcion || '',
      orientacion: item.orientacion || '',
      ubicacion: modo === 'espacio' ? (item.ubicacion || '') : '',
      ...(modo === 'espacio' && item.ubicacion === 'pared'
        ? { alturaRespectoAlSuelo: fromCm(item.alturaRespectoAlSuelo) }
        : {}),
    }
    const dimensiones = {
      forma: item.forma || '',
      largo: fromCm(d.largo),
      alto: fromCm(d.alto),
      ancho: fromCm(d.ancho),
      capacidadCarga: Number(item.capacidadCarga ?? item.pesoMaximo) || 0,
    }
    const pisosNiveles = [
      {
        id: 1,
        nombre: modo === 'cuarto' ? 'Piso 1' : 'Nivel 1',
        largo: null,
        alto: null,
        ancho: null,
        capacidadCarga: null,
        tiposProductos: [],
        tipoZona: 'almacenaje',
        permiteFragiles: false,
        _touched: { tiposProductos: false, tipoZona: false, nombre: false },
      },
    ]
    return { modo, datosGenerales, dimensiones, pisosNiveles }
  }

  return null
}

/**
 * Construye un item de catálogo actualizado a partir de un formulario,
 * preservando el id y metadatos relevantes del item original.
 */
export function buildUpdatedCatalogItem(originalItem, form) {
  if (!originalItem) throw new Error('Item original requerido')
  const structure = buildStructureFromForm(form)
  const kind = form.modo === 'cuarto' ? 'room' : 'space'
  const updated = toCatalogItemFromStructure({
    name: form?.datosGenerales?.nombre,
    description: form?.datosGenerales?.descripcion,
    structure,
    kind,
    color: form?.datosGenerales?.color,
    tags: Array.isArray(originalItem.tags) ? originalItem.tags : [],
  })
  // Preservar id y algunos metadatos
  updated.id = originalItem.id
  updated.createdAt = originalItem.createdAt || updated.createdAt
  updated.updatedAt = new Date().toISOString()
  // Si el original tenía props específicas, mezclarlas
  updated.props = { ...(updated.props || {}), ...(originalItem.props || {}) }
  return updated
}

/**
 * Elimina un item del arreglo de catálogo por id. Retorna true si se eliminó.
 */
export function removeCatalogItem(itemsArray, id) {
  if (!Array.isArray(itemsArray)) return false
  const idx = itemsArray.findIndex((it) => it.id === id)
  if (idx === -1) return false
  itemsArray.splice(idx, 1)
  return true
}

/**
 * Dada una estructura serializada, genera nuevas IDs y la pega recursivamente en el canvas.
 * Requiere el canvasStore para realizar la inserción (evitamos import directo para no circular).
 */
export function instantiateStructureOnCanvas(canvasStore, payload, position) {
  console.time('⏱️ instantiate: total')
  if (!canvasStore || !payload?.rootId || !Array.isArray(payload.elements)) return false

  console.time('⏱️ instantiate: mapear elementos')
  // Mapear elementos por id (optimizado: usar cloneCanvasElement)
  const allElementsMap = new Map()
  for (const el of payload.elements) {
    allElementsMap.set(el.id, cloneCanvasElement(el))
  }
  console.timeEnd('⏱️ instantiate: mapear elementos')

  // Regenerar IDs únicos (similar a useCanvasBuffer)
  const newIdMap = new Map()
  const newMap = new Map()
  let counter = 0
  for (const [oldId, el] of allElementsMap) {
    const newId = uid(el.tipo || el.categoria || 'el') + '_' + counter++
    newIdMap.set(oldId, newId)
  }
  for (const [oldId, el] of allElementsMap) {
    const nid = newIdMap.get(oldId)
    const cloned = { ...el, id: nid }
    cloned.hijos = Array.isArray(el.hijos) ? el.hijos.map((hid) => newIdMap.get(hid)).filter(Boolean) : []
    cloned.padre = el.padre ? newIdMap.get(el.padre) : null
    newMap.set(nid, cloned)
  }

  const newRootId = newIdMap.get(payload.rootId)
  let root = newMap.get(newRootId)
  if (!root) return false

  // Ajuste especial para pasillos (altura = alto planta)
  try {
    if ((root?.tipo || '').toLowerCase() === 'pasillos') {
      const planta = canvasStore.plantaPorId(canvasStore.plantaActiva)
      const alto = planta?.dimensiones?.alto
      if (Number.isFinite(alto)) {
        const dims = { ...(root.dimensiones || {}) }
        dims.alto = alto
        root = { ...root, dimensiones: dims }
        newMap.set(newRootId, root)
      }
      // Dejar que el store genere nombre alfabético
      // delete root.nombre
    }
  } catch (e) {
    console.warn('Error ajustando dimensiones de pasillo:', e)
  }

  // Pegado recursivo con reposicionamiento de pisos internos si aplica
  const computeCanvasSize = (el) => {
    const dims = el?.dimensiones || {}
    const hasDims = Number.isFinite(dims.ancho) && (Number.isFinite(dims.largo) || Number.isFinite(dims.alto))

    // Si ya tiene width/height válidos del canvas original, usarlos preferentemente
    if (Number.isFinite(el?.width) && Number.isFinite(el?.height)) {
      return {
        width: el.width,
        height: el.height,
      }
    }

    // Si no tiene dimensiones calculables, retornar vacío
    if (!hasDims) return {}

    const tipo = (el?.tipo || '').toLowerCase()
    const isFloor = tipo === 'pisos' || el?.meta?.esPisoInterno === true

    // Calcular width desde ancho (siempre)
    const width = (dims.ancho ?? 0) * CM_TO_PX

    // Calcular height según tipo de elemento
    let height
    if (isFloor) height = (dims.alto ?? 0) * CM_TO_PX // pisos en XZ: alto
    else if (tipo === 'cuartos' || tipo === 'pasillos') height = (dims.largo ?? 0) * CM_TO_PX // XY
    else height = (dims.alto ?? 0) * CM_TO_PX // elementos/contenedores en XZ

    return {
      width: Number.isFinite(width) ? width : undefined,
      height: Number.isFinite(height) ? height : undefined,
    }
  }

  const pasteRecursive = (elem, pos, parentId = null) => {
    const size = computeCanvasSize(elem)
    const isRoot = parentId == null
    const hasXYSelf = Number.isFinite(elem?.x) && Number.isFinite(elem?.y)

    // Para plantillas: calcular posición según contexto de renderizado
    let effectivePos
    if (isRoot) {
      effectivePos = pos
    } else if (hasXYSelf) {
      // Para hijos: mantener posiciones absolutas originales
      // (se renderizan en el canvas del padre, no en el canvas de la planta)
      effectivePos = {
        x: elem.x,
        y: elem.y
      }
    } else {
      // Hijos sin posiciones: heredar posición del padre
      effectivePos = pos
    }

    // Asegurar color y colorBase en todos los nodos
    const colorMerged = elem.color ?? elem.colorBase ?? (isRoot ? (root.color ?? root.colorBase) : undefined)
    const colorBaseMerged = elem.colorBase ?? elem.color ?? colorMerged
    const base = {
      ...elem,
      ...size,
      x: effectivePos.x,
      y: effectivePos.y,
      padre: parentId,
      hijos: [],
      color: colorMerged,
      colorBase: colorBaseMerged,
      // Preservar dimensiones del canvas si existen
      width: elem.width || size.width,
      height: elem.height || size.height,
    }
    // Limpiar propiedades que setea el store
    if (!parentId) { delete base.plantaId; base.padre = null }

    let newId
    if (!parentId) newId = canvasStore.agregarElemento(base, { preserveExistingCode: false, resetName: false, regenerateCode: true, saveHistory: false, skipReorder: true })
    else newId = addChildDirect(canvasStore, base, parentId)
    if (!newId) return null

    const isRootWithFloors = base.meta?.tienePisosGenerados === true && !parentId
    const hasChildren = Array.isArray(elem.hijos) && elem.hijos.length > 0

    // Decidir si regenerar pisos/niveles basándose en si vienen de plantilla o formulario
    const childFloors = elem.hijos?.map((hid) => newMap.get(hid))?.filter((h) => h && (h.meta?.esPisoInterno || h.meta?.esNivelInterno)) || []
    const hasFloorChildren = childFloors.length > 0

    // Regenerar solo si:
    // 1. Es root con pisos/niveles generados automáticamente
    // 2. Tiene pisos/niveles como hijos
    // 3. Los pisos/niveles parecen venir del formulario (posiciones básicas) NO de plantilla (posiciones complejas)
    const shouldRegenerate = isRootWithFloors && hasFloorChildren && childFloors.every((f, idx) => {
      // Si no tiene posición definida, es del formulario
      if (!(Number.isFinite(f?.x) && Number.isFinite(f?.y))) return true

      // Si tiene posición básica de formulario (x=0, y secuencial), es del formulario
      const hasBasicPosition = f.x === 0 && f.y === (idx * 50)

      // Si tiene posición compleja/no básica, es de plantilla -> NO regenerar
      return hasBasicPosition
    })

    if (shouldRegenerate) {
      regenerateFloors(canvasStore, elem, newMap, newId, base.dimensiones)
    } else if (hasChildren) {
      for (const hid of elem.hijos) {
        const child = newMap.get(hid)
        if (!child) continue
        // Pasar la posición del root pegado para que los hijos calculen su posición relativa
        // El cálculo de posición relativa se hace en pasteRecursive
        pasteRecursive(child, pos, newId) // usar 'pos' (posición del root) en lugar de childPos
      }
    }
    return newId
  }

  const rootId = pasteRecursive(root, position, null)

  // Reordenar una sola vez al final (en lugar de N veces durante el proceso)
  if (rootId && canvasStore.reorderVisibleByHeightForContext) {
    try {
      const ctxTipo = canvasStore.contextoNavegacion?.value?.tipo || canvasStore.contextoNavegacion?.tipo
      const ctxId = canvasStore.contextoNavegacion?.value?.id || canvasStore.contextoNavegacion?.id
      if (ctxTipo === 'plantas' || ctxTipo === 'pisos') {
        canvasStore.reorderVisibleByHeightForContext(ctxTipo, ctxId)
      }
    } catch (e) { /* noop */ }
  }

  // Guardar en historial una sola vez al final con toda la estructura
  if (rootId && canvasStore.saveToHistory) {
    const elementCount = payload.elements.length
    const mensaje = elementCount > 1
      ? `Estructura pegada (${elementCount} elementos)`
      : `Elemento "${root.nombre || root.tipo}" pegado`
    canvasStore.saveToHistory(mensaje)
  }

  return rootId
}

// Inserción directa como hijo sin depender del contexto
function addChildDirect(canvasStore, elemento, parentId) {
  try {
    const padreIndex = canvasStore.elementos.findIndex((el) => el.id === parentId)
    if (padreIndex === -1) return null
    const padre = canvasStore.elementos[padreIndex]

    // Configurar relación padre-hijo
    elemento.padre = parentId
    elemento.plantaId = padre.plantaId

    // Preservar width/height existentes si son válidos
    const hasValidCanvas = Number.isFinite(elemento.width) && Number.isFinite(elemento.height)
    if (!hasValidCanvas && elemento.dimensiones) {
      // Solo calcular si no tiene dimensiones de canvas válidas
      const dims = elemento.dimensiones
      const tipo = (elemento.tipo || '').toLowerCase()
      const isFloor = tipo === 'pisos' || elemento.meta?.esPisoInterno === true

      elemento.width = (dims.ancho || 10) * 10 // CM_TO_PX
      if (isFloor) elemento.height = (dims.alto || 10) * 10
      else if (tipo === 'cuartos' || tipo === 'pasillos') elemento.height = (dims.largo || 10) * 10
      else elemento.height = (dims.alto || 10) * 10
    }

    assignCodigoNombre(elemento, canvasStore.elementos, { preserveExistingCode: false, resetName: false, regenerateCode: true })

    // Agregar a la lista de elementos
    canvasStore.elementos.push(elemento)

    // Actualizar lista de hijos del padre
    if (!Array.isArray(padre.hijos)) padre.hijos = []
    padre.hijos.push(elemento.id)

    return elemento.id
  } catch { return null }
}

// Reposición de pisos/niveles internos al instanciar estructura
function regenerateFloors(canvasStore, originalParent, allMap, newParentId, parentDims) {
  try {
    // Buscar tanto pisos como niveles internos
    const floors = (originalParent.hijos || [])
      .map((hid) => allMap.get(hid))
      .filter((h) => h && (h.meta?.esPisoInterno || h.meta?.esNivelInterno))
      .sort((a, b) => {
        const indexA = a.meta?.indicePiso || a.meta?.indiceNivel || 0
        const indexB = b.meta?.indicePiso || b.meta?.indiceNivel || 0
        return indexA - indexB
      })

    let acum = 0
    for (const piso of floors) {
      const altoPiso = piso.dimensiones?.alto || 0
      const anchoPiso = piso.dimensiones?.ancho || parentDims.ancho
      const posX = (parentDims.ancho - anchoPiso) / 2
      const alturaDesdeAbajo = acum + altoPiso
      const posY = parentDims.alto - alturaDesdeAbajo
      const child = {
        ...piso,
        x: posX * CM_TO_PX,
        y: posY * CM_TO_PX,
        width: (anchoPiso || 0) * CM_TO_PX,
        height: (altoPiso || 0) * CM_TO_PX,
        alturaRespectoAlSuelo: acum,
        padre: newParentId,
      }
      addChildDirect(canvasStore, child, newParentId)
      acum += altoPiso
    }
  } catch (e) {
    // ignore floor regeneration errors to avoid breaking the paste
  }
}

/**
 * Serializa un elemento existente (por id de store) en una estructura con hijos.
 * Requiere canvasStore y un elementoId.
 */
export function buildStructureFromCanvasElement(canvasStore, elementoId, { offsetX = 0, offsetY = 0 } = {}) {
  const elemento = canvasStore.elementoPorId?.(elementoId)
  if (!elemento) return null

  const idMapping = new Map()
  const all = new Map()
  const baseTs = Date.now()
  let counter = 0
  const cloneRec = (elem, parentNewId = null, level = 0) => {
    const uniqueTs = baseTs + counter
    const newId = `${(elem.tipo || elem.categoria || 'elemento')}_${uniqueTs}_${Math.random().toString(36).slice(2, 6)}`
    idMapping.set(elem.id, newId)
    counter++

    // Para plantillas: mantener coordenadas tal cual para preservar estructura
    // Optimizado: usar cloneCanvasElement en lugar de JSON.parse(JSON.stringify())
    const cloned = cloneCanvasElement(elem)
    cloned.id = newId
    cloned.x = (elem.x || 0) + offsetX
    cloned.y = (elem.y || 0) + offsetY
    cloned.padre = parentNewId
    cloned.hijos = []

    if (level === 0) { delete cloned.plantaId; cloned.padre = null }
    all.set(newId, cloned)
    if (Array.isArray(elem.hijos) && elem.hijos.length) {
      for (const hid of elem.hijos) {
        const h = canvasStore.elementoPorId?.(hid)
        if (h) {
          const cc = cloneRec(h, newId, level + 1)
          if (cc) cloned.hijos.push(cc.id)
        }
      }
    }
    return cloned
  }
  const root = cloneRec(elemento, null, 0)
  return { root, payload: { rootId: root.id, elements: Array.from(all.values()) }, meta: { kind: 'template', childrenCount: (Array.isArray(root.hijos) ? root.hijos.length : 0) } }
}

export function buildChildFromDraft(draft, parentContext, index = 0, parentChilds) {
  if (!draft || !parentContext) {
    console.warn('buildChildFromDraft requiere un draft y un parentContext.');
    return draft; // Devuelve el draft original si faltan datos
  }

  // 1. Determinar el tipo y categoría del hijo basándose en el padre
  const esPadreEspacio = parentContext.tipo === 'elementos';
  const childType = esPadreEspacio ? 'contenedores' : 'pisos';
  const childCategory = esPadreEspacio ? 'nivel' : 'piso';
  const defaultName = `${esPadreEspacio ? 'Nivel' : 'Piso'} ${index + 1}`;

  console.log('draft en buildChildFromDraft:', draft);
  // 2. Construir el objeto base con datos heredados y por defecto
  const baseChild = {
    id: draft.id || uid(esPadreEspacio ? 'nivel' : 'piso'),
    tipo: childType,
    categoria: childCategory,
    padre: parentContext.id,

    // Datos heredados del padre
    color: parentContext.color,
    colorBase: parentContext.colorBase,

    // Datos por defecto que el draft puede sobreescribir
    nombre: draft.nombre ?? defaultName,
    dimensiones: {},
    capacidadCarga: 0,
    plantaId: parentContext.plantaId || null,
    tiposProductos: [],
    permiteFragiles: false,
    props: { catalogVisible: false },
    meta: esPadreEspacio
      ? { esNivelInterno: true, indiceNivel: index + 1 }
      : { esPisoInterno: true, indicePiso: index + 1 },
  };

  // 3. Fusionar el borrador con la base. El draft tiene prioridad.
  const completedChild = {
    ...baseChild,
    ...draft,
    dimensiones: {
      ...baseChild.dimensiones,
      ...(draft.dimensiones || {}),
    },
    meta: {
      ...baseChild.meta,
      ...(draft.meta || {}),
    }
  };

  const typeKey = esPadreEspacio ? 'contenedores' : 'pisos';

  completedChild.codigo = generateCodigo(typeKey, { existing: parentChilds, baseName: completedChild?.nombre });

  return completedChild;
}
