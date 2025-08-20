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
import { ref, computed } from 'vue'

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
        alto: 300, // cm
        ancho: 1000, // cm
        largo: 1200, // cm
      },
      pesoMaximoSoportado: 5000, // kg
    },
  ])

  const plantaActiva = ref('planta_1')

  // Estado básico para desarrollo
  const elementos = ref([])

  const elementoSeleccionado = ref(null)
  const vistaActiva = ref('XY') // XY, ZX, ZY
  const zoom = ref(1)
  const crearPlanta = ref(false);
  const panX = ref(0)
  const panY = ref(0)

  // Configuración de grilla y snap
  const gridSize = ref(50) // px entre líneas de grilla
  const snapGridEps = ref(6) // px de proximidad para aplicar snap al soltar

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
    tipo: 'planta', // 'planta' | 'elemento'
    id: 'planta_1', // ID de la planta o elemento actual
    path: [], // Array de objetos: [{ tipo: 'planta', id: 'planta_1', nombre: 'Planta Baja' }]
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

    // Si estamos en una planta, mostrar solo elementos de nivel raíz (sin padre)
    if (contextoNavegacion.value.tipo === 'planta') {
      const plantaId = contextoNavegacion.value.id
      const elementosEnEstaPlanta = elementos.value.filter((el) => el.plantaId === plantaId)
      const visibles = elementosEnEstaPlanta.filter((el) => !el.padre)

      console.log('DEBUG elementosVisibles - En planta:', {
        plantaId,
        elementosEnEstaPlanta: elementosEnEstaPlanta.length,
        elementosRaiz: visibles.length,
        elementos: visibles.map((el) => ({
          id: el.id,
          nombre: el.nombre,
          x: el.x,
          y: el.y,
          plantaId: el.plantaId,
        })),
      })
      return visibles
    }

    // Si estamos dentro de un elemento, mostrar sus hijos
    if (contextoNavegacion.value.tipo === 'elemento') {
      const elementoPadre = elementos.value.find((el) => el.id === contextoNavegacion.value.id)
      if (elementoPadre && elementoPadre.hijos) {
        const hijosCompletos = elementoPadre.hijos
          .map((hijoId) => elementos.value.find((el) => el.id === hijoId))
          .filter(Boolean)

        console.log('Elementos visibles en contenedor:', {
          contenedorId: contextoNavegacion.value.id,
          hijosVisibles: hijosCompletos.length,
          hijos: hijosCompletos,
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
    return contextoNavegacion.value.tipo === 'planta'
  })

  const estaEnElemento = computed(() => {
    return contextoNavegacion.value.tipo === 'elemento'
  })

  const elementoContenedorActual = computed(() => {
    if (contextoNavegacion.value.tipo === 'elemento') {
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
        tipo: 'planta',
        id: planta.id,
        nombre: planta.nombre,
        icono: '🏢',
      })
    }

    // Agregar elementos del path
    for (let i = 1; i < contextoNavegacion.value.path.length; i++) {
      const pathItem = contextoNavegacion.value.path[i]
      if (pathItem.tipo === 'elemento') {
        const elemento = elementoPorId.value(pathItem.id)
        if (elemento) {
          crumbs.push({
            tipo: 'elemento',
            id: elemento.id,
            nombre: elemento.nombre,
            icono: getIconoElemento(elemento.tipo),
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
  const getIconoElemento = (tipo) => {
    const iconos = {
      anaqueles: '📚',
      estantes: '📋',
      mesas: '🗄️',
      armarios: '🗃️',
      contenedores: '📦',
      cajas: '📦',
    }
    return iconos[tipo] || '📦'
  }

  // === FUNCIONES DE NAVEGACIÓN JERÁRQUICA ===
  const navegarAElemento = (elementoId) => {
    const elemento = elementoPorId.value(elementoId)
    if (!elemento) {
      console.error('Elemento no encontrado:', elementoId)
      return
    }

    // Actualizar contexto de navegación
    const nuevoPath = [...contextoNavegacion.value.path]
    nuevoPath.push({
      tipo: 'elemento',
      id: elementoId,
      nombre: elemento.nombre,
    })

    contextoNavegacion.value = {
      tipo: 'elemento',
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

    if (ultimoElemento.tipo === 'planta') {
      // Regresar a vista de planta
      contextoNavegacion.value = {
        tipo: 'planta',
        id: ultimoElemento.id,
        path: nuevoPath,
      }

      // Reset canvas a tamaño por defecto
      canvasAdaptativo.value = {
        width: 800,
        height: 600,
        escala: 1,
      }
    } else {
      // Regresar a elemento padre
      contextoNavegacion.value = {
        tipo: 'elemento',
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

  const navegarAPlanta = (plantaId) => {
    const planta = plantaPorId.value(plantaId)
    if (!planta) {
      console.error('Planta no encontrada:', plantaId)
      return
    }

    // Reset a vista de planta
    contextoNavegacion.value = {
      tipo: 'planta',
      id: plantaId,
      path: [
        {
          tipo: 'planta',
          id: plantaId,
          nombre: planta.nombre,
        },
      ],
    }

    // Actualizar planta activa
    plantaActiva.value = plantaId

    // Reset canvas a tamaño por defecto
    canvasAdaptativo.value = {
      width: 800,
      height: 600,
      escala: 1,
    }

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
    // Calcular tamaño proporcional del canvas basado en las dimensiones del elemento
    const factorEscala = 10 // Factor para hacer el canvas más grande que el elemento

    canvasAdaptativo.value = {
      width: Math.max(elemento.width * factorEscala, 400), // Mínimo 400px
      height: Math.max(elemento.height * factorEscala, 300), // Mínimo 300px
      escala: factorEscala,
    }

    console.log('Canvas adaptativo calculado:', {
      elemento: { width: elemento.width, height: elemento.height },
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
      Object.assign(elemento, propiedades)
    }
  }

  const cambiarVista = (nuevaVista) => {
    vistaActiva.value = nuevaVista
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
        tipo: 'planta',
        id: plantaId,
        path: [
          {
            tipo: 'planta',
            id: plantaId,
            nombre: planta.nombre,
          },
        ],
      }
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

    // Si estamos dentro de un elemento (no en una planta), el nuevo elemento es hijo
    if (contextoNavegacion.value.tipo === 'elemento') {
      const elementoPadre = elementos.value.find((el) => el.id === contextoNavegacion.value.id)
      if (elementoPadre) {
        // Agregar como hijo del elemento actual
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
          hijosDelPadre: elementoPadre.hijos.length,
        })
      }
    } else {
      // Si estamos en una planta, agregar normalmente
      nuevoElemento.plantaId = contextoNavegacion.value.id
      nuevoElemento.padre = null
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
        elevacion: elemento.elevacion || { zBase: 0, altura: elemento.dimensiones?.alto || elemento.alto || 0, espesor: elemento.elevacion?.espesor || 0 },
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

      // Restaurar elementos
      state.elementos.forEach((elementoData) => {
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
      vistaActiva.value = config.vistaActiva || 'XY'
      zoom.value = config.zoom || 1
      panX.value = config.panX || 0
      panY.value = config.panY || 0

      // Restaurar contexto de navegación
      if (config.contextoNavegacion) {
        contextoNavegacion.value = {
          tipo: config.contextoNavegacion.tipo || 'planta',
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

  const abrirEditor = () => {
    crearPlanta.value = true;
  }

  const cerrarEditor = () => {
    crearPlanta.value = false;
  }

  // === FIN FUNCIONES DE SERIALIZACIÓN ===

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
    elementoContenedorActual,
    breadcrumbs,
    puedeNavegar,
    contextoNavegacion,
    canvasAdaptativo,

    // Actions - Canvas
    seleccionarElemento,
    actualizarPosicion,
    actualizarElemento,
    cambiarVista,
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
    navegarAPlanta,
    calcularCanvasAdaptativo,

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
    cerrarEditor
  }
})
