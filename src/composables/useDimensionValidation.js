import { useCanvasStore } from '@/composables/useCanvasStore'
import { useToast } from '@/composables/useToast'
import { detectConflictsFor } from '@/utils/collision'
import { CM_TO_PX } from '@/utils/constants'

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

    console.log('🔍 VALIDACIÓN DE DIMENSIONES - INICIO:', {
      elementoId: elementoId,
      dimensionesActuales: elemento ? { ancho: elemento.ancho, largo: elemento.largo, alto: elemento.alto } : 'no encontrado',
      dimensionesNuevas: nuevasDimensiones,
      dimensionesFinal: dimensionesFinal,
      areaTotal: { ancho: areaTotal.ancho / CM_TO_PX, largo: areaTotal.largo / CM_TO_PX },
      posicionActual: { x: elemento.x / CM_TO_PX, y: elemento.y / CM_TO_PX },
      dimensionesActualesPx: { width: elemento.width / CM_TO_PX, height: elemento.height / CM_TO_PX }
    })

    // PASO 1: Crear elemento temporal con las nuevas dimensiones
    const widthPx = dimensionesFinal.ancho * CM_TO_PX
    const heightPx = dimensionesFinal.largo * CM_TO_PX

    let elementoTemporal = {
      ...elemento,
      width: widthPx,
      height: heightPx,
      dimensiones: dimensionesFinal
    }

    console.log('🔍 ELEMENTO TEMPORAL CREADO:', {
      id: elementoTemporal.id,
      posicionOriginal: { x: elementoTemporal.x / CM_TO_PX, y: elementoTemporal.y / CM_TO_PX },
      dimensionesOriginales: { width: elemento.width / CM_TO_PX, height: elemento.height / CM_TO_PX },
      dimensionesNuevas: { width: elementoTemporal.width / CM_TO_PX, height: elementoTemporal.height / CM_TO_PX }
    })

    // PASO 2: Verificar si necesitamos reposicionar el elemento
    let posicionAjustada = false
    let nuevaPosicion = { x: elementoTemporal.x / CM_TO_PX, y: elementoTemporal.y / CM_TO_PX }

    const areaAnchoCm = areaTotal.ancho / CM_TO_PX
    const areaLargoCm = areaTotal.largo / CM_TO_PX
    const posXActual = elementoTemporal.x / CM_TO_PX
    const posYActual = elementoTemporal.y / CM_TO_PX

    console.log('🔍 VERIFICANDO SI NECESITA REPOSICIONAMIENTO:', {
      posicionActual: { x: posXActual, y: posYActual },
      dimensionesDeseadas: { ancho: dimensionesFinal.ancho, largo: dimensionesFinal.largo },
      areaTotal: { ancho: areaAnchoCm, largo: areaLargoCm },
      seSaleEnX: posXActual + dimensionesFinal.ancho > areaAnchoCm,
      seSaleEnY: posYActual + dimensionesFinal.largo > areaLargoCm,
      posicionFinalX: posXActual + dimensionesFinal.ancho,
      posicionFinalY: posYActual + dimensionesFinal.largo,
      espacioDisponibleAbajo: areaLargoCm - posYActual
    })

    // Verificar si se sale del área O si hay colisiones en posición actual
    const seSaleDelArea = (posXActual + dimensionesFinal.ancho > areaAnchoCm || posYActual + dimensionesFinal.largo > areaLargoCm)

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

    // PASO 4: Si llegamos aquí, las dimensiones son válidas

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
   * Obtiene las dimensiones del área contenedora (planta)
   */
  function obtenerDimensionesArea(elemento) {
    try {
      // Si el elemento tiene un padre, usar sus dimensiones
      if (elemento.parentId) {
        const parent = canvasStore.elementoPorId(elemento.parentId)
        if (parent && parent.dimensiones) {
          return {
            ancho: parent.dimensiones.ancho * CM_TO_PX,
            largo: parent.dimensiones.largo * CM_TO_PX
          }
        }
      }

      // Usar las dimensiones de la planta activa
      const contextoActual = canvasStore.contextoNavegacion
      if (contextoActual && contextoActual.tipo === 'planta') {
        const planta = canvasStore.elementoPorId(contextoActual.id)
        if (planta && planta.dimensiones) {
          return {
            ancho: planta.dimensiones.ancho * CM_TO_PX,
            largo: planta.dimensiones.largo * CM_TO_PX
          }
        }
      }

      // Fallback por defecto: 5m x 5m
      console.warn('No se pudo determinar el área contenedora, usando 5m x 5m por defecto')
      return {
        ancho: 500 * CM_TO_PX, // 5m = 500cm
        largo: 500 * CM_TO_PX  // 5m = 500cm
      }
    } catch (error) {
      console.error('Error al obtener dimensiones del área:', error)
      return {
        ancho: 500 * CM_TO_PX,
        largo: 500 * CM_TO_PX
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
   * Calcula el espacio real disponible considerando la posición específica del elemento
   */
  function calcularEspacioRealDisponible(elementoTemporal, elementosExistentes, areaTotal) {
    const posXCm = elementoTemporal.x / CM_TO_PX
    const posYCm = elementoTemporal.y / CM_TO_PX
    const anchoCm = elementoTemporal.width / CM_TO_PX
    const largoCm = elementoTemporal.height / CM_TO_PX
    const areaAnchoCm = areaTotal.ancho / CM_TO_PX
    const areaLargoCm = areaTotal.largo / CM_TO_PX

    console.log('🔍 CALCULANDO ESPACIO REAL DISPONIBLE:', {
      elementoPos: { x: posXCm, y: posYCm },
      elementoDims: { ancho: anchoCm, largo: largoCm },
      areaTotal: { ancho: areaAnchoCm, largo: areaLargoCm }
    })

    // Verificar si el elemento cabe en el área total
    if (posXCm + anchoCm > areaAnchoCm) {
      const exceso = (posXCm + anchoCm) - areaAnchoCm
      return {
        cabe: false,
        razon: `El elemento se sale del área por ${exceso.toFixed(1)}cm en el ancho (posición: ${posXCm.toFixed(1)}cm + ancho: ${anchoCm}cm = ${(posXCm + anchoCm).toFixed(1)}cm > área: ${areaAnchoCm}cm)`,
        sugerencias: [`Reducir ancho en ${exceso.toFixed(1)}cm`]
      }
    }

    if (posYCm + largoCm > areaLargoCm) {
      const exceso = (posYCm + largoCm) - areaLargoCm
      return {
        cabe: false,
        razon: `El elemento se sale del área por ${exceso.toFixed(1)}cm en el largo (posición: ${posYCm.toFixed(1)}cm + largo: ${largoCm}cm = ${(posYCm + largoCm).toFixed(1)}cm > área: ${areaLargoCm}cm)`,
        sugerencias: [`Reducir largo en ${exceso.toFixed(1)}cm`]
      }
    }

    // Verificar si hay elementos que obstruyen el espacio
    for (const elemento of elementosExistentes) {
      const elPosX = (elemento.x || 0) / CM_TO_PX
      const elPosY = (elemento.y || 0) / CM_TO_PX
      const elAncho = (elemento.width || 0) / CM_TO_PX
      const elLargo = (elemento.height || 0) / CM_TO_PX

      // Verificar si hay solapamiento real (no solo adyacencia)
      const solapamientoX = Math.min(posXCm + anchoCm, elPosX + elAncho) - Math.max(posXCm, elPosX)
      const solapamientoY = Math.min(posYCm + largoCm, elPosY + elLargo) - Math.max(posYCm, elPosY)

      console.log(`🔍 Verificando solapamiento con elemento ${elemento.id}:`, {
        elementoActual: { x: posXCm, y: posYCm, ancho: anchoCm, largo: largoCm },
        elementoExistente: { x: elPosX, y: elPosY, ancho: elAncho, largo: elLargo },
        solapamiento: { x: solapamientoX, y: solapamientoY }
      })

      // Si hay solapamiento real (mayor a una tolerancia mínima)
      const tolerancia = 0.1 // 1mm de tolerancia
      if (solapamientoX > tolerancia && solapamientoY > tolerancia) {
        return {
          cabe: false,
          razon: `El elemento se solaparía ${solapamientoX.toFixed(1)}cm x ${solapamientoY.toFixed(1)}cm con el elemento ${elemento.id}`,
          sugerencias: ['Reducir las dimensiones para evitar solapamiento', 'Cambiar la posición del elemento']
        }
      }
    }

    return {
      cabe: true,
      razon: 'El elemento cabe en el espacio disponible sin colisiones'
    }
  }

  /**
   * Verifica si un elemento cabe dentro de los límites del área
   */
  function verificarLimitesArea(elemento, areaTotal) {
    const margen = 0.1 * CM_TO_PX // 1mm de margen
    const elementoFinalX = elemento.x + elemento.width
    const elementoFinalY = elemento.y + elemento.height

    const calculo = {
      elementoPos: { x: elemento.x / CM_TO_PX, y: elemento.y / CM_TO_PX },
      elementoDims: { ancho: elemento.width / CM_TO_PX, largo: elemento.height / CM_TO_PX },
      elementoFinal: { x: elementoFinalX / CM_TO_PX, y: elementoFinalY / CM_TO_PX },
      area: { ancho: areaTotal.ancho / CM_TO_PX, largo: areaTotal.largo / CM_TO_PX },
      limites: {
        xValido: elementoFinalX <= (areaTotal.ancho + margen),
        yValido: elementoFinalY <= (areaTotal.largo + margen)
      }
    }

    const validacion = {
      dentroEnX: calculo.limites.xValido,
      dentroEnY: calculo.limites.yValido,
      cabe: calculo.limites.xValido && calculo.limites.yValido
    }

    console.log('Debug verificarLimitesArea:', {
      elemento: {
        posicion: calculo.elementoPos,
        dimensiones: calculo.elementoDims,
        posicionFinal: calculo.elementoFinal
      },
      calculo: calculo,
      area: calculo.area,
      validacion: validacion
    })

    if (!validacion.cabe) {
      const problemas = []
      const sugerencias = []

      if (!validacion.dentroEnX) {
        const exceso = calculo.elementoFinal.x - calculo.area.ancho
        problemas.push(`se sale ${exceso.toFixed(1)}cm en el ancho`)
        sugerencias.push(`Reducir ancho en ${exceso.toFixed(1)}cm o mover hacia la izquierda`)
      }

      if (!validacion.dentroEnY) {
        const exceso = calculo.elementoFinal.y - calculo.area.largo
        problemas.push(`se sale ${exceso.toFixed(1)}cm en el largo`)
        sugerencias.push(`Reducir largo en ${exceso.toFixed(1)}cm o mover hacia arriba`)
      }

      return {
        cabe: false,
        razon: `El elemento ${problemas.join(' y ')}`,
        sugerencias: sugerencias
      }
    }

    return {
      cabe: true,
      razon: 'El elemento cabe dentro del área'
    }
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
