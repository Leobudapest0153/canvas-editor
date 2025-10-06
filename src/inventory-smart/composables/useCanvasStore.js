import { generateCodigo, generateNombre } from '@/inventory-smart/utils/codeNameGenerator.js'
import { assignCodigoNombre } from '@/inventory-smart/utils/codeNameAssigner.js'
import { resolvePasilloAssignment, PASILLO_ASSIGNMENT_DEFAULTS } from '@/inventory-smart/utils/pasilloAssignment.js'
/**
 * useCanvasStore.js
 *
 * Store principal para el estado y lógica del canvas del editor visual jerárquico.
 *
 * Responsabilidades:
 * - Estado global del canvas (elementos, plantas, vista)
 * - Estado de selección y herramientas activas
 * - Configuración de canvas (zoom, pan, grid)
 * - CRUD de elementos en el canvas
 * - Gestión de plantas y navegación entre ellas
 * - Estado de las vistas XY/XZ
 * - Integración con otros stores y composables
 * - Persistencia y sincronización del estado
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { CM_TO_PX, DEFAULT_TIPOS_PRODUCTO_ADMITIDOS, CATALOGO, OFFSETS, TIPOS_ENTIDAD } from '@/inventory-smart/utils/constants'
import { computeDimsByAxisScale, toCanvasSizePx } from '@/inventory-smart/utils/dimensionPolicy'
import { useToast } from '@/inventory-smart/composables/useToast'
import { useStatePersistence } from '@/inventory-smart/composables/useStatePersistence'
import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  errorsPlacement,
} from '@/inventory-smart/validation/placementOrchestrator'
import { proposeLevelChange, applyLevelChange } from '@/inventory-smart/composables/useLevelStacking'
import { checkChildrenFit } from '@/inventory-smart/composables/useChildFitting'
// Importar store de catálogo para sincronizar selección al abrir detalle
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import { exportTemplatesToDTO, importTemplatesFromDTO } from '@/inventory-smart/modules/templates/templates.serializer.js'
import { useChangeHistoryStore } from '@/inventory-smart/stores/changeHistory'
import { exportCatalogItemsToDTO, importCatalogItemsFromDTO } from '@/inventory-smart/modules/catalog/catalogItems.serializer.js'

const SIDEBAR_TAB_IDS = new Set(['elementos', 'capas', 'buffer'])

export const useCanvasStore = defineStore('canvas', () => {
  const { showToast } = useToast()
  const { serialize: _serialize, deserialize: _deserialize, persist: _persist } = useStatePersistence()

  // Instancia del catálogo
  const catalogStore = useCatalogStore()
  const changeHistoryStore = useChangeHistoryStore?.() // opcional durante init

  // === INTEGRACIÓN CON HISTORIAL ===
  // Instancia del historial - se establece desde useCanvasWithHistory
  const historyInstance = ref(null)

  // Estado de plantas
  const plantas = ref([
    {
      id: 'planta_1',
      nombre: 'Planta Baja',
      descripcion: 'Nivel principal del edificio',
      elementos: [], // Los elementos se calculan dinámicamente
      activa: true,
      dimensiones: {
        alto: 1500, // cm
        ancho: 3000, // cm
        largo: 3000, // cm
      },
      capacidadCargaSoportado: 500000, // kg
      // Nuevo flag para plantas elásticas (por defecto false)
      isInfinite: false,
      forma: 'rectangle', // Plantilla por defecto
      poligono: [
        {
          x: 0,
          y: 0,
        },
        {
          x: 30000,
          y: 0,
        },
        {
          x: 30000,
          y: 30000,
        },
        {
          x: 0,
          y: 30000,
        },
      ],
    },
  ])

  const plantaActiva = ref('planta_1')

  // Estado básico para desarrollo
  const elementos = ref([])

  const PASILLO_SCOPE_TYPES = new Set(['pisos', 'cuartos'])
  const PASILLO_SCOPE_FALLBACK = '__scope:root__'

  const makeElementIndex = () => {
    const map = new Map()
    for (const el of elementos.value) {
      if (el?.id) {
        map.set(el.id, el)
      }
    }
    return map
  }

  const computeScopeKey = (element, index = null) => {
    if (!element) return PASILLO_SCOPE_FALLBACK
    const idx = index || makeElementIndex()
    let current = element
    let depthGuard = 0
    while (current?.padre && depthGuard < 50) {
      const parent = idx.get(current.padre)
      if (!parent) break
      if (PASILLO_SCOPE_TYPES.has(parent.tipo)) {
        return `${parent.tipo}:${parent.id}`
      }
      current = parent
      depthGuard += 1
    }
    const plantaId = element.plantaId || current?.plantaId
    return plantaId ? `planta:${plantaId}` : PASILLO_SCOPE_FALLBACK
  }

  const buildPasilloAssignmentContext = () => {
    const index = makeElementIndex()
    const scopeMemo = new Map()

    const getScope = (element) => {
      if (!element?.id) return PASILLO_SCOPE_FALLBACK
      if (scopeMemo.has(element.id)) {
        return scopeMemo.get(element.id)
      }
      const scope = computeScopeKey(element, index)
      scopeMemo.set(element.id, scope)
      return scope
    }

    const pasillosByScope = new Map()
    for (const el of index.values()) {
      if (el?.tipo === 'pasillos') {
        const scope = getScope(el)
        const key = scope || PASILLO_SCOPE_FALLBACK
        if (!pasillosByScope.has(key)) pasillosByScope.set(key, [])
        pasillosByScope.get(key).push(el)
      }
    }

    const getPasillosForScope = (scope) => {
      const key = scope || PASILLO_SCOPE_FALLBACK
      return pasillosByScope.get(key) || []
    }

    return {
      index,
      getScope,
      getPasillosForScope,
      settings: PASILLO_ASSIGNMENT_DEFAULTS,
    }
  }

  const assignPasilloWithContext = (ctx, element) => {
    if (!element) return
    if (element.tipo === 'pasillos') {
      element.pasilloId = null
      return
    }
    if (!Object.prototype.hasOwnProperty.call(element, 'pasilloId')) {
      element.pasilloId = null
    }
    const scope = ctx.getScope(element)
    const pasillos = ctx.getPasillosForScope(scope)
    if (!pasillos.length) {
      element.pasilloId = null
      return
    }
    const match = resolvePasilloAssignment({
      element,
      pasillos,
      config: ctx.settings,
    })
    const newId = match?.id ?? null
    element.pasilloId = newId
  }

  const applyPasilloAssignments = (ctx, { scope = null, elementIds = null } = {}) => {
    if (Array.isArray(elementIds) && elementIds.length > 0) {
      for (const id of elementIds) {
        const target = ctx.index.get(id)
        if (target) assignPasilloWithContext(ctx, target)
      }
      return
    }

    if (scope != null) {
      for (const target of ctx.index.values()) {
        if (target?.tipo === 'pasillos') continue
        if (ctx.getScope(target) === scope) {
          assignPasilloWithContext(ctx, target)
        }
      }
      return
    }

    for (const target of ctx.index.values()) {
      if (target?.tipo === 'pasillos') continue
      assignPasilloWithContext(ctx, target)
    }
  }

  const recomputePasilloAssignments = (options = {}) => {
    const ctx = buildPasilloAssignmentContext()
    applyPasilloAssignments(ctx, options)
  }

  // Etiquetas
  const etiquetas = ref([
    { id: 1, texto: 'Urgente', colorFondo: '#FECACA', colorTexto: '#991B1B' },
    { id: 2, texto: 'Revisar', colorFondo: '#DBEAFE', colorTexto: '#1E40AF' },
    { id: 3, texto: 'Material Pesado', colorFondo: '#FEF9C3', colorTexto: '#854D0E' },
  ])
  const etiquetasSeleccionadas = ref([])

  const elementoSeleccionado = ref(null)
  const elementosSeleccionadosMultiple = ref([]) // Array de IDs para selección múltiple
  const cambiosNoAplicados = ref(false);

  // === NAVEGACIÓN JERÁRQUICA (se declara antes de vistaActiva para evitar ReferenceError) ===
  const contextoNavegacion = ref({
    tipo: 'plantas',
    id: 'planta_1',
    path: [],
  })

  const vistaActiva = computed(() => {
    const t = contextoNavegacion.value.tipo
    if (t === 'plantas' || t === 'pisos') return 'XY'
    if (t === 'elementos' || t === 'cuartos') return 'XZ'
    return 'XY'
  })

  // Recalcular footprint canvas (width/height) al cambiar la vista
  watch(() => vistaActiva.value, (vista) => {
    for (const el of elementos.value) {
      if (!el?.dimensiones) continue
      const { width, height } = toCanvasSizePx(el.dimensiones, vista)
      if (el.width !== width) el.width = width
      if (el.height !== height) el.height = height
    }
  })
  const zoom = ref(1)
  const crearPlanta = ref(false)
  const plantaEnEdicion = ref(null)
  const panX = ref(0)
  const panY = ref(0)

  const elementoDestacadoId = ref(null)
  const idsElementosFiltrados = ref(null)
  const elementoAura = ref(null)
  // Opacidad animada (fade-out). 1 al iniciar, decrece a 0.
  const auraOpacity = ref(0)

  // Edición de niveles
  const nivelAEditar = ref(null);

  const confirmacionAlturasNivelesModal = ref(false);
  const propuestaAlturasNiveles = ref(null);

  const isDraggable = ref(true)
  const modoEdicion = ref(false)
  const modoConfigurarEsl = ref(false)
  const elementoEslObjetivo = ref(null)
  const sidebarActiveTab = ref('elementos')
  const sidebarVisible = ref(false)

  const editorPermissions = computed(() => ({
    modo: modoEdicion.value ? 'edicion' : 'visualizacion',
    canvasInteractivo: modoEdicion.value,
    propiedadesEditable: modoEdicion.value,
    catalogoMutable: modoEdicion.value,
    capasPersistentes: modoEdicion.value,
    atajosActivos: modoEdicion.value,
    menusEdicion: modoEdicion.value,
  }))

  const tiposProductoAdmitidos = ref(DEFAULT_TIPOS_PRODUCTO_ADMITIDOS)

  const setTiposProductoAdmitidos = (tipos) => {
    try {
      tiposProductoAdmitidos.value = Array.isArray(tipos) ? tipos : DEFAULT_TIPOS_PRODUCTO_ADMITIDOS
    } catch {
      tiposProductoAdmitidos.value = DEFAULT_TIPOS_PRODUCTO_ADMITIDOS
    }
  }
  // Configuración de grilla y snap
  // Por defecto desactivamos la cuadrícula (0 = sin cuadricula visual ni snap a grilla)
  const gridSize = ref(0) // px entre líneas de grilla (0 desactiva)
  const snapGridEps = ref(10) // px de proximidad para aplicar snap al soltar

  const setGridSize = (sizePx) => {
    const s = Number(sizePx)
    if (!Number.isFinite(s)) return
    // Permitimos 0 para desactivar la grilla; rango [0,500]
    gridSize.value = Math.max(0, Math.min(500, s))
  }
  const setSnapGridEps = (epsPx) => {
    const e = Number(epsPx)
    if (!Number.isFinite(e)) return
    snapGridEps.value = Math.max(0, Math.min(50, e))
  }

  // (contextoNavegacion ya declarado arriba)

  // Tamaño del canvas adaptativo según el contexto
  const canvasAdaptativo = ref({
    width: 800,
    height: 600,
    escala: 1,
  })

  // Edición de pisos (cuartos) desde las propiedades
  const gestionPisosPropiedadesModal = ref(false);

  const withRestrinctions = (el) => {
    if (!el) return null;

    const tipo = TIPOS_MAP[el.tipo];
    const restrictions = tipo?.restrictions ?? [];
    return { ...el, restrictions };
  }

  const TIPOS_MAP = Object.fromEntries(TIPOS_ENTIDAD.map(t => [t.id, t])
  )
  // Getters
  const elementosVisibles = computed(() => {
    const t = contextoNavegacion.value.tipo
    const id = contextoNavegacion.value.id

    if (t === 'plantas') {
      const enPlanta = elementos.value.filter((el) => el.plantaId === id && !el.padre)
      return enPlanta.filter((el) => ['cuartos', 'elementos', 'pasillos'].includes(el.tipo)).map(withRestrinctions);
    }

    if (t === 'cuartos') {
      const padre = elementos.value.find((el) => el.id === id)
      if (padre?.hijos) {
        return padre.hijos
          .map((hid) => elementos.value.find((e) => e.id === hid))
          .filter((h) => h && h.tipo === 'pisos').map(withRestrinctions);
      }
    }

    if (t === 'pisos') {
      const padre = elementos.value.find((el) => el.id === id)
      if (padre?.hijos) {
        return padre.hijos
          .map((hid) => elementos.value.find((e) => e.id === hid))
          .filter((h) => ['elementos', 'pasillos'].includes(h.tipo)).map(withRestrinctions);
      }
    }

    if (t === 'elementos') {
      const padre = elementos.value.find((el) => el.id === id)
      if (padre?.hijos) {
        return padre.hijos
          .map((hid) => elementos.value.find((e) => e.id === hid))
          .filter((h) => h && h.tipo === 'contenedores').map(withRestrinctions);
      }
    }

    return []
  })

  const elementoPorId = computed(() => (id) => {
    return elementos.value.find((el) => el.id === id)
  })

  const plantaPorId = computed(() => (id) => {
    return plantas.value.find((planta) => planta.id === id)
  })

  const plantaActivaData = computed(() => {
    return plantas.value.find((planta) => planta.id === plantaActiva.value)
  })

  const elementosEnPlanta = computed(() => (plantaId) => {
    return elementos.value.filter((el) => el.plantaId === plantaId)
  })

  const elementoSeleccionadoCompleto = computed(() => {
    if (!elementoSeleccionado.value) return null
    return elementos.value.find((el) => el.id === elementoSeleccionado.value)
  })

  // === COMPUTED PARA NAVEGACIÓN JERÁRQUICA ===
  const contextoActual = computed(() => {
    return contextoNavegacion.value
  })

  const estaEnPlanta = computed(() => {
    return contextoNavegacion.value.tipo === 'plantas'
  })

  const estaEnCuarto = computed(() => {
    return contextoNavegacion.value.tipo === 'cuartos'
  })

  const estaEnPiso = computed(() => {
    return contextoNavegacion.value.tipo === 'pisos'
  })

  const estaEnElemento = computed(() => {
    return contextoNavegacion.value.tipo === 'elementos'
  })

  const estaEnContenedor = computed(() => {
    return contextoNavegacion.value.tipo === 'contenedores'
  })

  const estructuraContenedorActual = computed(() => {
    if (
      contextoNavegacion.value.tipo === 'elementos' ||
      contextoNavegacion.value.tipo === 'contenedores' ||
      contextoNavegacion.value.tipo === 'pisos' ||
      contextoNavegacion.value.tipo === 'cuartos'
    ) {
      return elementos.value.find((el) => el.id === contextoNavegacion.value.id)
    }
    return null
  })

  // Nodo actual genérico para cualquier contexto (planta o elemento)
  const nodoActual = computed(() => {
    const t = contextoNavegacion.value.tipo
    const id = contextoNavegacion.value.id
    if (t === 'plantas') return plantaPorId.value(id)
    return elementos.value.find((el) => el.id === id) || null
  })

  const breadcrumbs = computed(() => {
    const crumbs = []

    // Siempre empezamos con la planta
    const planta = plantaPorId.value(contextoNavegacion.value.path[0]?.id || plantaActiva.value)
    if (planta) {
      crumbs.push({
        tipo: 'plantas',
        id: planta.id,
        nombre: planta.nombre,
        icono: 'warehouse',
      })
    }

    // Agregar items del path navegable (cuartos, pisos, elementos) y contenedores si existieran en el path
    for (let i = 1; i < contextoNavegacion.value.path.length; i++) {
      const pathItem = contextoNavegacion.value.path[i]
      if (
        pathItem.tipo === 'cuartos' ||
        pathItem.tipo === 'pisos' ||
        pathItem.tipo === 'elementos' ||
        pathItem.tipo === 'contenedores'
      ) {
        const elemento = elementoPorId.value(pathItem.id)
        if (elemento) {
          crumbs.push({
            tipo: pathItem.tipo,
            id: elemento.id,
            nombre: elemento.nombre,
            icono: getIconoElemento(elemento.tipo, elemento.ubicacion),
          })
        }
      }
    }

    return crumbs
  })

  const puedeNavegar = computed(() => {
    return contextoNavegacion.value.path.length > 1
  })

  // Helper function para iconos
  const getIconoElemento = (tipo, ubicacion) => {
    // Iconos por tipo - usando nombres de SVG
    if (tipo === 'pasillos') return 'space'
    if (tipo === 'cuartos') return 'room'
    if (tipo === 'pisos') return 'mezzanine'
    if (tipo === 'contenedores') return 'space'

    if (tipo === 'elementos') {
      const iconosElementos = {
        pared: 'space-on-wall',
        suelo: 'space',
      }
      return iconosElementos[ubicacion] || 'space'
    }

    return 'space'
  }

  const navegarAElemento = (elementoId) => {
    const elemento = elementoPorId.value(elementoId)
    if (!elemento) {
      showToast('Elemento no encontrado')
      return
    }

    // Verificar que el elemento sea navegable: cuartos, pisos, elementos
    if (!['cuartos', 'pisos', 'elementos'].includes(elemento.tipo)) {
      showToast('Este elemento no permite navegación')
      return
    }

    // Limpiar timer de zoom/pan
    clearZoomPanDebounce()

    // Actualizar contexto de navegación
    let nuevoPath = [...contextoNavegacion.value.path]
    if (nuevoPath.length === 0) {
      // Buscar la planta raíz activa
      const planta = plantaPorId.value(plantaActiva.value)
      if (planta) {
        nuevoPath.push({
          tipo: 'plantas',
          id: planta.id,
          nombre: planta.nombre,
        })
      }
    }
    nuevoPath.push({
      tipo: elemento.tipo,
      id: elementoId,
      nombre: elemento.nombre,
    })

    contextoNavegacion.value = {
      tipo: elemento.tipo,
      id: elementoId,
      path: nuevoPath,
    }

    // Limpiar historial de undo/redo al cambiar de contexto
    if (historyInstance.value && historyInstance.value.clearHistoryOnContextChange) {
      historyInstance.value.clearHistoryOnContextChange(
        { tipo: elemento.tipo, id: elementoId },
        `Navegación a ${elemento.nombre || elemento.tipo}`
      )
    }

    // Calcular tamaño del canvas según el elemento
    calcularCanvasAdaptativo(elemento)

    // Limpiar timer pendiente y deseleccionar elemento
    clearZoomPanDebounce()
    elementoSeleccionado.value = null
  }

  const navegarAlPadre = () => {
    if (contextoNavegacion.value.path.length <= 1) {
      return
    }

    // Limpiar timer de zoom/pan
    clearZoomPanDebounce()

    // Remover último elemento del path
    const nuevoPath = [...contextoNavegacion.value.path]
    nuevoPath.pop()

    const ultimoElemento = nuevoPath[nuevoPath.length - 1]

    if (ultimoElemento.tipo === 'plantas') {
      // Regresar a vista de planta
      contextoNavegacion.value = {
        tipo: 'plantas',
        id: ultimoElemento.id,
        path: nuevoPath,
      }

      // Limpiar historial de undo/redo al cambiar de contexto
      if (historyInstance.value && historyInstance.value.clearHistoryOnContextChange) {
        const planta = plantaPorId.value(ultimoElemento.id)
        historyInstance.value.clearHistoryOnContextChange(
          { tipo: 'plantas', id: ultimoElemento.id },
          `Navegación a planta ${planta?.nombre || ultimoElemento.id}`
        )
      }

      // Calcular canvas adaptativo para la planta
      const planta = plantaPorId.value(ultimoElemento.id)
      calcularCanvasAdaptativoPlanta(planta)
    } else {
      // Regresar a elemento/contenedor padre
      contextoNavegacion.value = {
        tipo: ultimoElemento.tipo,
        id: ultimoElemento.id,
        path: nuevoPath,
      }

      // Limpiar historial de undo/redo al cambiar de contexto
      if (historyInstance.value && historyInstance.value.clearHistoryOnContextChange) {
        const elementoPadre = elementoPorId.value(ultimoElemento.id)
        historyInstance.value.clearHistoryOnContextChange(
          { tipo: ultimoElemento.tipo, id: ultimoElemento.id },
          `Navegación a ${elementoPadre?.nombre || ultimoElemento.tipo}`
        )
      }

      const elementoPadre = elementoPorId.value(ultimoElemento.id)
      if (elementoPadre) {
        calcularCanvasAdaptativo(elementoPadre)
      }
    }

    // Limpiar timer pendiente y deseleccionar elemento
    clearZoomPanDebounce()
    elementoSeleccionado.value = null
  }

  /**
   * Navegar a un contexto ya construido (reemplaza el path en lugar de hacer push)
   * útil para cuando se selecciona un breadcrumb y queremos volver a un punto del path
   */
  const navegarAContexto = (tipo, id, path) => {
    if (!path || !Array.isArray(path) || path.length === 0) return

    // Limpiar timer de zoom/pan
    clearZoomPanDebounce()

    contextoNavegacion.value = {
      tipo: tipo,
      id: id,
      path: path,
    }

    // Limpiar historial de undo/redo al cambiar de contexto
    if (historyInstance.value && historyInstance.value.clearHistoryOnContextChange) {
      let nombreContexto = tipo
      if (tipo === 'plantas') {
        const planta = plantaPorId.value(id)
        nombreContexto = planta?.nombre || tipo
      } else {
        const elemento = elementoPorId.value(id)
        nombreContexto = elemento?.nombre || tipo
      }
      historyInstance.value.clearHistoryOnContextChange(
        { tipo, id },
        `Navegación a ${nombreContexto}`
      )
    }

    // Actualizar canvas adaptativo según el nuevo contexto
    if (tipo === 'plantas') {
      const planta = plantaPorId.value(id)
      calcularCanvasAdaptativoPlanta(planta)
    } else {
      const elemento = elementoPorId.value(id)
      if (elemento) calcularCanvasAdaptativo(elemento)
    }

    // Limpiar timer pendiente y deseleccionar elemento
    clearZoomPanDebounce()
    elementoSeleccionado.value = null
  }

  const navegarAPlanta = (plantaId) => {
    const planta = plantaPorId.value(plantaId)
    if (!planta) {
      showToast('Planta no encontrada')
      return
    }

    // Limpiar timer de zoom/pan
    clearZoomPanDebounce()

    // Reset a vista de planta
    contextoNavegacion.value = {
      tipo: 'plantas',
      id: plantaId,
      path: [
        {
          tipo: 'plantas',
          id: plantaId,
          nombre: planta.nombre,
        },
      ],
    }

    // Limpiar historial de undo/redo al cambiar de contexto
    if (historyInstance.value && historyInstance.value.clearHistoryOnContextChange) {
      historyInstance.value.clearHistoryOnContextChange(
        { tipo: 'plantas', id: plantaId },
        `Navegación a planta ${planta.nombre}`
      )
    }

    // Actualizar planta activa
    plantaActiva.value = plantaId

    // Calcular canvas adaptativo para la planta
    calcularCanvasAdaptativoPlanta(planta)

    // Limpiar timer pendiente y deseleccionar elemento
    clearZoomPanDebounce()
    elementoSeleccionado.value = null
  }

const calcularCanvasAdaptativo = (elemento) => {
    // Calcular tamaño del canvas basado en las dimensiones del elemento (ignorando orientacion)
    let elementWidthPx, elementHeightPx

    if (elemento.dimensiones) {
      // XY para pisos; XZ para elementos y cuartos
      if (['pisos'].includes(elemento.tipo)) {
        elementWidthPx = (Number(elemento.dimensiones.ancho) || 0) * CM_TO_PX
        elementHeightPx = (Number(elemento.dimensiones.largo) || 0) * CM_TO_PX
      } else if (['elementos', 'cuartos'].includes(elemento.tipo)) {
        // En vista XZ para elementos y cuartos: width=ancho, height=alto
        elementWidthPx = (Number(elemento.dimensiones.ancho) || 0) * CM_TO_PX
        elementHeightPx = (Number(elemento.dimensiones.alto) || 0) * CM_TO_PX
      } else {
        // Otros tipos
        elementWidthPx = (Number(elemento.dimensiones.ancho) || 0) * CM_TO_PX
        elementHeightPx = (Number(elemento.dimensiones.alto) || 0) * CM_TO_PX
      }
    } else if (elemento.width && elemento.height) {
      // Fallback a dimensiones legacy en píxeles (no alterar por orientacion)
      elementWidthPx = elemento.width
      elementHeightPx = elemento.height
    } else {
      // Fallback final - tamaño mínimo para contenedores pequeños
      const defaultWidth = elemento.tipo === 'contenedores' ? 30 : 100 // contenedores más pequeños
      const defaultHeight = elemento.tipo === 'contenedores' ? 40 : 60
      elementWidthPx = defaultWidth * CM_TO_PX
      elementHeightPx = defaultHeight * CM_TO_PX
      console.warn('Usando dimensiones por defecto')
    }

    // El canvas muestra el espacio real del elemento
    canvasAdaptativo.value = {
      width: elementWidthPx,
      height: elementHeightPx,
      escala: CM_TO_PX, // La escala es la conversión cm→px
    }
  }

  const calcularCanvasAdaptativoPlanta = (planta) => {
    // Calcular tamaño y origen del canvas basado en la planta activa
    if (!planta) {
      canvasAdaptativo.value = {
        width: 800,
        height: 600,
        escala: 1,
        frame: { x: 0, y: 0, width: 800, height: 600 },
      }
      return
    }

    const dims = planta.dimensiones || {}
    const widthPxFromDims = (Number(dims.ancho) || 0) * CM_TO_PX
    const heightPxFromDims = (Number(dims.largo) || 0) * CM_TO_PX

    let originX = 0
    let originY = 0
    let frameWidth = widthPxFromDims
    let frameHeight = heightPxFromDims

    if (Array.isArray(planta.poligono) && planta.poligono.length >= 3) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const point of planta.poligono) {
        const x = Number(point?.x ?? point?.[0])
        const y = Number(point?.y ?? point?.[1])
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }

      if (
        Number.isFinite(minX) &&
        Number.isFinite(minY) &&
        Number.isFinite(maxX) &&
        Number.isFinite(maxY) &&
        maxX > minX &&
        maxY > minY
      ) {
        originX = Math.floor(minX)
        originY = Math.floor(minY)
        frameWidth = Math.max(1, Math.ceil(maxX) - originX)
        frameHeight = Math.max(1, Math.ceil(maxY) - originY)
      }
    }

    if (!Number.isFinite(frameWidth) || frameWidth <= 0) frameWidth = widthPxFromDims || 0
    if (!Number.isFinite(frameHeight) || frameHeight <= 0) frameHeight = heightPxFromDims || 0

    canvasAdaptativo.value = {
      width: frameWidth || widthPxFromDims,
      height: frameHeight || heightPxFromDims,
      escala: CM_TO_PX,
      originX,
      originY,
      frame: {
        x: originX,
        y: originY,
        width: frameWidth || widthPxFromDims,
        height: frameHeight || heightPxFromDims,
      },
    }
  }

  // Actions
  const seleccionarElemento = (id) => {
    elementoSeleccionado.value = id
    // Limpiar selección múltiple al seleccionar un solo elemento
    elementosSeleccionadosMultiple.value = []
    // Forzar catálogo de 'elementos' al abrir detalle si estaba en 'plantillas'
    if (id && catalogStore.selectedCatalog === 'plantillas') {
      catalogStore.setSelectedCatalog('elementos')
    }
  }

  // Selección múltiple: establecer array de IDs seleccionados
  const seleccionarElementosMultiple = (ids) => {
    if (!Array.isArray(ids)) {
      return
    }
    elementosSeleccionadosMultiple.value = [...ids]
    // Si hay múltiples, limpiar selección individual
    if (ids.length > 0) {
      elementoSeleccionado.value = null
    }
  }

  // Limpiar selección de elementos (individual y múltiple)
  const limpiarSeleccionElementos = () => {
    elementoSeleccionado.value = null
    elementosSeleccionadosMultiple.value = []
  }

  // Computed: obtener todos los elementos seleccionados (individual + múltiple)
  const todosLosElementosSeleccionados = computed(() => {
    const seleccionados = []
    if (elementoSeleccionado.value) {
      seleccionados.push(elementoSeleccionado.value)
    }
    if (elementosSeleccionadosMultiple.value.length > 0) {
      seleccionados.push(...elementosSeleccionadosMultiple.value)
    }
    return [...new Set(seleccionados)] // Eliminar duplicados
  })

  const actualizarPosicion = (id, x, y, saveHistory = false, description = null) => {
    const elemento = elementos.value.find((el) => el.id === id)
    if (elemento) {
      elemento.x = x
      elemento.y = y

      const ctx = buildPasilloAssignmentContext()
      if (elemento.tipo === 'pasillos') {
        const scope = ctx.getScope(elemento)
        applyPasilloAssignments(ctx, { scope })
      } else {
        applyPasilloAssignments(ctx, { elementIds: [elemento.id] })
      }

      // Solo guardar en historial si se especifica explícitamente
      if (saveHistory && description) {
        saveToHistory(description)
      }

      // Reordenar visibles si corresponde al contexto actual (plantas, pisos, elementos)
      try {
        const ctxTipo = contextoNavegacion.value?.tipo
        const ctxId = contextoNavegacion.value?.id
        if (ctxTipo === 'plantas' || ctxTipo === 'pisos') {
          reorderVisibleByHeightForContext(ctxTipo, ctxId)
        }
      } catch (e) { /* noop */ }
    }
  }

  // Actualización directa SIN validaciones de colocación/vecinos.
  // patch típico: { dimensiones: { alto: number, ancho?: number, largo?: number }, alturaRespectoAlSuelo?: number }
  const actualizarElementoSinValidacion = (id, patch = {}, description = 'Actualización sin validación') => {
    try {
      const idx = elementos.value.findIndex(e => e && e.id === id);
      if (idx === -1) {
        console.warn('Elemento no encontrado:', id);
        return false;
      }

      const prev = elementos.value[idx];
      const indexBefore = makeElementIndex()
      const previousScope = prev?.tipo === 'pasillos'
        ? computeScopeKey(prev, indexBefore)
        : null

      const next = {
        ...prev,
        ...patch,
        dimensiones: {
          ...(prev?.dimensiones || {}),
          ...(patch?.dimensiones || {}),
        },
      };

      // Normalizaciones en cm
      if (next.dimensiones) {
        for (const k of ['ancho', 'largo', 'alto']) {
          if (next.dimensiones[k] != null && Number.isFinite(Number(next.dimensiones[k]))) {
            next.dimensiones[k] = Math.round(Number(next.dimensiones[k]));
          }
        }
      }
      if (patch.alturaRespectoAlSuelo != null && Number.isFinite(Number(patch.alturaRespectoAlSuelo))) {
        next.alturaRespectoAlSuelo = Math.max(0, Math.round(Number(patch.alturaRespectoAlSuelo)));
      }

      // Normalizaciones en px
      for (const k of ['x', 'y', 'width', 'height']) {
        if (patch[k] != null && Number.isFinite(Number(patch[k]))) {
          let v = Math.round(Number(patch[k]));
          if (k === 'width' || k === 'height') v = Math.max(1, v);
          if (k === 'x' || k === 'y') v = Math.max(0, v);
          next[k] = v;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(next, 'pasilloId')) {
        next.pasilloId = prev?.pasilloId ?? null
      }
      if (next.tipo === 'pasillos') {
        next.pasilloId = null
      }

      elementos.value.splice(idx, 1, next);

      const ctx = buildPasilloAssignmentContext()
      if (next.tipo === 'pasillos') {
        const newScope = ctx.getScope(next)
        applyPasilloAssignments(ctx, { scope: newScope })
        if (previousScope && newScope !== previousScope) {
          applyPasilloAssignments(ctx, { scope: previousScope })
        }
      } else {
        applyPasilloAssignments(ctx, { elementIds: [next.id] })
        if (prev?.tipo === 'pasillos' && previousScope) {
          applyPasilloAssignments(ctx, { scope: previousScope })
        }
      }

      // if (saveHistory) {
      //   if (typeof registrarEnHistorial === 'function') {
      //     registrarEnHistorial({ tipo: 'update', id, antes: prev, despues: next, descripcion: description });
      //   } else if (typeof addToHistory === 'function') {
      //     addToHistory({ type: 'update', id, before: prev, after: next, description });
      //   }
      // }

      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  // Después de actualizar sin validación, reordenar visibles si aplica
  const _afterUpdateReorderIfNeeded = () => {
    try {
      const ctxTipo = contextoNavegacion.value?.tipo
      const ctxId = contextoNavegacion.value?.id
      if (ctxTipo === 'plantas' || ctxTipo === 'pisos') {
        reorderVisibleByHeightForContext(ctxTipo, ctxId)
      }
    } catch (e) { /* noop */ }
  }



  const actualizarElemento = (elementoId, propiedades, saveHistory = false, description = null) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    if (!elemento) return false
    if (!runPlacementValidators(elemento, propiedades)) return false
    const prevWasPasillo = elemento.tipo === 'pasillos'
    const previousScope = prevWasPasillo ? computeScopeKey(elemento, makeElementIndex()) : null
    if (elemento) {
      for (const key in propiedades) {
        if (
          typeof propiedades[key] === 'object' &&
          propiedades[key] !== null &&
          !Array.isArray(propiedades[key])
        ) {
          // Si la propiedad es un objeto (como 'dimensiones'), la fusionamos recursivamente.
          if (!elemento[key]) elemento[key] = {}
          Object.assign(elemento[key], propiedades[key])
        } else {
          // Si es un valor simple, lo asignamos directamente.
          elemento[key] = propiedades[key]
        }
      }

      // Correcciones en los datos de ancho y alto a base de las dimensiones
      if (propiedades.dimensiones) {
        // Actualizar width/height dependiendo de la vista activa
        if (vistaActiva.value === 'XY') {
          // En vista aérea (XY): ancho->width, largo->height
          if (propiedades.dimensiones.ancho !== undefined) {
            elemento.width = elemento.dimensiones.ancho * CM_TO_PX
          }
          if (propiedades.dimensiones.largo !== undefined) {
            elemento.height = elemento.dimensiones.largo * CM_TO_PX
          }
        } else if (vistaActiva.value === 'XZ') {
          // En vista de frente (XZ): ancho->width, alto->height
          if (propiedades.dimensiones.ancho !== undefined) {
            elemento.width = elemento.dimensiones.ancho * CM_TO_PX
          }
          if (propiedades.dimensiones.alto !== undefined) {
            elemento.height = elemento.dimensiones.alto * CM_TO_PX
          }
          // Nota: largo no afecta a width/height en vista de frente (XZ)
        }
      }

      const ctx = buildPasilloAssignmentContext()
      if (elemento.tipo === 'pasillos') {
        elemento.pasilloId = null
        const newScope = ctx.getScope(elemento)
        applyPasilloAssignments(ctx, { scope: newScope })
        if (previousScope && newScope !== previousScope) {
          applyPasilloAssignments(ctx, { scope: previousScope })
        }
      } else {
        if (!Object.prototype.hasOwnProperty.call(elemento, 'pasilloId')) {
          elemento.pasilloId = null
        }
        applyPasilloAssignments(ctx, { elementIds: [elemento.id] })
        if (prevWasPasillo && previousScope) {
          applyPasilloAssignments(ctx, { scope: previousScope })
        }
      }

      // Guardar en historial si se especifica
      if (saveHistory) {
        const descripcionAuto =
          description || `Propiedades actualizadas: ${Object.keys(propiedades).join(', ')}`
        saveToHistory(descripcionAuto)
      }
      // Reordenar visibles después de una actualización normal
      try {
        const ctxTipo = contextoNavegacion.value?.tipo
        const ctxId = contextoNavegacion.value?.id
        if (ctxTipo === 'plantas' || ctxTipo === 'pisos') {
          reorderVisibleByHeightForContext(ctxTipo, ctxId)
        }
      } catch (e) { /* noop */ }
    }
    return true
  }

  const persist = () => {
    try {
      const state = {
        plantas: plantas.value,
        elementos: elementos.value,
        modoEdicion: modoEdicion.value,
      }
      const data = _serialize(state)
      return _persist(data)
    } catch (e) {
      console.warn('Error persisting state', e)
      return false
    }
  }

  const updateElementById = (id, patch) => {
    const ok = actualizarElemento(id, patch, true, 'Editar propiedades')
    if (ok) {
      const el = elementos.value.find(e => e.id === id)
      if (el) {
        el.updatedAt = new Date().toISOString()
      }
      // Reordenar visibles si corresponde (persist no forzado aquí)
      try {
        const ctxTipo = contextoNavegacion.value?.tipo
        const ctxId = contextoNavegacion.value?.id
        if (ctxTipo === 'plantas' || ctxTipo === 'pisos') {
          reorderVisibleByHeightForContext(ctxTipo, ctxId)
        }
      } catch (e) { /* noop */ }
    }
    return ok
  }

  // Variables para debounce de historial de vista
  let zoomPanDebounceTimer = null
  const ZOOM_PAN_DEBOUNCE_DELAY = 1000 // 1 segundo

  /**
   * Guardar cambios de zoom/pan en historial con debounce
   */
  const saveZoomPanToHistory = () => {
    if (zoomPanDebounceTimer) {
      clearTimeout(zoomPanDebounceTimer)
    }

    zoomPanDebounceTimer = setTimeout(() => {
      saveToHistory(
        `Vista ajustada: zoom ${zoom.value.toFixed(2)}x, pan (${Math.round(panX.value)}, ${Math.round(panY.value)})`,
      )
      zoomPanDebounceTimer = null
    }, ZOOM_PAN_DEBOUNCE_DELAY)
  }

  const configurarZoom = (nuevoZoom, minZoom = 0.1) => {
    const zoomAnterior = zoom.value
    zoom.value = Math.max(minZoom, Math.min(5, nuevoZoom))

    // Sincronizar con Konva Stage
    const stage = window.__konvaStage
    if (stage && typeof stage.scale === 'function') {
      stage.scale({ x: zoom.value, y: zoom.value })
      stage.batchDraw?.()
    }

    // Solo guardar en historial si cambió significativamente
    if (Math.abs(zoom.value - zoomAnterior) > 0.01) {
      saveZoomPanToHistory()
    }
  }

  const configurarPan = (x, y) => {
    const panXAnterior = panX.value
    const panYAnterior = panY.value
    panX.value = x
    panY.value = y

    // Sincronizar con Konva Stage
    const stage = window.__konvaStage
    if (stage && typeof stage.position === 'function') {
      stage.position({ x: panX.value, y: panY.value })
      stage.batchDraw?.()
    }

    // Solo guardar en historial si cambió significativamente
    if (Math.abs(x - panXAnterior) > 1 || Math.abs(y - panYAnterior) > 1) {
      saveZoomPanToHistory()
    }
  }

  // Actions para plantas
  const seleccionarPlanta = (plantaId) => {
    // Limpiar timer de zoom/pan
    clearZoomPanDebounce()

    plantaActiva.value = plantaId
    // Deseleccionar elemento al cambiar de planta
    elementoSeleccionado.value = null

    // Actualizar contexto de navegación
    const planta = plantaPorId.value(plantaId)
    if (planta) {
      contextoNavegacion.value = {
        tipo: 'plantas',
        id: plantaId,
        path: [
          {
            tipo: 'plantas',
            id: plantaId,
            nombre: planta.nombre,
          },
        ],
      }

      // Limpiar historial de undo/redo al cambiar de planta
      if (historyInstance.value && historyInstance.value.clearHistoryOnContextChange) {
        historyInstance.value.clearHistoryOnContextChange(
          { tipo: 'plantas', id: plantaId },
          `Selección de planta: ${planta.nombre}`
        )
      }

      // Calcular canvas adaptativo para la planta seleccionada
      calcularCanvasAdaptativoPlanta(planta)
    }
  }

  const agregarPlanta = (nuevaPlanta) => {
    const id = `planta_${Date.now()}`

    // Asignar código a la planta (secuencial PLA-###)
    let codigo = undefined
    const existentes = Array.isArray(plantas.value) ? plantas.value : []
    codigo = generateCodigo('plantas', { existing: existentes })

    plantas.value.push({
      id,
      codigo,
      nombre: nuevaPlanta.nombre || 'Nueva Planta',
      descripcion: nuevaPlanta.descripcion || '',
      elementos: [],
      activa: false,
      dimensiones: {
        alto: nuevaPlanta.dimensiones?.alto || 0,
        ancho: nuevaPlanta.dimensiones?.ancho || 0,
        largo: nuevaPlanta.dimensiones?.largo || 0,
      },
      capacidadCargaSoportado: nuevaPlanta.capacidadCargaSoportado || 3000,
      // Flag de planta elástica: por defecto false
      isInfinite: false,
      ...nuevaPlanta,
    })
    return id
  }

  const editarPlanta = (plantaId, datosActualizados) => {
    const planta = plantas.value.find((p) => p.id === plantaId)
    if (planta) {
      Object.assign(planta, datosActualizados)
      try {
        // Recalcular dimensiones de elementos "sistema base" si la planta cambia de tamaño
        // const shouldAuto = DIMENSIONS?.autoResizeOnParentChange !== false
        // if (shouldAuto && planta?.dimensiones) {
        //   const parentDims = {
        //     w: planta.dimensiones.ancho,
        //     h: planta.dimensiones.largo,
        //     d: planta.dimensiones.alto,
        //   }
        //   const elems = elementos.value.filter(
        //     (el) => el.plantaId === plantaId && !el.padre && (el.tipo === 'elementos' || el.tipo === 'pasillos' || el.tipo === 'cuartos')
        //   )
        //   for (const el of elems) {
        //     const typeKey = el.systemTypeKey || el.id
        //     const isSystemDefault = !!(
        //       typeKey && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(typeKey)
        //     )
        //     if (!isSystemDefault) continue
        //     if (el.dimensionLock === true) continue
        //     const dims = computeDimsByAxisScale(typeKey, parentDims, { snap: true, gridPx: gridSize.value })
        //     if (!dims) continue
        //     // Persistir nuevas dimensiones; width/height se recalculan según vista en actualizarElemento
        //     actualizarElemento(el.id, { dimensiones: dims }, true, `Auto-resize por cambio de planta: ${el.nombre || el.id}`)
        //     // Offset vertical configurable (por tipo) — solo si aplica
        //     const off = OFFSETS?.offsetByType?.[typeKey]?.zOffsetShare
        //     if (typeof off === 'number' && isFinite(off)) {
        //       const zBase = Math.round((planta.dimensiones.alto || 0) * off)
        //       actualizarElemento(el.id, { alturaRespectoAlSuelo: zBase })
        //     }
        //   }
        // }

        // Ajuste SIEMPRE aplicado: altura de pasillos = alto de la planta (solo para pasillos directos en planta)
        const plantaAlto = planta?.dimensiones?.alto
        if (Number.isFinite(plantaAlto)) {
          const pasillos = elementos.value.filter((e) => e.plantaId === plantaId && !e.padre && e.tipo === 'pasillos')
          for (const pa of pasillos) {
            actualizarElemento(
              pa.id,
              { dimensiones: { alto: plantaAlto } },
              true,
              `Altura de pasillo actualizada por cambio de planta: ${pa.nombre || pa.id}`,
            )
          }
        }
      } catch (e) {
        console.warn('Recalculo de dimensiones al editar planta falló:', e)
      }
    }
  }

  const eliminarPlanta = (plantaId) => {
    const elementosEnEstePlanta = elementos.value.filter((el) => el.plantaId === plantaId)

    if (elementosEnEstePlanta.length > 0) {
      throw new Error('No se puede eliminar una planta que contiene elementos')
    }

    const index = plantas.value.findIndex((p) => p.id === plantaId)
    if (index > -1) {
      plantas.value.splice(index, 1)

      const contextRootId = contextoNavegacion.value.path?.[0]?.id
      const contextMatches =
        contextoNavegacion.value.tipo === 'plantas' && contextoNavegacion.value.id === plantaId

      if (plantaActiva.value === plantaId || contextMatches || contextRootId === plantaId) {
        if (plantas.value.length > 0) {
          const nextId = plantas.value[0].id
          seleccionarPlanta(nextId)
        } else {
          plantaActiva.value = null
          contextoNavegacion.value = {
            tipo: 'plantas',
            id: null,
            path: [],
          }
        }
      }
    }
  }

  const runPlacementValidators = (element, candidate) => {
    const planta = plantaPorId.value(plantaActiva.value)
    const ctx = {
      alturaBodega: planta?.dimensiones?.alto,
      isInfinite: planta?.isInfinite === true
    }
    const neighbors = elementosVisibles.value.filter((n) => n.id !== element?.id)
    const checks = [
      (el, cand) => validateWallZBaseRequired(el, cand, ctx),
      (el, cand) => validateHeightWithinWarehouse(el, cand, ctx),
      (el, cand) => validateZStacking(el, cand, neighbors, {}, ctx),
    ]
    for (const v of checks) {
      const res = v(element, candidate)
      if (res.valid === false) {
        const msg = errorsPlacement[res.code] || 'Posición inválida'
        showToast(msg, 'error')
        return false
      }
    }
    return true
  }

  // Actions para elementos
  const agregarElemento = (nuevoElemento, opts = {}) => {
    const { saveHistory = true, skipReorder = false } = opts  // Permitir desactivar guardado de historial y reordenamiento
    const ubic = (
      nuevoElemento.ubicacion ||
      nuevoElemento.ubic ||
      nuevoElemento.location ||
      ''
    ).toLowerCase()
    const hasZBase =
      nuevoElemento.zBase != null ||
      nuevoElemento.alturaRespectoAlSuelo != null ||
      nuevoElemento.z_base != null ||
      nuevoElemento.baseZ != null
    if (ubic === 'suelo' && !hasZBase) {
      nuevoElemento.zBase = 0
    }

    if (!runPlacementValidators(null, nuevoElemento)) return null

    // Validar tipo de elemento
    if (!nuevoElemento.tipo) {
      console.error('El elemento debe tener un tipo definido')
      return null
    }

    // Validar jerarquía según el contexto actual
    const contextoActual = contextoNavegacion.value.tipo
    const tipoElemento = nuevoElemento.tipo

    // Reglas de jerarquía actualizadas
    if (contextoActual === 'plantas' && !['cuartos', 'elementos', 'pasillos'].includes(tipoElemento)) {
      showToast('En plantas solo se pueden agregar cuartos, elementos o pasillos')
      return null
    }
    if (contextoActual === 'cuartos' && tipoElemento !== 'pisos') {
      showToast('En cuartos solo se pueden agregar pisos')
      return null
    }
    if (contextoActual === 'pisos' && !['elementos', 'pasillos'].includes(tipoElemento)) {
      showToast('En pisos solo se pueden agregar elementos o pasillos')
      return null
    }
    if (contextoActual === 'elementos' && tipoElemento !== 'contenedores') {
      showToast('En elementos solo se pueden agregar niveles')
      return null
    }
    if (contextoActual === 'contenedores') {
      showToast('Los niveles no pueden contener más elementos')
      return null
    }

    // Si estamos dentro de un elemento o contenedor, el nuevo elemento es hijo
    if ([
      'cuartos',
      'pisos',
      'elementos',
      'contenedores',
    ].includes(contextoNavegacion.value.tipo)) {
      const elementoPadre = elementos.value.find((el) => el.id === contextoNavegacion.value.id)
      if (elementoPadre) {
        // Agregar como hijo del elemento/contenedor actual
        nuevoElemento.padre = elementoPadre.id
        nuevoElemento.plantaId = elementoPadre.plantaId // Hereda la planta del padre

        // Agregar el ID del hijo al array de hijos del padre
        if (!elementoPadre.hijos) {
          elementoPadre.hijos = []
        }
        elementoPadre.hijos.push(nuevoElemento.id)
      }
    } else {
      // Si estamos en una planta, agregar normalmente
      nuevoElemento.plantaId = contextoNavegacion.value.id
      nuevoElemento.padre = null
      nuevoElemento.etiquetas = [] // Sin etiquetas inicialmente
      nuevoElemento.codigoEsl = '' // Sin código ESL inicialmente

      // Actualizar el array de elementos en la planta
      const planta = plantas.value.find((p) => p.id === contextoNavegacion.value.id)
      if (planta) {
        if (!planta.elementos) {
          planta.elementos = []
        }
        planta.elementos.push(nuevoElemento.id)
      }
    }

    // Política especial: altura de pasillos = alto del contenedor padre (planta o elemento padre)
    if (nuevoElemento.tipo === 'pasillos') {
      if (!nuevoElemento.dimensiones) nuevoElemento.dimensiones = { ancho: 0, largo: 0, alto: 0 }

      // Si tiene padre (está dentro de un elemento), usar el alto del padre
      if (nuevoElemento.padre) {
        const elementoPadre = elementos.value.find((el) => el.id === nuevoElemento.padre)
        if (elementoPadre?.dimensiones?.alto) {
          nuevoElemento.dimensiones.alto = elementoPadre.dimensiones.alto
        }
      } else {
        // Si no tiene padre, usar el alto de la planta
        const planta = plantas.value.find((p) => p.id === (nuevoElemento.plantaId || contextoNavegacion.value.id))
        if (planta?.dimensiones?.alto) {
          nuevoElemento.dimensiones.alto = planta.dimensiones.alto
        }
      }
    }

    // Política de dimensiones al crear en planta para elementos de sistema
    // try {
    //   const shouldAuto = true
    //   if (shouldAuto && ['cuartos','pisos','elementos','pasillos'].includes(nuevoElemento.tipo)) {
    //     const typeKey = nuevoElemento.systemTypeKey || nuevoElemento.id
    //     const isSystemDefault = !!(typeKey && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(typeKey))
    //     const isLocked = nuevoElemento.dimensionLock === true
    //     if (isSystemDefault && !isLocked) {
    //       const planta = plantas.value.find((p) => p.id === nuevoElemento.plantaId)
    //       if (planta && planta.dimensiones) {
    //         const parentDims = {
    //           w: planta.dimensiones.ancho,
    //           h: planta.dimensiones.largo,
    //           d: planta.dimensiones.alto,
    //         }
    //         const dims = computeDimsByAxisScale(typeKey, parentDims, { snap: true, gridPx: gridSize.value })
    //         if (dims) {
    //           // Ajustar dimensiones de modelo
    //           nuevoElemento.dimensiones = { ...nuevoElemento.dimensiones, ...dims }
    //           // Ajustar canvas en px según la vista ACTUAL (fix Option A: evita forzar 'XZ' en elementos cuando estamos en planta/XY)
    //           let view = vistaActiva.value
    //           // Si la vista calculada es XZ pero estamos creando en contexto planta (tipo 'plantas'), forzar XY para footprint inicial.
    //           if (view === 'XZ' && contextoNavegacion.value?.tipo === 'plantas') {
    //             view = 'XY'
    //           }
    //           const { width, height } = toCanvasSizePx(dims, view)
    //           if (Number.isFinite(width)) nuevoElemento.width = width
    //           if (Number.isFinite(height)) nuevoElemento.height = height
    //         }
    //         // Offset vertical configurable (por tipo)
    //         const off = OFFSETS?.offsetByType?.[typeKey]?.zOffsetShare
    //         if (typeof off === 'number' && isFinite(off)) {
    //           nuevoElemento.alturaRespectoAlSuelo = Math.round((planta.dimensiones.alto || 0) * off)
    //         }
    //       }
    //     }
    //   }
    // } catch (e) {
    //   console.warn('Auto-scale on create failed:', e)
    // }

    try {
      if (nuevoElemento.tipo === 'pasillos') opts.resetName = true
      assignCodigoNombre(nuevoElemento, elementos.value, opts)
    } catch (e) {
      console.warn('No se pudo generar codigo/nombre:', e)
      if (!nuevoElemento.codigo) {
        try {
          const pref = (nuevoElemento?.tipo || 'ELM').toString().slice(0, 3).toUpperCase()
          const count = elementos.value.filter((el) => (el?.tipo || '').toLowerCase() === (nuevoElemento?.tipo || '').toLowerCase()).length + 1
          nuevoElemento.codigo = `${pref}-${String(count).padStart(3, '0')}`
        } catch { nuevoElemento.codigo = 'ELM-001' }
      }
    }

    if (!Object.prototype.hasOwnProperty.call(nuevoElemento, 'pasilloId')) {
      nuevoElemento.pasilloId = null
    }
    if (nuevoElemento.tipo === 'pasillos') {
      nuevoElemento.pasilloId = null
    }

    elementos.value.push(nuevoElemento)

    // Normalización inmediata post-inserción: asegurar que en vista XY height represente largo (caso Anaquel)
    try {
      const currentView = vistaActiva.value
      if (currentView === 'XY' && nuevoElemento?.dimensiones) {
        const expected = nuevoElemento.dimensiones.largo * CM_TO_PX
        // Solo remapear si difiere exactamente del uso de alto
        if (nuevoElemento.height !== expected && nuevoElemento.dimensiones.alto * CM_TO_PX === nuevoElemento.height) {
          nuevoElemento.height = expected
        }
      }
    } catch (e) { /* noop */ }

    const ctx = buildPasilloAssignmentContext()
    if (nuevoElemento.tipo === 'pasillos') {
      const scope = ctx.getScope(nuevoElemento)
      applyPasilloAssignments(ctx, { scope })
    } else {
      applyPasilloAssignments(ctx, { elementIds: [nuevoElemento.id] })
    }

    // Guardar estado en historial (solo si está habilitado)
    if (saveHistory) {
      saveToHistory(`Elemento agregado: ${nuevoElemento.nombre || nuevoElemento.tipo}`)
    }

    // Reordenar elementos visibles según altura si el contexto actual es plantas o elementos
    // (Solo si no está desactivado explícitamente para operaciones en lote)
    if (!skipReorder) {
      try {
        const ctxTipo = contextoNavegacion.value?.tipo
        const ctxId = contextoNavegacion.value?.id
        if (ctxTipo === 'plantas' || ctxTipo === 'pisos') {
          reorderVisibleByHeightForContext(ctxTipo, ctxId)
        }
      } catch (e) { /* noop */ }
    }

    return nuevoElemento.id
  }

  const agregarElementoSinValidacion = (_id, nuevoElemento, saveHistory = true, description = 'Inserción sin validación') => {
    try {
      if (!nuevoElemento || !nuevoElemento.id) {
        return false;
      }

      // Copia defensiva
      const next = { ...nuevoElemento };

      // Normalizaciones en cm
      if (next.dimensiones) {
        for (const k of ['ancho', 'largo', 'alto']) {
          if (next.dimensiones[k] != null && Number.isFinite(Number(next.dimensiones[k]))) {
            next.dimensiones[k] = Math.round(Number(next.dimensiones[k]));
          }
        }
      }

      // Altura respecto al suelo
      if (next.alturaRespectoAlSuelo != null && Number.isFinite(Number(next.alturaRespectoAlSuelo))) {
        next.alturaRespectoAlSuelo = Math.max(0, Math.round(Number(next.alturaRespectoAlSuelo)));
      }

      // Normalizaciones en px
      for (const k of ['x', 'y', 'width', 'height']) {
        if (next[k] != null && Number.isFinite(Number(next[k]))) {
          let v = Math.round(Number(next[k]));
          if (k === 'width' || k === 'height') v = Math.max(1, v);
          if (k === 'x' || k === 'y') v = Math.max(0, v);
          next[k] = v;
        }
      }

      if (!Object.prototype.hasOwnProperty.call(next, 'pasilloId')) {
        next.pasilloId = null
      }
      if (next.tipo === 'pasillos') {
        next.pasilloId = null
      }

      // Insertar directamente en el store
      elementos.value.push(next);

      const ctx = buildPasilloAssignmentContext()
      if (next.tipo === 'pasillos') {
        const scope = ctx.getScope(next)
        applyPasilloAssignments(ctx, { scope })
      } else {
        applyPasilloAssignments(ctx, { elementIds: [next.id] })
      }

      // Agregar hijo al padre si aplica
      if (next.padre) {
        const padre = elementos.value.find((el) => el.id === next.padre);
        if (padre) {
          if (!Array.isArray(padre.hijos)) {
            padre.hijos = [];
          }
          if (!padre.hijos.includes(next.id)) {
            padre.hijos.push(next.id);
          }
        }
      }

      // Guardar en historial
      if (saveHistory) {
        // Historial: funciones legacy pueden no existir en el entorno actual
        try {
          const rH = typeof globalThis !== 'undefined' ? globalThis.registrarEnHistorial : undefined
          const aH = typeof globalThis !== 'undefined' ? globalThis.addToHistory : undefined
          if (typeof rH === 'function') {
            rH({ tipo: 'insert', id: next.id, despues: next, descripcion: description })
          } else if (typeof aH === 'function') {
            aH({ type: 'insert', id: next.id, after: next, description })
          }
        } catch { /* ignore historial error */ }
      }

      // Reordenar visibles si corresponde al contexto actual
      try {
        const ctxTipo = contextoNavegacion.value?.tipo
        const ctxId = contextoNavegacion.value?.id
        if (ctxTipo === 'plantas' || ctxTipo === 'pisos') {
          reorderVisibleByHeightForContext(ctxTipo, ctxId)
        }
      } catch (e) { /* noop */ }

      return next.id;
    } catch (err) {
      return false;
    }
  };


  const eliminarElemento = (elementoId) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    const index = elementos.value.findIndex((el) => el.id === elementoId)
    const wasPasillo = elemento?.tipo === 'pasillos'
    const previousScope = wasPasillo ? computeScopeKey(elemento, makeElementIndex()) : null

    if (index > -1) {
      // Remover de la planta si no tiene padre
      if (elemento && !elemento.padre && elemento.plantaId) {
        const planta = plantas.value.find((p) => p.id === elemento.plantaId)
        if (planta && planta.elementos) {
          const elementoIndex = planta.elementos.indexOf(elementoId)
          if (elementoIndex > -1) {
            planta.elementos.splice(elementoIndex, 1)
          }
        }
      }

      // Remover del padre si tiene uno
      if (elemento && elemento.padre) {
        const padre = elementos.value.find((el) => el.id === elemento.padre)
        if (padre && padre.hijos) {
          const hijoIndex = padre.hijos.indexOf(elementoId)
          if (hijoIndex > -1) {
            padre.hijos.splice(hijoIndex, 1)
          }
        }
      }

      elementos.value.splice(index, 1)

      if (wasPasillo && previousScope) {
        const ctx = buildPasilloAssignmentContext()
        applyPasilloAssignments(ctx, { scope: previousScope })
      }

      // Deseleccionar si era el elemento seleccionado
      if (elementoSeleccionado.value === elementoId) {
        elementoSeleccionado.value = null
      }

      // Guardar estado en historial
      saveToHistory(`Elemento eliminado: ${elemento?.nombre || elemento?.tipo || elementoId}`)
    }
  }

  const toggleElementoVisibilidad = (elementoId) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    if (elemento) {
      elemento.visible = elemento.visible === false
      const estado = elemento.visible ? 'mostrado' : 'ocultado'
      saveToHistory(`Elemento ${estado}: ${elemento.nombre || elemento.tipo}`)
    }
  }

  // === INTEGRACIÓN CON HISTORIAL ===

  /**
   * Establecer la instancia del historial (resuelve dependencia circular)
   */
  /**
   * Limpiar timer de debounce de zoom/pan
   */
  const clearZoomPanDebounce = () => {
    if (zoomPanDebounceTimer) {
      clearTimeout(zoomPanDebounceTimer)
      zoomPanDebounceTimer = null
    }
  }

  const setHistoryInstance = (historyComposableInstance) => {
    historyInstance.value = historyComposableInstance
  }

  /**
   * Guardar estado actual en el historial
   */
  const saveToHistory = (description) => {
    if (historyInstance.value && !historyInstance.value.isUndoRedoOperation.value) {
      historyInstance.value.pushState(description)
    }
  }

  // === FUNCIONES DE SERIALIZACIÓN ===

  /**
   * Serializa el estado completo del canvas a JSON
   * @returns {string} JSON string con todo el estado
   */
  const serialize = (saveTimestamp = false) => {
    const state = {
      plantas: plantas.value.map(p => p?._custom?.value || p),
      elementos: elementos.value.map(e => e?._custom?.value || e),
      templates: catalogStore.templates?.map?.(t => t?._custom?.value || t) || [],
      catalogItems: catalogStore.items?.map?.(i => i?._custom?.value || i) || [],
      modoEdicion: modoEdicion.value,
    }
    // Incluir historial de cambios si existe
    try {
      const ch = changeHistoryStore?.serialize?.()
      if (ch) state.changeHistory = ch
    } catch (e) {
      // ignore change history serialization errors
    }

    const jsonStr = _serialize(state, { validateBeforeSerialize: true, includeMetrics: true, saveTimestamp })
    try {
      const parsed = JSON.parse(jsonStr)
      if (state.templates.length > 0) {
        parsed.plantillas = exportTemplatesToDTO(state.templates)
        if (parsed.meta) {
          parsed.meta.version = '1.1.0'
          if (!parsed.meta.metrics) parsed.meta.metrics = {}
          parsed.meta.metrics.totalPlantillas = state.templates.length
        }
      } // si no hay plantillas mantenemos formato legacy (sin campo y version 1.0.0)
      // Exportar items estructurados del catálogo (excluye kind 'template')
      const itemsDTO = exportCatalogItemsToDTO(state.catalogItems)
      if (itemsDTO.length > 0) {
        parsed.catalogItems = itemsDTO
        if (parsed.meta) {
          parsed.meta.metrics.totalCatalogItems = itemsDTO.length
        }
      }

      // CRÍTICO: Agregar changeHistory al JSON final (se perdió en _serialize)
      if (state.changeHistory) {
        parsed.changeHistory = state.changeHistory
        if (parsed.meta?.metrics) {
          parsed.meta.metrics.totalChangeHistoryEntries =
            state.changeHistory.entries?.length || 0
        }
      }

      return JSON.stringify(parsed, null, 2)
    } catch (e) {
      console.warn('No se pudo post-procesar JSON para plantillas', e)
      return jsonStr
    }
  }

  /**
   * Deserializa un JSON y reconstruye el estado del canvas
   * @param {string} jsonString - JSON string con el estado
   * @returns {boolean} true si la deserialización fue exitosa
   */
  const deserialize = (jsonString) => {
    // Capturar contexto y vista previos
    const prevContext = {
      tipo: contextoNavegacion.value?.tipo || null,
      id: contextoNavegacion.value?.id || null,
      path: Array.isArray(contextoNavegacion.value?.path)
        ? contextoNavegacion.value.path.map(p => ({ tipo: p.tipo, id: p.id, nombre: p.nombre }))
        : [],
    }
    const prevZoom = zoom.value
    const prevPan = { x: panX.value, y: panY.value }

    try {
      const storeActions = {
        clearState: () => {
          plantas.value = []
          elementos.value = []
        },
        addPlanta: (plantaData) => {
          plantas.value.push(plantaData)
        },
        addElemento: (elementoData) => {
          elementos.value.push(elementoData)
        },
        setModoEdicion: (value) => {
          setModoEdicion(value)
        },
        setInitialNavigation: (plantaId, plantaNombre) => {
          // Establecer la primera planta como activa siempre
          plantaActiva.value = plantaId

          // Establecer contexto de navegación siempre en la primera planta
          contextoNavegacion.value = {
            tipo: 'plantas',
            id: plantaId,
            path: [
              {
                tipo: 'plantas',
                id: plantaId,
                nombre: plantaNombre,
              },
            ],
          }

          // Resetear valores temporales a sus defaults
          elementoSeleccionado.value = null
          // No resetear zoom/pan; mantener vista previa

          // Canvas adaptativo se recalculará automáticamente por el watcher
        }
      }

      const ok = _deserialize(jsonString, storeActions)

      if (modoEdicion.value !== true) {
        modoEdicion.value = false
      }

      // Post-procesar: garantizar que todas las plantas y elementos tengan 'codigo'
      try {
        // Plantas: asignar códigos únicos incrementando la lista existente a medida que asignamos
        if (Array.isArray(plantas.value)) {
          const existentes = plantas.value.filter(p => !!p)
          const existentesConCodigo = existentes.filter(p => !!p.codigo)
          for (const p of existentes) {
            if (!p.codigo) {
              p.codigo = generateCodigo('plantas', { existing: existentesConCodigo })
              existentesConCodigo.push(p)
            }
          }
        }
        // Elementos
        if (Array.isArray(elementos.value)) {
          for (const el of elementos.value) {
            try { assignCodigoNombre(el, elementos.value) } catch { /* ignore */ }
          }
        }
      } catch (e) {
        console.warn('Post-procesamiento de codigo/nombre tras deserializar falló:', e)
      }

      // Importar plantillas si existen (retrocompatible)
      try {
        const parsed = JSON.parse(jsonString)
        // Importar historial de cambios si viene
        try {
          if (parsed.changeHistory) {
            const ch = useChangeHistoryStore?.()
            ch?.deserialize?.(parsed.changeHistory)
            ch?.setBaseline?.({ plantas: plantas.value, elementos: elementos.value })
          }
        } catch (e) {
          // ignore change history import errors
        }
        if (Array.isArray(parsed.plantillas) && parsed.plantillas.length > 0) {
          importTemplatesFromDTO(parsed.plantillas)
        }
        if (Array.isArray(parsed.catalogItems) && parsed.catalogItems.length > 0) {
          importCatalogItemsFromDTO(parsed.catalogItems)
        }
      } catch (e) {
        console.warn('No se pudieron importar plantillas', e)
      }

      try {
        recomputePasilloAssignments()
      } catch (e) {
        console.warn('No se pudieron recalcular asignaciones de pasillo tras deserializar', e)
      }

      // Intentar restaurar el mismo contexto de navegación y vista
      try {
        const plantaExists = (id) => !!plantaPorId.value(id)
        const elementoExists = (id) => !!elementoPorId.value(id)

        let restoredPath = []
        let finalTipo = 'plantas'
        let finalId = null

        if (Array.isArray(prevContext.path) && prevContext.path.length > 0) {
          const rootPlantaId = prevContext.path[0]?.id
          if (rootPlantaId && plantaExists(rootPlantaId)) {
            const planta = plantaPorId.value(rootPlantaId)
            restoredPath.push({ tipo: 'plantas', id: planta.id, nombre: planta?.nombre || 'Planta' })
            finalTipo = 'plantas'
            finalId = planta.id
            for (let i = 1; i < prevContext.path.length; i++) {
              const node = prevContext.path[i]
              if (!node || !node.id) break
              if (elementoExists(node.id)) {
                const el = elementoPorId.value(node.id)
                restoredPath.push({ tipo: el.tipo, id: el.id, nombre: el?.nombre || el.id })
                finalTipo = el.tipo
                finalId = el.id
              } else {
                break
              }
            }
          }
        }

        // Fallback a primera planta si no se pudo reconstruir
        if (restoredPath.length === 0) {
          const firstPlanta = Array.isArray(plantas.value) && plantas.value.length > 0 ? plantas.value[0] : null
          if (firstPlanta) {
            restoredPath = [{ tipo: 'plantas', id: firstPlanta.id, nombre: firstPlanta.nombre }]
            finalTipo = 'plantas'
            finalId = firstPlanta.id
          }
        }

        if (finalId) {
          navegarAContexto(finalTipo, finalId, restoredPath)
          // Restaurar zoom y pan previos
          try {
            configurarZoom(prevZoom)
            configurarPan(prevPan.x, prevPan.y)
          } catch (e) { /* noop */ }
        }
      } catch (e) {
        console.warn('No se pudo restaurar el contexto de navegación previo:', e)
      }

      return ok
    } catch (error) {
      console.error('Error al deserializar el estado:', error)
      return false
    }
  }

  // === FIN FUNCIONES DE SERIALIZACIÓN ===

  const abrirEditor = (plantaId = null) => {
    if (plantaId) {
      const plantaAEditar = plantas.value.find((p) => p.id === plantaId)
      if (plantaAEditar) {
        plantaEnEdicion.value = plantaAEditar
      } else {
        console.error(`No se encontró la planta con id: ${plantaId}`)
        plantaEnEdicion.value = null
        return
      }
    } else {
      plantaEnEdicion.value = null
    }
    crearPlanta.value = true
  }

  const cerrarEditor = () => {
    crearPlanta.value = false
    plantaEnEdicion.value = null
  }

  const abrirCuartoNivelesPropiedades = (idElemento, tipo) => {
    const elemento = elementos.value.find((e) => e.id === idElemento);
    if (!elemento) {
      console.error('Elemento no encontrado:', idElemento);
      return;
    }
    // El elemento es un padre
    if (['elementos', 'cuartos'].includes(elemento.tipo)) {
      nivelAEditar.value = { padre: idElemento, tipo }
    }
    // El elemento es un nivel hijo
    if (['pisos', 'contenedores'].includes(elemento.tipo)) {
      nivelAEditar.value = { ...elemento }
    }
    gestionPisosPropiedadesModal.value = true;
  }

  const cerrarCuartoNivelesPropiedades = () => {
    gestionPisosPropiedadesModal.value = false;
    nivelAEditar.value = null;
  }

  const guardarCuartoNivelesPropiedades = (nivelActualizado, id) => {

    const parent = elementos.value.find(e => e.id === nivelAEditar.value.padre);
    if (nivelActualizado?.dimensiones?.alto > parent?.dimensiones?.alto) {
      showToast('La altura del nivel no puede exceder la altura del cuarto', 'error');
      return;
    }
    if (!nivelActualizado?.dimensiones.alto || nivelActualizado?.dimensiones?.alto <= 0) {
  // Evitar uso incorrecto de ?? dentro de expresión ya evaluada; aplicar fallback final
  const divisor = (parent?.hijos?.length || 0) + 1; // siempre >=1
  nivelActualizado.dimensiones.alto = Math.floor((parent?.dimensiones?.alto || 300) / (divisor || 3));
    }
    if (!nivelActualizado?.dimensiones.ancho || nivelActualizado?.dimensiones?.ancho <= 0) {
      nivelActualizado.dimensiones.ancho = parent?.dimensiones?.ancho || 100;
    }
    if (!nivelActualizado?.dimensiones.largo || nivelActualizado?.dimensiones?.largo <= 0) {
      nivelActualizado.dimensiones.largo = parent?.dimensiones?.largo || 100;
    }
    // Si no hay id, es un nuevo nivel
    if (!id) {
      const res = proposeLevelChange(elementos.value, 'Nuevo', nivelActualizado || {}, nivelAEditar.value.padre);
      console.log('Propuesta de nuevo nivel:', res);

      if (res.status === 'ok') {
        console.log('Aplicando nuevo nivel directamente:', res.draft);
        res.draft.padre = nivelAEditar.value.padre;
        const ok = applyLevelChange(
          elementos.value,
          res.draft,
          'ok',
          {
            add: agregarElementoSinValidacion,
            update: actualizarElementoSinValidacion
          }
        );
      }
      if (res.status === 'needs_confirmation') {
        console.log('Nuevo nivel requiere confirmación:', res.draft);
        propuestaAlturasNiveles.value = res.draft;
        confirmacionAlturasNivelesModal.value = true;
        showToast('Se requiere confirmación para ajustar otros niveles', 'info');
        return;
      }

      cerrarCuartoNivelesPropiedades();
      return;
    }

    // Validación previa: calcular encaje de hijos (para usarlo si el cambio no requiere confirmación)
    let preFit = null
    try {
      const pisoActual = elementos.value.find(e => e.id === id) || nivelAEditar.value
      if (pisoActual && Array.isArray(pisoActual.hijos) && pisoActual.hijos.length > 0) {
        preFit = checkChildrenFit(pisoActual, {
          anchoCm: Number(nivelActualizado?.dimensiones?.ancho),
          largoCm: Number(nivelActualizado?.dimensiones?.largo),
          altoCm: Number(nivelActualizado?.dimensiones?.alto),
          capacidadCarga: Number(nivelActualizado?.capacidadCarga),
        }, elementos.value)
      }
    } catch (e) {
      console.warn('checkChildrenFit pre calculation failed', e)
    }

    // 1) Proponer cambio (alto/peso entre hermanos; incluye childFit en draft para el modal)
    const res = proposeLevelChange(elementos.value, id, nivelActualizado || {}, nivelAEditar.value.padre);
    if (res.status === 'error') {
      showToast(res.message || 'No se pudo aplicar el cambio', 'error');
      return;
    }
    if (res.status === 'ok' && preFit && preFit.ok === false) {
       res.status = 'needs_confirmation';

       if (res.draft) {
         res.draft.childFitError = preFit; // `preFit` contiene { ok: false, minAnchoCm, ... }
       }
    }

    if (res.status === 'ok') {
      // Si no requiere confirmación, validar que los hijos aún quepan y bloquear si no
      if (preFit && preFit.ok === false) {
        const parts = []
        const proposed = {
          anchoCm: Number(nivelActualizado?.dimensiones?.ancho),
          largoCm: Number(nivelActualizado?.dimensiones?.largo),
          altoCm: Number(nivelActualizado?.dimensiones?.alto),
          capacidadCarga: Number(nivelActualizado?.capacidadCarga),
        }
        if (preFit.minAnchoCm != null && proposed.anchoCm < preFit.minAnchoCm) parts.push(`ancho mínimo ${(preFit.minAnchoCm / 100).toFixed(2)}m`)
        if (preFit.minLargoCm != null && proposed.largoCm < preFit.minLargoCm) parts.push(`largo mínimo ${(preFit.minLargoCm / 100).toFixed(2)}m`)
        if (preFit.minAltoCm != null && proposed.altoCm < preFit.minAltoCm) parts.push(`alto mínimo ${(preFit.minAltoCm / 100).toFixed(2)}m`)
        if (preFit.minCapacidad != null && proposed.capacidadCarga < preFit.minCapacidad) parts.push(`capacidad mínima ${Math.round(preFit.minCapacidad)}kg`)
        const detalle = parts.length ? ` Requisitos: ${parts.join(', ')}.` : ''
        showToast(`No se puede aplicar: los elementos del piso no caben con las nuevas propiedades.${detalle}`, 'error')
        return
      }

      // 2) Aplicar directamente
      const ok = applyLevelChange(
        elementos.value,
        res.draft,
        'ok',
          {
            add: agregarElementoSinValidacion,
            update: actualizarElementoSinValidacion
          }
      );
      if (!ok.ok) {
        showToast(ok.message || 'Fallo aplicando el cambio', 'error');
        return;
      }
      showToast('Nivel actualizado', 'success');
      cerrarCuartoNivelesPropiedades();
      return;
    }

    if (res.status === 'needs_confirmation') {
      // 3) Guardar propuesta y abrir submodal de confirmación (no cerrar el modal principal)
      propuestaAlturasNiveles.value = res.draft;
      confirmacionAlturasNivelesModal.value = true;
      // Opcional: notificación informativa
      showToast('Se requiere confirmación para ajustar otros niveles', 'info');
      return;
    }
  }

  const confirmarPropuestaAlturasNiveles = (estrategia) => {
    if (!propuestaAlturasNiveles.value) {
      showToast('No hay propuesta pendiente', 'error');
      return false;
    }
    const draft = propuestaAlturasNiveles.value;

    // Agregar padre si falta (caso nuevo nivel)
    if (!draft.padre && nivelAEditar.value?.padre) {
      draft.padre = nivelAEditar.value.padre;
    }

    // Si estrategia es 'clamp' o 'redistribute', ajustar automáticamente a los mínimos requeridos por los hijos
    try {
      if (draft?.childFit) {
        const f = draft.childFit;
        const tp = draft.targetPatch || {};
        const dims = { ...(tp.dimensiones || {}) };

        if (Number.isFinite(f.minAnchoCm)) {
          const cur = Number(dims.ancho);
          if (!Number.isFinite(cur) || cur < f.minAnchoCm) dims.ancho = f.minAnchoCm;
        }
        if (Number.isFinite(f.minLargoCm)) {
          const cur = Number(dims.largo);
          if (!Number.isFinite(cur) || cur < f.minLargoCm) dims.largo = f.minLargoCm;
        }
        if (Number.isFinite(f.minAltoCm)) {
          const cur = Number(dims.alto);
          if (!Number.isFinite(cur) || cur < f.minAltoCm) dims.alto = f.minAltoCm;
        }
        if (Number.isFinite(f.minCapacidad)) {
          const cur = Number(tp.capacidadCarga);
          if (!Number.isFinite(cur) || cur < f.minCapacidad) tp.capacidadCarga = f.minCapacidad;
        }

        draft.targetPatch = { ...tp, dimensiones: dims };
      }
    } catch (e) {
      console.warn('auto adjust to child minimums failed', e);
    }

    const ok = applyLevelChange(
      elementos.value,
      draft,
      estrategia,
      {
        add: agregarElementoSinValidacion,
        update: actualizarElementoSinValidacion
      }
    );

    if (!ok.ok) {
      showToast(ok.message || 'Fallo aplicando el cambio', 'error');
      return false;
    }

    // Limpiar estado y cerrar ambos modales
    confirmacionAlturasNivelesModal.value = false;
    propuestaAlturasNiveles.value = null;

    showToast('Niveles ajustados', 'success');
    cerrarCuartoNivelesPropiedades();
    return true;
  }

  const cancelarPropuestaAlturasNiveles = () => {
    confirmacionAlturasNivelesModal.value = false;
    // Mantener el modal principal abierto para que el usuario corrija manualmente
    return true;
  }

  /* Funciones de filtros*/
  const getEtiquetaPorId = computed(() => {
    return (id) => etiquetas.value.find((etiqueta) => etiqueta.id === id)
  })

  const agregarEtiqueta = (nuevaEtiqueta) => {
    const newId = Math.max(0, ...etiquetas.value.map((e) => e.id)) + 1
    etiquetas.value.push({ id: newId, ...nuevaEtiqueta })
  }

  const seleccionarEtiqueta = (etiquetaId) => {
    if (!etiquetasSeleccionadas.value.includes(etiquetaId)) {
      etiquetasSeleccionadas.value.push(etiquetaId)
    }
  }

  const deseleccionarEtiqueta = (etiquetaId) => {
    etiquetasSeleccionadas.value = etiquetasSeleccionadas.value.filter((id) => id !== etiquetaId)
  }

  const limpiarSeleccion = () => {
    etiquetasSeleccionadas.value = []
  }

  const elementosVisiblesParaCapas = computed(() => {
    const elementosLimpios = elementos.value.map((el) => el?._custom?.value || el)
    const t = contextoNavegacion.value.tipo
    const id = contextoNavegacion.value.id

    if (t === 'plantas') {
      const enPlanta = elementosLimpios.filter((el) => el.plantaId === id && !el.padre)
      return enPlanta.filter((el) => ['cuartos', 'elementos', 'pasillos'].includes(el.tipo))
    }
    if (t === 'cuartos') {
      const padre = elementosLimpios.find((el) => el.id === id)
      if (padre?.hijos) {
        return padre.hijos
          .map((hid) => elementosLimpios.find((e) => e.id === hid))
          .filter((h) => h && h.tipo === 'pisos')
      }
    }
    if (t === 'pisos') {
      const padre = elementosLimpios.find((el) => el.id === id)
      if (padre?.hijos) {
        return padre.hijos
          .map((hid) => elementosLimpios.find((e) => e.id === hid))
          .filter((h) => h && h.tipo === 'elementos')
      }
    }
    if (t === 'elementos') {
      const padre = elementosLimpios.find((el) => el.id === id)
      if (padre?.hijos) {
        return padre.hijos
          .map((hid) => elementosLimpios.find((e) => e.id === hid))
          .filter((h) => h && h.tipo === 'contenedores')
      }
    }
    return []
  })

  const agregarYSeleccionarEtiqueta = (nuevaEtiqueta) => {
    // 1. Agregar la etiqueta a la lista global (lógica de agregarEtiqueta)
    const newId = Math.max(0, ...etiquetas.value.map((e) => e.id)) + 1
    const etiquetaCompleta = { id: newId, ...nuevaEtiqueta }
    etiquetas.value.push(etiquetaCompleta)

    // 2. Seleccionarla inmediatamente
    if (!etiquetasSeleccionadas.value.includes(newId)) {
      etiquetasSeleccionadas.value.push(newId)
    }
  }

  // Funciones para agregar etiquetas a los filtros
  const agregarEtiquetaAElemento = (elementoId, etiquetaId) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    if (elemento) {
      if (!elemento.etiquetas) {
        elemento.etiquetas = []
      }
      if (!elemento.etiquetas.includes(etiquetaId)) {
        elemento.etiquetas.push(etiquetaId)
        saveToHistory(`Etiqueta añadida a ${elemento.nombre}`)
      }
    }
  }

  const quitarEtiquetaDeElemento = (elementoId, etiquetaId) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    if (elemento && elemento.etiquetas) {
      const index = elemento.etiquetas.indexOf(etiquetaId)
      if (index > -1) {
        elemento.etiquetas.splice(index, 1)
        saveToHistory(`Etiqueta quitada de ${elemento.nombre}`)
      }
    }
  }

  const crearYAsignarEtiquetaAElemento = (elementoId, nuevaEtiqueta) => {
    // 1. Crear la etiqueta globalmente
    const newId = Math.max(0, ...etiquetas.value.map((e) => e.id)) + 1
    const etiquetaCompleta = { id: newId, ...nuevaEtiqueta }
    etiquetas.value.push(etiquetaCompleta)

    // 2. Asignarla al elemento
    agregarEtiquetaAElemento(elementoId, newId)
  }
  const destacarElemento = (elementoId) => {
    const el = elementoPorId.value(elementoId)
    if (!el) return
    elementoDestacadoId.value = elementoId

    const stage = typeof window !== 'undefined' ? window.__konvaStage : null
    const PADDING_VISUAL = 40 // px en pantalla
    let worldX, worldY, worldW, worldH

    // Helpers reales de dimensiones (coinciden con CanvasView)
    const getDrawWidth = (typeof window !== 'undefined' && window.__getDrawWidth) ? window.__getDrawWidth : (e) => e.width || 0
    const getDrawHeight = (typeof window !== 'undefined' && window.__getDrawHeight) ? window.__getDrawHeight : (e) => e.height || 0

    // 1. Intentar bounding box real via Konva para incluir rotaciones / grupos
    if (stage && typeof stage.findOne === 'function') {
      try {
        const node = stage.findOne(`#${el.id}`)
        if (node && typeof node.getClientRect === 'function') {
          const rect = node.getClientRect({ skipStroke: false, skipShadow: true })
          const scale = stage.scaleX ? (stage.scaleX() || 1) : 1
          const stageX = stage.x ? (stage.x() || 0) : 0
          const stageY = stage.y ? (stage.y() || 0) : 0
          // Convertir de coords de pantalla (aplican pan+scale) a coords de mundo lógico
          worldX = (rect.x - stageX) / scale
          worldY = (rect.y - stageY) / scale
          worldW = rect.width / scale
          worldH = rect.height / scale
        }
      } catch (e) {
        /* fallback below */
      }
    }

    // 2. Fallback si no se obtuvo node/rect
    if (worldW == null || !Number.isFinite(worldW) || worldW === 0) {
      worldW = getDrawWidth(el) || el.width || 0
      worldH = getDrawHeight(el) || el.height || 0
      worldX = el.x || 0
      worldY = el.y || 0
    }

    const z = zoom.value || 1
    const padWorld = PADDING_VISUAL / z

    // Animación PULSO: el aura se expande y contrae en bucle suave (no desaparece)
  const BASE_PADDING = padWorld
  const PULSE_EXTRA = 6 / z // amplitud adicional
  const CYCLE = 1400 // ms ciclo completo expandir+contraer
  const MAX_DURATION = 3000 // ms total de vida del pulso (antes 5000)
  const startTime = performance.now()
    auraOpacity.value = 0.75 // opacidad base estable

    // Cancelar animación previa
    if (destacarElemento._fadeRaf) cancelAnimationFrame(destacarElemento._fadeRaf)

    const animatePulse = (now) => {
      if (elementoDestacadoId.value !== elementoId) return
      const elapsed = now - startTime
      if (elapsed >= MAX_DURATION) {
        elementoDestacadoId.value = null
        elementoAura.value = null
        return
      }
      // fase 0..1
      const phase = (elapsed % CYCLE) / CYCLE
      // curva senoidal para expandir y volver: 0 -> 1 -> 0
      const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
      const padding = BASE_PADDING + PULSE_EXTRA * wave
      // opacidad ligeramente modulada 0.65 - 0.85
      auraOpacity.value = 0.65 + 0.20 * (1 - Math.abs(0.5 - wave) * 2) // más intensa cerca del centro

      elementoAura.value = {
        id: `aura_${el.id}`,
        forma: el.forma,
        x: worldX - padding,
        y: worldY - padding,
        width: worldW + padding * 2,
        height: worldH + padding * 2,
        color: el.color || '#4f46e5',
      }
      destacarElemento._fadeRaf = requestAnimationFrame(animatePulse)
    }
    destacarElemento._fadeRaf = requestAnimationFrame(animatePulse)
  }

  /**
   * Enfoca (zoom + pan) el elemento indicado haciendo que quepa dentro del viewport
   * con un padding visual y animación opcional.
   * @param {string} elementoId
   * @param {{paddingPx?:number, fitRatio?:number, animate?:boolean, duration?:number, offsetRight?:number}} opts
   */
  const focusElemento = (elementoId, opts = {}) => {
    const el = elementoPorId.value(elementoId)
    if (!el) {
      return
    }

    const stage = typeof window !== 'undefined' ? window.__konvaStage : null
    if (!stage) {
      return
    }
    // Invalidate cualquier animación previa (nueva sesión de enfoque)
    if (focusElemento._raf) cancelAnimationFrame(focusElemento._raf)
    focusElemento._sessionCounter = (focusElemento._sessionCounter || 0) + 1
    const sessionId = focusElemento._sessionCounter
    focusElemento._currentSession = sessionId
  const paddingPx = Number.isFinite(opts.paddingPx) ? opts.paddingPx : 40
  const fitRatio = Number.isFinite(opts.fitRatio) ? opts.fitRatio : 0.92
  const animate = opts.animate !== false
  const duration = Number.isFinite(opts.duration) ? opts.duration : 340
  const coarseSnapThreshold = Number.isFinite(opts.coarseSnapThreshold) ? opts.coarseSnapThreshold : 0.3 // diferencia relativa de escala para decidir snap
  const exact = opts.exact === true
  const offsetRight = Number.isFinite(opts.offsetRight) ? opts.offsetRight : 0

  // Marcar si había otra animación en progreso y es otro elemento → forzar snap (sin animación) para evitar interferencia
  const previousSessionInProgress = focusElemento._inProgress === true && focusElemento._lastTargetId && focusElemento._lastTargetId !== el.id
  focusElemento._lastTargetId = el.id
  // Flag de progreso
  focusElemento._inProgress = true

    // Flag para marcar interrupciones externas (zoom manual durante animación anterior)
    focusElemento._interrupted = false

    // Dimensiones canónicas por vista (evita tomar 'alto' como height en vista XY)
    const vista = vistaActiva.value
    const getDrawWidth = (typeof window !== 'undefined' && window.__getDrawWidth) ? window.__getDrawWidth : (e) => e.width || 0
    const getDrawHeight = (typeof window !== 'undefined' && window.__getDrawHeight) ? window.__getDrawHeight : (e) => e.height || 0
    const hasDims = !!el?.dimensiones
    const dimAnchoPx = hasDims && Number.isFinite(el.dimensiones.ancho) ? el.dimensiones.ancho * CM_TO_PX : 0
    const dimLargoPx = hasDims && Number.isFinite(el.dimensiones.largo) ? el.dimensiones.largo * CM_TO_PX : 0
    const dimAltoPx = hasDims && Number.isFinite(el.dimensiones.alto) ? el.dimensiones.alto * CM_TO_PX : 0
    let fallbackW = 0, fallbackH = 0
    if (hasDims) {
      if (vista === 'XZ') {
        fallbackW = dimAnchoPx || el.width || getDrawWidth(el) || 1
        fallbackH = dimAltoPx || el.height || getDrawHeight(el) || 1
      } else { // XY o default
        fallbackW = dimAnchoPx || el.width || getDrawWidth(el) || 1
        fallbackH = dimLargoPx || el.height || getDrawHeight(el) || 1
      }
    } else {
      // Legacy sin dimensiones canónicas
      fallbackW = getDrawWidth(el) || el.width || 1
      fallbackH = getDrawHeight(el) || el.height || 1
    }
    // Salvaguarda mínima
    if (!(fallbackW > 0)) fallbackW = 1
    if (!(fallbackH > 0)) fallbackH = 1
    const fallbackX = el.x || 0
    const fallbackY = el.y || 0

    // Estado previo por elemento para permitir refinamiento y decidir snap dinámicamente
    if (!focusElemento._last) focusElemento._last = Object.create(null)
    const prevState = focusElemento._last[el.id]

    const computeAndAnimate = (bbox, phase = 0) => {
      if (focusElemento._currentSession !== sessionId) return // sesión obsoleta
      const viewportW = stage.width() || 1
      const viewportH = stage.height() || 1
      // Considerar el offset del panel de propiedades para calcular el espacio útil
      const effectiveViewportW = Math.max(1, viewportW - offsetRight)
      const usableW = Math.max(1, effectiveViewportW - paddingPx * 2)
      const usableH = Math.max(1, viewportH - paddingPx * 2)
      let targetScale = Math.min(usableW / bbox.w, usableH / bbox.h)
      if (!exact) targetScale *= fitRatio
      if (!Number.isFinite(targetScale) || targetScale <= 0) targetScale = 1

      // El targetScale calculado naturalmente YA es correcto:
      // - Para elementos grandes → targetScale bajo (0.001 - 0.1)
      // - Para elementos pequeños → targetScale alto (1 - 5)
      // Solo aplicamos límites globales razonables (0.0001 mínimo, 5 máximo)

      const elementMaxDim = Math.max(bbox.w, bbox.h)
      const viewportMaxDim = Math.max(viewportW, viewportH)
      const sizeRatio = elementMaxDim / viewportMaxDim

      // Aplicar solo límites globales para evitar valores extremos
      targetScale = Math.max(0.0001, Math.min(5, targetScale))

      const cx = bbox.x + bbox.w / 2
      const cy = bbox.y + bbox.h / 2
      // Centrar en el espacio visible (desplazado a la izquierda si hay panel)
      const centerX = (effectiveViewportW / 2)
      const centerY = (viewportH / 2)
      const targetPanX = centerX - cx * targetScale
      const targetPanY = centerY - cy * targetScale
      const currentScale = zoom.value || 1
      const scaleDiffRel = Math.abs(targetScale - currentScale) / Math.max(currentScale, 0.0001)

      // Si cambio grande o usuario pidió no animar
      const shouldSnap = scaleDiffRel > coarseSnapThreshold
      const animateEffective = (!previousSessionInProgress && animate && !shouldSnap)

      if (!animateEffective) {
        // Permitir cualquier zoom calculado, sin restricciones artificiales
        const effectiveMinZoom = 0.0001 // Mínimo absoluto para elementos gigantescos
        configurarZoom(targetScale, effectiveMinZoom)
        configurarPan(targetPanX, targetPanY)
        focusElemento._last[el.id] = { scale: targetScale, w: bbox.w, h: bbox.h }
        scheduleRefine(sessionId, targetScale, targetPanX, targetPanY, bbox, phase)
        return
      }
      const startZoom = zoom.value
      const startPanX = panX.value
      const startPanY = panY.value
      const startTime = performance.now()
      const ease = (t) => 1 - Math.pow(1 - t, 3)
      const step = (now) => {
        const tt = Math.min(1, (now - startTime) / duration)
        const k = ease(tt)
        zoom.value = startZoom + (targetScale - startZoom) * k
        panX.value = startPanX + (targetPanX - startPanX) * k
        panY.value = startPanY + (targetPanY - startPanY) * k

        // Sincronizar con Konva durante animación
        const stage = window.__konvaStage
        if (stage) {
          if (typeof stage.scale === 'function') {
            stage.scale({ x: zoom.value, y: zoom.value })
          }
          if (typeof stage.position === 'function') {
            stage.position({ x: panX.value, y: panY.value })
          }
          stage.batchDraw?.()
        }

        if (focusElemento._currentSession !== sessionId) return // abortar animación obsoleta
        if (tt < 1) {
          focusElemento._raf = requestAnimationFrame(step)
        } else {
          saveZoomPanToHistory()
          focusElemento._last[el.id] = { scale: targetScale, w: bbox.w, h: bbox.h }
          scheduleRefine(sessionId, targetScale, targetPanX, targetPanY, bbox, phase)
        }
      }
      focusElemento._raf = requestAnimationFrame(step)
    }

    const scheduleRefine = (sid, appliedScale, appliedPanX, appliedPanY, appliedBBox, phase) => {
      const refine = () => {
        if (focusElemento._currentSession !== sid) return // refinamiento viejo
        try {
          const node = stage.findOne(`#${el.id}`)
          if (!node || typeof node.getClientRect !== 'function') return
          const rect = node.getClientRect({ skipStroke: false, skipShadow: true })
          const sc = stage.scaleX ? (stage.scaleX() || 1) : 1
          const sx = stage.x ? (stage.x() || 0) : 0
          const sy = stage.y ? (stage.y() || 0) : 0
          const rx = (rect.x - sx) / sc
          const ry = (rect.y - sy) / sc
          const rw = rect.width / sc
          const rh = rect.height / sc
          if (!(rw > 0 && rh > 0)) return
          // Recalcular objetivo con bounding real
          const viewportW = stage.width() || 1
            const viewportH = stage.height() || 1
            // Considerar el offset del panel de propiedades
            const effectiveViewportW = Math.max(1, viewportW - offsetRight)
            const usableW = Math.max(1, effectiveViewportW - paddingPx * 2)
            const usableH = Math.max(1, viewportH - paddingPx * 2)
            let idealScale = Math.min(usableW / rw, usableH / rh)
            if (!exact) idealScale *= fitRatio

            // El idealScale natural YA es correcto para TODOS los tamaños
            // Solo límites globales para evitar valores extremos
            idealScale = Math.max(0.0001, Math.min(5, idealScale))
          const diff = Math.abs(idealScale - appliedScale) / Math.max(idealScale, 0.0001)
          // Si la diferencia es significativa refinamos (pero evitar bucles infinitos: solo 1 refinamiento por invocación)
          if (diff > 0.08 && phase < 2) {
            const cx = rx + rw / 2
            const cy = ry + rh / 2
            // Centrar en el espacio visible (desplazado a la izquierda si hay panel)
            const centerX = (effectiveViewportW / 2)
            const centerY = (viewportH / 2)
            const newPanX = centerX - cx * idealScale
            const newPanY = centerY - cy * idealScale
            // Si la corrección es muy grande, aplicar snap; si es moderada, animación breve
            const large = diff > 0.35
            if (large) {
              const effectiveMinZoom = 0.0001 // Permitir cualquier zoom
              configurarZoom(idealScale, effectiveMinZoom)
              configurarPan(newPanX, newPanY)
              focusElemento._last[el.id] = { scale: idealScale, w: rw, h: rh }
            } else {
              // animación corta de refinamiento
              const startZoom = zoom.value
              const startPanX = panX.value
              const startPanY = panY.value
              const startTime = performance.now()
              const refineDur = 140 + Math.min(180, diff * 400) // escala ligera
              const ease = (t) => 1 - Math.pow(1 - t, 3)
              const step = (now) => {
                const tt = Math.min(1, (now - startTime) / refineDur)
                const k = ease(tt)
                if (focusElemento._currentSession !== sid) return
                zoom.value = startZoom + (idealScale - startZoom) * k
                panX.value = startPanX + (newPanX - startPanX) * k
                panY.value = startPanY + (newPanY - startPanY) * k

                // Sincronizar con Konva durante animación
                const stage = window.__konvaStage
                if (stage) {
                  if (typeof stage.scale === 'function') {
                    stage.scale({ x: zoom.value, y: zoom.value })
                  }
                  if (typeof stage.position === 'function') {
                    stage.position({ x: panX.value, y: panY.value })
                  }
                  stage.batchDraw?.()
                }

                if (tt < 1) {
                  focusElemento._raf = requestAnimationFrame(step)
                } else {
                  saveZoomPanToHistory()
                  focusElemento._last[el.id] = { scale: idealScale, w: rw, h: rh }
                }
              }
              focusElemento._raf = requestAnimationFrame(step)
            }
          }
          // Marcar finalización segura después de primer refinamiento (o no-op)
          focusElemento._inProgress = false
        } catch { /* ignore refine errors */ }
      }
      // Dos frames después de aplicar para asegurar layout estable
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (focusElemento._currentSession !== sid) return
        refine()
      }))
    }

    // Medición simplificada: usar canonical dims como fallback inmediato y luego un refinamiento tras 1 frame
    const canonicalW = vista === 'XZ' ? dimAnchoPx : dimAnchoPx
    const canonicalH = vista === 'XZ' ? dimAltoPx : dimLargoPx
    let bx = fallbackX
    let by = fallbackY
    let bw = (canonicalW > 0 ? canonicalW : fallbackW)
    let bh = (canonicalH > 0 ? canonicalH : fallbackH)
    // Evitar valores absurdos
    if (!(bw > 0)) bw = 1
    if (!(bh > 0)) bh = 1

    // Programar refinamiento para capturar bounding real si difiere significativamente
    requestAnimationFrame(() => {
      if (focusElemento._currentSession !== sessionId) return
      try {
        const node = stage.findOne(`#${el.id}`)
        if (node && typeof node.getClientRect === 'function') {
          const rect = node.getClientRect({ skipStroke: false, skipShadow: true })
          const sc = stage.scaleX ? (stage.scaleX() || 1) : 1
          const sx = stage.x ? (stage.x() || 0) : 0
          const sy = stage.y ? (stage.y() || 0) : 0
          const rx = (rect.x - sx) / sc
          const ry = (rect.y - sy) / sc
          const rw = rect.width / sc
          const rh = rect.height / sc
          if (Number.isFinite(rw) && rw > 0 && Number.isFinite(rh) && rh > 0) {
            const tooSmall = (rw < bw * 0.35) || (rh < bh * 0.35)
            if (!tooSmall) {
              bx = rx; by = ry; bw = rw; bh = rh
            }
          }
        }
      } catch (err) {
        // ignore refine errors
      }
      computeAndAnimate({ x: bx, y: by, w: bw, h: bh })
    })
  }

  const actualizarIdsFiltrados = (ids) => {
    idsElementosFiltrados.value = ids
  }

  const setDraggableMode = (mode) => {
    isDraggable.value = !!mode
  }

  const setModoConfigurarEsl = (value, { silent = false } = {}) => {
    const next = value === true
    if (modoConfigurarEsl.value === next) return

    if (next && modoEdicion.value) {
      modoEdicion.value = false
      isDraggable.value = false
    }

    modoConfigurarEsl.value = next

    if (!next) {
      elementoEslObjetivo.value = null
      if (!silent) {
        showToast('Modo Configurar ESL desactivado', 'info')
      }
      return
    }

    setDraggableMode(false)
    if (!silent) {
      showToast('Modo Configurar ESL activo: haz clic en un elemento para asignar su ESL', 'info')
    }
  }

  const activarModoConfigurarEsl = (options) => setModoConfigurarEsl(true, options)
  const desactivarModoConfigurarEsl = (options) => setModoConfigurarEsl(false, options)
  const toggleModoConfigurarEsl = (options) => setModoConfigurarEsl(!modoConfigurarEsl.value, options)

  const setModoEdicion = (value) => {
    const next = value === true
    // Si se activa el modo edición, desactivar configuración de ESL
    if (next && modoConfigurarEsl.value) {
      setModoConfigurarEsl(false, { silent: true })
    }
    modoEdicion.value = next
    if (!modoEdicion.value) {
      isDraggable.value = false
    }
  }

  const activarModoEdicion = () => setModoEdicion(true)
  const desactivarModoEdicion = () => setModoEdicion(false)
  const toggleModoEdicion = () => setModoEdicion(!modoEdicion.value)

  const iniciarConfiguracionEsl = (elementoId) => {
    if (!modoConfigurarEsl.value) return false
    if (!elementoId) return false
    const existe = elementos.value.find((el) => el?.id === elementoId)
    if (!existe) return false
    elementoEslObjetivo.value = elementoId
    return true
  }

  const finalizarConfiguracionEsl = () => {
    elementoEslObjetivo.value = null
  }

  const guardarCodigoEslElemento = (elementoId, codigoEsl) => {
    const elemento = elementos.value.find((el) => el?.id === elementoId)
    if (!elemento) return false

    const trimmed = typeof codigoEsl === 'string' ? codigoEsl.trim() : ''
    const success = actualizarElementoSinValidacion(elementoId, { codigoEsl: trimmed })
    if (!success) return false

    // setCambiosNoAplicados(true)
    const descriptor = elemento.nombre || elemento.codigo || elementoId
    const accion = trimmed ? 'asignado' : 'limpiado'
    saveToHistory(`Código ESL ${accion}: ${descriptor}`)
    return true
  }

  const setSidebarActiveTab = (tabId) => {
    sidebarActiveTab.value = SIDEBAR_TAB_IDS.has(tabId) ? tabId : 'elementos'
  }

  const setSidebarVisible = (visible) => {
    sidebarVisible.value = Boolean(visible)
  }

  const toggleSidebar = () => {
    sidebarVisible.value = !sidebarVisible.value
  }

  const initializeSidebarVisibility = (isDesktop = true) => {
    sidebarVisible.value = isDesktop
  }

  // === INTEGRACIÓN CON AUTOSAVE ===
  // Instancia del autosave - se establece desde App.vue o el componente principal
  const autoSaveInstance = ref(null)

  /**
   * Establecer la instancia del autosave (resuelve dependencia circular)
   */
  const setAutoSaveInstance = (autoSaveComposableInstance) => {
    autoSaveInstance.value = autoSaveComposableInstance
  }


  // Marcar si existen cambios
  const setCambiosNoAplicados = (value = false) => {
    cambiosNoAplicados.value = value;
  }

  watch(
    () => modoEdicion.value,
    (activo) => {
      if (!activo) {
        isDraggable.value = false
      }
    },
    { immediate: true },
  )

  // Watcher para recalcular canvas adaptativo cuando cambia el contexto
  watch(
    () => [contextoNavegacion.value.tipo, contextoNavegacion.value.id],
    ([tipo, id]) => {
      if (tipo === 'plantas') {
        const planta = plantaPorId.value(id)
        calcularCanvasAdaptativoPlanta(planta)
      } else {
        const elemento = elementoPorId.value(id)
        if (elemento) {
          calcularCanvasAdaptativo(elemento)
        } else {
          console.error('Elemento no encontrado para calcular canvas:', { tipo, id })
        }
      }
    },
    { immediate: true },
  )

  /**
   * Reordena en-place los elementos visibles del contexto dado según
   * `alturaRespectoAlSuelo`, poniendo al final aquellos con mayor altura.
   * Operamos por índices para tocar únicamente las posiciones visibles
   * y evitar resort de toda la lista global `elementos.value`.
   *
   * @param {string} contextType - tipo de contexto (p. ej. 'plantas' o 'elementos')
   * @param {string} contextId - id del contexto (planta o elemento padre)
   */
  const reorderVisibleByHeightForContext = (contextType, contextId) => {
    try {
      if (!contextType) return

      // Determinar los ids y sus índices en elementos.value que son "visibles"
      const visibleCriteria = []

      if (contextType === 'plantas') {
        for (let i = 0; i < elementos.value.length; i++) {
          const el = elementos.value[i]
          if (!el) continue
          if (el.plantaId === contextId && !el.padre && ['cuartos', 'elementos'].includes(el.tipo)) {
            visibleCriteria.push({ index: i, el })
          }
        }
      } else if (contextType === 'pisos') {
        // contexto 'pisos': visibles son los hijos del elemento padre de tipo 'pisos'
        const padre = elementos.value.find((e) => e.id === contextId)
        if (padre?.hijos && Array.isArray(padre.hijos)) {
          const hijoSet = new Set(padre.hijos)
          for (let i = 0; i < elementos.value.length; i++) {
            const el = elementos.value[i]
            if (!el) continue
            if (hijoSet.has(el.id) && el.tipo === 'pisos') {
              visibleCriteria.push({ index: i, el })
            }
          }
        }
      } else {
        return
      }

      if (!visibleCriteria.length) return

      // Establecer orden estable: usar alturaRespectoAlSuelo (num); fallback a 0.
      const withOrder = visibleCriteria.map((v, idx) => ({
        origIndex: idx,
        index: v.index,
        el: v.el,
        key: Number((v.el && Number(v.el.alturaRespectoAlSuelo)) || 0),
      }))

      // Orden ascendente para que los mayores queden al final
      withOrder.sort((a, b) => {
        if (a.key === b.key) return a.origIndex - b.origIndex
        return a.key - b.key
      })

      // Reasignar en los índices detectados (manteniendo otros elementos intactos)
      for (let i = 0; i < withOrder.length; i++) {
        const targetIndex = visibleCriteria[i].index
        const sourceEl = withOrder[i].el
        elementos.value[targetIndex] = sourceEl
      }
    } catch (e) {
      // No bloquear la inserción si falla el reorder
      console.warn('reorderVisibleByHeightForContext failed', e)
    }
  }

  return {
    // State
    elementos,
    plantas,
    plantaActiva,
    elementoSeleccionado,
    elementosSeleccionadosMultiple,
    todosLosElementosSeleccionados,
    vistaActiva,
    zoom,
    panX,
    panY,
    gridSize,
    snapGridEps,
    modoEdicion,
  sidebarActiveTab,
    sidebarVisible,
    editorPermissions,
    crearPlanta,
    plantaEnEdicion,
    etiquetas,
    etiquetasSeleccionadas,
    elementoDestacadoId,
    idsElementosFiltrados,
    elementoAura,
    auraOpacity,
    isDraggable,
    cambiosNoAplicados,
    modoConfigurarEsl,
    elementoEslObjetivo,
    tiposProductoAdmitidos,
    setTiposProductoAdmitidos,
    gestionPisosPropiedadesModal,
    nivelAEditar,

    // Getters
    elementosVisibles,
    elementoPorId,
    plantaPorId,
    plantaActivaData,
    elementosEnPlanta,
    elementoSeleccionadoCompleto,

    // Navegación jerárquica - Getters
    contextoActual,
    estaEnPlanta,
    estaEnCuarto,
    estaEnPiso,
    estaEnElemento,
    estaEnContenedor,
    estructuraContenedorActual,
    breadcrumbs,
    puedeNavegar,
    contextoNavegacion,
    nodoActual,
    canvasAdaptativo,

    // Actions - Canvas
    seleccionarElemento,
    seleccionarElementosMultiple,
    limpiarSeleccionElementos,
    setCambiosNoAplicados,
    actualizarPosicion,
    actualizarElemento,
    updateElementById,
    persist,
    configurarZoom,
    configurarPan,
    setGridSize,
    setSnapGridEps,
    setModoEdicion,
    activarModoEdicion,
    desactivarModoEdicion,
    toggleModoEdicion,
    setModoConfigurarEsl,
    activarModoConfigurarEsl,
    desactivarModoConfigurarEsl,
    toggleModoConfigurarEsl,
    iniciarConfiguracionEsl,
    finalizarConfiguracionEsl,
    guardarCodigoEslElemento,
    setSidebarActiveTab,
    setSidebarVisible,
    toggleSidebar,
    initializeSidebarVisibility,

    // Actions - Plantas
    seleccionarPlanta,
    agregarPlanta,
    editarPlanta,
    eliminarPlanta,

    // Actions - Elementos
    agregarElemento,
    agregarElementoSinValidacion,
    eliminarElemento,
    toggleElementoVisibilidad,


    // Navegación jerárquica - Actions
    navegarAElemento,
    navegarAlPadre,
    navegarAContexto,
    navegarAPlanta,
    calcularCanvasAdaptativo,
    calcularCanvasAdaptativoPlanta,

    // === INTEGRACIÓN CON HISTORIAL ===
    setHistoryInstance,
    saveToHistory,
    clearZoomPanDebounce,

    // === INTEGRACIÓN CON AUTOSAVE ===
    setAutoSaveInstance,
    autoSaveInstance,

    // === UTILIDADES INTERNAS (expuestas para optimización) ===
    reorderVisibleByHeightForContext,

    // === FUNCIONES DE SERIALIZACIÓN ===
    serialize,
    deserialize,

    // == Editor de planta
    abrirEditor,
    cerrarEditor,

    // == Filtros de capas
    getEtiquetaPorId,
    agregarEtiqueta,
    seleccionarEtiqueta,
    deseleccionarEtiqueta,
    limpiarSeleccion,
    elementosVisiblesParaCapas,
    agregarYSeleccionarEtiqueta,

    // == Asignar etiquetas
    agregarEtiquetaAElemento,
    quitarEtiquetaDeElemento,
    crearYAsignarEtiquetaAElemento,

    // == Destacar
    destacarElemento,
    focusElemento,
    actualizarIdsFiltrados,

    setDraggableMode,

    // == Edición de plantas desde las propiedades
    abrirCuartoNivelesPropiedades,
    cerrarCuartoNivelesPropiedades,
    guardarCuartoNivelesPropiedades,
    confirmarPropuestaAlturasNiveles,
    cancelarPropuestaAlturasNiveles,
    propuestaAlturasNiveles,
    confirmacionAlturasNivelesModal,
    actualizarElementoSinValidacion,
    recomputePasilloAssignments,
  }
})



