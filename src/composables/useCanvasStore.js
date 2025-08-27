/**
 * useCanvasStore.js
 *
 * Store principal para el estado y lógica del canvas del editor visual jerárquico.
 *
 * Responsabilidades:
 * - Estado global del canvas (elementos, plantas, vista  const eliminarElemento = (elementoId) => {
 * - Estado de selección y herramientas activas
 * - Configuración de canvas (zoom, pan, grid)
 * - CRUD de elementos en el canvas
 * - Gestión de plantas y navegación entre ellas
 * - Estado de las vistas XY/ZX/ZY
 * - Integración con otros stores y composables
 * - Persistencia y sincronización del estado
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { CM_TO_PX } from '@/utils/constants'
import { validateWallPlacement } from '@/utils/placementValidity'
import { validateZStacking } from '@/validation/placementOrchestrator'
import { errorsPlacement } from '@/utils/errorsPlacement'

// Variable para evitar circular import - será inicializada por el composable de historial
let historyComposable = null

export const useCanvasStore = defineStore('canvas', () => {
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

  const elementoDestacadoId = ref(null);
  const idsElementosFiltrados = ref(null);
  const elementoAura = ref(null);

  const isDraggable = ref(true);
  // Configuración de grilla y snap
  const gridSize = ref(50) // px entre líneas de grilla
  const snapGridEps = ref(6) // px de proximidad para aplicar snap al soltar
  const useDragBoundsClamp = ref(false) // experimental drag clamping

  const setGridSize = (sizePx) => {
    const s = Number(sizePx)
    if (!Number.isFinite(s)) return
    gridSize.value = Math.max(5, Math.min(500, s))
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
        cajas: '�',
        bins: '�️',
        bandejas: '�',
      }
      return iconosContenedores[categoria] || '🗃️'
    }

    if (tipo === 'elementos') {
      const iconosElementos = {
        anaqueles: '📚',
        estantes: '📋',
        mesas: '�️',
        armarios: '�️',
      }
      return iconosElementos[categoria] || '📦'
    }

    return '📦'
  }

  // === FUNCIONES DE NAVEGACIÓN JERÁRQUICA ===
  const navegarAElemento = (elementoId) => {
    const elemento = elementoPorId.value(elementoId)
    if (!elemento) {
      console.error('Elemento no encontrado:', elementoId)
      return
    }

    // Verificar que el elemento sea navegable (elementos o contenedores)
    if (elemento.tipo !== 'elementos' && elemento.tipo !== 'contenedores') {
      console.error('Solo se puede navegar a elementos o contenedores:', elemento.tipo)
      return
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

    // Guardar en historial
    saveToHistory(`Navegación a ${elemento.nombre}`)
  }

  const navegarAlPadre = () => {
    if (contextoNavegacion.value.path.length <= 1) {
      console.warn('Ya estás en el nivel raíz')
      return
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
    zoom.value = 1
    panX.value = 0
    panY.value = 0

    // Deseleccionar elemento actual
    elementoSeleccionado.value = null

    console.log('Navegando al padre:', {
      nuevoContexto: contextoNavegacion.value,
      path: nuevoPath,
    })

    // Guardar en historial
    saveToHistory(`Navegación al padre`)
  }

  /**
   * Navegar a un contexto ya construido (reemplaza el path en lugar de hacer push)
   * útil para cuando se selecciona un breadcrumb y queremos volver a un punto del path
   */
  const navegarAContexto = (tipo, id, path) => {
    if (!path || !Array.isArray(path) || path.length === 0) return

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
    zoom.value = 1
    panX.value = 0
    panY.value = 0
    elementoSeleccionado.value = null

    saveToHistory(`Navegación a contexto: ${id}`)
  }

  const navegarAPlanta = (plantaId) => {
    const planta = plantaPorId.value(plantaId)
    if (!planta) {
      console.error('Planta no encontrada:', plantaId)
      return
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
    zoom.value = 1
    panX.value = 0
    panY.value = 0

    // Deseleccionar elemento actual
    elementoSeleccionado.value = null

    console.log('Navegando a planta:', {
      plantaId,
      nombre: planta.nombre,
    })

    // Guardar en historial
    saveToHistory(`Navegación a ${planta.nombre}`)
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
      // Para elementos/contenedores usamos vista XZ: ancho × alto
      // (ya que navegamos "dentro" del elemento, vemos su vista frontal)
      elementWidthPx = elemento.dimensiones.ancho * CM_TO_PX
      elementHeightPx = elemento.dimensiones.alto * CM_TO_PX
      console.log('Usando dimensiones en cm (Vista XZ - ancho × alto):', {
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

  const actualizarPosicion = (id, x, y) => {
    const elemento = elementos.value.find((el) => el.id === id)
    if (elemento) {
      elemento.x = x
      elemento.y = y
    }
  }

  const actualizarElemento = (elementoId, propiedades) => {
    const elemento = elementos.value.find((el) => el.id === elementoId)
    if (elemento) {
      const ubicacionFinal = propiedades.ubicacion || elemento.ubicacion
      const zBaseFinal =
        propiedades.alturaRespectoAlSuelo ??
        propiedades.elevacion?.zBase ??
        elemento.alturaRespectoAlSuelo ??
        elemento.elevacion?.zBase
      const altoFinal =
        propiedades.dimensiones?.alto ??
        elemento.dimensiones?.alto ??
        elemento.alto ?? 0

      if (ubicacionFinal === 'pared') {
        const alturaBodega = plantaActivaData.value?.dimensiones?.alto || Infinity
        const { valido, mensaje } = validateWallPlacement({
          zBase: zBaseFinal,
          alto: altoFinal,
          alturaBodega
        })
        if (!valido) {
          console.error(mensaje)
          return false
        }
      }

      const candidate = {
        ...elemento,
        ...propiedades,
        ubicacion: ubicacionFinal,
        x: propiedades.x ?? elemento.x,
        y: propiedades.y ?? elemento.y,
        width: propiedades.width ?? elemento.width,
        height: propiedades.height ?? elemento.height,
        elevacion: {
          ...(elemento.elevacion || {}),
          ...(propiedades.elevacion || {}),
          zBase: zBaseFinal,
          altura: altoFinal,
        },
      }
      const stackRes = validateZStacking(elementos.value, candidate)
      if (!stackRes.valid) {
        console.error(errorsPlacement[stackRes.code || stackRes.reason] || stackRes.code || stackRes.reason)
        return false
      }

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
          // En vista XY (superior): ancho->width, largo->height
          if (propiedades.dimensiones.ancho !== undefined) {
            elemento.width = elemento.dimensiones.ancho * CM_TO_PX
          }
          if (propiedades.dimensiones.largo !== undefined) {
            elemento.height = elemento.dimensiones.largo * CM_TO_PX
          }
        } else if (vistaActiva.value === 'XZ') {
          // En vista XZ (frontal): ancho->width, alto->height
          if (propiedades.dimensiones.ancho !== undefined) {
            elemento.width = elemento.dimensiones.ancho * CM_TO_PX
          }
          if (propiedades.dimensiones.alto !== undefined) {
            elemento.height = elemento.dimensiones.alto * CM_TO_PX
          }
          // Nota: largo no afecta a width/height en vista XZ
        }
      }
      return true
    }
    return false
  }

  const configurarZoom = (nuevoZoom) => {
    zoom.value = Math.max(0.1, Math.min(5, nuevoZoom))
  }

  const configurarPan = (x, y) => {
    panX.value = x
    panY.value = y
  }

  // Actions para plantas
  const seleccionarPlanta = (plantaId) => {
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

  // Actions para elementos
  const agregarElemento = (nuevoElemento) => {
    console.log('Agregando elemento al store:', nuevoElemento)

    // Validar tipo de elemento
    if (!nuevoElemento.tipo) {
      console.error('El elemento debe tener un tipo definido')
      return null
    }

    // Validación específica para elementos ubicados en pared
    if (nuevoElemento.ubicacion === 'pared') {
      const alturaBodega = plantaActivaData.value?.dimensiones?.alto || Infinity
      const { valido, mensaje } = validateWallPlacement({
        zBase: nuevoElemento.alturaRespectoAlSuelo ?? nuevoElemento.elevacion?.zBase,
        alto: nuevoElemento.dimensiones?.alto ?? nuevoElemento.alto ?? 0,
        alturaBodega
      })
      if (!valido) {
        console.error(mensaje)
        return null
      }
    }
    const stackRes = validateZStacking(elementos.value, nuevoElemento)
    if (!stackRes.valid) {
      console.error(errorsPlacement[stackRes.code || stackRes.reason] || stackRes.code || stackRes.reason)
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
      console.error('En plantas solo se pueden agregar elementos')
      return null
    }

    if (contextoActual === 'elementos' && tipoElemento !== 'contenedores') {
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
      nuevoElemento.padre = null;
      nuevoElemento.etiquetas = []; // Sin etiquetas inicialmente

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
   * Inicializar la integración con el historial
   */
  const initializeHistory = (historyComposableInstance) => {
    historyComposable = historyComposableInstance

    // Guardar estado inicial
    if (historyComposable) {
      historyComposable.initializeHistory('Estado inicial del canvas')
    }
  }

  /**
   * Guardar estado actual en el historial
   */
  const saveToHistory = (description) => {
    if (historyComposable && !historyComposable.isUndoRedoOperation.value) {
      historyComposable.pushState(description)
    }
  }

  /**
   * Versiones con historial de las acciones principales
   */
  const actualizarElementoConHistorial = (elementoId, propiedades, description) => {
    actualizarElemento(elementoId, propiedades)

    const descripcionAuto =
      description || `Propiedades actualizadas: ${Object.keys(propiedades).join(', ')}`
    saveToHistory(descripcionAuto)
  }

  const actualizarPosicionConHistorial = (elementoId, x, y, description) => {
    actualizarPosicion(elementoId, x, y)

    // Solo guardar en historial al finalizar el arrastre, no en cada movimiento
    if (description) {
      saveToHistory(description)
    }
  }

  const seleccionarPlantaConHistorial = (plantaId) => {
    const plantaAnterior = plantaActiva.value
    seleccionarPlanta(plantaId)

    if (plantaAnterior !== plantaId) {
      const planta = plantas.value.find((p) => p.id === plantaId)
      saveToHistory(`Cambio a planta: ${planta?.nombre || plantaId}`)
    }
  }

  const agregarPlantaConHistorial = (nuevaPlanta) => {
    const id = agregarPlanta(nuevaPlanta)
    saveToHistory(`Nueva planta creada: ${nuevaPlanta.nombre || 'Sin nombre'}`)
    return id
  }

  const eliminarPlantaConHistorial = (plantaId) => {
    const planta = plantas.value.find((p) => p.id === plantaId)

    // eslint-disable-next-line no-useless-catch
    try {
      eliminarPlanta(plantaId)
      saveToHistory(`Planta eliminada: ${planta?.nombre || plantaId}`)
    } catch (error) {
      throw error // Re-lanzar error sin guardar en historial
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
        app: 'dv-canva-editor',
      },

      // Estado de plantas con todas sus propiedades
      plantas: plantas.value.map((planta) => {
        // Calcular elementos que pertenecen a esta planta dinámicamente
        const elementosEnPlanta = elementos.value
          .filter((el) => el.plantaId === planta.id)
          .map((el) => el.id)

        return {
          id: planta.id,
          nombre: planta.nombre,
          descripcion: planta.descripcion || '',
          dimensiones: {
            alto: planta.dimensiones?.alto || 280,
            ancho: planta.dimensiones?.ancho || 800,
            largo: planta.dimensiones?.largo || 1000,
          },
          pesoMaximoSoportado: planta.pesoMaximoSoportado || 3000,
          elementos: elementosEnPlanta,
          activa: planta.activa || false,
          // Propiedades personalizadas adicionales
          propiedadesPersonalizadas: planta.propiedadesPersonalizadas || {},
        }
      }),

      // Estado de elementos con propiedades estáticas y personalizadas
      elementos: elementos.value.map((elemento) => ({
        // Elevación y tolerancias
        elevacion: elemento.elevacion || {
          zBase: 0,
          altura: elemento.dimensiones?.alto || elemento.alto || 0,
          espesor: elemento.elevacion?.espesor || 0,
        },
        tolerancias: elemento.tolerancias || { junta: 0, paralelismo: 0, zEpsilon: 0 },
        id: elemento.id,
        nombre: elemento.nombre,
        tipo: elemento.tipo,
        categoria: elemento.categoria,
        plantaId: elemento.plantaId,

        // Propiedades físicas (maneja formato nuevo y legacy)
        dimensiones: elemento.dimensiones
          ? {
              ancho: elemento.dimensiones.ancho,
              largo: elemento.dimensiones.largo,
              alto: elemento.dimensiones.alto,
            }
          : elemento.width || elemento.height
            ? {
                // Fallback para formato legacy (width, height directos)
                ancho: elemento.width || 100,
                largo: elemento.height || 60,
                alto: elemento.alto || 20,
              }
            : null,

        // Posición y transformación (maneja formato nuevo y legacy)
        posicion: elemento.posicion
          ? {
              x: elemento.posicion.x,
              y: elemento.posicion.y,
              z: elemento.posicion.z || 0,
              rotation: elemento.posicion.rotation || 0,
            }
          : {
              // Fallback para formato legacy (x, y directos)
              x: elemento.x || 0,
              y: elemento.y || 0,
              z: elemento.z || 0,
              rotation: elemento.rotation || 0,
            },

        // Propiedades visuales
        visual: {
          colorBase: elemento.colorBase || '#3b82f6',
          forma: elemento.forma || 'rectangular',
          visible: elemento.visible !== false, // Por defecto visible
        },

        // Propiedades funcionales
        propiedades: {
          pesoMaximo: elemento.pesoMaximo || 0,
          ubicacion: elemento.ubicacion || 'suelo',
          descripcion: elemento.descripcion || '',
        },

        // Jerarquía
        jerarquia: {
          padre: elemento.padre || null,
          hijos: elemento.hijos || [],
          nivel: elemento.nivel || 0,
        },

        // Propiedades personalizadas del usuario
        propiedadesPersonalizadas: elemento.propiedadesPersonalizadas || {},

        // Metadatos adicionales
        metadatos: {
          fechaCreacion: elemento.fechaCreacion || new Date().toISOString(),
          fechaModificacion: elemento.fechaModificacion || new Date().toISOString(),
          creador: elemento.creador || 'usuario',
        },
      })),

      // Estado de navegación y configuración
      configuracion: {
        plantaActiva: plantaActiva.value,
        elementoSeleccionado: elementoSeleccionado.value,
        vistaActiva: vistaActiva.value,
        zoom: zoom.value,
        panX: panX.value,
        panY: panY.value,
        contextoNavegacion: {
          tipo: contextoNavegacion.value.tipo,
          id: contextoNavegacion.value.id,
          path: contextoNavegacion.value.path || [],
        },
        canvasAdaptativo: {
          width: canvasAdaptativo.value.width,
          height: canvasAdaptativo.value.height,
          escala: canvasAdaptativo.value.escala,
        },
        // Nueva configuración de grilla/snap
        grid: {
          size: gridSize.value,
          snapEps: snapGridEps.value,
        },
      },
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
      if (!state || !state.plantas || !state.elementos || !state.configuracion) {
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
            alto: plantaData.dimensiones?.alto || 280,
            ancho: plantaData.dimensiones?.ancho || 800,
            largo: plantaData.dimensiones?.largo || 1000,
          },
          pesoMaximoSoportado: plantaData.pesoMaximoSoportado || 3000,
          elementos: plantaData.elementos || [],
          activa: plantaData.activa || false,
          propiedadesPersonalizadas: plantaData.propiedadesPersonalizadas || {},
        })
      })

      // Restaurar elementos directamente (primera versión, sin migración)
      const elementosData = state.elementos || []

      elementosData.forEach((elementoData) => {
        // Extraer posición y dimensiones
        const posX = elementoData.posicion?.x || 0
        const posY = elementoData.posicion?.y || 0
        const width = elementoData.dimensiones?.ancho || 100
        const height = elementoData.dimensiones?.largo || 60

        elementos.value.push({
          id: elementoData.id,
          nombre: elementoData.nombre,
          tipo: elementoData.tipo,
          categoria: elementoData.categoria,
          plantaId: elementoData.plantaId,

          elevacion: elementoData.elevacion || {
            zBase: elementoData.posicion?.z || 0,
            altura: elementoData.dimensiones?.alto || 0,
            espesor: 0,
          },
          tolerancias: elementoData.tolerancias || { junta: 0, paralelismo: 0, zEpsilon: 0 },

          // Propiedades físicas (estructura nueva)
          dimensiones: {
            ancho: width,
            largo: height,
            alto: elementoData.dimensiones?.alto || 20,
          },

          // Posición (estructura nueva)
          posicion: {
            x: posX,
            y: posY,
            z: elementoData.posicion?.z || 0,
            rotation: elementoData.posicion?.rotation || 0,
          },

          // Propiedades legacy para compatibilidad con Konva
          x: posX,
          y: posY,
          width: width,
          height: height,

          // Propiedades visuales
          color: elementoData.visual?.colorBase || '#3b82f6',
          colorBase: elementoData.visual?.colorBase || '#3b82f6',
          forma: elementoData.visual?.forma || 'rectangular',
          visible: elementoData.visual?.visible !== false,

          // Propiedades funcionales
          pesoMaximo: elementoData.propiedades?.pesoMaximo || 0,
          ubicacion: elementoData.propiedades?.ubicacion || 'suelo',
          descripcion: elementoData.propiedades?.descripcion || '',

          // Jerarquía
          padre: elementoData.jerarquia?.padre || null,
          hijos: elementoData.jerarquia?.hijos || [],
          nivel: elementoData.jerarquia?.nivel || 0,

          // Propiedades personalizadas
          propiedadesPersonalizadas: elementoData.propiedadesPersonalizadas || {},

          // Metadatos
          metadata: {
            fechaCreacion: elementoData.metadatos?.fechaCreacion || new Date().toISOString(),
            fechaModificacion:
              elementoData.metadatos?.fechaModificacion || new Date().toISOString(),
            creador: elementoData.metadatos?.creador || 'usuario',
            descripcion: elementoData.propiedades?.descripcion || '',
            material: 'Estándar',
            capacidad: 'Variable',
          },
        })
      })

      // Restaurar configuración
      const config = state.configuracion
      plantaActiva.value = config.plantaActiva || plantas.value[0]?.id || null
      elementoSeleccionado.value = config.elementoSeleccionado || null
      // vistaActiva ahora es computed y se calcula automáticamente
      zoom.value = config.zoom || 1
      panX.value = config.panX || 0
      panY.value = config.panY || 0

      // Restaurar contexto de navegación directamente (primera versión, sin migración)
      if (config.contextoNavegacion) {
        contextoNavegacion.value = {
          tipo: config.contextoNavegacion.tipo || 'plantas',
          id: config.contextoNavegacion.id || plantaActiva.value,
          path: config.contextoNavegacion.path || [],
        }
      }

      // Restaurar canvas adaptativo
      if (config.canvasAdaptativo) {
        canvasAdaptativo.value = {
          width: config.canvasAdaptativo.width || 800,
          height: config.canvasAdaptativo.height || 600,
          escala: config.canvasAdaptativo.escala || 1,
        }
      }

      // Restaurar grid/snapping si existe
      if (config.grid) {
        if (Number.isFinite(config.grid.size)) gridSize.value = config.grid.size
        if (Number.isFinite(config.grid.snapEps)) snapGridEps.value = config.grid.snapEps
      }

      // Guardar en historial
      saveToHistory('Estado deserializado desde JSON')

      // Recalcular canvas adaptativo según el contexto actual
      if (contextoNavegacion.value.tipo === 'planta') {
        const planta = plantaPorId.value(contextoNavegacion.value.id)
        calcularCanvasAdaptativoPlanta(planta)
      } else if (contextoNavegacion.value.tipo === 'elemento') {
        const elemento = elementoPorId.value(contextoNavegacion.value.id)
        if (elemento) {
          calcularCanvasAdaptativo(elemento)
        }
      }

      console.log('Estado deserializado exitosamente:', {
        plantas: plantas.value.length,
        elementos: elementos.value.length,
        plantaActiva: plantaActiva.value,
      })

      // Guardar en historial
      saveToHistory(
        `Canvas importado: ${elementos.value.length} elementos en ${plantas.value.length} plantas`,
      )

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
    const paddingAura = 30 / zoom.value; // Píxeles extra de tamaño para el aura
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
  };
  

  const actualizarIdsFiltrados = (ids) => {
    idsElementosFiltrados.value = ids
  }

  const setDraggableMode = (mode) => {
    this.isDraggable = mode;
  };

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
    useDragBoundsClamp,
    crearPlanta,
    plantaEnEdicion,
    etiquetas,
    etiquetasSeleccionadas,
    elementoDestacadoId,
    idsElementosFiltrados,
    elementoAura,
    isDraggable,

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
    initializeHistory,
    saveToHistory,

    // Actions con historial
    actualizarElementoConHistorial,
    actualizarPosicionConHistorial,
    seleccionarPlantaConHistorial,
    agregarPlantaConHistorial,
    eliminarPlantaConHistorial,

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
  }
})
