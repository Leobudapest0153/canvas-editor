import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useToast } from '@/inventory-smart/composables/useToast'
import { detectConflictsFor } from '@/inventory-smart/utils/collision'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'

/**
 * Composable para validar dimensiones físicas de elementos
 * Implementa validación estricta anti-colisión y anti-desbordamiento
 */
export function useDimensionValidation() {
  const canvasStore = useCanvasStore()

  /**
   * Valida si las nuevas dimensiones de un elemento pueden aplicarse
   * @param {string} elementoId - ID del elemento a redimensionar
   * @param {Object} nuevasDimensiones - Nuevas dimensiones en cm
   * @param {number} nuevasDimensiones.ancho - Nuevo ancho en cm
   * @param {number} nuevasDimensiones.largo - Nuevo largo en cm (opcional)
   * @param {number} nuevasDimensiones.alto - Nuevo alto en cm (opcional)
   * @returns {Object} Resultado de la validación
   */
  function validarDimensiones(elementoId, nuevasDimensiones, opciones = {}) {
    const toast = useToast()
    let toastMostrado = false // Control para evitar múltiples toasts
    const silencioso = opciones.silencioso || false // Opción para validación silenciosa

    const elemento = canvasStore.elementoPorId(elementoId)
    if (!elemento) {
      return {
        valida: false,
        razon: 'Elemento no encontrado',
        accion: 'error'
      }
    }

    const dimensionesActuales = elemento.dimensiones || {}

    // Fusionar dimensiones actuales con las nuevas
    const dimensionesFinal = {
      ancho: nuevasDimensiones.ancho ?? dimensionesActuales.ancho ?? 50,
      largo: nuevasDimensiones.largo ?? dimensionesActuales.largo ?? 50,
      alto: nuevasDimensiones.alto ?? dimensionesActuales.alto ?? 100
    }

    // Obtener dimensiones del área total (planta)
    const areaTotal = obtenerDimensionesArea(elemento)
    if (!areaTotal) {
      return {
        valida: false,
        razon: 'No se pudo obtener las dimensiones del área contenedora',
        accion: 'error'
      }
    }

    const vista = areaTotal.vista || 'XY'
    const esVistaFrontal = vista === 'XZ'

    console.log(`🔍 VALIDACIÓN DE DIMENSIONES - INICIO EN VISTA ${vista}:`, {
      elementoId: elementoId,
      vista: vista,
      tipoVista: esVistaFrontal ? 'Frontal (ancho × alto)' : 'Planta (ancho × largo)',
      dimensionesActuales: elemento ? { ancho: elemento.ancho, largo: elemento.largo, alto: elemento.alto } : 'no encontrado',
      dimensionesNuevas: nuevasDimensiones,
      dimensionesFinal: dimensionesFinal,
      areaTotal: esVistaFrontal ?
        { ancho: areaTotal.ancho / CM_TO_PX, alto: areaTotal.largo / CM_TO_PX } :
        { ancho: areaTotal.ancho / CM_TO_PX, largo: areaTotal.largo / CM_TO_PX },
      posicionActual: { x: elemento.x / CM_TO_PX, y: elemento.y / CM_TO_PX },
      dimensionesActualesPx: { width: elemento.width / CM_TO_PX, height: elemento.height / CM_TO_PX },
      contenedorInfo: areaTotal.contenedorId ? `Contenedor: ${areaTotal.contenedorId}` :
                     areaTotal.plantaId ? `Planta: ${areaTotal.plantaId}` : 'Área por defecto'
    })

    // PASO 1: Crear elemento temporal con las nuevas dimensiones
    // En vista frontal XZ: width=ancho, height=alto
    // En vista planta XY: width=ancho, height=largo
    const widthPx = dimensionesFinal.ancho * CM_TO_PX
    const heightPx = esVistaFrontal ?
      (dimensionesFinal.alto * CM_TO_PX) :
      (dimensionesFinal.largo * CM_TO_PX)

    let elementoTemporal = {
      ...elemento,
      width: widthPx,
      height: heightPx,
      dimensiones: dimensionesFinal
    }

    console.log(`🔍 ELEMENTO TEMPORAL CREADO EN VISTA ${vista}:`, {
      id: elementoTemporal.id,
      vista: vista,
      posicionOriginal: { x: elementoTemporal.x / CM_TO_PX, y: elementoTemporal.y / CM_TO_PX },
      dimensionesOriginales: esVistaFrontal ?
        { ancho: elemento.width / CM_TO_PX, alto: elemento.height / CM_TO_PX } :
        { ancho: elemento.width / CM_TO_PX, largo: elemento.height / CM_TO_PX },
      dimensionesNuevas: esVistaFrontal ?
        { ancho: elementoTemporal.width / CM_TO_PX, alto: elementoTemporal.height / CM_TO_PX } :
        { ancho: elementoTemporal.width / CM_TO_PX, largo: elementoTemporal.height / CM_TO_PX }
    })

    // PASO 2: Verificar validez de dimensiones en la posición actual
    const posXActual = elementoTemporal.x / CM_TO_PX
    const posYActual = elementoTemporal.y / CM_TO_PX

    // En vista frontal XZ: Y representa alto, en vista planta XY: Y representa largo
    const dimension2Final = esVistaFrontal ? dimensionesFinal.alto : dimensionesFinal.largo
    const areaAnchoCm = areaTotal.ancho / CM_TO_PX
    const areaDimension2Cm = areaTotal.largo / CM_TO_PX // largo en XY, alto en XZ

    console.log(`🔍 VERIFICANDO VALIDEZ EN POSICIÓN ACTUAL EN VISTA ${vista}:`, {
      posicionActual: { x: posXActual, y: posYActual },
      dimensionesDeseadas: esVistaFrontal ?
        { ancho: dimensionesFinal.ancho, alto: dimension2Final } :
        { ancho: dimensionesFinal.ancho, largo: dimension2Final },
      areaTotal: esVistaFrontal ?
        { ancho: areaAnchoCm, alto: areaDimension2Cm } :
        { ancho: areaAnchoCm, largo: areaDimension2Cm },
      seSaleEnX: posXActual + dimensionesFinal.ancho > areaAnchoCm,
      seSaleEnDimension2: posYActual + dimension2Final > areaDimension2Cm,
      posicionFinalX: posXActual + dimensionesFinal.ancho,
      posicionFinalDimension2: posYActual + dimension2Final,
      vista: vista
    })

    // Verificar si se sale del área
    const seSaleDelArea = (posXActual + dimensionesFinal.ancho > areaAnchoCm || posYActual + dimension2Final > areaDimension2Cm)

    if (seSaleDelArea) {
      console.log('❌ ELEMENTO SE SALE DEL ÁREA PERMITIDA')

      if (!toastMostrado && !silencioso) {
        const excesosTexto = []
        if (posXActual + dimensionesFinal.ancho > areaAnchoCm) {
          const excesoAncho = (posXActual + dimensionesFinal.ancho) - areaAnchoCm
          excesosTexto.push(`${excesoAncho.toFixed(1)}cm en ancho`)
        }
        if (posYActual + dimension2Final > areaDimension2Cm) {
          const excesoDimension2 = (posYActual + dimension2Final) - areaDimension2Cm
          const nombreDimension2 = esVistaFrontal ? 'alto' : 'largo'
          excesosTexto.push(`${excesoDimension2.toFixed(1)}cm en ${nombreDimension2}`)
        }

        toast.showError(`Las nuevas dimensiones se salen del área por: ${excesosTexto.join(' y ')}. Reduce el tamaño del elemento.`)
        toastMostrado = true
      }

      return {
        valida: false,
        razon: 'Las nuevas dimensiones exceden el área disponible en la posición actual',
        accion: 'error'
      }
    }

    // Verificar colisiones en posición actual
    const elementosExistentes = canvasStore.elementosVisibles.filter(el => el.id !== elementoId)
    const hayColisiones = verificarColisionesEnPosicion(elementoTemporal, elementosExistentes)

    console.log('🔍 ANÁLISIS INICIAL:', {
      seSaleDelArea,
      hayColisiones: hayColisiones
    })

    if (hayColisiones) {
      console.log('❌ ELEMENTO TIENE COLISIONES 3D EN POSICIÓN ACTUAL')

      if (!toastMostrado && !silencioso) {
        toast.showError('Las nuevas dimensiones generan colisiones con otros elementos. Reduce el tamaño o mueve el elemento.')
        toastMostrado = true
      }

      return {
        valida: false,
        razon: 'Las nuevas dimensiones generan colisiones con elementos existentes',
        accion: 'error'
      }
    }

    console.log('✅ ELEMENTO CABE EN POSICIÓN ACTUAL - CONTINUANDO VALIDACIONES')

    // PASO 3: VALIDACIÓN FINAL - Verificar que todo esté correcto
    console.log('🚨 VALIDACIÓN FINAL - VERIFICANDO LÍMITES Y COLISIONES')
    console.log('🔍 ELEMENTO FINAL ANTES DE VALIDACIÓN:', {
      id: elementoTemporal.id,
      posicion: { x: elementoTemporal.x / CM_TO_PX, y: elementoTemporal.y / CM_TO_PX },
      dimensiones: { ancho: elementoTemporal.width / CM_TO_PX, largo: elementoTemporal.height / CM_TO_PX }
    })

    // VALIDACIÓN 1: Verificar límites del área PRIMERO
    const dentroDelArea = verificarLimitesArea(elementoTemporal, areaTotal)
    console.log('🔍 RESULTADO VERIFICACIÓN DE LÍMITES:', dentroDelArea)

    if (!dentroDelArea.cabe) {
      console.log('❌ FUERA DEL ÁREA - RECHAZANDO OPERACIÓN:', dentroDelArea.razon)
      return {
        valida: false,
        razon: `El elemento se sale del área permitida: ${dentroDelArea.razon}`,
        accion: 'rechazar',
        sugerencias: dentroDelArea.sugerencias || ['Reducir las dimensiones del elemento']
      }
    }

    // VALIDACIÓN 2: Calcular espacio disponible real considerando elementos existentes
    const elementosParaColision = canvasStore.elementosVisibles.filter(el => el.id !== elementoId)
    console.log('🔍 ELEMENTOS PARA VERIFICAR COLISIÓN:', elementosParaColision.map(el => ({
      id: el.id,
      posicion: { x: (el.x || 0) / CM_TO_PX, y: (el.y || 0) / CM_TO_PX },
      dimensiones: { ancho: (el.width || 0) / CM_TO_PX, largo: (el.height || 0) / CM_TO_PX },
      posicionFinal: {
        x: ((el.x || 0) + (el.width || 0)) / CM_TO_PX,
        y: ((el.y || 0) + (el.height || 0)) / CM_TO_PX
      }
    })))

    // Verificar si hay espacio real disponible
    const espacioDisponible = calcularEspacioRealDisponible(elementoTemporal, elementosParaColision, areaTotal)
    console.log('🔍 ESPACIO REAL DISPONIBLE:', espacioDisponible)

    if (!espacioDisponible.cabe) {
      console.log('❌ NO HAY ESPACIO SUFICIENTE - RECHAZANDO OPERACIÓN:', espacioDisponible.razon)
      return {
        valida: false,
        razon: espacioDisponible.razon,
        accion: 'rechazar',
        sugerencias: espacioDisponible.sugerencias || ['Reducir las dimensiones del elemento']
      }
    }

    // VALIDACIÓN 3: Verificar colisiones reales (solapamiento)
    const conflictosFinales = detectConflictsFor(elementoTemporal, elementosParaColision)
    console.log('🔍 RESULTADO DETECCIÓN DE CONFLICTOS:', {
      totalConflictos: conflictosFinales.length,
      conflictos: conflictosFinales
    })

    // Filtrar solo conflictos reales de solapamiento (no adyacencia)
    const conflictosReales = conflictosFinales.filter(conflicto => {
      // Un conflicto real es cuando hay solapamiento significativo
      const margenTolerancia = 5 // 5px de tolerancia (0.5cm)
      return conflicto.overlap && (
        Math.abs(conflicto.overlap.x) > margenTolerancia ||
        Math.abs(conflicto.overlap.y) > margenTolerancia
      )
    })

    console.log('🔍 CONFLICTOS REALES (DESPUÉS DE FILTRO):', {
      totalConflictosReales: conflictosReales.length,
      conflictosReales: conflictosReales
    })

    if (conflictosReales.length > 0) {
      console.log('❌ COLISIÓN REAL DETECTADA - RECHAZANDO OPERACIÓN:', conflictosReales)
      return {
        valida: false,
        razon: `El elemento se solaparía con ${conflictosReales.length} elemento(s) existente(s). No se permite el solapamiento.`,
        accion: 'rechazar',
        sugerencias: ['Reducir las dimensiones para evitar solapamiento', 'Mover otros elementos para hacer espacio']
      }
    }

    console.log('✅ VALIDACIÓN CRÍTICA EXITOSA - SIN COLISIONES NI DESBORDAMIENTO')

    // PASO 4: NUEVAS VALIDACIONES ESPECÍFICAS

    // VALIDACIÓN 4: Verificar que las nuevas dimensiones contengan a los elementos hijos (3D)
    const validacionHijos = validarContencionHijos(elementoTemporal);
    if (!validacionHijos.valida) {
      console.log('❌ VALIDACIÓN DE HIJOS FALLIDA:', validacionHijos.razon);
      return {
        valida: false,
        razon: validacionHijos.razon,
        accion: 'rechazar',
        sugerencias: validacionHijos.sugerencias || ['Aumentar las dimensiones para contener a todos los elementos hijos']
      };
    }

    // VALIDACIÓN 5: Verificar que el elemento quepa dentro de su contenedor padre (3D)
    const validacionPadre = validarContencionEnPadre(elementoTemporal);
    if (!validacionPadre.valida) {
      console.log('❌ VALIDACIÓN DE CONTENCIÓN EN PADRE FALLIDA:', validacionPadre.razon);
      return {
        valida: false,
        razon: validacionPadre.razon,
        accion: 'rechazar',
        sugerencias: validacionPadre.sugerencias || ['Reducir las dimensiones para caber dentro del contenedor padre']
      };
    }

    // VALIDACIÓN 6: Verificar que el nuevo volumen no sea menor al volumen usado
    const validacionVolumen = validarVolumenMinimo(elementoTemporal);
    if (!validacionVolumen.valida) {
      console.log('❌ VALIDACIÓN DE VOLUMEN FALLIDA:', validacionVolumen.razon);
      return {
        valida: false,
        razon: validacionVolumen.razon,
        accion: 'rechazar',
        sugerencias: validacionVolumen.sugerencias || ['Aumentar las dimensiones para mantener el volumen requerido']
      };
    }

    console.log('✅ TODAS LAS VALIDACIONES EXITOSAS');

    // PASO 4: Si llegamos aquí, las dimensiones son válidas

    // Mostrar toast de éxito si no se ha mostrado otro toast
    if (!toastMostrado && !silencioso) {
      toast.showSuccess('Dimensiones aplicadas correctamente.')
    }

    return {
      valida: true,
      razon: 'Dimensiones aplicadas correctamente',
      accion: 'aplicar',
      elementoFinal: elementoTemporal
    }
  }

  /**
   * Obtiene las dimensiones del área contenedora según la vista actual
   * - Plantas: Vista XY (ancho × largo)
   * - Elementos/Contenedores: Vista XZ (ancho × alto)
   */
  function obtenerDimensionesArea(elemento) {
    try {
      // Determinar el contexto y la vista
      const contextoActual = canvasStore.contextoNavegacion
      const vistaActual = canvasStore.vistaActiva
      let contenedor = null
      let planta = null
      const { width: anchoCanvasActual, height: largoCanvasActual } = canvasStore.canvasAdaptativo
      const { estaEnPlanta } = canvasStore

      if (estaEnPlanta) {
        planta = canvasStore.plantaPorId(contextoActual.id)
      } else {
        contenedor = canvasStore.elementoPorId(contextoActual.id)
      }

      console.log('🔍 DETERMINANDO ÁREA CONTENEDORA:', {
        elementoId: elemento.id,
        vistaDetectada: vistaActual,
        contenedorId: contenedor?.id,
        contextoNavegacion: contextoActual
      })

      if (!estaEnPlanta) {
        // Vista frontal XZ: validar contra ancho × alto del contenedor
        return {
          ancho: anchoCanvasActual,
          largo: largoCanvasActual, // En vista XZ, Y representa el alto
          vista: vistaActual,
          contenedorId: contenedor.id
        }
      } else {
        // Vista planta XY: usar dimensiones de la planta activa
        return {
          ancho: anchoCanvasActual,
          largo: largoCanvasActual,
          vista: vistaActual,
          plantaId: planta.id
        }
      }
    } catch (error) {
      console.error('Error al obtener dimensiones del área:', error)
      return {
        ancho: 500 * CM_TO_PX,
        largo: 500 * CM_TO_PX,
        vista: 'XY',
        esDefault: true,
        error: error.message
      }
    }
  }

  /**
   * Calcula el solapamiento 3D entre dos elementos considerando sus dimensiones y alturas
   * @param {Object} elemento1 - Primer elemento (temporal)
   * @param {Object} elemento2 - Segundo elemento (existente)
   * @returns {Object} Información del solapamiento en las 3 dimensiones
   */
  function calcularSolapamiento3D(elemento1, elemento2) {
    const tolerancia = 0.1 // 1mm de tolerancia

    // Calcular posiciones y dimensiones en X e Y (ancho y largo/profundidad)
    const el1PosX = elemento1.x / CM_TO_PX
    const el1PosY = elemento1.y / CM_TO_PX
    const el1Ancho = elemento1.width / CM_TO_PX
    const el1Largo = elemento1.height / CM_TO_PX

    const el2PosX = (elemento2.x || 0) / CM_TO_PX
    const el2PosY = (elemento2.y || 0) / CM_TO_PX
    const el2Ancho = (elemento2.width || 0) / CM_TO_PX
    const el2Largo = (elemento2.height || 0) / CM_TO_PX

    // Obtener dimensiones de ambos elementos
    const el1Dimensiones = elemento1.dimensiones || {}
    const el2Dimensiones = elemento2.dimensiones || {}

    // Verificar solapamiento en X e Y (ancho y largo/profundidad)
    const solapamientoX = Math.min(el1PosX + el1Ancho, el2PosX + el2Ancho) - Math.max(el1PosX, el2PosX)
    const solapamientoY = Math.min(el1PosY + el1Largo, el2PosY + el2Largo) - Math.max(el1PosY, el2PosY)

    // Si no hay solapamiento en X o Y, no hay colisión en esta proyección
    if (solapamientoX <= tolerancia || solapamientoY <= tolerancia) {
      return {
        hayColision: false,
        solapamientos: { x: solapamientoX, y: solapamientoY, z: 0 },
        elemento1Info: {
          posicion: { x: el1PosX, y: el1PosY },
          dimensiones: { ancho: el1Ancho, largo: el1Largo, alto: el1Dimensiones.alto || 0 },
          alturaDesdesuelo: 0,
          limiteAlto: el1Dimensiones.alto || 0
        },
        elemento2Info: {
          id: elemento2.id,
          ubicacion: elemento2.ubicacion,
          posicion: { x: el2PosX, y: el2PosY },
          dimensiones: { ancho: el2Ancho, largo: el2Largo, alto: el2Dimensiones.alto || 0 },
          alturaDesdesuelo: elemento2.ubicacion === 'pared' && elemento2.alturaRespectoAlSuelo !== undefined ? elemento2.alturaRespectoAlSuelo : 0,
          limiteAlto: (elemento2.ubicacion === 'pared' && elemento2.alturaRespectoAlSuelo !== undefined ? elemento2.alturaRespectoAlSuelo : 0) + (el2Dimensiones.alto || 0),
          esElementoPared: elemento2.ubicacion === 'pared'
        },
        razon: solapamientoX <= tolerancia ? 'No hay solapamiento en X (ancho)' : 'No hay solapamiento en Y (largo/profundidad)'
      }
    }

    // Si hay solapamiento en X e Y, verificar también la altura (dimensión Z)
    // Altura del elemento1 (temporal) - siempre desde el suelo
    const el1AltoDesdesuelo = 0
    const el1AltoTotal = el1Dimensiones.alto || 0
    const el1LimiteAlto = el1AltoDesdesuelo + el1AltoTotal

    // Altura del elemento2 (existente) - considerar elementos de pared
    let el2AltoDesdesuelo = 0
    let el2AltoTotal = el2Dimensiones.alto || 0

    // Para elementos tipo "pared", considerar su alturaRespectoAlSuelo
    if (elemento2.ubicacion === 'pared' && elemento2.alturaRespectoAlSuelo !== undefined) {
      el2AltoDesdesuelo = elemento2.alturaRespectoAlSuelo
    }
    const el2LimiteAlto = el2AltoDesdesuelo + el2AltoTotal

    // Verificar solapamiento en altura (dimensión Z)
    const solapamientoZ = Math.min(el1LimiteAlto, el2LimiteAlto) - Math.max(el1AltoDesdesuelo, el2AltoDesdesuelo)

    // Determinar si hay colisión 3D
    const hayColision3D = solapamientoX > tolerancia && solapamientoY > tolerancia && solapamientoZ > tolerancia

    return {
      hayColision: hayColision3D,
      solapamientos: { x: solapamientoX, y: solapamientoY, z: solapamientoZ },
      elemento1Info: {
        posicion: { x: el1PosX, y: el1PosY },
        dimensiones: { ancho: el1Ancho, largo: el1Largo, alto: el1AltoTotal },
        alturaDesdesuelo: el1AltoDesdesuelo,
        limiteAlto: el1LimiteAlto
      },
      elemento2Info: {
        id: elemento2.id,
        ubicacion: elemento2.ubicacion,
        posicion: { x: el2PosX, y: el2PosY },
        dimensiones: { ancho: el2Ancho, largo: el2Largo, alto: el2AltoTotal },
        alturaDesdesuelo: el2AltoDesdesuelo,
        limiteAlto: el2LimiteAlto,
        esElementoPared: elemento2.ubicacion === 'pared'
      },
      razon: hayColision3D
        ? 'Los elementos se solapan en las 3 dimensiones (X, Y y Z) - COLISIÓN REAL'
        : solapamientoZ <= tolerancia
          ? 'Elementos están a diferentes alturas - NO HAY COLISIÓN'
          : 'Solapamiento insuficiente - NO HAY COLISIÓN'
    }
  }

  /**
   * Verifica si hay colisiones en una posición específica
   * Incluye validación de altura para elementos tipo "pared" con alturaRespectoAlSuelo
   */
  function verificarColisionesEnPosicion(elementoTemporal, elementosExistentes) {
    for (const elemento of elementosExistentes) {
      // Usar la función reutilizable para calcular solapamiento 3D
      const resultadoSolapamiento = calcularSolapamiento3D(elementoTemporal, elemento)

      console.log(`🔍 Verificando colisión 3D con elemento ${elemento.id}:`, {
        elementoExistente: resultadoSolapamiento.elemento2Info,
        elementoTemporal: resultadoSolapamiento.elemento1Info,
        solapamientos: {
          x: resultadoSolapamiento.solapamientos.x.toFixed(2),
          y: resultadoSolapamiento.solapamientos.y.toFixed(2),
          z: resultadoSolapamiento.solapamientos.z.toFixed(2)
        },
        criteriosColision: {
          solapamientoX_mayor_tolerancia: resultadoSolapamiento.solapamientos.x > 0.1,
          solapamientoY_mayor_tolerancia: resultadoSolapamiento.solapamientos.y > 0.1,
          solapamientoZ_mayor_tolerancia: resultadoSolapamiento.solapamientos.z > 0.1,
          todas_dimensiones_solapan: resultadoSolapamiento.hayColision
        },
        hayColision3D: resultadoSolapamiento.hayColision
      })

      if (resultadoSolapamiento.hayColision) {
        console.log(`❌ COLISIÓN 3D DETECTADA con elemento ${elemento.id}:`, {
          solapamientoTotal: {
            x: resultadoSolapamiento.solapamientos.x.toFixed(2) + 'cm',
            y: resultadoSolapamiento.solapamientos.y.toFixed(2) + 'cm',
            z: resultadoSolapamiento.solapamientos.z.toFixed(2) + 'cm'
          },
          tipoElemento: elemento.ubicacion === 'pared' ? 'Elemento de pared' : 'Elemento normal',
          explicacion: resultadoSolapamiento.razon
        })
        return true // Hay colisión
      } else {
        console.log(`✅ NO HAY COLISIÓN con elemento ${elemento.id}: ${resultadoSolapamiento.razon}`, {
          detalleAlturas: {
            elementoTemporal: `${resultadoSolapamiento.elemento1Info.alturaDesdesuelo}cm - ${resultadoSolapamiento.elemento1Info.limiteAlto}cm`,
            elementoExistente: `${resultadoSolapamiento.elemento2Info.alturaDesdesuelo}cm - ${resultadoSolapamiento.elemento2Info.limiteAlto}cm`,
            esElementoPared: resultadoSolapamiento.elemento2Info.esElementoPared,
            explicacion: resultadoSolapamiento.razon
          }
        })
      }
    }

    return false // No hay colisiones
  }

  /**
   * Calcula el espacio real disponible considerando la posición específica del elemento y la vista actual
   */
  function calcularEspacioRealDisponible(elementoTemporal, elementosExistentes, areaTotal) {
    const posXCm = elementoTemporal.x / CM_TO_PX
    const posYCm = elementoTemporal.y / CM_TO_PX
    const anchoCm = elementoTemporal.width / CM_TO_PX
    const dimension2Cm = elementoTemporal.height / CM_TO_PX // largo en XY, alto en XZ
    const areaAnchoCm = areaTotal.ancho / CM_TO_PX
    const areaDimension2Cm = areaTotal.largo / CM_TO_PX // largo en XY, alto en XZ

    const vista = areaTotal.vista || 'XY'
    const esVistaFrontal = vista === 'XZ'
    const dimension2Nombre = esVistaFrontal ? 'alto' : 'largo'

    console.log(`🔍 CALCULANDO ESPACIO REAL DISPONIBLE EN VISTA ${vista}:`, {
      elementoPos: { x: posXCm, y: posYCm },
      elementoDims: esVistaFrontal ?
        { ancho: anchoCm, alto: dimension2Cm } :
        { ancho: anchoCm, largo: dimension2Cm },
      areaTotal: esVistaFrontal ?
        { ancho: areaAnchoCm, alto: areaDimension2Cm } :
        { ancho: areaAnchoCm, largo: areaDimension2Cm },
      vista: vista
    })

    // Verificar si el elemento cabe en el área total
    if (posXCm + anchoCm > areaAnchoCm) {
      const exceso = (posXCm + anchoCm) - areaAnchoCm
      return {
        cabe: false,
        razon: `El elemento se sale del área por ${exceso.toFixed(1)}cm en su ancho`,
        sugerencias: [`Reducir ancho en ${exceso.toFixed(1)}cm`],
        vista: vista
      }
    }

    if (posYCm + dimension2Cm > areaDimension2Cm) {
      const exceso = (posYCm + dimension2Cm) - areaDimension2Cm
      return {
        cabe: false,
        razon: `El elemento se sale del área por ${exceso.toFixed(1)}cm en su ${dimension2Nombre}`,
        sugerencias: [`Reducir ${dimension2Nombre} en ${exceso.toFixed(1)}cm`],
        vista: vista
      }
    }

    // Verificar si hay elementos que obstruyen el espacio usando validación 3D
    for (const elemento of elementosExistentes) {
      // Usar la función reutilizable para calcular solapamiento 3D
      const resultadoSolapamiento = calcularSolapamiento3D(elementoTemporal, elemento)

      console.log(`🔍 Verificando solapamiento 3D con elemento ${elemento.id} en vista ${vista}:`, {
        elementoActual: esVistaFrontal ?
          { x: posXCm, y: posYCm, ancho: anchoCm, alto: dimension2Cm } :
          { x: posXCm, y: posYCm, ancho: anchoCm, largo: dimension2Cm },
        elementoExistente: esVistaFrontal ?
          { x: resultadoSolapamiento.elemento2Info.posicion.x, y: resultadoSolapamiento.elemento2Info.posicion.y, ancho: resultadoSolapamiento.elemento2Info.dimensiones.ancho, alto: resultadoSolapamiento.elemento2Info.dimensiones.largo } :
          { x: resultadoSolapamiento.elemento2Info.posicion.x, y: resultadoSolapamiento.elemento2Info.posicion.y, ancho: resultadoSolapamiento.elemento2Info.dimensiones.ancho, largo: resultadoSolapamiento.elemento2Info.dimensiones.largo },
        solapamiento3D: {
          x: resultadoSolapamiento.solapamientos.x,
          y: resultadoSolapamiento.solapamientos.y,
          z: resultadoSolapamiento.solapamientos.z
        },
        alturas: {
          elementoActual: `${resultadoSolapamiento.elemento1Info.alturaDesdesuelo}cm - ${resultadoSolapamiento.elemento1Info.limiteAlto}cm`,
          elementoExistente: `${resultadoSolapamiento.elemento2Info.alturaDesdesuelo}cm - ${resultadoSolapamiento.elemento2Info.limiteAlto}cm`,
          esElementoPared: resultadoSolapamiento.elemento2Info.esElementoPared
        }
      })

      // Si hay colisión 3D real (solapamiento en las tres dimensiones)
      if (resultadoSolapamiento.hayColision) {
        return {
          cabe: false,
          razon: `El elemento se solaparía en 3D con el elemento ${elemento.id} en vista ${vista}. Solapamiento: ${resultadoSolapamiento.solapamientos.x.toFixed(1)}cm(X) × ${resultadoSolapamiento.solapamientos.y.toFixed(1)}cm(Y) × ${resultadoSolapamiento.solapamientos.z.toFixed(1)}cm(Z)`,
          sugerencias: [
            'Reducir las dimensiones para evitar solapamiento 3D',
            'Cambiar la posición del elemento',
            resultadoSolapamiento.elemento2Info.esElementoPared ?
              'Considerar ajustar la altura respecto al suelo del elemento de pared' :
              'Verificar la altura de los elementos'
          ],
          vista: vista,
          tipoColision: '3D',
          detalleColision: {
            solapamientos: resultadoSolapamiento.solapamientos,
            alturas: {
              elementoActual: `${resultadoSolapamiento.elemento1Info.alturaDesdesuelo}cm - ${resultadoSolapamiento.elemento1Info.limiteAlto}cm`,
              elementoExistente: `${resultadoSolapamiento.elemento2Info.alturaDesdesuelo}cm - ${resultadoSolapamiento.elemento2Info.limiteAlto}cm`
            }
          }
        }
      } else {
        // Log informativo de por qué NO hay colisión
        console.log(`✅ NO HAY COLISIÓN 3D con elemento ${elemento.id}: ${resultadoSolapamiento.razon}`)
      }
    }

    return {
      cabe: true,
      razon: `El elemento cabe en el espacio disponible sin colisiones en vista ${vista}`,
      vista: vista
    }
  }

  /**
   * Verifica si un elemento cabe dentro de los límites del área según la vista actual
   * - Vista XY (plantas): valida ancho (X) y largo (Y)
   * - Vista XZ (elementos): valida ancho (X) y alto (Y como Z)
   */
  function verificarLimitesArea(elemento, areaTotal) {
    const margen = 0.1 * CM_TO_PX // 1mm de margen
    const elementoFinalX = elemento.x + elemento.width
    const elementoFinalY = elemento.y + elemento.height

    const vista = areaTotal.vista || 'XY'
    const esVistaFrontal = vista === 'XZ'

    const calculo = {
      elementoPos: { x: elemento.x / CM_TO_PX, y: elemento.y / CM_TO_PX },
      elementoDims: {
        ancho: elemento.width / CM_TO_PX,
        dimension2: elemento.height / CM_TO_PX // largo en XY, alto en XZ
      },
      elementoFinal: { x: elementoFinalX / CM_TO_PX, y: elementoFinalY / CM_TO_PX },
      area: {
        ancho: areaTotal.ancho / CM_TO_PX,
        dimension2: areaTotal.largo / CM_TO_PX // largo en XY, alto en XZ
      },
      vista: vista,
      limites: {
        xValido: elementoFinalX <= (areaTotal.ancho + margen),
        yValido: elementoFinalY <= (areaTotal.largo + margen)
      }
    }

    const validacion = {
      dentroEnX: calculo.limites.xValido,
      dentroEnDimension2: calculo.limites.yValido,
      cabe: calculo.limites.xValido && calculo.limites.yValido
    }

    console.log(`🔍 VERIFICANDO LÍMITES EN VISTA ${vista}:`, {
      elemento: {
        id: elemento.id,
        posicion: calculo.elementoPos,
        dimensiones: esVistaFrontal ?
          { ancho: calculo.elementoDims.ancho, alto: calculo.elementoDims.dimension2 } :
          { ancho: calculo.elementoDims.ancho, largo: calculo.elementoDims.dimension2 },
        posicionFinal: calculo.elementoFinal
      },
      areaContenedora: {
        id: areaTotal.contenedorId || areaTotal.plantaId || 'default',
        dimensiones: esVistaFrontal ?
          { ancho: calculo.area.ancho, alto: calculo.area.dimension2 } :
          { ancho: calculo.area.ancho, largo: calculo.area.dimension2 },
        vista: vista
      },
      validacion: validacion
    })

    if (!validacion.cabe) {
      const problemas = []
      const sugerencias = []
      const dimension2Nombre = esVistaFrontal ? 'alto' : 'largo'
      const direccion2 = esVistaFrontal ? 'abajo' : 'arriba'

      if (!validacion.dentroEnX) {
        const exceso = calculo.elementoFinal.x - calculo.area.ancho
        problemas.push(`se sale ${exceso.toFixed(1)}cm en su ancho`)
        sugerencias.push(`Reducir ancho en ${exceso.toFixed(1)}cm o mover hacia la izquierda`)
      }

      if (!validacion.dentroEnDimension2) {
        const exceso = calculo.elementoFinal.y - calculo.area.dimension2
        problemas.push(`se sale ${exceso.toFixed(1)}cm en su ${dimension2Nombre}`)
        sugerencias.push(`El ${dimension2Nombre} máximo posible es de ${calculo.area.dimension2.toFixed(1)}cm. También puedes moverlo hacia ${direccion2}`)
      }

      return {
        cabe: false,
        razon: `El elemento ${problemas.join(' y ')} en vista ${vista}`,
        sugerencias: sugerencias,
        vista: vista
      }
    }

    return {
      cabe: true,
      razon: `El elemento cabe dentro del área en vista ${vista}`,
      vista: vista
    }
  }

  /**
   * Valida que las nuevas dimensiones del elemento sean suficientes para contener a sus elementos hijos
   * Valida las 3 dimensiones: ancho (X), largo (profundidad), alto (Y en frontal)
   * IMPORTANTE: Valida posición + dimensión para verificar que el hijo no se salga del área del padre
   * @param {Object} elemento - Elemento con las nuevas dimensiones a validar
   * @returns {Object} Resultado de la validación
   */
  function validarContencionHijos(elemento) {
    const hijos = canvasStore.elementos.filter(el => el.padre === elemento.id);

    if (hijos.length === 0) {
      return { valida: true, razon: 'No tiene elementos hijos' };
    }

    console.log('🔍 VALIDANDO CONTENCIÓN DE HIJOS EN 3D:', {
      elementoPadre: elemento.id,
      cantidadHijos: hijos.length,
      dimensionesPadre: elemento.dimensiones
    });

    const dimensionesPadre = elemento.dimensiones;
    const problemasContención = [];

    for (const hijo of hijos) {
      // Obtener posición del hijo dentro del padre (en cm)
      // X = ancho, Y = alto (en vista frontal), largo siempre empieza en 0 (profundidad)
      const posHijoX = (hijo.x || 0) / CM_TO_PX; // Posición en ancho
      const posHijoY = (hijo.y || 0) / CM_TO_PX; // Posición en alto (coordenada Konva Y)
      const posHijoLargo = 0; // El largo siempre empieza en 0 (profundidad)

      // Obtener dimensiones del hijo (en cm)
      const dimHijo = hijo.dimensiones || {};
      const anchoHijo = dimHijo.ancho || 0;
      const largoHijo = dimHijo.largo || 0;
      const altoHijo = dimHijo.alto || 0;

      // Calcular límites del hijo en las 3 dimensiones
      // IMPORTANTE: posición + dimensión = límite final
      const limiteDerechoHijo = posHijoX + anchoHijo;        // Límite en X (ancho)
      const limiteProfundidadHijo = posHijoLargo + largoHijo; // Límite en largo (profundidad)
      const limiteAltoHijo = posHijoY + altoHijo;           // Límite en Y/Z (alto)

      console.log(`🔍 Analizando hijo ${hijo.id} en 3D:`, {
        posicion: { x: posHijoX, y: posHijoY, largo: posHijoLargo },
        dimensiones: { ancho: anchoHijo, largo: largoHijo, alto: altoHijo },
        limites: {
          derecho: limiteDerechoHijo,
          profundidad: limiteProfundidadHijo,
          alto: limiteAltoHijo
        },
        padreDisponible: {
          ancho: dimensionesPadre.ancho,
          largo: dimensionesPadre.largo,
          alto: dimensionesPadre.alto
        },
        validaciones: {
          ancho: limiteDerechoHijo <= dimensionesPadre.ancho,
          largo: limiteProfundidadHijo <= dimensionesPadre.largo,
          alto: limiteAltoHijo <= dimensionesPadre.alto
        }
      });

      // Verificar si el hijo se sale en ancho (X)
      if (limiteDerechoHijo > dimensionesPadre.ancho) {
        const exceso = limiteDerechoHijo - dimensionesPadre.ancho;
        problemasContención.push({
          hijo: hijo.id,
          tipo: 'ancho',
          exceso: exceso,
          posicion: posHijoX,
          dimension: anchoHijo,
          limite: limiteDerechoHijo,
          mensaje: `El elemento ${hijo.nombre || hijo.id} se sale ${exceso.toFixed(1)}cm en su ancho`
        });
      }

      // Verificar si el hijo se sale en largo (profundidad)
      if (limiteProfundidadHijo > dimensionesPadre.largo) {
        const exceso = limiteProfundidadHijo - dimensionesPadre.largo;
        problemasContención.push({
          hijo: hijo.id,
          tipo: 'largo',
          exceso: exceso,
          posicion: posHijoLargo,
          dimension: largoHijo,
          limite: limiteProfundidadHijo,
          mensaje: `El elemento ${hijo.nombre || hijo.id} se sale ${exceso.toFixed(1)}cm en su largo`
        });
      }

      // Verificar si el hijo se sale en alto (Y en vista frontal)
      if (limiteAltoHijo > dimensionesPadre.alto) {
        const exceso = limiteAltoHijo - dimensionesPadre.alto;
        problemasContención.push({
          hijo: hijo.id,
          tipo: 'alto',
          exceso: exceso,
          posicion: posHijoY,
          dimension: altoHijo,
          limite: limiteAltoHijo,
          mensaje: `El elemento ${hijo.nombre || hijo.id} se sale ${exceso.toFixed(1)}cm en su alto`
        });
      }
    }

    if (problemasContención.length > 0) {
      const mensajesProblemas = problemasContención.map(p => p.mensaje);
      const excesoAncho = Math.max(0, ...problemasContención.filter(p => p.tipo === 'ancho').map(p => p.exceso));
      const excesoLargo = Math.max(0, ...problemasContención.filter(p => p.tipo === 'largo').map(p => p.exceso));
      const excesoAlto = Math.max(0, ...problemasContención.filter(p => p.tipo === 'alto').map(p => p.exceso));

      const sugerencias = [];
      if (excesoAncho > 0) {
        sugerencias.push(`Aumentar ancho ${excesoAncho.toFixed(1)}cm más`);
      }
      if (excesoLargo > 0) {
        sugerencias.push(`Aumentar largo ${excesoLargo.toFixed(1)}cm más`);
      }
      if (excesoAlto > 0) {
        sugerencias.push(`Aumentar alto ${excesoAlto.toFixed(1)}cm más`);
      }

      return {
        valida: false,
        razon: `Las nuevas dimensiones no son suficientes para contener a los elementos hijos: ${mensajesProblemas.join(', ')}`,
        sugerencias: sugerencias,
        problemasDetallados: problemasContención
      };
    }

    return { valida: true, razon: 'Todos los elementos hijos caben dentro de las nuevas dimensiones' };
  }

  /**
   * Valida que el elemento con sus nuevas dimensiones quepa dentro de su contenedor padre
   * Valida las 3 dimensiones: ancho, largo y alto
   * @param {Object} elemento - Elemento con las nuevas dimensiones a validar
   * @returns {Object} Resultado de la validación
   */
  function validarContencionEnPadre(elemento) {
    // Si no tiene padre, no hay restricción de contención
    if (!elemento.padre && !elemento.parentId) {
      return { valida: true, razon: 'El elemento no tiene contenedor padre' };
    }

    const parentId = elemento.padre || elemento.parentId;
    const padre = canvasStore.elementoPorId(parentId);

    if (!padre || !padre.dimensiones) {
      return { valida: true, razon: 'No se encontró el contenedor padre o no tiene dimensiones' };
    }

    console.log('🔍 VALIDANDO CONTENCIÓN EN PADRE 3D:', {
      elemento: elemento.id,
      padre: padre.id,
      dimensionesElemento: elemento.dimensiones,
      dimensionesPadre: padre.dimensiones
    });

    const dimElemento = elemento.dimensiones;
    const dimPadre = padre.dimensiones;

    // Obtener posición del elemento dentro del padre (en cm)
    const posElementoX = (elemento.x || 0) / CM_TO_PX; // Posición en ancho
    const posElementoY = (elemento.y || 0) / CM_TO_PX; // Posición en alto
    const posElementoLargo = 0; // El largo siempre empieza en 0 (profundidad)

    // Calcular límites del elemento en las 3 dimensiones
    const limiteDerechoElemento = posElementoX + dimElemento.ancho;
    const limiteProfundidadElemento = posElementoLargo + dimElemento.largo;
    const limiteAltoElemento = posElementoY + dimElemento.alto;

    const problemas = [];

    console.log(`🔍 Verificando elemento ${elemento.id} en padre ${padre.id}:`, {
      posicion: { x: posElementoX, y: posElementoY, largo: posElementoLargo },
      dimensiones: { ancho: dimElemento.ancho, largo: dimElemento.largo, alto: dimElemento.alto },
      limites: {
        derecho: limiteDerechoElemento,
        profundidad: limiteProfundidadElemento,
        alto: limiteAltoElemento
      },
      padreDisponible: {
        ancho: dimPadre.ancho,
        largo: dimPadre.largo,
        alto: dimPadre.alto
      },
      validaciones: {
        ancho: limiteDerechoElemento <= dimPadre.ancho,
        largo: limiteProfundidadElemento <= dimPadre.largo,
        alto: limiteAltoElemento <= dimPadre.alto
      }
    });

    // Verificar ancho
    if (limiteDerechoElemento > dimPadre.ancho) {
      const exceso = limiteDerechoElemento - dimPadre.ancho;
      problemas.push({
        tipo: 'ancho',
        exceso: exceso,
        mensaje: `El elemento se sale ${exceso.toFixed(1)}cm en su ancho`
      });
    }

    // Verificar largo
    if (limiteProfundidadElemento > dimPadre.largo) {
      const exceso = limiteProfundidadElemento - dimPadre.largo;
      problemas.push({
        tipo: 'largo',
        exceso: exceso,
        mensaje: `El elemento se sale ${exceso.toFixed(1)}cm en su largo`
      });
    }

    // Verificar alto
    if (limiteAltoElemento > dimPadre.alto) {
      const exceso = limiteAltoElemento - dimPadre.alto;
      problemas.push({
        tipo: 'alto',
        exceso: exceso,
        mensaje: `El elemento se sale ${exceso.toFixed(1)}cm en su alto`
      });
    }

    if (problemas.length > 0) {
      const mensajesProblemas = problemas.map(p => p.mensaje);
      const sugerencias = [];

      problemas.forEach(p => {
        switch(p.tipo) {
          case 'ancho':
            sugerencias.push(`Reducir ancho ${p.exceso.toFixed(1)}cm menos`);
            break;
          case 'largo':
            sugerencias.push(`Reducir largo ${p.exceso.toFixed(1)}cm menos`);
            break;
          case 'alto':
            sugerencias.push(`Reducir alto ${p.exceso.toFixed(1)}cm menos`);
            break;
        }
      });

      return {
        valida: false,
        razon: `El elemento no cabe dentro de su contenedor padre: ${mensajesProblemas.join(', ')}`,
        sugerencias: sugerencias,
        problemasDetallados: problemas
      };
    }

    return { valida: true, razon: 'El elemento cabe correctamente dentro de su contenedor padre en las 3 dimensiones' };
  }

  /**
   * Valida que el nuevo volumen calculado no sea menor al volumen usado actual del elemento
   * @param {Object} elemento - Elemento con las nuevas dimensiones a validar
   * @returns {Object} Resultado de la validación
   */
  function validarVolumenMinimo(elemento) {
    // Obtener el volumen usado actual del elemento
    const usoActual = elemento.uso || {};
    const volumenUsado = usoActual.volumen || 0;

    // Si no hay volumen usado, la validación pasa
    if (volumenUsado === 0) {
      return { valida: true, razon: 'No hay volumen usado registrado' };
    }

    // Calcular el nuevo volumen teórico según el tipo de elemento
    const dimensiones = elemento.dimensiones;
    let nuevoVolumenTeorico = 0;

    if (elemento.tipo === 'contenedores') {
      // Para contenedores: volumen teórico = sus propias dimensiones
      if (elemento.forma === 'circular') {
        // Para formas circulares: V = π × r² × h
        const radio = (dimensiones.ancho || 0) / 2;
        const alto = dimensiones.alto || 0;
        nuevoVolumenTeorico = (Math.PI * Math.pow(radio, 2) * alto) / 1_000_000; // cm³ a m³
      } else {
        // Para formas rectangulares: V = ancho × largo × alto
        const ancho = dimensiones.ancho || 0;
        const largo = dimensiones.largo || 0;
        const alto = dimensiones.alto || 0;
        nuevoVolumenTeorico = (ancho * largo * alto) / 1_000_000; // cm³ a m³
      }
    } else {
      // Para elementos: volumen teórico = suma de volúmenes de sus contenedores hijos
      const contenedoresHijos = canvasStore.elementos.filter(el =>
        el.padre === elemento.id && el.tipo === 'contenedores'
      );

      nuevoVolumenTeorico = contenedoresHijos.reduce((suma, contenedor) => {
        const dimContenedor = contenedor.dimensiones || {};
        let volumenContenedor = 0;

        if (contenedor.forma === 'circular') {
          const radio = (dimContenedor.ancho || 0) / 2;
          const alto = dimContenedor.alto || 0;
          volumenContenedor = (Math.PI * Math.pow(radio, 2) * alto) / 1_000_000;
        } else {
          const ancho = dimContenedor.ancho || 0;
          const largo = dimContenedor.largo || 0;
          const alto = dimContenedor.alto || 0;
          volumenContenedor = (ancho * largo * alto) / 1_000_000;
        }

        return suma + volumenContenedor;
      }, 0);
    }

    console.log('🔍 VALIDANDO VOLUMEN MÍNIMO:', {
      elemento: elemento.id,
      tipo: elemento.tipo,
      volumenUsado: volumenUsado,
      nuevoVolumenTeorico: nuevoVolumenTeorico,
      dimensiones: dimensiones,
      forma: elemento.forma,
      esContenedor: elemento.tipo === 'contenedores',
      contenedoresHijos: elemento.tipo !== 'contenedores' ?
        canvasStore.elementos.filter(el => el.padre === elemento.id && el.tipo === 'contenedores').length :
        'N/A'
    });

    // Verificar si el nuevo volumen es suficiente
    if (nuevoVolumenTeorico < volumenUsado) {
      const deficit = volumenUsado - nuevoVolumenTeorico;

      // Calcular sugerencias de ajuste según el tipo de elemento
      const sugerencias = [];

      if (elemento.tipo === 'contenedores') {
        // Para contenedores: sugerir cambio de dimensiones propias
        // const factorEscala = Math.cbrt(volumenUsado / nuevoVolumenTeorico); // Raíz cúbica para escalar proporcionalmente

        if (elemento.forma === 'circular') {
          // const nuevoDiametro = dimensiones.ancho * factorEscala;
          // const nuevoAlto = dimensiones.alto * factorEscala;
          sugerencias.push(`Verificar las dimensiones necesarias`);
        } else {
          // const nuevoAncho = dimensiones.ancho * factorEscala;
          // const nuevoLargo = dimensiones.largo * factorEscala;
          // const nuevoAlto = dimensiones.alto * factorEscala;
          sugerencias.push(`Verificar las dimensiones necesarias`);
        }
      } else {
        // Para elementos: sugerir agregar más contenedores o aumentar el tamaño de los existentes
        const contenedoresHijos = canvasStore.elementos.filter(el =>
          el.padre === elemento.id && el.tipo === 'contenedores'
        );

        if (contenedoresHijos.length === 0) {
          sugerencias.push('Agregar más contenedores internos para alcanzar el volumen requerido');
        } else {
          const volumenAdicionalRequerido = volumenUsado - nuevoVolumenTeorico;
          sugerencias.push(`Aumentar el volumen de los contenedores existentes en ${volumenAdicionalRequerido.toFixed(3)}m³`);
          sugerencias.push('O agregar contenedores adicionales para completar el volumen requerido');
        }
      }

      // const tipoElemento = elemento.tipo === 'contenedores' ? 'contenedores' : 'elementos';
      const explicacionCalculo = elemento.tipo === 'contenedores' ?
        'basado en sus dimensiones propias' :
        'basado en la suma de volúmenes de sus contenedores hijos';

      return {
        valida: false,
        razon: `El nuevo volumen (${nuevoVolumenTeorico.toFixed(3)}m³, ${explicacionCalculo}) no es suficiente para satisfacer su uso actual. Déficit: ${deficit.toFixed(3)}m³`,
        sugerencias: sugerencias,
        deficit: deficit,
        volumenUsado: volumenUsado,
        volumenNuevo: nuevoVolumenTeorico
      };
    }

    const tipoElemento = elemento.tipo === 'contenedores' ? 'contenedores' : 'elementos';
    const explicacionCalculo = elemento.tipo === 'contenedores' ?
      'basado en sus dimensiones propias' :
      'basado en la suma de volúmenes de sus contenedores hijos';

    return { valida: true, razon: `El nuevo volumen del ${tipoElemento} (${nuevoVolumenTeorico.toFixed(3)}m³, ${explicacionCalculo}) es suficiente para el volumen usado (${volumenUsado.toFixed(3)}m³)` };
  }

  /**
   * Aplica el resultado de la validación al elemento
   */
  function aplicarResultadoValidacion(elementoId, resultado) {
    if (!resultado.valida) {
      return {
        exito: false,
        mensaje: resultado.razon,
        sugerencias: resultado.sugerencias || []
      }
    }

    const elemento = canvasStore.elementoPorId(elementoId)
    if (!elemento) {
      return {
        exito: false,
        mensaje: 'Elemento no encontrado'
      }
    }

    const actualizaciones = {}

    console.log('🔍 CONSTRUYENDO ACTUALIZACIONES:', {
      accion: resultado.accion,
      elementoFinal: resultado.elementoFinal,
      dimensionesOriginal: elemento.dimensiones,
      widthOriginal: elemento.width,
      heightOriginal: elemento.height
    })

    switch (resultado.accion) {
      case 'aplicar':
        console.log('📝 CASO APLICAR - Aplicando todas las dimensiones')
        // Aplicar todas las dimensiones
        if (resultado.elementoFinal.dimensiones) {
          actualizaciones.dimensiones = resultado.elementoFinal.dimensiones
          actualizaciones.width = resultado.elementoFinal.width
          actualizaciones.height = resultado.elementoFinal.height

          console.log('📏 DIMENSIONES FINALES:', {
            dimensiones: resultado.elementoFinal.dimensiones,
            widthPx: resultado.elementoFinal.width,
            heightPx: resultado.elementoFinal.height,
            widthCm: resultado.elementoFinal.width / CM_TO_PX,
            heightCm: resultado.elementoFinal.height / CM_TO_PX
          })
        }

        // Aplicar cambios de posición si los hay
        if (resultado.elementoFinal.x !== elemento.x || resultado.elementoFinal.y !== elemento.y) {
          actualizaciones.x = resultado.elementoFinal.x
          actualizaciones.y = resultado.elementoFinal.y
          console.log('Aplicando cambios de posición:', { x: resultado.elementoFinal.x, y: resultado.elementoFinal.y })
        }
        break

      default:
        return {
          exito: false,
          mensaje: 'Acción de validación no reconocida'
        }
    }

    // Aplicar las actualizaciones
    if (Object.keys(actualizaciones).length > 0) {
      console.log('=== APLICANDO ACTUALIZACIONES ===')
      console.log('Elemento ID:', elementoId)
      console.log('Actualizaciones a aplicar:', actualizaciones)
      if (actualizaciones.x !== undefined || actualizaciones.y !== undefined) {
        console.log('Posición siendo aplicada:', {
          x: actualizaciones.x !== undefined ? (actualizaciones.x / CM_TO_PX).toFixed(1) + 'cm' : 'sin cambio',
          y: actualizaciones.y !== undefined ? (actualizaciones.y / CM_TO_PX).toFixed(1) + 'cm' : 'sin cambio'
        })
      }
      if (actualizaciones.width !== undefined || actualizaciones.height !== undefined) {
        console.log('Dimensiones siendo aplicadas:', {
          width: actualizaciones.width !== undefined ? (actualizaciones.width / CM_TO_PX).toFixed(1) + 'cm' : 'sin cambio',
          height: actualizaciones.height !== undefined ? (actualizaciones.height / CM_TO_PX).toFixed(1) + 'cm' : 'sin cambio'
        })
      }
      console.log('====================================')

      canvasStore.actualizarElemento(elementoId, actualizaciones)
    }

    return {
      exito: true,
      mensaje: resultado.razon,
      accion: resultado.accion,
      dimensionesAplicadas: resultado.dimensionesAplicadas || resultado.elementoFinal?.dimensiones
    }
  }

  return {
    validarDimensiones,
    aplicarResultadoValidacion
  }
}
