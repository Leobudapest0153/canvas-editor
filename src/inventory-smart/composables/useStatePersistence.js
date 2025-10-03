/**
 * useStatePersistence.js
 *
 * Composable para gestionar la serialización y persistencia del estado del canvas.
 *
 * Responsabilidades:
 * - Serialización completa del estado (plantas, elementos, configuración, catálogos)
 * - Deserialización y restauración del estado
 * - Persistencia en localStorage
 * - Validación de estructura de datos
 * - Manejo de errores en operaciones de persistencia
 * - Gestión de catálogos dinámicos
 * - Serialización/deserialización opcional del historial de cambios
 */

import { EXPORT_FORMAT_VERSION, SERIALIZE_CONFIG } from "../utils/constants"

export const useStatePersistence = () => {
  let hasHydratedMode = false

  /**
   * Serializa el estado completo del canvas a JSON
   * @param {Object} state - Estado del store (plantas, elementos, etc.)
   * @param {Object} options - Opciones de serialización
   * @param {boolean} options.includeChangeHistory - Si incluir el historial de cambios (opcional)
   * @returns {string} JSON string con todo el estado
   */
  const serialize = (state, options = {}) => {
    const { validateBeforeSerialize = true, includeMetrics = true, saveTimestamp = false, includeChangeHistory = true } = options

    if (validateBeforeSerialize) {
      const preValidation = validateStateBeforeSerialization(state)
      if (!preValidation.valid) {
        if (preValidation.critical) {
          throw new Error(`Serialización abortada: ${preValidation.issues.join(', ')}`)
        }
      }
    }

    // Timestamp actual en ISO 8601
    const timestamp = new Date().toISOString()

    const serializedState = {
      // Información básica del canvas
      meta: {
        version: EXPORT_FORMAT_VERSION,
        timestamp: timestamp,
        app: 'inventory-smart',
        ...(includeMetrics && {
          metrics: calculateStateMetrics(state)
        })
      },

      modoEdicion: state.modoEdicion === true,

      // Estado de plantas con todas sus propiedades
      plantas: state.plantas.map((planta) => {
        // Validar datos críticos de la planta antes de serializar
        if (!planta.id || !planta.dimensiones) {
          console.warn('Planta con datos incompletos será serializada:', planta.id || 'sin ID')
        }

        return {
          id: planta.id,
          nombre: planta.nombre || 'Planta sin nombre',
          descripcion: planta.descripcion || '',
          dimensiones: {
            alto: Math.max(1, planta.dimensiones?.alto || 300),
            ancho: Math.max(1, planta.dimensiones?.ancho || 500),
            largo: Math.max(1, planta.dimensiones?.largo || 500),
          },
          poligono: Array.isArray(planta.poligono) ? planta.poligono : [],
          capacidadCargaSoportado: Math.max(0, planta.capacidadCargaSoportado || 5000),
          elementos: Array.isArray(planta.elementos) ? planta.elementos : [],
          activa: Boolean(planta.activa),
          // Nuevo: flag de planta elástica (persistir si true; fallback false)
          isInfinite: planta.isInfinite === true,

          // CRÍTICO: Código único de la planta
          codigo: planta.codigo || null,

          // Timestamps para auditoría
          createdAt: planta.createdAt || new Date().toISOString(),
          updatedAt: planta.updatedAt || new Date().toISOString(),

          propiedadesPersonalizadas: planta.propiedadesPersonalizadas || {},
        }
      }),

      // Estado de elementos
      elementos: state.elementos.map((elemento) => {
        // Validar datos críticos del elemento antes de serializar
        if (!elemento.id || !elemento.tipo || !elemento.dimensiones) {
          console.warn('Elemento con datos incompletos será serializado:', elemento.id || 'sin ID')
        }

        return {
          // Identificación básica
          id: elemento.id,
          nombre: elemento.nombre || `Elemento ${elemento.tipo || 'sin tipo'}`,
          descripcion: elemento.descripcion || '',
          tipo: elemento.tipo || 'elementos',
          plantaId: elemento.plantaId,
          etiquetas: Array.isArray(elemento.etiquetas) ? elemento.etiquetas : [],
          codigoEsl: elemento.codigoEsl || '',

          // Orientación discreta (0,90,180,270)
          orientacion: (() => {
            const v = Number(elemento.orientacion)
            if (!Number.isFinite(v)) return 0
            const n = ((v % 360) + 360) % 360
            // Snap a las orientaciones permitidas
            const allowed = [0, 90, 180, 270]
            return allowed.includes(n) ? n : 0
          })(),

          alturaRespectoAlSuelo: typeof elemento.alturaRespectoAlSuelo === 'number'
            ? elemento.alturaRespectoAlSuelo : 0,

          posicion: {
            x: typeof elemento.x === 'number' ? elemento.x : 0,
            y: typeof elemento.y === 'number' ? elemento.y : 0,
            z: typeof elemento.z === 'number' ? elemento.z : 0,
            rotation: typeof elemento.rotation === 'number' ? elemento.rotation : 0,
          },

          dimensiones: {
            ancho: Math.max(1, elemento.dimensiones?.ancho || 10),
            largo: Math.max(1, elemento.dimensiones?.largo || 10),
            alto: Math.max(1, elemento.dimensiones?.alto || 10),
          },

          color: elemento.color || elemento.colorBase || '#3b82f6',
          colorBase: elemento.colorBase || '#3b82f6',
          forma: elemento.forma || 'rectangular',
          visible: elemento.visible !== false,
          capacidadCarga: Math.max(0, elemento.capacidadCarga || 0),
          volumenMaximo: Math.max(0, elemento.volumenMaximo || 0),
          ubicacion: elemento.ubicacion || 'suelo',

          // Política de dimensiones
          dimensionLock: Boolean(elemento.dimensionLock),
          systemTypeKey: elemento.systemTypeKey || null,

          // Canvas representacion
          canvas: {
            width: Math.max(1, elemento.width || (() => {
              // Si no hay width, calcular desde dimensiones
              const dims = elemento.dimensiones || {}
              return (dims.ancho || 10) * 10 // CM_TO_PX = 10
            })()),
            height: Math.max(1, elemento.height || (() => {
              // Si no hay height, calcular según tipo de elemento
              const dims = elemento.dimensiones || {}
              const tipo = (elemento.tipo || '').toLowerCase()
              const isFloor = tipo === 'pisos'
              if (isFloor) return (dims.alto || 10) * 10 // pisos en XZ: alto
              if (tipo === 'cuartos' || tipo === 'pasillos') return (dims.largo || 10) * 10 // XY
              return (dims.alto || 10) * 10 // elementos/contenedores en XZ
            })())
          },

          // Uso real
          uso: {
            peso: Math.max(0, elemento.uso?.peso || 0),
            volumen: Math.max(0, elemento.uso?.volumen || 0)
          },

          // Jerarquía
          padre: elemento.padre || null,
          hijos: Array.isArray(elemento.hijos) ? elemento.hijos : [],

          // CRÍTICO: Código único del elemento
          codigo: elemento.codigo || null,

          // CRÍTICO: Asignación de pasillo
          pasilloId: elemento.pasilloId || null,

          // Timestamps para auditoría
          createdAt: elemento.createdAt || new Date().toISOString(),
          updatedAt: elemento.updatedAt || new Date().toISOString(),

          // Configuración de espacios/contenedores
          tiposProductos: Array.isArray(elemento.tiposProductos) ? elemento.tiposProductos : [],
          tipoZona: elemento.tipoZona || null,
          permiteFragiles: Boolean(elemento.permiteFragiles),

          // Props y metadatos del catálogo
          props: elemento.props || {},
          meta: elemento.meta || {},

          // Propiedades personalizadas
          propiedadesPersonalizadas: elemento.propiedadesPersonalizadas || {},
        }
      }),
    }

    if (includeChangeHistory && state.changeHistory) {
      try {
        const changeHistoryData = typeof state.changeHistory.serialize === 'function'
          ? state.changeHistory.serialize()
          : state.changeHistory

        if (changeHistoryData && changeHistoryData.entries) {
          serializedState.changeHistory = {
            entries: changeHistoryData.entries,
            meta: {
              totalEntries: changeHistoryData.entries.length,
              exportedAt: timestamp
            }
          }
        }
      } catch (error) {
        console.warn('Error al serializar historial de cambios:', error)
      }
    }

    // Añadir métrica de plantillas (retrocompatible)
    if (serializedState.meta?.metrics) {
      serializedState.meta.metrics.totalPlantillas = state.templates?.length || 0
      if (serializedState.changeHistory?.entries) {
        serializedState.meta.metrics.totalChangeHistory = serializedState.changeHistory.entries.length
      }
    }

    // Guardar timestamp en localStorage si se solicita
    if (saveTimestamp) {
      saveLastSerializationTimestamp(timestamp)
    }

    return JSON.stringify(serializedState, null, 2)
  }

  /**
   * Guardar timestamp de última serialización en localStorage
   * @param {string} timestamp - Timestamp ISO 8601
   */
  const saveLastSerializationTimestamp = (timestamp) => {
    localStorage.setItem('canvas_last_serialization', timestamp)
  }

  /**
   * Obtener timestamp de última serialización desde localStorage
   * @returns {string|null} - Timestamp ISO 8601 o null si no existe
   */
  const getLastSerializationTimestamp = () => {
    return localStorage.getItem('canvas_last_serialization')
  }

  /**
   * Valida el estado antes de la serialización
   * @param {Object} state - Estado a validar
   * @returns {Object} Resultado de la validación
   */
  const validateStateBeforeSerialization = (state) => {
    const result = {
      valid: true,
      issues: [],
      critical: false,
      metrics: {}
    }

    // Validar que el estado tiene la estructura básica
    if (!state || typeof state !== 'object') {
      result.issues.push('Estado inválido: no es un objeto')
      result.critical = true
      result.valid = false
      return result
    }

    if (!Array.isArray(state.plantas)) {
      result.issues.push('Estado inválido: plantas no es un array')
      result.critical = true
      result.valid = false
    }

    if (!Array.isArray(state.elementos)) {
      result.issues.push('Estado inválido: elementos no es un array')
      result.critical = true
      result.valid = false
    }

    if (result.critical) {
      return result
    }

    // Validar plantas
    if (state.plantas.length === 0) {
      result.issues.push('No hay plantas en el estado')
      result.critical = true
      result.valid = false
    }

    state.plantas.forEach((planta, index) => {
      if (!planta.id) {
        result.issues.push(`Planta ${index + 1}: falta ID`)
        result.critical = true
      }
      if (!planta.dimensiones) {
        result.issues.push(`Planta ${index + 1}: faltan dimensiones`)
        result.critical = true
      }
    })

    // Validar elementos
    const plantaIds = new Set(state.plantas.map(p => p.id))

    state.elementos.forEach((elemento, index) => {
      if (!elemento.id) {
        result.issues.push(`Elemento ${index + 1}: falta ID`)
        result.critical = true
      }
      if (!elemento.plantaId || !plantaIds.has(elemento.plantaId)) {
        result.issues.push(`Elemento ${index + 1}: plantaId inválido`)
        result.critical = true
      }
      if (!elemento.dimensiones) {
        result.issues.push(`Elemento ${index + 1}: faltan dimensiones`)
        result.critical = true
      }
    })

    result.valid = !result.critical

    return result
  }

  /**
   * Calcula métricas del estado para incluir en los metadatos
   * @param {Object} state - Estado a analizar
   * @returns {Object} Métricas calculadas
   */
  const calculateStateMetrics = (state) => {
    const metrics = {
      totalPlantas: state.plantas?.length || 0,
      totalElementos: state.elementos?.length || 0,
      elementosPorTipo: {},
      elementosConHijos: 0,
      elementosHuerfanos: 0,
      relacionesPadreHijo: 0,
      plantasConElementos: 0,
      promedioElementosPorPlanta: 0,
      totalPlantillas: state.templates?.length || 0,
    }

    // Analizar elementos
    if (Array.isArray(state.elementos)) {
      state.elementos.forEach(elemento => {
        // Contar por tipo
        const tipo = elemento.tipo || 'sin_tipo'
        metrics.elementosPorTipo[tipo] = (metrics.elementosPorTipo[tipo] || 0) + 1

        // Contar elementos con hijos
        if (elemento.hijos && elemento.hijos.length > 0) {
          metrics.elementosConHijos++
          metrics.relacionesPadreHijo += elemento.hijos.length
        }

        // Contar elementos huérfanos
        if (!elemento.padre) {
          metrics.elementosHuerfanos++
        }
      })
    }

    // Analizar plantas
    if (Array.isArray(state.plantas)) {
      state.plantas.forEach(planta => {
        if (planta.elementos && planta.elementos.length > 0) {
          metrics.plantasConElementos++
        }
      })

      if (metrics.totalPlantas > 0) {
        metrics.promedioElementosPorPlanta = Math.round(
          metrics.totalElementos / metrics.totalPlantas * 100
        ) / 100
      }
    }

    return metrics
  }

  /**
   * Deserializa un JSON y reconstruye el estado del canvas
   * @param {string} jsonString - JSON string con el estado
   * @param {Object} storeActions - Acciones del store para actualizar el estado
   * @returns {boolean} true si la deserialización fue exitosa
   */
  const deserialize = (jsonString, storeActions) => {
    try {
      const validation = validateStructure(jsonString, true)

      if (!validation.valid) {
        console.error('Validación fallida:', validation.error)
        console.error('Errores encontrados:', validation.errors)
        if (validation.warnings?.length > 0) {
          console.warn('Advertencias:', validation.warnings)
        }
        return false
      }

      if (validation.warnings?.length > 0) {
        console.warn('Advertencias durante la validación:', validation.warnings)
      }

      const state = validation.data || JSON.parse(jsonString)

      // === LIMPIEZA Y PREPARACIÓN ===
      storeActions.clearState()

      if (!hasHydratedMode && typeof storeActions?.setModoEdicion === 'function') {
        // Siempre ajustar modo de edición según el snapshot entrante
        storeActions.setModoEdicion(state.modoEdicion === true)
        hasHydratedMode = true
      }

      // === RESTAURAR PLANTAS CON VALIDACIÓN INDIVIDUAL ===
      let plantasRestauradas = 0
      state.plantas.forEach((plantaData, index) => {
        try {
          // Validar datos mínimos antes de crear la planta
          if (!plantaData.id || !plantaData.nombre || !plantaData.dimensiones) {
            console.warn(`Planta ${index + 1} omitida: datos incompletos`)
            return
          }

          // Aplicar valores por defecto seguros
          const plantaSegura = {
            id: plantaData.id,
            nombre: plantaData.nombre,
            descripcion: plantaData.descripcion || '',
            dimensiones: {
              alto: Math.max(1, plantaData.dimensiones.alto || 300), // Mínimo 1cm
              ancho: Math.max(1, plantaData.dimensiones.ancho || 500),
              largo: Math.max(1, plantaData.dimensiones.largo || 500),
            },
            poligono: Array.isArray(plantaData.poligono) ? plantaData.poligono : [],
            capacidadCargaSoportado: Math.max(0, plantaData.capacidadCargaSoportado || 5000),
            elementos: Array.isArray(plantaData.elementos) ? plantaData.elementos : [],
            activa: plantaData.activa === true,
            // Nuevo: flag de planta elástica (fallback false si no viene)
            isInfinite: plantaData.isInfinite === true,

            // CRÍTICO: Código único (se regenerará si no existe)
            codigo: plantaData.codigo || null,

            // Timestamps
            createdAt: plantaData.createdAt || new Date().toISOString(),
            updatedAt: plantaData.updatedAt || new Date().toISOString(),

            propiedadesPersonalizadas: plantaData.propiedadesPersonalizadas || {},
          }

          storeActions.addPlanta(plantaSegura)
          plantasRestauradas++
        } catch (error) {
          console.error(`Error restaurando planta ${index + 1}:`, error)
        }
      })

      if (plantasRestauradas === 0) {
        console.error('No se pudo restaurar ninguna planta válida')
        return false
      }

      // === RESTAURAR ELEMENTOS CON VALIDACIÓN INDIVIDUAL ===
      const plantaIds = new Set(state.plantas.map(p => p.id))
      let elementosRestaurados = 0
      let elementosOmitidos = 0

      state.elementos.forEach((elementoData, index) => {
        try {
          // Validaciones críticas que impiden la restauración
          if (!elementoData.id) {
            console.warn(`Elemento ${index + 1} omitido: falta ID`)
            elementosOmitidos++
            return
          }

          if (!elementoData.tipo) {
            console.warn(`Elemento ${index + 1} omitido: falta tipo`)
            elementosOmitidos++
            return
          }

          if (!elementoData.plantaId || !plantaIds.has(elementoData.plantaId)) {
            console.warn(`Elemento ${index + 1} omitido: plantaId inválido`)
            elementosOmitidos++
            return
          }

          if (!elementoData.dimensiones || !elementoData.posicion) {
            console.warn(`Elemento ${index + 1} omitido: faltan dimensiones o posición`)
            elementosOmitidos++
            return
          }

          // Crear elemento con valores seguros y por defecto
          const elementoSeguro = {
            id: elementoData.id,
            nombre: elementoData.nombre || `Elemento ${elementoData.tipo}`,
            descripcion: elementoData.descripcion || '',
            tipo: elementoData.tipo,
            plantaId: elementoData.plantaId,
            etiquetas: Array.isArray(elementoData.etiquetas) ? elementoData.etiquetas : [],
            codigoEsl: elementoData.codigoEsl || '',

            // Orientación discreta con fallback
            orientacion: (() => {
              const v = Number(elementoData.orientacion)
              if (!Number.isFinite(v)) return 0
              const n = ((v % 360) + 360) % 360
              const allowed = [0, 90, 180, 270]
              return allowed.includes(n) ? n : 0
            })(),

            // Posición con validación
            x: typeof elementoData.posicion.x === 'number' ? elementoData.posicion.x : 0,
            y: typeof elementoData.posicion.y === 'number' ? elementoData.posicion.y : 0,
            z: typeof elementoData.posicion.z === 'number' ? elementoData.posicion.z : 0,
            rotation: typeof elementoData.posicion.rotation === 'number' ? elementoData.posicion.rotation : 0,

            // Dimensiones con validación y mínimos
            dimensiones: {
              ancho: Math.max(1, elementoData.dimensiones.ancho || 10),
              largo: Math.max(1, elementoData.dimensiones.largo || 10),
              alto: Math.max(1, elementoData.dimensiones.alto || 10),
            },

            // Propiedades visuales con defaults
            colorBase: elementoData.colorBase || elementoData.color || '#3b82f6',
            color: elementoData.color || elementoData.colorBase || '#3b82f6',
            forma: elementoData.forma || 'rectangular',
            visible: elementoData.visible !== false,

            // Propiedades físicas
            capacidadCarga: Math.max(0, elementoData.capacidadCarga || 0),
            volumenMaximo: Math.max(0, elementoData.volumenMaximo || 0),
            ubicacion: elementoData.ubicacion || 'suelo',
            alturaRespectoAlSuelo: typeof elementoData.alturaRespectoAlSuelo === 'number'
              ? elementoData.alturaRespectoAlSuelo : 0,

            // Política de dimensiones
            dimensionLock: elementoData.dimensionLock === true,
            systemTypeKey: elementoData.systemTypeKey || null,

            // Canvas representación con validación
            width: (elementoData.canvas?.width && elementoData.canvas.width > 0)
              ? elementoData.canvas.width
              : elementoData.dimensiones.ancho * 10, // Fallback usando CM_TO_PX
            height: (elementoData.canvas?.height && elementoData.canvas.height > 0)
              ? elementoData.canvas.height
              : (() => {
                // Calcular height según el tipo de elemento
                const tipo = (elementoData.tipo || '').toLowerCase()
                const dims = elementoData.dimensiones
                const isFloor = tipo === 'pisos'
                if (isFloor) return dims.alto * 10 // pisos en XZ: alto
                if (tipo === 'cuartos' || tipo === 'pasillos') return dims.largo * 10 // XY
                return dims.alto * 10 // elementos/contenedores en XZ
              })(),

            // Uso real
            uso: {
              peso: Math.max(0, elementoData.uso?.peso || 0),
              volumen: Math.max(0, elementoData.uso?.volumen || 0)
            },

            // Jerarquía (se validará la consistencia después)
            padre: elementoData.padre || null,
            hijos: Array.isArray(elementoData.hijos) ? elementoData.hijos : [],

            // CRÍTICO: Código único (se regenerará si no existe)
            codigo: elementoData.codigo || null,

            // CRÍTICO: Asignación de pasillo (se recalculará después)
            pasilloId: elementoData.pasilloId || null,

            // Timestamps
            createdAt: elementoData.createdAt || new Date().toISOString(),
            updatedAt: elementoData.updatedAt || new Date().toISOString(),

            // Configuración de espacios/contenedores
            tiposProductos: Array.isArray(elementoData.tiposProductos) 
              ? elementoData.tiposProductos 
              : [],
            tipoZona: elementoData.tipoZona || null,
            permiteFragiles: Boolean(elementoData.permiteFragiles),

            // Props y metadatos del catálogo
            props: elementoData.props || {},
            meta: elementoData.meta || {},

            propiedadesPersonalizadas: elementoData.propiedadesPersonalizadas || {},
          }

          storeActions.addElemento(elementoSeguro)
          elementosRestaurados++
        } catch (error) {
          console.error(`Error restaurando elemento ${index + 1}:`, error)
          elementosOmitidos++
        }
      })

      let changeHistoryRestored = false
      if (state.changeHistory && storeActions.setChangeHistory) {
        try {
          if (state.changeHistory.entries && Array.isArray(state.changeHistory.entries)) {
            storeActions.setChangeHistory(state.changeHistory.entries)
            changeHistoryRestored = true
          }
        } catch (error) {
          console.warn('Error al restaurar historial de cambios:', error)
        }
      }

      const primeraPlanta = state.plantas[0]
      storeActions.setInitialNavigation(primeraPlanta.id, primeraPlanta.nombre)

      if (elementosOmitidos > 0) {
        console.warn(`⚠️ ${elementosOmitidos} elementos fueron omitidos debido a datos inválidos`)
      }

      return true
    } catch (error) {
      console.error('Error al deserializar JSON:', error)
      return false
    }
  }

  /**
   * Persiste el estado en localStorage
   * @param {string} serializedData - Datos serializados
   * @param {string} key - Clave de almacenamiento (opcional)
   * @returns {boolean} true si la persistencia fue exitosa
   */
  const persist = (serializedData, key = SERIALIZE_CONFIG.STORAGE_KEY) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, serializedData)
        return true
      }
      console.warn('localStorage no disponible')
      return false
    } catch (e) {
      console.warn('Error persisting state', e)
      return false
    }
  }

  /**
   * Carga el estado desde localStorage
   * @param {string} key - Clave de almacenamiento (opcional)
   * @returns {string|null} Datos serializados o null si no existen
   */
  const load = (key = SERIALIZE_CONFIG.STORAGE_KEY) => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key)
      }
      return null
    } catch (e) {
      console.warn('Error loading state', e)
      return null
    }
  }

  /**
   * Elimina el estado persistido
   * @param {string} key - Clave de almacenamiento (opcional)
   * @returns {boolean} true si la eliminación fue exitosa
   */
  const clear = (key = SERIALIZE_CONFIG.STORAGE_KEY) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key)
        return true
      }
      return false
    } catch (e) {
      console.warn('Error clearing state', e)
      return false
    }
  }

  /**
   * Valida si un JSON tiene la estructura correcta para deserializar
   * @param {string} jsonString - JSON string a validar
   * @param {boolean} strict - Si true, aplica validaciones estrictas (opcional)
   * @returns {object} Resultado de la validación con detalles
   */
  const validateStructure = (jsonString, strict = false) => {
    try {
      const data = JSON.parse(jsonString)
      // === VALIDACIONES BÁSICAS REQUERIDAS ===
      const validationResult = {
        valid: true,
        errors: [],
        warnings: [],
        info: {},
        data: data
      }

      // 1. Validar que existen las propiedades principales
      if (!data || typeof data !== 'object') {
        return {
          valid: false,
          error: 'El archivo JSON debe ser un objeto válido',
          errors: ['Estructura JSON inválida'],
          warnings: [],
          info: {}
        }
      }

      if (!data.plantas) {
        validationResult.errors.push('Falta la propiedad "plantas"')
      }

      if (!data.elementos) {
        validationResult.errors.push('Falta la propiedad "elementos"')
      }

      if (validationResult.errors.length > 0) {
        return {
          valid: false,
          error: 'Estructura básica inválida: ' + validationResult.errors.join(', '),
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          info: validationResult.info
        }
      }

      // 2. Validar tipos de datos
      if (!Array.isArray(data.plantas)) {
        validationResult.errors.push('"plantas" debe ser un array')
      }

      if (!Array.isArray(data.elementos)) {
        validationResult.errors.push('"elementos" debe ser un array')
      }

      // 3. Validar que hay al menos una planta
      if (Array.isArray(data.plantas) && data.plantas.length === 0) {
        validationResult.errors.push('Debe existir al menos una planta')
      }

      // === VALIDACIONES DE PLANTAS ===
      if (Array.isArray(data.plantas)) {
        data.plantas.forEach((planta, index) => {
          const context = `Planta ${index + 1}`

          // Campos obligatorios
          if (!planta.id) {
            validationResult.errors.push(`${context}: falta ID`)
          }
          if (!planta.nombre) {
            validationResult.errors.push(`${context}: falta nombre`)
          }
          if (!planta.dimensiones) {
            validationResult.errors.push(`${context}: faltan dimensiones`)
          } else {
            // Validar dimensiones de planta
            const dims = planta.dimensiones
            if (typeof dims.ancho !== 'number' || dims.ancho <= 0) {
              validationResult.errors.push(`${context}: dimensión ancho inválida`)
            }
            if (typeof dims.largo !== 'number' || dims.largo <= 0) {
              validationResult.errors.push(`${context}: dimensión largo inválida`)
            }
            if (typeof dims.alto !== 'number' || dims.alto <= 0) {
              validationResult.errors.push(`${context}: dimensión alto inválida`)
            }
          }

          // Campos opcionales con validación de tipo
          if (planta.capacidadCargaSoportado && typeof planta.capacidadCargaSoportado !== 'number') {
            validationResult.warnings.push(`${context}: capacidadCargaSoportado debe ser un número`)
          }
          if (planta.poligono && !Array.isArray(planta.poligono)) {
            validationResult.warnings.push(`${context}: polígono debe ser un array`)
          }
          if (planta.elementos && !Array.isArray(planta.elementos)) {
            validationResult.warnings.push(`${context}: elementos debe ser un array`)
          }
          // Nuevo: validar tipo del flag elástico si viene
          if (Object.prototype.hasOwnProperty.call(planta, 'isInfinite') && typeof planta.isInfinite !== 'boolean') {
            validationResult.warnings.push(`${context}: isInfinite debe ser boolean`)
          }
        })
      }

      // === VALIDACIONES DE ELEMENTOS ===
      if (Array.isArray(data.elementos)) {
        const plantaIds = new Set(data.plantas?.map(p => p.id) || [])

        data.elementos.forEach((elemento, index) => {
          const context = `Elemento ${index + 1}`

          // Campos obligatorios
          if (!elemento.id) {
            validationResult.errors.push(`${context}: falta ID`)
          }
          if (!elemento.tipo) {
            validationResult.errors.push(`${context}: falta tipo`)
          }
          if (!elemento.plantaId) {
            validationResult.errors.push(`${context}: falta plantaId`)
          } else if (!plantaIds.has(elemento.plantaId)) {
            validationResult.errors.push(`${context}: plantaId "${elemento.plantaId}" no existe`)
          }

          // Validar dimensiones de elemento
          if (!elemento.dimensiones) {
            validationResult.errors.push(`${context}: faltan dimensiones`)
          } else {
            const dims = elemento.dimensiones
            if (typeof dims.ancho !== 'number' || dims.ancho <= 0) {
              validationResult.errors.push(`${context}: dimensión ancho inválida`)
            }
            if (typeof dims.largo !== 'number' || dims.largo <= 0) {
              validationResult.errors.push(`${context}: dimensión largo inválida`)
            }
            if (typeof dims.alto !== 'number' || dims.alto <= 0) {
              validationResult.errors.push(`${context}: dimensión alto inválida`)
            }
          }

          // Validar posición
          if (!elemento.posicion) {
            validationResult.errors.push(`${context}: falta posición`)
          } else {
            const pos = elemento.posicion
            if (typeof pos.x !== 'number') {
              validationResult.errors.push(`${context}: posición X inválida`)
            }
            if (typeof pos.y !== 'number') {
              validationResult.errors.push(`${context}: posición Y inválida`)
            }
          }

          // Validar canvas (representación visual)
          if (!elemento.canvas) {
            validationResult.warnings.push(`${context}: falta información de canvas`)
          } else {
            if (typeof elemento.canvas.width !== 'number' || elemento.canvas.width <= 0) {
              validationResult.warnings.push(`${context}: width de canvas inválido`)
            }
            if (typeof elemento.canvas.height !== 'number' || elemento.canvas.height <= 0) {
              validationResult.warnings.push(`${context}: height de canvas inválido`)
            }
          }

          // Validaciones estrictas (opcionales)
          if (strict) {
            if (!elemento.nombre) {
              validationResult.warnings.push(`${context}: se recomienda tener nombre`)
            }
            if (elemento.tipo !== 'plantas' && !elemento.ubicacion) {
              validationResult.warnings.push(`${context}: estructuras/espacios deben tener ubicación`)
            }
          }

          // Validar jerarquía (padre-hijo)
          if (elemento.padre && !data.elementos.find(e => e.id === elemento.padre)) {
            validationResult.errors.push(`${context}: padre "${elemento.padre}" no existe`)
          }
          if (elemento.hijos && !Array.isArray(elemento.hijos)) {
            validationResult.warnings.push(`${context}: hijos debe ser un array`)
          }
        })
      }

      // === VALIDACIONES DE INTEGRIDAD REFERENCIAL ===
      if (Array.isArray(data.elementos) && Array.isArray(data.plantas)) {
        // Verificar que todos los elementos tienen una planta válida
        const elementosSinPlanta = data.elementos.filter(el =>
          !data.plantas.find(p => p.id === el.plantaId)
        )
        if (elementosSinPlanta.length > 0) {
          validationResult.errors.push(
            `${elementosSinPlanta.length} elementos tienen plantaId inválido`
          )
        }

        // Verificar relaciones padre-hijo
        const elementosMap = new Map(data.elementos.map(el => [el.id, el]))
        data.elementos.forEach((elemento, index) => {
          if (elemento.hijos && Array.isArray(elemento.hijos)) {
            elemento.hijos.forEach(hijoId => {
              const hijo = elementosMap.get(hijoId)
              if (!hijo) {
                validationResult.errors.push(
                  `Elemento ${index + 1}: hijo "${hijoId}" no existe`
                )
              } else if (hijo.padre !== elemento.id) {
                validationResult.warnings.push(
                  `Inconsistencia: elemento "${hijoId}" está en hijos pero su padre no coincide`
                )
              }
            })
          }
        })
      }

      if (data.changeHistory) {
        if (typeof data.changeHistory !== 'object') {
          validationResult.warnings.push('changeHistory debe ser un objeto')
        } else {
          if (!Array.isArray(data.changeHistory.entries)) {
            validationResult.warnings.push('changeHistory.entries debe ser un array')
          } else {
            // Validar estructura básica de entradas del historial
            data.changeHistory.entries.forEach((entry, index) => {
              if (!entry || typeof entry !== 'object') {
                validationResult.warnings.push(`Entrada de historial ${index + 1}: estructura inválida`)
              } else {
                if (!entry.id) {
                  validationResult.warnings.push(`Entrada de historial ${index + 1}: falta ID`)
                }
                if (!entry.timestamp) {
                  validationResult.warnings.push(`Entrada de historial ${index + 1}: falta timestamp`)
                }
                if (!entry.changes || !Array.isArray(entry.changes)) {
                  validationResult.warnings.push(`Entrada de historial ${index + 1}: changes debe ser un array`)
                }
              }
            })
          }
        }
      }

      validationResult.info = {
        plantas: data.plantas?.length || 0,
        elementos: data.elementos?.length || 0,
        version: data.meta?.version || 'desconocida',
        timestamp: data.meta?.timestamp || null,
        app: data.meta?.app || 'desconocida',
        elementosPorTipo: {},
        elementosConHijos: 0,
        elementosHuerfanos: 0,
        changeHistory: data.changeHistory ? {
          hasChangeHistory: true,
          entries: data.changeHistory.entries?.length || 0,
          exportedAt: data.changeHistory.meta?.exportedAt || null
        } : {
          hasChangeHistory: false,
          entries: 0
        }
      }

      // Estadísticas de elementos
      if (Array.isArray(data.elementos)) {
        data.elementos.forEach(elemento => {
          // Contar por tipo
          const tipo = elemento.tipo || 'sin_tipo'
          validationResult.info.elementosPorTipo[tipo] =
            (validationResult.info.elementosPorTipo[tipo] || 0) + 1

          // Contar elementos con hijos
          if (elemento.hijos && elemento.hijos.length > 0) {
            validationResult.info.elementosConHijos++
          }

          // Contar elementos huérfanos (sin padre)
          if (!elemento.padre) {
            validationResult.info.elementosHuerfanos++
          }
        })
      }

      // Determinar si es válido
      validationResult.valid = validationResult.errors.length === 0

      if (!validationResult.valid) {
        return {
          valid: false,
          error: `Estructura inválida: ${validationResult.errors.length} errores encontrados`,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          info: validationResult.info
        }
      }

      return {
        valid: true,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        info: validationResult.info,
        plantas: validationResult.info.plantas,
        elementos: validationResult.info.elementos,
        version: validationResult.info.version,
        timestamp: validationResult.info.timestamp
      }

    } catch (error) {
      return {
        valid: false,
        error: `Error al parsear JSON: ${error.message}`,
        errors: [`Error de sintaxis JSON: ${error.message}`],
        warnings: [],
        info: {}
      }
    }
  }

  /**
   * Compara dos estados serializados para detectar cambios
   * @param {string} state1 - Primer estado serializado
   * @param {string} state2 - Segundo estado serializado
   * @returns {boolean} true si los estados son diferentes
   */
  const hasStateChanged = (state1, state2) => {
    try {
      const data1 = JSON.parse(state1)
      const data2 = JSON.parse(state2)

      // Comparar elementos y plantas (sin metadatos de timestamp)
      const normalize = (data) => ({
        plantas: data.plantas || [],
        elementos: data.elementos || []
      })

      return JSON.stringify(normalize(data1)) !== JSON.stringify(normalize(data2))
    } catch (error) {
      console.warn('Error comparing states:', error)
      return true // Asumir cambio si no se puede comparar
    }
  }

  /**
   * Genera un reporte detallado de validación para debugging
   * @param {string} jsonString - JSON string a analizar
   * @returns {Object} Reporte completo de validación
   */
  const generateValidationReport = (jsonString) => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        valid: false,
        totalIssues: 0,
        criticalIssues: 0,
        warnings: 0
      },
      details: {
        structure: {},
        plantas: {},
        elementos: {},
        integrity: {}
      },
      recommendations: []
    }

    try {
      const validation = validateStructure(jsonString, true)

      report.summary.valid = validation.valid
      report.summary.totalIssues = (validation.errors?.length || 0) + (validation.warnings?.length || 0)
      report.summary.criticalIssues = validation.errors?.length || 0
      report.summary.warnings = validation.warnings?.length || 0

      // Detalles de estructura
      report.details.structure = {
        hasValidJson: true,
        hasBasicStructure: !!validation.data,
        version: validation.info?.version || 'desconocida',
        app: validation.info?.app || 'desconocida'
      }

      // Detalles de plantas
      if (validation.info) {
        report.details.plantas = {
          count: validation.info.plantas || 0,
          issues: validation.errors?.filter(e => e.includes('Planta')) || [],
          warnings: validation.warnings?.filter(w => w.includes('Planta')) || []
        }

        // Detalles de elementos
        report.details.elementos = {
          count: validation.info.elementos || 0,
          byType: validation.info.elementosPorTipo || {},
          withChildren: validation.info.elementosConHijos || 0,
          orphans: validation.info.elementosHuerfanos || 0,
          issues: validation.errors?.filter(e => e.includes('Elemento')) || [],
          warnings: validation.warnings?.filter(w => w.includes('Elemento')) || []
        }

        // Detalles de integridad
        report.details.integrity = {
          hierarchyIssues: validation.errors?.filter(e => e.includes('padre') || e.includes('hijo')) || [],
          referenceIssues: validation.errors?.filter(e => e.includes('plantaId')) || []
        }
      }

      // Generar recomendaciones
      if (report.summary.criticalIssues > 0) {
        report.recommendations.push('❌ Hay errores críticos que impiden la importación')
        report.recommendations.push('🔧 Revisar y corregir los errores listados antes de intentar importar')
      }

      if (report.summary.warnings > 0) {
        report.recommendations.push('⚠️ Se encontraron advertencias que podrían afectar la funcionalidad')
        report.recommendations.push('🔍 Revisar las advertencias para optimizar los datos')
      }

      if (report.details.elementos.count === 0) {
        report.recommendations.push('📦 No hay elementos en el archivo - considera agregar contenido')
      }

      if (report.details.plantas.count > 1) {
        report.recommendations.push('🏢 Archivo con múltiples plantas - verificar configuración')
      }

      if (report.summary.valid) {
        report.recommendations.push('✅ El archivo es válido y puede ser importado')
      }

    } catch (error) {
      report.summary.valid = false
      report.summary.criticalIssues = 1
      report.details.structure.hasValidJson = false
      report.details.structure.parseError = error.message
      report.recommendations.push('❌ Error de sintaxis JSON - archivo corrupto o inválido')
    }

    return report
  }

  return {
    // Funciones principales
    serialize,
    deserialize,
    persist,
    load,
    clear,

    // Timestamp
    getLastSerializationTimestamp,

    // Utilidades de validación
    validateStructure,
    hasStateChanged,
    generateValidationReport,

    // Utilidades internas (para testing o debugging)
    validateStateBeforeSerialization,
    calculateStateMetrics,
  }
}
