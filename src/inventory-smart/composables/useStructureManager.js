/**
 * useStructureManager.js
 *
 * Punto único para manejar:
 * - Estructuración (serializar) de elementos con hijos
 * - Desestructuración/instanciación (pegar) de estructuras en el canvas
 * - Construcción de entradas de catálogo unificadas (plantillas, cuartos, espacios)
 *
 * Contratos:
 * - Estructura serializada: { rootId: string, elements: Array<ElementoDTO> }
 * - CatalogItem: objeto mostrado en el panel con props base + payload de estructura opcional
 *   Campos clave añadidos: catalogKind ('template' | 'room' | 'space' | 'item')
 */

import { CM_TO_PX } from '@/inventory-smart/utils/constants'

// Util: ids únicos legibles
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

/**
 * Crea una estructura desde datos de formulario (AgregarCuarto/Espacio)
 * No realiza efectos (no inserta en stores); retorna estructura y metadatos.
 */
export function buildStructureFromForm(form) {
  if (!form || typeof form !== 'object') throw new Error('Formulario inválido')
  const { tipo, datosGenerales, dimensiones, pisosNiveles } = form
  if (!tipo || !datosGenerales || !dimensiones || !Array.isArray(pisosNiveles)) {
    throw new Error('Formulario incompleto')
  }

  const toCm = (m) => Math.round(Number(m || 0) * 100)
  const dimsCm = {
    ancho: toCm(dimensiones.ancho),
    largo: toCm(dimensiones.largo),
    alto: toCm(dimensiones.alto),
  }

  const rootId = uid(tipo === 'cuarto' ? 'cuarto' : 'espacio')
  const root = {
    id: rootId,
    nombre: datosGenerales.nombre,
    tipo: tipo === 'cuarto' ? 'cuartos' : 'elementos',
    categoria: datosGenerales.tipoSeleccionado || (tipo === 'cuarto' ? 'cuartos' : 'elementos'),
    forma: dimensiones.forma,
    orientacion: datosGenerales.orientacion,
    color: datosGenerales.color || '#3B82F6',
    colorBase: datosGenerales.color || '#3B82F6',
    dimensiones: dimsCm,
    pesoMaximo: Number(dimensiones.capacidadCarga) || 0,
    ubicacion: 'suelo',
    descripcion: datosGenerales.descripcion || '',
    icono: tipo === 'cuarto' ? 'home' : 'box',
    hijos: [],
    // metadata que indica que al instanciar debe regenerar pisos
    meta: { tienePisosGenerados: true },
    // Calcular width/height directamente para evitar problemas de serialización
    width: dimsCm.ancho * CM_TO_PX,
    height: dimsCm.largo * CM_TO_PX, // cuartos/espacios usan vista XY (largo->height)
    // Posición inicial (será sobrescrita al pegar, pero necesaria para serialización)
    x: 0,
    y: 0,
  }

  // Hijos: pisos/niveles — calcular posiciones básicas para evitar superposición
  const children = []
  pisosNiveles.forEach((p, idx) => {
    const pisoId = uid('piso')
    children.push({
      id: pisoId,
      nombre: p.nombre || `${tipo === 'cuarto' ? 'Piso' : 'Nivel'} ${idx + 1}`,
      tipo: 'pisos',
      categoria: 'piso',
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
      height: toCm(p.alto) * CM_TO_PX, // pisos usan vista XZ (alto->height)
      capacidadCarga: Number(p.capacidadCarga) || 0,
      tiposProductos: Array.isArray(p.tiposProductos) ? p.tiposProductos.slice() : [],
      tipoZona: p.tipoZona,
      permiteFragiles: !!p.permiteFragiles,
      props: { catalogVisible: false },
      meta: { esPisoInterno: true, indicePiso: idx + 1 },
    })
    root.hijos.push(pisoId)
  })

  return {
    root,
    payload: { rootId, elements: [root, ...children] },
    meta: {
      kind: tipo === 'cuarto' ? 'room' : 'space',
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
    pesoMaximo: root?.pesoMaximo || 0,
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
 * Dada una estructura serializada, genera nuevas IDs y la pega recursivamente en el canvas.
 * Requiere el canvasStore para realizar la inserción (evitamos import directo para no circular).
 */
export function instantiateStructureOnCanvas(canvasStore, payload, position) {
  if (!canvasStore || !payload?.rootId || !Array.isArray(payload.elements)) return false

  // 1) Mapear elementos por id
  const allElementsMap = new Map()
  for (const el of payload.elements) allElementsMap.set(el.id, JSON.parse(JSON.stringify(el)))

  // 2) Regenerar IDs únicos (similar a useCanvasBuffer)
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

  // 3) Ajuste especial para pasillos (altura = alto planta)
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
    }
  } catch (e) {
    // ignore adjustments for aisle height
  }

  // 4) Pegado recursivo con reposicionamiento de pisos internos si aplica
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

    console.log(`🎯 Paste element: ${elem.id || elem.nombre} (${elem.tipo})`, {
      isRoot,
      hasXYSelf,
      elemXY: { x: elem.x, y: elem.y },
      effectivePos,
      context: isRoot ? 'planta-canvas' : 'padre-canvas'
    })

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
    if (!parentId) newId = canvasStore.agregarElemento(base)
    else newId = addChildDirect(canvasStore, base, parentId)
    if (!newId) return null

    const isRootWithFloors = base.meta?.tienePisosGenerados === true && !parentId
    const hasChildren = Array.isArray(elem.hijos) && elem.hijos.length > 0

    // Decidir si regenerar pisos basándose en si vienen de plantilla o formulario
    const childFloors = elem.hijos?.map((hid) => newMap.get(hid))?.filter((h) => h && h.meta?.esPisoInterno) || []
    const hasFloorChildren = childFloors.length > 0

    // Regenerar solo si:
    // 1. Es root con pisos generados automáticamente
    // 2. Tiene pisos como hijos
    // 3. Los pisos parecen venir del formulario (posiciones básicas) NO de plantilla (posiciones complejas)
    const shouldRegenerate = isRootWithFloors && hasFloorChildren && childFloors.every((f, idx) => {
      // Si no tiene posición definida, es del formulario
      if (!(Number.isFinite(f?.x) && Number.isFinite(f?.y))) return true

      // Si tiene posición básica de formulario (x=0, y secuencial), es del formulario
      const hasBasicPosition = f.x === 0 && f.y === (idx * 50)

      // Si tiene posición compleja/no básica, es de plantilla -> NO regenerar
      return hasBasicPosition
    })

    console.log('🔍 Regenerate decision:', {
      isRootWithFloors,
      hasFloorChildren,
      shouldRegenerate
    })

    if (shouldRegenerate) {
      console.log(`🔧 Using regenerateFloors for: ${elem.id || elem.nombre}`)
      regenerateFloors(canvasStore, elem, newMap, newId, base.dimensiones)
    } else if (hasChildren) {
      console.log(`🎯 Using pasteRecursive for children of: ${elem.id || elem.nombre}`)
      for (const hid of elem.hijos) {
        const child = newMap.get(hid)
        if (!child) continue
        console.log(`  → Child: ${child.id || child.nombre} at (${child.x}, ${child.y})`)
        // Pasar la posición del root pegado para que los hijos calculen su posición relativa
        // El cálculo de posición relativa se hace en pasteRecursive
        pasteRecursive(child, pos, newId) // usar 'pos' (posición del root) en lugar de childPos
      }
    }
    return newId
  }

  return pasteRecursive(root, position, null)
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

    // Agregar a la lista de elementos
    canvasStore.elementos.push(elemento)

    // Actualizar lista de hijos del padre
    if (!Array.isArray(padre.hijos)) padre.hijos = []
    padre.hijos.push(elemento.id)

    return elemento.id
  } catch { return null }
}

// Reposición de pisos internos al instanciar estructura
function regenerateFloors(canvasStore, originalParent, allMap, newParentId, parentDims) {
  try {
    const floors = (originalParent.hijos || [])
      .map((hid) => allMap.get(hid))
      .filter((h) => h && h.meta?.esPisoInterno)
      .sort((a, b) => (a.meta?.indicePiso || 0) - (b.meta?.indicePiso || 0))

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
    const cloned = {
      ...JSON.parse(JSON.stringify(elem)),
      id: newId,
      x: (elem.x || 0) + offsetX,
      y: (elem.y || 0) + offsetY,
      padre: parentNewId,
      hijos: [],
    }
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
