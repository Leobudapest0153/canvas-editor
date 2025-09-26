import { generateCodigo, generateNombre } from '@/inventory-smart/utils/codeNameGenerator.js'
import { assignCodigoNombre } from '@/inventory-smart/utils/codeNameAssigner.js'
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
import { CM_TO_PX, DEFAULT_TIPOS_ESPACIO, DEFAULT_TIPOS_CUARTO, DEFAULT_TIPOS_PRODUCTO_ADMITIDOS, CATALOGO, OFFSETS, TIPOS_ENTIDAD } from '@/inventory-smart/utils/constants'
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
// Importar store de catálogo para sincronizar selección al abrir detalle
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import { exportTemplatesToDTO, importTemplatesFromDTO } from '@/inventory-smart/modules/templates/templates.serializer.js'
import { useChangeHistoryStore } from '@/inventory-smart/stores/changeHistory'
import { exportCatalogItemsToDTO, importCatalogItemsFromDTO } from '@/inventory-smart/modules/catalog/catalogItems.serializer.js'

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
        ancho: 1500, // cm
        largo: 1500, // cm
      },
      capacidadCargaSoportado: 5000, // kg
      // Nuevo flag para plantas elásticas (por defecto false)
      isInfinite: false,
      poligono: [
        {
          x: 0,
          y: 0,
        },
        {
          x: 15000,
          y: 0,
        },
        {
          x: 15000,
          y: 15000,
        },
        {
          x: 0,
          y: 15000,
        },
      ],
    },
  ])

  const plantaActiva = ref('planta_1')

  // Estado básico para desarrollo
  const elementos = ref([])

  // Etiquetas
  const etiquetas = ref([
    { id: 1, texto: 'Urgente', colorFondo: '#FECACA', colorTexto: '#991B1B' },
    { id: 2, texto: 'Revisar', colorFondo: '#DBEAFE', colorTexto: '#1E40AF' },
    { id: 3, texto: 'Material Pesado', colorFondo: '#FEF9C3', colorTexto: '#854D0E' },
  ])
  const etiquetasSeleccionadas = ref([])

  const elementoSeleccionado = ref(null)
  const cambiosNoAplicados = ref(false);

  const vistaActiva = computed(() => {
    const t = contextoNavegacion.value.tipo
    if (t === 'plantas' || t === 'pisos') return 'XY'
    if (t === 'elementos' || t === 'cuartos') return 'XZ'
    return 'XY'
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

  // === CATÁLOGOS DINÁMICOS (persistidos via useStatePersistence) ===
  const catalogos = ref({
    tiposEspacio: DEFAULT_TIPOS_ESPACIO,
    tiposCuarto: DEFAULT_TIPOS_CUARTO,
    tiposProductoAdmitidos: DEFAULT_TIPOS_PRODUCTO_ADMITIDOS,
  })

  const setCatalogos = (cats) => {
    try {
      const safe = {
        tiposEspacio: Array.isArray(cats?.tiposEspacio) ? cats.tiposEspacio : DEFAULT_TIPOS_ESPACIO,
        tiposCuarto: Array.isArray(cats?.tiposCuarto) ? cats.tiposCuarto : DEFAULT_TIPOS_CUARTO,
        tiposProductoAdmitidos: Array.isArray(cats?.tiposProductoAdmitidos)
          ? cats.tiposProductoAdmitidos
          : DEFAULT_TIPOS_PRODUCTO_ADMITIDOS,
      }
      catalogos.value = safe
    } catch {
      catalogos.value = {
        tiposEspacio: DEFAULT_TIPOS_ESPACIO,
        tiposCuarto: DEFAULT_TIPOS_CUARTO,
        tiposProductoAdmitidos: DEFAULT_TIPOS_PRODUCTO_ADMITIDOS,
      }
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

  // === NAVEGACIÓN JERÁRQUICA ===
  // Contexto de navegación: representa la "ubicación" actual en la jerarquía
  const contextoNavegacion = ref({
    tipo: 'plantas', // 'plantas' | 'cuartos' | 'pisos' | 'elementos' | 'contenedores'
    id: 'planta_1', // ID de la planta, elemento o contenedor actual
    path: [], // Array de objetos: [{ tipo: 'plantas', id: 'planta_1', nombre: 'Planta Baja' }]
  })

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
          .filter((h) => h && h.tipo === 'elementos').map(withRestrinctions);
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
        icono: '🏢',
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
            icono: getIconoElemento(elemento.tipo, elemento.categoria),
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
  const getIconoElemento = (tipo, categoria) => {
    // Iconos por tipo
    if (tipo === 'pasillos') return '🛣️'
    if (tipo === 'cuartos') return '🏠'
    if (tipo === 'pisos') return '🧱'
    if (tipo === 'contenedores') {
      const iconosContenedores = {
        cajas: '📦',
        bins: '🗑️',
        bandejas: '🪣',
      }
      return iconosContenedores[categoria] || '🗃️'
    }

    if (tipo === 'elementos') {
      const iconosElementos = {
        anaqueles: '📚',
        estantes: '📋',
        mesas: '🪑',
        armarios: '🗄️',
      }
      return iconosElementos[categoria] || '📦'
    }

    return '📦'
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

    // Limpiar historial y timer de zoom/pan al cambiar contexto
    clearZoomPanDebounce()
    if (historyInstance.value) {
      historyInstance.value.clearHistory()
    }

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

    // Limpiar historial y timer de zoom/pan al cambiar contexto
    clearZoomPanDebounce()
    if (historyInstance.value) {
      historyInstance.value.clearHistory()
    }

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

    // Limpiar historial y timer de zoom/pan al cambiar contexto
    clearZoomPanDebounce()
    if (historyInstance.value) {
      historyInstance.value.clearHistory()
    }

    contextoNavegacion.value = {
      tipo: tipo,
      id: id,
      path: path,
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

    // Limpiar historial y timer de zoom/pan al cambiar contexto
    clearZoomPanDebounce()
    if (historyInstance.value) {
      historyInstance.value.clearHistory()
    }

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

    // Actualizar planta activa
    plantaActiva.value = plantaId

    // Calcular canvas adaptativo para la planta
    calcularCanvasAdaptativoPlanta(planta)

    // Limpiar timer pendiente y deseleccionar elemento
    clearZoomPanDebounce()
    elementoSeleccionado.value = null
  }

  const calcularCanvasAdaptativo = (elemento) => {
    // Calcular tamaño del canvas basado en las dimensiones del elemento
    let elementWidthPx, elementHeightPx

    if (elemento.dimensiones) {
      // XY para cuartos/pisos/pasillos; XZ para elementos
      if (['pisos'].includes(elemento.tipo)) {
        elementWidthPx = elemento.dimensiones.ancho * CM_TO_PX
        elementHeightPx = elemento.dimensiones.largo * CM_TO_PX
      } else if (['elementos', 'cuartos'].includes(elemento.tipo)) {
        // Vista XZ para elementos y cuartos - considerar orientación
        const orientacion = Number(elemento.orientacion || 0)
        const orientacionNormalizada = ((orientacion % 360) + 360) % 360
        const useAncho = (orientacionNormalizada === 0 || orientacionNormalizada === 180)

        // En vista XZ: orientación determina qué usar como ancho
        elementWidthPx = useAncho
          ? elemento.dimensiones.ancho * CM_TO_PX
          : elemento.dimensiones.largo * CM_TO_PX
        elementHeightPx = elemento.dimensiones.alto * CM_TO_PX
      } else {
        // Para otros tipos (pasillos)
        elementWidthPx = elemento.dimensiones.ancho * CM_TO_PX
        elementHeightPx = elemento.dimensiones.alto * CM_TO_PX
      }
    } else if (elemento.width && elemento.height) {
      // Fallback a dimensiones legacy en píxeles
      if (['elementos', 'cuartos'].includes(elemento.tipo)) {
        // Para elementos y cuartos legacy, también aplicar orientación
        const orientacion = Number(elemento.orientacion || 0)
        const orientacionNormalizada = ((orientacion % 360) + 360) % 360
        const useAncho = (orientacionNormalizada === 0 || orientacionNormalizada === 180)

        elementWidthPx = useAncho ? elemento.width : elemento.height
        elementHeightPx = elemento.height // Altura siempre es height en legacy
      } else {
        elementWidthPx = elemento.width
        elementHeightPx = elemento.height
      }
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
    // Forzar catálogo de 'elementos' al abrir detalle si estaba en 'plantillas'
    if (id && catalogStore.selectedCatalog === 'plantillas') {
      catalogStore.setSelectedCatalog('elementos')
    }
  }

  const actualizarPosicion = (id, x, y, saveHistory = false, description = null) => {
    const elemento = elementos.value.find((el) => el.id === id)
    if (elemento) {
      elemento.x = x
      elemento.y = y

      // Solo guardar en historial si se especifica explícitamente
      if (saveHistory && description) {
        saveToHistory(description)
      }
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

      elementos.value.splice(idx, 1, next);

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



  const actualizarElemento = (elementoId, propiedades, saveHistory = false, description = null) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    if (!elemento) return false
    if (!runPlacementValidators(elemento, propiedades)) return false
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

      // Guardar en historial si se especifica
      if (saveHistory) {
        const descripcionAuto =
          description || `Propiedades actualizadas: ${Object.keys(propiedades).join(', ')}`
        saveToHistory(descripcionAuto)
      }
    }
    return true
  }

  const persist = () => {
    try {
      const state = {
        plantas: plantas.value,
        elementos: elementos.value,
        catalogos: catalogos.value,
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
      // persist()
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

    // Solo guardar en historial si cambió significativamente
    if (Math.abs(x - panXAnterior) > 1 || Math.abs(y - panYAnterior) > 1) {
      saveZoomPanToHistory()
    }
  }

  // Actions para plantas
  const seleccionarPlanta = (plantaId) => {
    // Limpiar historial y timer de zoom/pan al cambiar contexto
    clearZoomPanDebounce()
    if (historyInstance.value) {
      historyInstance.value.clearHistory()
    }

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

        // Ajuste SIEMPRE aplicado: altura de pasillos = alto de la planta
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

      // Si se elimina la planta activa, cambiar a la primera disponible
      if (plantaActiva.value === plantaId && plantas.value.length > 0) {
        plantaActiva.value = plantas.value[0].id
      }
    }
  }

  const runPlacementValidators = (element, candidate) => {
    const planta = plantaPorId.value(plantaActiva.value)
    const ctx = { alturaBodega: planta?.dimensiones?.alto }
    const neighbors = elementosVisibles.value.filter((n) => n.id !== element?.id)
    const checks = [
      (el, cand) => validateWallZBaseRequired(el, cand, ctx),
      (el, cand) => validateHeightWithinWarehouse(el, cand, ctx),
      (el, cand) => validateZStacking(el, cand, neighbors),
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
    if (contextoActual === 'pisos' && tipoElemento !== 'elementos') {
      showToast('En pisos solo se pueden agregar elementos')
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

    // Política especial: altura de pasillos = planta.alto al crear
    if (nuevoElemento.tipo === 'pasillos') {
      const planta = plantas.value.find((p) => p.id === (nuevoElemento.plantaId || contextoNavegacion.value.id))
      if (planta) {
        if (!nuevoElemento.dimensiones) nuevoElemento.dimensiones = { ancho: 0, largo: 0, alto: 0 }
        nuevoElemento.dimensiones.alto = planta.dimensiones.alto
      }
    }

    // Política de dimensiones al crear en planta para elementos de sistema
    try {
      const shouldAuto = true
      if (shouldAuto && ['cuartos','pisos','elementos','pasillos'].includes(nuevoElemento.tipo)) {
        const typeKey = nuevoElemento.systemTypeKey || nuevoElemento.id
        const isSystemDefault = !!(typeKey && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(typeKey))
        const isLocked = nuevoElemento.dimensionLock === true
        if (isSystemDefault && !isLocked) {
          const planta = plantas.value.find((p) => p.id === nuevoElemento.plantaId)
          if (planta && planta.dimensiones) {
            const parentDims = {
              w: planta.dimensiones.ancho,
              h: planta.dimensiones.largo,
              d: planta.dimensiones.alto,
            }
            const dims = computeDimsByAxisScale(typeKey, parentDims, { snap: true, gridPx: gridSize.value })
            if (dims) {
              // Ajustar dimensiones de modelo
              nuevoElemento.dimensiones = { ...nuevoElemento.dimensiones, ...dims }
              // Ajustar canvas en px según vista actual
              const view = ['cuartos','pisos','pasillos'].includes(nuevoElemento.tipo) ? 'XY' : 'XZ'
              const { width, height } = toCanvasSizePx(dims, view)
              if (Number.isFinite(width)) nuevoElemento.width = width
              if (Number.isFinite(height)) nuevoElemento.height = height
            }
            // Offset vertical configurable (por tipo)
            const off = OFFSETS?.offsetByType?.[typeKey]?.zOffsetShare
            if (typeof off === 'number' && isFinite(off)) {
              nuevoElemento.alturaRespectoAlSuelo = Math.round((planta.dimensiones.alto || 0) * off)
            }
          }
        }
      }
    } catch (e) {
      console.warn('Auto-scale on create failed:', e)
    }

    // Asignación unificada de 'codigo' y nombre (pasillos)
    try {
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

    elementos.value.push(nuevoElemento)

    // Guardar estado en historial
    saveToHistory(`Elemento agregado: ${nuevoElemento.nombre || nuevoElemento.tipo}`)

    return nuevoElemento.id
  }

  const agregarElementoSinValidacion = (_id, nuevoElemento, saveHistory = true, description = 'Inserción sin validación') => {
    try {
      console.log('[insertarElementoSinValidacion] Insertando elemento:', nuevoElemento)
      if (!nuevoElemento || !nuevoElemento.id) {
        console.warn('[insertarElementoSinValidacion] Elemento inválido o sin id:', nuevoElemento);
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

      // Insertar directamente en el store
      elementos.value.push(next);

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

      return next.id;
    } catch (err) {
      console.error('[insertarElementoSinValidacion] Error:', err);
      return false;
    }
  };


  const eliminarElemento = (elementoId) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    const index = elementos.value.findIndex((el) => el.id === elementoId)

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
      catalogos: catalogos.value,
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
      setCatalogos: (cats) => {
        setCatalogos(cats)
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
        zoom.value = 1
        panX.value = 0
        panY.value = 0

        // Canvas adaptativo se recalculará automáticamente por el watcher
      }
    }

  const ok = _deserialize(jsonString, storeActions)

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

    return ok
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

  const abrirCuartoNivelesPropiedades = (idElemento) => {
    const elemento = elementos.value.find((e) => e.id === idElemento);
    if (!elemento) {
      console.error('Elemento no encontrado:', idElemento);
      return;
    }
    // El elemento es un padre
    if (['elementos', 'cuartos'].includes(elemento.tipo)) {
      console.log('Vamos a editar un hijo guardando el id del padre:', idElemento);
      nivelAEditar.value = { padre: idElemento }
    }
    // El elemento es un nivel hijo
    if (['pisos', 'contenedores'].includes(elemento.tipo)) {
      console.log('Vamos a editar un nivel hijo:', idElemento);
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
    console.log('Parent del nivel a editar:', parent);
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

    // 1) Proponer cambio (solo nos importa dimensiones aquí; alto es clave)
    const res = proposeLevelChange(elementos.value, id, nivelActualizado || {}, nivelAEditar.value.padre);
    if (res.status === 'error') {
      showToast(res.message || 'No se pudo aplicar el cambio', 'error');
      return;
    }

    if (res.status === 'ok') {
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
   * @param {{paddingPx?:number, fitRatio?:number, animate?:boolean, duration?:number}} opts
   */
  const focusElemento = (elementoId, opts = {}) => {
    const el = elementoPorId.value(elementoId)
    if (!el) return
    const stage = typeof window !== 'undefined' ? window.__konvaStage : null
    if (!stage) return
  const paddingPx = Number.isFinite(opts.paddingPx) ? opts.paddingPx : 40
  const fitRatio = Number.isFinite(opts.fitRatio) ? opts.fitRatio : 0.92
  const animate = opts.animate !== false
  const duration = Number.isFinite(opts.duration) ? opts.duration : 340
  const coarseSnapThreshold = Number.isFinite(opts.coarseSnapThreshold) ? opts.coarseSnapThreshold : 0.3 // diferencia relativa de escala para decidir snap
    const exact = opts.exact === true

    if (focusElemento._raf) cancelAnimationFrame(focusElemento._raf)

    const getDrawWidth = (typeof window !== 'undefined' && window.__getDrawWidth) ? window.__getDrawWidth : (e) => e.width || 0
    const getDrawHeight = (typeof window !== 'undefined' && window.__getDrawHeight) ? window.__getDrawHeight : (e) => e.height || 0
    const fallbackW = getDrawWidth(el) || el.width || (el?.dimensiones?.ancho ? el.dimensiones.ancho * CM_TO_PX : 0) || 1
    const dimLargo = el?.dimensiones?.largo ? el.dimensiones.largo * CM_TO_PX : 0
    const dimAlto = el?.dimensiones?.alto ? el.dimensiones.alto * CM_TO_PX : 0
    const fallbackH = getDrawHeight(el) || el.height || Math.max(dimLargo, dimAlto) || 1
    const fallbackX = el.x || 0
    const fallbackY = el.y || 0

    // Estado previo por elemento para permitir refinamiento y decidir snap dinámicamente
    if (!focusElemento._last) focusElemento._last = Object.create(null)
    const prevState = focusElemento._last[el.id]

    const computeAndAnimate = (bbox, phase = 0) => {
      const viewportW = stage.width() || 1
      const viewportH = stage.height() || 1
      const usableW = Math.max(1, viewportW - paddingPx * 2)
      const usableH = Math.max(1, viewportH - paddingPx * 2)
      let targetScale = Math.min(usableW / bbox.w, usableH / bbox.h)
      if (!exact) targetScale *= fitRatio
      if (!Number.isFinite(targetScale) || targetScale <= 0) targetScale = 1
      targetScale = Math.max(0.05, Math.min(5, targetScale))
      const cx = bbox.x + bbox.w / 2
      const cy = bbox.y + bbox.h / 2
      const targetPanX = (viewportW / 2) - cx * targetScale
      const targetPanY = (viewportH / 2) - cy * targetScale
      const currentScale = zoom.value || 1
      const scaleDiffRel = Math.abs(targetScale - currentScale) / Math.max(currentScale, 0.0001)
      // Si cambio grande o usuario pidió no animar
      const shouldSnap = scaleDiffRel > coarseSnapThreshold
      if (!animate || shouldSnap) {
        configurarZoom(targetScale)
        configurarPan(targetPanX, targetPanY)
        focusElemento._last[el.id] = { scale: targetScale, w: bbox.w, h: bbox.h }
        // Programar verificación para ajustar si el bounding real difiere tras layout final
        scheduleRefine(targetScale, targetPanX, targetPanY, bbox, phase)
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
        if (tt < 1) {
          focusElemento._raf = requestAnimationFrame(step)
        } else {
          saveZoomPanToHistory()
          focusElemento._last[el.id] = { scale: targetScale, w: bbox.w, h: bbox.h }
          scheduleRefine(targetScale, targetPanX, targetPanY, bbox, phase)
        }
      }
      focusElemento._raf = requestAnimationFrame(step)
    }

    const scheduleRefine = (appliedScale, appliedPanX, appliedPanY, appliedBBox, phase) => {
      const refine = () => {
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
            const usableW = Math.max(1, viewportW - paddingPx * 2)
            const usableH = Math.max(1, viewportH - paddingPx * 2)
            let idealScale = Math.min(usableW / rw, usableH / rh)
            if (!exact) idealScale *= fitRatio
            idealScale = Math.max(0.05, Math.min(5, idealScale))
          const diff = Math.abs(idealScale - appliedScale) / Math.max(idealScale, 0.0001)
          // Si la diferencia es significativa refinamos (pero evitar bucles infinitos: solo 1 refinamiento por invocación)
          if (diff > 0.08 && phase < 2) {
            const cx = rx + rw / 2
            const cy = ry + rh / 2
            const newPanX = (viewportW / 2) - cx * idealScale
            const newPanY = (viewportH / 2) - cy * idealScale
            // Si la corrección es muy grande, aplicar snap; si es moderada, animación breve
            const large = diff > 0.35
            if (large) {
              configurarZoom(idealScale)
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
                zoom.value = startZoom + (idealScale - startZoom) * k
                panX.value = startPanX + (newPanX - startPanX) * k
                panY.value = startPanY + (newPanY - startPanY) * k
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
        } catch { /* ignore refine errors */ }
      }
      // Dos frames después de aplicar para asegurar layout estable
      requestAnimationFrame(() => requestAnimationFrame(refine))
    }

    // Primera medición diferida para usar rect real antes de animar
    requestAnimationFrame(() => {
      let bx = fallbackX, by = fallbackY, bw = fallbackW, bh = fallbackH
      let haveReal = false
      try {
        const node = stage.findOne(`#${el.id}`)
        if (node && typeof node.getClientRect === 'function') {
          const rect = node.getClientRect({ skipStroke: false, skipShadow: true })
          const scaleNow = stage.scaleX ? (stage.scaleX() || 1) : 1
          const stageX = stage.x ? (stage.x() || 0) : 0
          const stageY = stage.y ? (stage.y() || 0) : 0
          const rx = (rect.x - stageX) / scaleNow
          const ry = (rect.y - stageY) / scaleNow
          const rw = rect.width / scaleNow
          const rh = rect.height / scaleNow
          if (Number.isFinite(rw) && rw > 0 && Number.isFinite(rh) && rh > 0) {
            // Descarta si es absurdamente pequeño (<35% fallback) para evitar mid-group
            const tooSmall = (rw < fallbackW * 0.35) || (rh < fallbackH * 0.35)
            if (!tooSmall) {
              bx = rx; by = ry; bw = rw; bh = rh; haveReal = true
            }
          }
        }
      } catch { /* ignore */ }
      if (!haveReal) {
        // Segundo frame para intentar rect real antes de animar
        requestAnimationFrame(() => {
          try {
            const node2 = stage.findOne(`#${el.id}`)
            if (node2 && typeof node2.getClientRect === 'function') {
              const rect2 = node2.getClientRect({ skipStroke: false, skipShadow: true })
              const sc = stage.scaleX ? (stage.scaleX() || 1) : 1
              const sx = stage.x ? (stage.x() || 0) : 0
              const sy = stage.y ? (stage.y() || 0) : 0
              const rx2 = (rect2.x - sx) / sc
              const ry2 = (rect2.y - sy) / sc
              const rw2 = rect2.width / sc
              const rh2 = rect2.height / sc
              if (Number.isFinite(rw2) && rw2 > 0 && Number.isFinite(rh2) && rh2 > 0) {
                const tooSmall2 = (rw2 < fallbackW * 0.35) || (rh2 < fallbackH * 0.35)
                if (!tooSmall2) {
                  bx = rx2; by = ry2; bw = rw2; bh = rh2
                }
              }
            }
          } catch { /* ignore second try */ }
          if ((bw === fallbackW && bh === fallbackH) || bw < 2 || bh < 2) {
            // Tercer frame (último intento) si seguimos solo con fallback o valores irrisorios
            requestAnimationFrame(() => {
              try {
                const node3 = stage.findOne(`#${el.id}`)
                if (node3 && typeof node3.getClientRect === 'function') {
                  const rect3 = node3.getClientRect({ skipStroke: false, skipShadow: true })
                  const sc3 = stage.scaleX ? (stage.scaleX() || 1) : 1
                  const sx3 = stage.x ? (stage.x() || 0) : 0
                  const sy3 = stage.y ? (stage.y() || 0) : 0
                  const rx3 = (rect3.x - sx3) / sc3
                  const ry3 = (rect3.y - sy3) / sc3
                  const rw3 = rect3.width / sc3
                  const rh3 = rect3.height / sc3
                  if (Number.isFinite(rw3) && rw3 > 0 && Number.isFinite(rh3) && rh3 > 0) {
                    const tooSmall3 = (rw3 < fallbackW * 0.35) || (rh3 < fallbackH * 0.35)
                    if (!tooSmall3) {
                      bx = rx3; by = ry3; bw = rw3; bh = rh3
                    }
                  }
                }
              } catch { /* ignore third try */ }
              computeAndAnimate({ x: bx, y: by, w: bw, h: bh })
            })
          } else {
            computeAndAnimate({ x: bx, y: by, w: bw, h: bh })
          }
        })
      } else {
        computeAndAnimate({ x: bx, y: by, w: bw, h: bh })
      }
    })
  }

  const actualizarIdsFiltrados = (ids) => {
    idsElementosFiltrados.value = ids
  }

  const setDraggableMode = (mode) => {
    isDraggable.value = !!mode
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

  return {
    // State
    elementos,
    plantas,
    plantaActiva,
    elementoSeleccionado,
    vistaActiva,
    zoom,
    panX,
    panY,
    gridSize,
    snapGridEps,
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
  // Catálogos dinámicos
  catalogos,
  setCatalogos,
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
    setCambiosNoAplicados,
    actualizarPosicion,
    actualizarElemento,
    updateElementById,
    persist,
    configurarZoom,
    configurarPan,
    setGridSize,
    setSnapGridEps,

    // Actions - Plantas
    seleccionarPlanta,
    agregarPlanta,
    editarPlanta,
    eliminarPlanta,

    // Actions - Elementos
    agregarElemento,
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
  }
})
