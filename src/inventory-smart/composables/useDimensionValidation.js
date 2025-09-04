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
    const dimension2Nombre = esVistaFrontal ? 'alto' : 'largo'

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

    // PASO 2: Verificar si necesitamos reposicionar el elemento
    let posicionAjustada = false
    let nuevaPosicion = { x: elementoTemporal.x / CM_TO_PX, y: elementoTemporal.y / CM_TO_PX }

    const areaAnchoCm = areaTotal.ancho / CM_TO_PX
    const areaLargoCm = areaTotal.largo / CM_TO_PX
    const posXActual = elementoTemporal.x / CM_TO_PX
    const posYActual = elementoTemporal.y / CM_TO_PX

    // En vista frontal XZ: Y representa alto, en vista planta XY: Y representa largo
    const dimension2Final = esVistaFrontal ? dimensionesFinal.alto : dimensionesFinal.largo
    const areaDimension2Cm = areaTotal.largo / CM_TO_PX // largo en XY, alto en XZ

    console.log(`🔍 VERIFICANDO SI NECESITA REPOSICIONAMIENTO EN VISTA ${vista}:`, {
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
      espacioDisponible: areaDimension2Cm - posYActual,
      vista: vista
    })

    // Verificar si se sale del área O si hay colisiones en posición actual
    const seSaleDelArea = (posXActual + dimensionesFinal.ancho > areaAnchoCm || posYActual + dimension2Final > areaDimension2Cm)

    // Verificar colisiones en posición actual
    const elementosExistentes = canvasStore.elementosVisibles.filter(el => el.id !== elementoId)
    const elementoEnPosicionActual = {
      ...elementoTemporal,
      x: posXActual * CM_TO_PX,
      y: posYActual * CM_TO_PX
    }

    const hayColisiones = verificarColisionesEnPosicion(elementoEnPosicionActual, elementosExistentes)

    console.log('🔍 ANÁLISIS INICIAL:', {
      seSaleDelArea,
      hayColisiones: hayColisiones,
      necesitaReposicionamiento: seSaleDelArea || hayColisiones
    })

    if (seSaleDelArea || hayColisiones) {
      console.log('🔄 ELEMENTO NECESITA REPOSICIONAMIENTO - EVALUANDO OPCIONES')

      let reposicionExitoso = false
      let nuevaX = posXActual
      let nuevaY = posYActual

      // OPCIÓN 1: Intentar expandir desde posición actual (crecimiento natural)
      if (!seSaleDelArea) {
        console.log('🔄 OPCIÓN 1: VERIFICANDO CRECIMIENTO DESDE POSICIÓN ACTUAL')
        // Si no se sale del área, el problema son solo las colisiones
        // Verificar si puede crecer hacia derecha (ancho) o hacia abajo (largo)

        const elementoEnPosicionOriginal = {
          ...elementoTemporal,
          x: posXActual * CM_TO_PX,
          y: posYActual * CM_TO_PX
        }

        const hayColisionesEnOriginal = verificarColisionesEnPosicion(elementoEnPosicionOriginal, elementosExistentes)

        if (!hayColisionesEnOriginal) {
          console.log('✅ PUEDE CRECER DESDE POSICIÓN ACTUAL')
          nuevaX = posXActual
          nuevaY = posYActual
          reposicionExitoso = true
        }
      } else {
        // OPCIÓN 1.5: Si se sale SOLO hacia abajo Y tiene espacio suficiente, permitir crecimiento
        const soloSeSaleEnY = (posYActual + dimensionesFinal.largo > areaLargoCm) &&
                             (posXActual + dimensionesFinal.ancho <= areaAnchoCm)
        const soloSeSaleEnX = (posXActual + dimensionesFinal.ancho > areaAnchoCm) &&
                             (posYActual + dimensionesFinal.largo <= areaLargoCm)
        const espacioTotalAbajo = areaLargoCm
        const espacioTotalDerecha = areaAnchoCm
        const margenDesbordamiento = 1 // Tolerancia de 1cm para errores de redondeo

        console.log('🔍 ANÁLISIS DE DESBORDAMIENTO:', {
          soloSeSaleEnY,
          soloSeSaleEnX,
          desbordamientoY: (posYActual + dimensionesFinal.largo) - areaLargoCm,
          desbordamientoX: (posXActual + dimensionesFinal.ancho) - areaAnchoCm,
          espacioTotalAbajo,
          espacioTotalDerecha
        })

        if (soloSeSaleEnY && dimensionesFinal.largo <= espacioTotalAbajo &&
            ((posYActual + dimensionesFinal.largo) - areaLargoCm) <= margenDesbordamiento) {
          console.log('🔄 OPCIÓN 1.5Y: ELEMENTO SE SALE SOLO HACIA ABAJO CON MARGEN MÍNIMO')

          // Calcular nueva posición Y para que quepa exactamente
          const nuevaYCalculada = Math.max(0, areaLargoCm - dimensionesFinal.largo)

          const elementoReajustado = {
            ...elementoTemporal,
            x: posXActual * CM_TO_PX,
            y: nuevaYCalculada * CM_TO_PX
          }

          const hayColisionesReajustado = verificarColisionesEnPosicion(elementoReajustado, elementosExistentes)

          console.log('🔍 VERIFICACIÓN REAJUSTE Y:', {
            posicionOriginal: posYActual,
            nuevaYCalculada,
            diferencia: posYActual - nuevaYCalculada,
            hayColisiones: hayColisionesReajustado
          })

          if (!hayColisionesReajustado) {
            console.log('✅ PUEDE CRECER CON REAJUSTE MÍNIMO EN Y')
            nuevaX = posXActual
            nuevaY = nuevaYCalculada
            reposicionExitoso = true
          }
        } else if (soloSeSaleEnX && dimensionesFinal.ancho <= espacioTotalDerecha &&
                   ((posXActual + dimensionesFinal.ancho) - areaAnchoCm) <= margenDesbordamiento) {
          console.log('🔄 OPCIÓN 1.5X: ELEMENTO SE SALE SOLO HACIA DERECHA CON MARGEN MÍNIMO')

          // Calcular nueva posición X para que quepa exactamente
          const nuevaXCalculada = Math.max(0, areaAnchoCm - dimensionesFinal.ancho)

          const elementoReajustado = {
            ...elementoTemporal,
            x: nuevaXCalculada * CM_TO_PX,
            y: posYActual * CM_TO_PX
          }

          const hayColisionesReajustado = verificarColisionesEnPosicion(elementoReajustado, elementosExistentes)

          if (!hayColisionesReajustado) {
            console.log('✅ PUEDE CRECER CON REAJUSTE MÍNIMO EN X')
            nuevaX = nuevaXCalculada
            nuevaY = posYActual
            reposicionExitoso = true
          }
        }
      }

      // OPCIÓN 2: Si no puede crecer desde posición actual, probar esquina superior izquierda
      if (!reposicionExitoso) {
        console.log('🔄 OPCIÓN 2: REPOSICIONANDO EN ESQUINA SUPERIOR IZQUIERDA')
        nuevaX = 0
        nuevaY = 0

        console.log('🔄 REPOSICIONANDO EN ESQUINA SUPERIOR IZQUIERDA:', {
          posicionOriginal: { x: posXActual, y: posYActual },
          nuevaPosicion: { x: nuevaX, y: nuevaY },
          razonamiento: 'Permite crecimiento natural: ancho→derecha, largo→abajo'
        })
      }

      // Verificar si cabe en el área desde la nueva posición
      if (nuevaX + dimensionesFinal.ancho <= areaAnchoCm && nuevaY + dimensionesFinal.largo <= areaLargoCm) {
        // Crear elemento temporal en la nueva posición
        const elementoReposicionado = {
          ...elementoTemporal,
          x: nuevaX * CM_TO_PX,
          y: nuevaY * CM_TO_PX
        }

        // Verificar colisiones en la nueva posición
        const hayColisionesEnNuevaPosicion = verificarColisionesEnPosicion(elementoReposicionado, elementosExistentes)

        console.log('🔍 VERIFICACIÓN EN NUEVA POSICIÓN:', {
          nuevaPosicion: { x: nuevaX, y: nuevaY },
          hayColisiones: hayColisionesEnNuevaPosicion,
          elementosAVerificar: elementosExistentes.length,
          opcionUsada: reposicionExitoso ? 'Crecimiento desde posición actual' : 'Reposición en esquina'
        })

        if (!hayColisionesEnNuevaPosicion) {
          nuevaPosicion = { x: nuevaX, y: nuevaY }
          posicionAjustada = (nuevaX !== posXActual || nuevaY !== posYActual)
          elementoTemporal.x = nuevaX * CM_TO_PX
          elementoTemporal.y = nuevaY * CM_TO_PX

          console.log('✅ REPOSICIONAMIENTO EXITOSO')

          // Notificar al usuario sobre el reposicionamiento solo si cambió la posición
          if (posicionAjustada && !toastMostrado && !silencioso) {
            const tiposCambio = []
            if (nuevasDimensiones.ancho && nuevasDimensiones.ancho !== dimensionesActuales.ancho) {
              tiposCambio.push('ancho (crece →)')
            }
            if (nuevasDimensiones.largo && nuevasDimensiones.largo !== dimensionesActuales.largo) {
              tiposCambio.push('largo (crece ↓)')
            }

            toast.showWarning(`El elemento se reposicionó automáticamente para permitir el crecimiento de ${tiposCambio.join(' y ')}.`)
            toastMostrado = true
          }
        } else {
          console.log('❌ NO HAY ESPACIO DISPONIBLE EN NINGUNA POSICIÓN')

          if (!toastMostrado && !silencioso) {
            toast.showError('No hay espacio suficiente para las nuevas dimensiones. Reduce el tamaño o libera espacio en el área.')
            toastMostrado = true
          }

          return {
            valida: false,
            razon: 'No hay espacio suficiente para las nuevas dimensiones',
            accion: 'error'
          }
        }
      } else {
        console.log('❌ ELEMENTO NO CABE EN EL ÁREA TOTAL:', {
          dimensionesDeseadas: { ancho: dimensionesFinal.ancho, largo: dimensionesFinal.largo },
          areaDisponible: { ancho: areaAnchoCm, largo: areaLargoCm }
        })

        if (!toastMostrado && !silencioso) {
          toast.showError('Las nuevas dimensiones son demasiado grandes para el área disponible. Ajusta el tamaño o mueve otros elementos.')
          toastMostrado = true
        }

        return {
          valida: false,
          razon: 'Las nuevas dimensiones exceden el área disponible',
          accion: 'error'
        }
      }
    } else {
      console.log('✅ ELEMENTO CABE EN POSICIÓN ACTUAL - NO NECESITA REPOSICIONAMIENTO')
    }

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

    // VALIDACIÓN 4: Verificar que las nuevas dimensiones contengan a los elementos hijos
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

    // VALIDACIÓN 5: Verificar que el nuevo volumen no sea menor al volumen usado
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

    // PASO 5: Si llegamos aquí, las dimensiones son válidas

    // Mostrar toast de éxito si no se ha mostrado otro toast
    if (!toastMostrado && !silencioso && !posicionAjustada) {
      toast.showSuccess('Dimensiones aplicadas correctamente.')
    }

    return {
      valida: true,
      razon: posicionAjustada
        ? 'Dimensiones aplicadas con ajuste automático de posición para evitar desbordamiento'
        : 'Dimensiones aplicadas correctamente',
      accion: 'aplicar',
      elementoFinal: elementoTemporal,
      posicionAjustada: posicionAjustada,
      nuevaPosicion: posicionAjustada ? nuevaPosicion : undefined
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
      let vistaActual = 'XY' // Por defecto vista planta
      let contenedor = null

      // Si el elemento tiene un padre, estamos en vista frontal XZ
      if (elemento.parentId || elemento.padre) {
        vistaActual = 'XZ'
        const parentId = elemento.parentId || elemento.padre
        contenedor = canvasStore.elementoPorId(parentId)
      } else if (contextoActual && contextoActual.tipo === 'elementos') {
        // Si estamos navegando dentro de un elemento, vista frontal XZ
        vistaActual = 'XZ'
        contenedor = canvasStore.elementoPorId(contextoActual.id)
      }

      console.log('🔍 DETERMINANDO ÁREA CONTENEDORA:', {
        elementoId: elemento.id,
        vistaDetectada: vistaActual,
        contenedorId: contenedor?.id,
        contextoNavegacion: contextoActual
      })

      if (vistaActual === 'XZ' && contenedor && contenedor.dimensiones) {
        // Vista frontal XZ: validar contra ancho × alto del contenedor
        return {
          ancho: contenedor.dimensiones.ancho * CM_TO_PX,
          largo: contenedor.dimensiones.alto * CM_TO_PX, // En vista XZ, Y representa el alto
          vista: 'XZ',
          contenedorId: contenedor.id
        }
      } else {
        // Vista planta XY: usar dimensiones de la planta activa
        let planta = null

        if (contextoActual && contextoActual.tipo === 'planta') {
          planta = canvasStore.elementoPorId(contextoActual.id)
        }

        if (planta && planta.dimensiones) {
          return {
            ancho: planta.dimensiones.ancho * CM_TO_PX,
            largo: planta.dimensiones.largo * CM_TO_PX,
            vista: 'XY',
            plantaId: planta.id
          }
        }

        // Fallback por defecto: 5m x 5m en vista XY
        console.warn('No se pudo determinar el área contenedora, usando 5m x 5m por defecto en vista XY')
        return {
          ancho: 500 * CM_TO_PX, // 5m = 500cm
          largo: 500 * CM_TO_PX,  // 5m = 500cm
          vista: 'XY',
          esDefault: true
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
   * Verifica si hay colisiones en una posición específica
   */
  function verificarColisionesEnPosicion(elementoTemporal, elementosExistentes) {
    const tolerancia = 0.1 // 1mm de tolerancia

    for (const elemento of elementosExistentes) {
      const elPosX = (elemento.x || 0) / CM_TO_PX
      const elPosY = (elemento.y || 0) / CM_TO_PX
      const elAncho = (elemento.width || 0) / CM_TO_PX
      const elLargo = (elemento.height || 0) / CM_TO_PX

      const tempPosX = elementoTemporal.x / CM_TO_PX
      const tempPosY = elementoTemporal.y / CM_TO_PX
      const tempAncho = elementoTemporal.width / CM_TO_PX
      const tempLargo = elementoTemporal.height / CM_TO_PX

      // Verificar solapamiento
      const solapamientoX = Math.min(tempPosX + tempAncho, elPosX + elAncho) - Math.max(tempPosX, elPosX)
      const solapamientoY = Math.min(tempPosY + tempLargo, elPosY + elLargo) - Math.max(tempPosY, elPosY)

      if (solapamientoX > tolerancia && solapamientoY > tolerancia) {
        return true // Hay colisión
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
        razon: `El elemento se sale del área por ${exceso.toFixed(1)}cm en el ancho (posición: ${posXCm.toFixed(1)}cm + ancho: ${anchoCm}cm = ${(posXCm + anchoCm).toFixed(1)}cm > área: ${areaAnchoCm}cm) en vista ${vista}`,
        sugerencias: [`Reducir ancho en ${exceso.toFixed(1)}cm`],
        vista: vista
      }
    }

    if (posYCm + dimension2Cm > areaDimension2Cm) {
      const exceso = (posYCm + dimension2Cm) - areaDimension2Cm
      return {
        cabe: false,
        razon: `El elemento se sale del área por ${exceso.toFixed(1)}cm en el ${dimension2Nombre} (posición: ${posYCm.toFixed(1)}cm + ${dimension2Nombre}: ${dimension2Cm}cm = ${(posYCm + dimension2Cm).toFixed(1)}cm > área: ${areaDimension2Cm}cm) en vista ${vista}`,
        sugerencias: [`Reducir ${dimension2Nombre} en ${exceso.toFixed(1)}cm`],
        vista: vista
      }
    }

    // Verificar si hay elementos que obstruyen el espacio
    for (const elemento of elementosExistentes) {
      const elPosX = (elemento.x || 0) / CM_TO_PX
      const elPosY = (elemento.y || 0) / CM_TO_PX
      const elAncho = (elemento.width || 0) / CM_TO_PX
      const elDimension2 = (elemento.height || 0) / CM_TO_PX // largo en XY, alto en XZ

      // Verificar si hay solapamiento real (no solo adyacencia)
      const solapamientoX = Math.min(posXCm + anchoCm, elPosX + elAncho) - Math.max(posXCm, elPosX)
      const solapamientoY = Math.min(posYCm + dimension2Cm, elPosY + elDimension2) - Math.max(posYCm, elPosY)

      console.log(`🔍 Verificando solapamiento con elemento ${elemento.id} en vista ${vista}:`, {
        elementoActual: esVistaFrontal ?
          { x: posXCm, y: posYCm, ancho: anchoCm, alto: dimension2Cm } :
          { x: posXCm, y: posYCm, ancho: anchoCm, largo: dimension2Cm },
        elementoExistente: esVistaFrontal ?
          { x: elPosX, y: elPosY, ancho: elAncho, alto: elDimension2 } :
          { x: elPosX, y: elPosY, ancho: elAncho, largo: elDimension2 },
        solapamiento: { x: solapamientoX, y: solapamientoY }
      })

      // Si hay solapamiento real (mayor a una tolerancia mínima)
      const tolerancia = 0.1 // 1mm de tolerancia
      if (solapamientoX > tolerancia && solapamientoY > tolerancia) {
        return {
          cabe: false,
          razon: `El elemento se solaparía ${solapamientoX.toFixed(1)}cm x ${solapamientoY.toFixed(1)}cm con el elemento ${elemento.id} en vista ${vista}`,
          sugerencias: ['Reducir las dimensiones para evitar solapamiento', 'Cambiar la posición del elemento'],
          vista: vista
        }
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
        problemas.push(`se sale ${exceso.toFixed(1)}cm en el ancho`)
        sugerencias.push(`Reducir ancho en ${exceso.toFixed(1)}cm o mover hacia la izquierda`)
      }

      if (!validacion.dentroEnDimension2) {
        const exceso = calculo.elementoFinal.y - calculo.area.dimension2
        problemas.push(`se sale ${exceso.toFixed(1)}cm en el ${dimension2Nombre}`)
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
   * Considera la vista frontal (XZ) usando coordenadas Konva: x = ancho, y = alto
   * IMPORTANTE: Valida posición + dimensión para verificar que el hijo no se salga del área del padre
   * @param {Object} elemento - Elemento con las nuevas dimensiones a validar
   * @returns {Object} Resultado de la validación
   */
  function validarContencionHijos(elemento) {
    const hijos = canvasStore.elementos.filter(el => el.padre === elemento.id);

    if (hijos.length === 0) {
      return { valida: true, razon: 'No tiene elementos hijos' };
    }

    console.log('🔍 VALIDANDO CONTENCIÓN DE HIJOS:', {
      elementoPadre: elemento.id,
      cantidadHijos: hijos.length,
      dimensionesPadre: elemento.dimensiones
    });

    const dimensionesPadre = elemento.dimensiones;
    const problemasContención = [];

    for (const hijo of hijos) {
      // Obtener posición del hijo dentro del padre (en cm)
      // En vista frontal XZ usando coordenadas Konva: x = ancho, y = alto
      const posHijoX = (hijo.x || 0) / CM_TO_PX; // Posición en ancho
      const posHijoY = (hijo.y || 0) / CM_TO_PX; // Posición en alto (no z!)

      // Obtener dimensiones del hijo (en cm)
      const dimHijo = hijo.dimensiones || {};
      const anchoHijo = dimHijo.ancho || 0;
      const altoHijo = dimHijo.alto || 0;

      // Calcular límites del hijo en vista frontal (XZ)
      // IMPORTANTE: posición + dimensión = límite final
      const limiteDerechoHijo = posHijoX + anchoHijo;
      const limiteAltoHijo = posHijoY + altoHijo;

      console.log(`🔍 Analizando hijo ${hijo.id}:`, {
        posicion: { x: posHijoX, y: posHijoY },
        dimensiones: { ancho: anchoHijo, alto: altoHijo },
        limites: { derecho: limiteDerechoHijo, alto: limiteAltoHijo },
        padreDisponible: { ancho: dimensionesPadre.ancho, alto: dimensionesPadre.alto },
        validacionAncho: limiteDerechoHijo <= dimensionesPadre.ancho,
        validacionAlto: limiteAltoHijo <= dimensionesPadre.alto
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
          mensaje: `El elemento ${hijo.nombre || hijo.id} se sale ${exceso.toFixed(1)}cm en ancho`
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
          mensaje: `El elemento ${hijo.nombre || hijo.id} se sale ${exceso.toFixed(1)}cm en alto`
        });
      }
    }

    if (problemasContención.length > 0) {
      const mensajesProblemas = problemasContención.map(p => p.mensaje);
      const excesoAncho = Math.max(0, ...problemasContención.filter(p => p.tipo === 'ancho').map(p => p.exceso));
      const excesoAlto = Math.max(0, ...problemasContención.filter(p => p.tipo === 'alto').map(p => p.exceso));

      const sugerencias = [];
      if (excesoAncho > 0) {
        sugerencias.push(`Aumentar ancho en ${excesoAncho.toFixed(1)}cm`);
      }
      if (excesoAlto > 0) {
        sugerencias.push(`Aumentar alto en ${excesoAlto.toFixed(1)}cm`);
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

        // Aplicar posición ajustada si la hubo
        if (resultado.posicionAjustada || (resultado.elementoFinal.x !== elemento.x || resultado.elementoFinal.y !== elemento.y)) {
          actualizaciones.x = resultado.elementoFinal.x
          actualizaciones.y = resultado.elementoFinal.y
          console.log('Aplicando posición ajustada:', { x: resultado.elementoFinal.x, y: resultado.elementoFinal.y })
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
      dimensionesAplicadas: resultado.dimensionesAplicadas || resultado.elementoFinal?.dimensiones,
      posicionAjustada: actualizaciones.x !== undefined || actualizaciones.y !== undefined
    }
  }

  return {
    validarDimensiones,
    aplicarResultadoValidacion
  }
}
