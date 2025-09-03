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
import { CM_TO_PX, DIMENSIONS, CATALOGO, OFFSETS } from '@/utils/constants'
import { computeDimsByAxisScale, toCanvasSizePx } from '@/utils/dimensionPolicy'
import { useAutoSave } from '@/composables/useAutoSave'
import { useToast } from '@/composables/useToast'
import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  validateZStacking,
  errorsPlacement,
} from '@/validation/placementOrchestrator'

export const useCanvasStore = defineStore('canvas', () => {
  const { showToast } = useToast()

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
        alto: 500, // cm
        ancho: 500, // cm
        largo: 500, // cm
      },
      pesoMaximoSoportado: 5000, // kg
      poligono: [
        {
          x: 0,
          y: 0,
        },
        {
          x: 5000,
          y: 0,
        },
        {
          x: 5000,
          y: 5000,
        },
        {
          x: 0,
          y: 5000,
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
  const mostrarPropiedades = ref(false);
  const vistaActiva = computed(() => {
    // Vista automática según el contexto
    if (estaEnPlanta.value) {
      return 'XY' // Vista superior para plantas
    } else if (estaEnElemento.value || estaEnContenedor.value) {
      return 'XZ' // Vista frontal para elementos y contenedores
    }
    return 'XY' // Fallback por defecto
  })
  const zoom = ref(1)
  const crearPlanta = ref(false)
  const plantaEnEdicion = ref(null)
  const panX = ref(0)
  const panY = ref(0)

  const elementoDestacadoId = ref(null)
  const idsElementosFiltrados = ref(null)
  const elementoAura = ref(null)

  const isDraggable = ref(true)
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
    tipo: 'plantas', // 'plantas' | 'elementos' | 'contenedores'
    id: 'planta_1', // ID de la planta, elemento o contenedor actual
    path: [], // Array de objetos: [{ tipo: 'plantas', id: 'planta_1', nombre: 'Planta Baja' }]
  })

  // Tamaño del canvas adaptativo según el contexto
  const canvasAdaptativo = ref({
    width: 800,
    height: 600,
    escala: 1,
  })

  // Getters
  const elementosVisibles = computed(() => {
    console.log('DEBUG elementosVisibles - Estado actual:', {
      contextoNavegacion: contextoNavegacion.value,
      totalElementos: elementos.value.length,
      plantaActiva: plantaActiva.value,
    })

    // Si estamos en una planta, mostrar solo elementos de tipo 'elementos' (sin padre)
    if (contextoNavegacion.value.tipo === 'plantas') {
      const plantaId = contextoNavegacion.value.id
      const elementosEnEstaPlanta = elementos.value.filter((el) => el.plantaId === plantaId)
      const visibles = elementosEnEstaPlanta.filter((el) => !el.padre && el.tipo === 'elementos')

      console.log('DEBUG elementosVisibles - En planta:', {
        plantaId,
        elementosEnEstaPlanta: elementosEnEstaPlanta.length,
        elementosRaiz: visibles.length,
        elementos: visibles.map((el) => ({
          id: el.id,
          nombre: el.nombre,
          tipo: el.tipo,
          x: el.x,
          y: el.y,
          plantaId: el.plantaId,
        })),
      })
      return visibles
    }

    // Si estamos dentro de un elemento, mostrar solo contenedores hijos
    if (contextoNavegacion.value.tipo === 'elementos') {
      const elementoPadre = elementos.value.find((el) => el.id === contextoNavegacion.value.id)
      if (elementoPadre && elementoPadre.hijos) {
        const hijosCompletos = elementoPadre.hijos
          .map((hijoId) => elementos.value.find((el) => el.id === hijoId))
          .filter((hijo) => hijo && hijo.tipo === 'contenedores')

        console.log('Contenedores visibles en elemento:', {
          elementoId: contextoNavegacion.value.id,
          contenedoresVisibles: hijosCompletos.length,
          contenedores: hijosCompletos,
        })
        return hijosCompletos
      }
    }

    // Si estamos dentro de un contenedor, mostrar elementos Y otros contenedores hijos
    if (contextoNavegacion.value.tipo === 'contenedores') {
      const contenedorPadre = elementos.value.find((el) => el.id === contextoNavegacion.value.id)
      if (contenedorPadre && contenedorPadre.hijos) {
        const hijosCompletos = contenedorPadre.hijos
          .map((hijoId) => elementos.value.find((el) => el.id === hijoId))
          .filter((hijo) => hijo && (hijo.tipo === 'elementos' || hijo.tipo === 'contenedores'))

        console.log('Elementos y contenedores visibles en contenedor:', {
          contenedorId: contextoNavegacion.value.id,
          hijosVisibles: hijosCompletos.length,
          elementos: hijosCompletos.filter((h) => h.tipo === 'elementos').length,
          contenedores: hijosCompletos.filter((h) => h.tipo === 'contenedores').length,
          todos: hijosCompletos,
        })
        return hijosCompletos
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

  const estaEnElemento = computed(() => {
    return contextoNavegacion.value.tipo === 'elementos'
  })

  const estaEnContenedor = computed(() => {
    return contextoNavegacion.value.tipo === 'contenedores'
  })

  const elementoContenedorActual = computed(() => {
    if (
      contextoNavegacion.value.tipo === 'elementos' ||
      contextoNavegacion.value.tipo === 'contenedores'
    ) {
      return elementos.value.find((el) => el.id === contextoNavegacion.value.id)
    }
    return null
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

    // Agregar elementos/contenedores del path
    for (let i = 1; i < contextoNavegacion.value.path.length; i++) {
      const pathItem = contextoNavegacion.value.path[i]
      if (pathItem.tipo === 'elementos' || pathItem.tipo === 'contenedores') {
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

  // === FUNCIONES DE NAVEGACIÓN JERÁRQUICA ===
  const navegarAElemento = (elementoId) => {
    const elemento = elementoPorId.value(elementoId)
    if (!elemento) {
      showToast('Elemento no encontrado')
      console.error('Elemento no encontrado:', elementoId)
      return
    }

    // Verificar que el elemento sea navegable (elementos o contenedores)
    if (elemento.tipo !== 'elementos' && elemento.tipo !== 'contenedores') {
      showToast('Solo se puede navegar a elementos o contenedores')
      console.error('Solo se puede navegar a elementos o contenedores:', elemento.tipo)
      return
    }

    // Limpiar historial y timer de zoom/pan al cambiar contexto
    clearZoomPanDebounce()
    if (historyInstance.value) {
      historyInstance.value.clearHistory()
    }

    // Actualizar contexto de navegación
    const nuevoPath = [...contextoNavegacion.value.path]
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

    // Reset zoom y pan
    clearZoomPanDebounce() // Limpiar timer pendiente antes del reset
    zoom.value = 1
    panX.value = 0
    panY.value = 0

    // Deseleccionar elemento actual
    elementoSeleccionado.value = null

    console.log('Navegando a elemento:', {
      elementoId,
      nombre: elemento.nombre,
      tipo: elemento.tipo,
      path: nuevoPath,
    })
  }

  const navegarAlPadre = () => {
    if (contextoNavegacion.value.path.length <= 1) {
      console.warn('Ya estás en el nivel raíz')
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

    // Reset zoom y pan
    clearZoomPanDebounce() // Limpiar timer pendiente antes del reset
    zoom.value = 1
    panX.value = 0
    panY.value = 0

    // Deseleccionar elemento actual
    elementoSeleccionado.value = null

    console.log('Navegando al padre:', {
      nuevoContexto: contextoNavegacion.value,
      path: nuevoPath,
    })
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

    // Reset zoom/pan y deseleccionar
    clearZoomPanDebounce() // Limpiar timer pendiente antes del reset
    zoom.value = 1
    panX.value = 0
    panY.value = 0
    elementoSeleccionado.value = null
  }

  const navegarAPlanta = (plantaId) => {
    const planta = plantaPorId.value(plantaId)
    if (!planta) {
      showToast('Planta no encontrada')
      console.error('Planta no encontrada:', plantaId)
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

    // Reset zoom y pan
    clearZoomPanDebounce() // Limpiar timer pendiente antes del reset
    zoom.value = 1
    panX.value = 0
    panY.value = 0

    // Deseleccionar elemento actual
    elementoSeleccionado.value = null

    console.log('Navegando a planta:', {
      plantaId,
      nombre: planta.nombre,
    })
  }

  const calcularCanvasAdaptativo = (elemento) => {
    console.log('Calculando canvas adaptativo para elemento:', {
      id: elemento.id,
      nombre: elemento.nombre,
      tipo: elemento.tipo,
      dimensiones: elemento.dimensiones,
      widthLegacy: elemento.width,
      heightLegacy: elemento.height,
    })

    // Calcular tamaño del canvas basado en las dimensiones del elemento
    let elementWidthPx, elementHeightPx

    if (elemento.dimensiones) {
      // Para elementos/contenedores usamos vista de frente (XZ): ancho × alto
      // (ya que navegamos "dentro" del elemento, vemos su vista frontal)
      elementWidthPx = elemento.dimensiones.ancho * CM_TO_PX
      elementHeightPx = elemento.dimensiones.alto * CM_TO_PX
      console.log('Usando dimensiones en cm (Vista de frente - ancho × alto):', {
        anchoCm: elemento.dimensiones.ancho,
        altoCm: elemento.dimensiones.alto,
        widthPx: elementWidthPx,
        heightPx: elementHeightPx,
      })
    } else if (elemento.width && elemento.height) {
      // Fallback a dimensiones legacy en píxeles
      elementWidthPx = elemento.width
      elementHeightPx = elemento.height
      console.log('Usando dimensiones legacy en px:', { elementWidthPx, elementHeightPx })
    } else {
      // Fallback final - tamaño mínimo para contenedores pequeños
      const defaultWidth = elemento.tipo === 'contenedores' ? 30 : 100 // contenedores más pequeños
      const defaultHeight = elemento.tipo === 'contenedores' ? 40 : 60
      elementWidthPx = defaultWidth * CM_TO_PX
      elementHeightPx = defaultHeight * CM_TO_PX
      console.log('Usando dimensiones por defecto:', {
        defaultWidthCm: defaultWidth,
        defaultHeightCm: defaultHeight,
        elementWidthPx,
        elementHeightPx,
      })
    }

    // Asegurar dimensiones mínimas para navegación
    // const MIN_CANVAS_WIDTH = 200 // px mínimos para el canvas
    // const MIN_CANVAS_HEIGHT = 150 // px mínimos para el canvas

    // elementWidthPx = Math.max(elementWidthPx, MIN_CANVAS_WIDTH)
    // elementHeightPx = Math.max(elementHeightPx, MIN_CANVAS_HEIGHT)

    // El canvas muestra el espacio real del elemento
    canvasAdaptativo.value = {
      width: elementWidthPx,
      height: elementHeightPx,
      escala: CM_TO_PX, // La escala es la conversión cm→px
    }

    console.log('Canvas adaptativo calculado:', {
      elemento: {
        id: elemento.id,
        tipo: elemento.tipo,
        widthPx: elementWidthPx,
        heightPx: elementHeightPx,
      },
      canvas: canvasAdaptativo.value,
    })
  }

  const calcularCanvasAdaptativoPlanta = (planta) => {
    // Calcular tamaño del canvas basado en las dimensiones de la planta
    if (!planta) {
      // Fallback por defecto
      canvasAdaptativo.value = {
        width: 800,
        height: 600,
        escala: 1,
      }
      return
    }

    // Convertir dimensiones de cm a pixels usando la constante CM_TO_PX
    // Para plantas, usamos la conversión directa 1:1 (sin factor de escala adicional)
    canvasAdaptativo.value = {
      width: planta.dimensiones.ancho * CM_TO_PX, // ancho = x
      height: planta.dimensiones.largo * CM_TO_PX, // largo = y
      escala: CM_TO_PX, // La escala es la conversión cm->px
    }

    console.log('Canvas adaptativo calculado para planta:', {
      planta: { anchoCm: planta.dimensiones.ancho, largoCm: planta.dimensiones.largo },
      canvas: canvasAdaptativo.value,
    })
  }

  // Actions
  const seleccionarElemento = (id) => {
    elementoSeleccionado.value = id
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
      const data = serialize()
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('canvas-data', data)
      }
    } catch (e) {
      console.warn('Error persisting state', e)
    }
  }

  const updateElementById = (id, patch) => {
    const ok = actualizarElemento(id, patch, true, 'Editar propiedades')
    if (ok) {
      const el = elementos.value.find(e => e.id === id)
      if (el) {
        el.updatedAt = new Date().toISOString()
      }
      persist()
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

  const configurarZoom = (nuevoZoom) => {
    const zoomAnterior = zoom.value
    zoom.value = Math.max(0.1, Math.min(5, nuevoZoom))

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

    plantas.value.push({
      id,
      nombre: nuevaPlanta.nombre || 'Nueva Planta',
      descripcion: nuevaPlanta.descripcion || '',
      elementos: [],
      activa: false,
      dimensiones: {
        alto: nuevaPlanta.dimensiones?.alto || 0,
        ancho: nuevaPlanta.dimensiones?.ancho || 0,
        largo: nuevaPlanta.dimensiones?.largo || 0,
      },
      pesoMaximoSoportado: nuevaPlanta.pesoMaximoSoportado || 3000,
      ...nuevaPlanta,
    })
    return id
  }

  const editarPlanta = (plantaId, datosActualizados) => {
    const planta = plantas.value.find((p) => p.id === plantaId)
    if (planta) {
      Object.assign(planta, datosActualizados)
      try {
        // Recalcular dimensiones de hijos (solo elementos de sistema) si aplica
        const shouldAuto = DIMENSIONS?.autoResizeOnParentChange !== false
        if (shouldAuto && planta?.dimensiones) {
          const parentDims = {
            w: planta.dimensiones.ancho,
            h: planta.dimensiones.largo,
            d: planta.dimensiones.alto,
          }
          const elems = elementos.value.filter(
            (el) => el.plantaId === plantaId && !el.padre && el.tipo === 'elementos'
          )
          for (const el of elems) {
            const typeKey = el.systemTypeKey || el.id
            const isSystemDefault = !!(
              typeKey && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(typeKey)
            )
            if (!isSystemDefault) continue
            if (el.dimensionLock === true) continue
            const dims = computeDimsByAxisScale(typeKey, parentDims, { snap: true, gridPx: gridSize.value })
            if (!dims) continue
            // Persistir nuevas dimensiones; width/height se recalculan según vista en actualizarElemento
            actualizarElemento(el.id, { dimensiones: dims }, true, `Auto-resize por cambio de planta: ${el.nombre || el.id}`)
            // Offset vertical configurable (por tipo) — solo si aplica
            const off = OFFSETS?.offsetByType?.[typeKey]?.zOffsetShare
            if (typeof off === 'number' && isFinite(off)) {
              const zBase = Math.round((planta.dimensiones.alto || 0) * off)
              actualizarElemento(el.id, { alturaRespectoAlSuelo: zBase })
            }
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
        window?.__toasts?.show?.(msg, { type: 'error' })
        return false
      }
    }
    return true
  }

  // Actions para elementos
  const agregarElemento = (nuevoElemento) => {
    console.log('Agregando elemento al store:', nuevoElemento)

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

    // Reglas de jerarquía:
    // - elementos solo pueden ir en plantas
    // - contenedores solo pueden ir en elementos
    // - elementos pueden ir en contenedores
    if (contextoActual === 'plantas' && tipoElemento !== 'elementos') {
      showToast('En plantas solo se pueden agregar elementos')
      console.error('En plantas solo se pueden agregar elementos')
      return null
    }

    if (contextoActual === 'elementos' && tipoElemento !== 'contenedores') {
      showToast('En elementos solo se pueden agregar contenedores')
      console.error('En elementos solo se pueden agregar contenedores')
      return null
    }

    if (
      contextoActual === 'contenedores' &&
      tipoElemento !== 'elementos' &&
      tipoElemento !== 'contenedores'
    ) {
      console.error('En contenedores solo se pueden agregar elementos u otros contenedores')
      return null
    }

    // Si estamos dentro de un elemento o contenedor, el nuevo elemento es hijo
    if (
      contextoNavegacion.value.tipo === 'elementos' ||
      contextoNavegacion.value.tipo === 'contenedores'
    ) {
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

        console.log('Elemento agregado como hijo de:', {
          padre: elementoPadre.nombre,
          hijo: nuevoElemento.nombre,
          tipoHijo: nuevoElemento.tipo,
          hijosDelPadre: elementoPadre.hijos.length,
        })
      }
    } else {
      // Si estamos en una planta, agregar normalmente
      nuevoElemento.plantaId = contextoNavegacion.value.id
      nuevoElemento.padre = null
      nuevoElemento.etiquetas = [] // Sin etiquetas inicialmente

      // Actualizar el array de elementos en la planta
      const planta = plantas.value.find((p) => p.id === contextoNavegacion.value.id)
      if (planta) {
        if (!planta.elementos) {
          planta.elementos = []
        }
        planta.elementos.push(nuevoElemento.id)
        console.log('Elemento agregado al array de elementos de la planta:', {
          plantaId: planta.id,
          elementoId: nuevoElemento.id,
          totalElementosEnPlanta: planta.elementos.length,
        })
      }
    }

    // Política de dimensiones al crear en planta para elementos de sistema
    try {
      const shouldAuto = true
      if (shouldAuto && nuevoElemento.tipo === 'elementos') {
        const typeKey = nuevoElemento.systemTypeKey || nuevoElemento.id
        const isSystemDefault = !!(
          typeKey && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(typeKey)
        )
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
              const { width, height } = toCanvasSizePx(dims, 'XY')
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

    elementos.value.push(nuevoElemento)
    console.log('Total elementos en store:', elementos.value.length)
    console.log('Elementos visibles:', elementosVisibles.value.length)

    // Guardar estado en historial
    saveToHistory(`Elemento agregado: ${nuevoElemento.nombre || nuevoElemento.tipo}`)

    return nuevoElemento.id
  }

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
            console.log('Elemento removido del array de elementos de la planta:', {
              plantaId: planta.id,
              elementoId,
              elementosRestantes: planta.elementos.length,
            })
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
            console.log('Elemento removido del array de hijos del padre:', {
              padreId: padre.id,
              elementoId,
              hijosRestantes: padre.hijos.length,
            })
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
      // Si no tiene propiedad visible, por defecto está visible (true)
      elemento.visible = elemento.visible === false ? true : false

      // Guardar estado en historial
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
    console.log('🔗 Instancia de historial establecida en el store')
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
  const serialize = () => {
    const state = {
      // Información básica del canvas
      meta: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        app: 'inventory-smart',
      },

      // Estado de plantas con todas sus propiedades
      plantas: plantas.value.map((planta) => {
        return {
          id: planta.id,
          nombre: planta.nombre,
          descripcion: planta.descripcion || '',
          dimensiones: {
            alto: planta.dimensiones.alto,
            ancho: planta.dimensiones.ancho,
            largo: planta.dimensiones.largo,
          },
          poligono: planta.poligono || [],
          pesoMaximoSoportado: planta.pesoMaximoSoportado,
          elementos: planta.elementos || [],
          activa: planta.activa || false,
          propiedadesPersonalizadas: planta.propiedadesPersonalizadas || {},
        }
      }),

      // Estado de elementos
      elementos: elementos.value.map((elemento) => ({
        // Identificación básica
        id: elemento.id,
        nombre: elemento.nombre,
        descripcion: elemento.descripcion || '',
        tipo: elemento.tipo,
        categoria: elemento.categoria,
        plantaId: elemento.plantaId,
        etiquetas: elemento.etiquetas || [],

        alturaRespectoAlSuelo: elemento.alturaRespectoAlSuelo || 0,

        posicion: {
          x: elemento.x || 0,
          y: elemento.y || 0,
          // Unused
          z: elemento.z || 0,
          rotation: elemento.rotation || 0,
        },

        dimensiones: {
          ancho: elemento.dimensiones.ancho,
          largo: elemento.dimensiones.largo,
          alto: elemento.dimensiones.alto,
        },

        color: elemento.color || elemento.colorBase || '#3b82f6',
        colorBase: elemento.colorBase || '#3b82f6',
        forma: elemento.forma || 'rectangular',
        visible: elemento.visible,
        pesoMaximo: elemento.pesoMaximo || 0,
        volumenMaximo: elemento.volumenMaximo || 0,
        ubicacion: elemento.ubicacion || 'suelo',
        // Política de dimensiones
        dimensionLock: elemento.dimensionLock === true,
        systemTypeKey: elemento.systemTypeKey || null,

        // Canvas representacion
        canvas: {
          width: elemento.width,
          height: elemento.height
        },

        // Uso real
        uso: {
          peso: elemento?.uso?.peso || 0,
          volumen: elemento?.uso?.volumen || 0
        },

        // Jerarquía
        padre: elemento.padre || null,
        hijos: elemento.hijos || [],

        // Propiedades personalizadas
        propiedadesPersonalizadas: elemento.propiedadesPersonalizadas || {},
      })),
    }

    return JSON.stringify(state, null, 2)
  }

  /**
   * Deserializa un JSON y reconstruye el estado del canvas
   * @param {string} jsonString - JSON string con el estado
   * @returns {boolean} true si la deserialización fue exitosa
   */
  const deserialize = (jsonString) => {
    try {
      const state = JSON.parse(jsonString)

      // Validar estructura básica
      if (!state || !state.plantas || !state.elementos) {
        console.error('Estructura JSON inválida')
        return false
      }

      // Limpiar estado actual
      plantas.value = []
      elementos.value = []

      // Restaurar plantas
      state.plantas.forEach((plantaData) => {
        plantas.value.push({
          id: plantaData.id,
          nombre: plantaData.nombre,
          descripcion: plantaData.descripcion || '',
          dimensiones: {
            alto: plantaData.dimensiones.alto,
            ancho: plantaData.dimensiones.ancho,
            largo: plantaData.dimensiones.largo,
          },
          poligono: plantaData.poligono || [],
          pesoMaximoSoportado: plantaData.pesoMaximoSoportado,
          elementos: plantaData.elementos || [],
          activa: plantaData.activa || false,
          propiedadesPersonalizadas: plantaData.propiedadesPersonalizadas || {},
        })
      })

      // Restaurar elementos
      const elementosData = state.elementos || []

      elementosData.forEach((elementoData) => {
        elementos.value.push({
          id: elementoData.id,
          nombre: elementoData.nombre,
                    descripcion: elementoData.descripcion || '',
          tipo: elementoData.tipo,
          categoria: elementoData.categoria,
          plantaId: elementoData.plantaId,
          etiquetas: elementoData.etiquetas || [],

          x: elementoData.posicion.x,
          y: elementoData.posicion.y,
          z: elementoData.posicion.z,
          rotation: elementoData.posicion.rotation,

          dimensiones: {
            ancho: elementoData.dimensiones.ancho,
            largo: elementoData.dimensiones.largo,
            alto: elementoData.dimensiones.alto,
          },

          colorBase: elementoData.colorBase || '#3b82f6',
          color: elementoData.color || '#3b82f6',
          forma: elementoData.forma || 'rectangular',
          visible: elementoData.visible !== false,
          pesoMaximo: elementoData.pesoMaximo || 0,
          volumenMaximo: elementoData.volumenMaximo || 0,
          ubicacion: elementoData.ubicacion || 'suelo',
          // Política de dimensiones
          dimensionLock: elementoData.dimensionLock === true,
          systemTypeKey: elementoData.systemTypeKey || null,

          width: elementoData.canvas.width,
          height: elementoData.canvas.height || 60,

          padre: elementoData.padre || null,
          hijos: elementoData.hijos || [],

          propiedadesPersonalizadas: elementoData.propiedadesPersonalizadas || {},
        })
      })

      // Validar que hay al menos una planta antes de continuar
      if (plantas.value.length === 0) {
        console.error('No se puede deserializar: no hay plantas en el archivo JSON')
        return false
      }

      // Establecer la primera planta como activa siempre
      const primeraPlanta = plantas.value[0]
      plantaActiva.value = primeraPlanta.id

      // Establecer contexto de navegación siempre en la primera planta
      contextoNavegacion.value = {
        tipo: 'plantas',
        id: primeraPlanta.id,
        path: [
          {
            tipo: 'plantas',
            id: primeraPlanta.id,
            nombre: primeraPlanta.nombre,
          },
        ],
      }

      // Resetear valores temporales a sus defaults
      elementoSeleccionado.value = null
      zoom.value = 1
      panX.value = 0
      panY.value = 0

      // Canvas adaptativo se recalculará automáticamente por el watcher

      console.log('Estado deserializado exitosamente:', {
        plantas: plantas.value.length,
        elementos: elementos.value.length,
        plantaActiva: plantaActiva.value,
      })

      return true
    } catch (error) {
      console.error('Error al deserializar JSON:', error)
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
    // "Desenvolvemos" los elementos para asegurarnos de que trabajamos con el objeto de datos real.
    const elementosLimpios = elementos.value.map((el) => el?._custom?.value || el)

    // Si estamos en una planta, mostrar solo elementos de tipo 'elementos' (sin padre)
    if (contextoNavegacion.value.tipo === 'plantas') {
      const plantaId = contextoNavegacion.value.id
      const elementosEnEstaPlanta = elementosLimpios.filter((el) => el.plantaId === plantaId)
      return elementosEnEstaPlanta.filter((el) => !el.padre && el.tipo === 'elementos')
    }

    // Si estamos dentro de un elemento, mostrar solo contenedores hijos
    if (contextoNavegacion.value.tipo === 'elementos') {
      const elementoPadre = elementosLimpios.find((el) => el.id === contextoNavegacion.value.id)
      if (elementoPadre && elementoPadre.hijos) {
        return elementoPadre.hijos
          .map((hijoId) => elementosLimpios.find((el) => el.id === hijoId))
          .filter((hijo) => hijo && hijo.tipo === 'contenedores')
      }
    }

    // Si estamos dentro de un contenedor, mostrar elementos Y otros contenedores hijos
    if (contextoNavegacion.value.tipo === 'contenedores') {
      const contenedorPadre = elementosLimpios.find((el) => el.id === contextoNavegacion.value.id)
      if (contenedorPadre && contenedorPadre.hijos) {
        return contenedorPadre.hijos
          .map((hijoId) => elementosLimpios.find((el) => el.id === hijoId))
          .filter((hijo) => hijo && (hijo.tipo === 'elementos' || hijo.tipo === 'contenedores'))
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
    const elemento = elementoPorId.value(elementoId)
    if (!elemento) return

    elementoDestacadoId.value = elementoId

    // Creamos la configuración del aura basada en el elemento
    const paddingAura = 30 / zoom.value // Píxeles extra de tamaño para el aura
    elementoAura.value = {
      // Usamos un ID único para el aura para evitar conflictos de key
      id: `aura_${elemento.id}`,
      forma: elemento.forma,
      x: elemento.x - paddingAura / 2,
      y: elemento.y - paddingAura / 2,
      width: elemento.width + paddingAura,
      height: elemento.height + paddingAura,
      color: elemento.color,
    }

    // Limpiamos todo después de un tiempo
    setTimeout(() => {
      if (elementoDestacadoId.value === elementoId) {
        elementoDestacadoId.value = null
        elementoAura.value = null // <-- Limpiar el aura
      }
    }, 2500) // Aumentamos un poco el tiempo a 2.5 segundos
  }

  const actualizarIdsFiltrados = (ids) => {
    idsElementosFiltrados.value = ids
  }

  const setDraggableMode = (mode) => {
    this.isDraggable = mode
  }

  // === INTEGRACIÓN CON AUTOSAVE ===
  // Instancia del autosave - se establece desde App.vue o el componente principal
  const autoSaveInstance = ref(null)

  /**
   * Establecer la instancia del autosave (resuelve dependencia circular)
   */
  const setAutoSaveInstance = (autoSaveComposableInstance) => {
    autoSaveInstance.value = autoSaveComposableInstance
    console.log('💾 Instancia de autosave establecida en el store')
  }

  const toggleMostrarPropiedades = (newValue = false) => {
    mostrarPropiedades.value = newValue;
  }

  // Watcher para recalcular canvas adaptativo cuando cambia el contexto
  watch(
    () => [contextoNavegacion.value.tipo, contextoNavegacion.value.id],
    ([tipo, id]) => {
      console.log('Watcher canvas adaptativo - cambio de contexto:', { tipo, id })

      if (tipo === 'plantas') {
        const planta = plantaPorId.value(id)
        console.log('Calculando canvas para planta:', planta?.nombre)
        calcularCanvasAdaptativoPlanta(planta)
      } else if (tipo === 'elementos' || tipo === 'contenedores') {
        const elemento = elementoPorId.value(id)
        console.log('Calculando canvas para elemento/contenedor:', {
          encontrado: !!elemento,
          id: elemento?.id,
          tipo: elemento?.tipo,
          nombre: elemento?.nombre,
        })
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
    isDraggable,
    mostrarPropiedades,

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
    estaEnElemento,
    estaEnContenedor,
    elementoContenedorActual,
    breadcrumbs,
    puedeNavegar,
    contextoNavegacion,
    canvasAdaptativo,

    // Actions - Canvas
    seleccionarElemento,
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
    actualizarIdsFiltrados,

    setDraggableMode,

    // == Propiedades
    toggleMostrarPropiedades,
  }
})
