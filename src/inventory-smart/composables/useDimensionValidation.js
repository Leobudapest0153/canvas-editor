import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useToast } from '@/inventory-smart/composables/useToast'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'

/**
 * Composable para validar dimensiones físicas de elementos
 */
export function useDimensionValidation() {
  const canvasStore = useCanvasStore()

  /**
   * Valida SOLO las dimensiones físicas del elemento
   * NO valida posicionamiento, colisiones o límites de área
   * @param {string} elementoId - ID del elemento a redimensionar
   * @param {Object} nuevasDimensiones - Nuevas dimensiones en cm
   * @param {number} nuevasDimensiones.ancho - Nuevo ancho en cm
   * @param {number} nuevasDimensiones.largo - Nuevo largo en cm (opcional)
   * @param {number} nuevasDimensiones.alto - Nuevo alto en cm (opcional)
   * @returns {Object} Resultado de la validación
   */
  function validarDimensiones(elementoId, nuevasDimensiones, opciones = {}) {
    const toast = useToast()
    const silencioso = opciones.silencioso || false

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

    console.log('🔍 VALIDACIÓN DE DIMENSIONES FÍSICAS - INICIO:', {
      elementoId: elementoId,
      dimensionesActuales: dimensionesActuales,
      dimensionesNuevas: nuevasDimensiones,
      dimensionesFinal: dimensionesFinal
    })

    // PASO 2: Crear elemento temporal con las nuevas dimensiones
    const vista = canvasStore.vistaActiva || 'XY'
    const esVistaFrontal = vista === 'XZ'

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

    console.log('🔍 ELEMENTO TEMPORAL CREADO:', {
      id: elementoTemporal.id,
      vista: vista,
      dimensionesOriginales: elemento.dimensiones,
      dimensionesNuevas: dimensionesFinal,
      pixelesNuevos: { width: widthPx, height: heightPx }
    })

    // PASO 3: Validar contención de elementos hijos
    const validacionHijos = validarContencionHijos(elementoTemporal)
    if (!validacionHijos.valida) {
      console.log('❌ VALIDACIÓN DE HIJOS FALLIDA:', validacionHijos.razon)
      if (!silencioso) {
        toast.showError(validacionHijos.razon)
      }
      return validacionHijos
    }

    // PASO 4: Validar contención en contenedor padre
    const validacionPadre = validarContencionEnPadre(elementoTemporal)
    if (!validacionPadre.valida) {
      console.log('❌ VALIDACIÓN DE CONTENCIÓN EN PADRE FALLIDA:', validacionPadre.razon)
      if (!silencioso) {
        toast.showError(validacionPadre.razon)
      }
      return validacionPadre
    }

    // PASO 5: Validar volumen mínimo
    const validacionVolumen = validarVolumenMinimo(elementoTemporal)
    if (!validacionVolumen.valida) {
      console.log('❌ VALIDACIÓN DE VOLUMEN FALLIDA:', validacionVolumen.razon)
      if (!silencioso) {
        toast.showError(validacionVolumen.razon)
      }
      return validacionVolumen
    }

    console.log('✅ TODAS LAS VALIDACIONES DE DIMENSIONES FÍSICAS EXITOSAS')

    // Mostrar toast de éxito si no se ha mostrado otro toast
    if (!silencioso) {
      toast.showSuccess('Dimensiones físicas válidas.')
    }

    return {
      valida: true,
      razon: 'Dimensiones físicas válidas',
      accion: 'aplicar',
      elementoFinal: elementoTemporal
    }
  }

  /**
   * Valida que las nuevas dimensiones del elemento sean suficientes para contener a sus elementos hijos
   * Considera la vista actual para mapear correctamente posiciones 2D a dimensiones 3D
   * @param {Object} elemento - Elemento con las nuevas dimensiones a validar
   * @returns {Object} Resultado de la validación
   */
  function validarContencionHijos(elemento) {
    const hijos = canvasStore.elementos.filter(el => el.padre === elemento.id);

    if (hijos.length === 0) {
      return { valida: true, razon: 'No tiene elementos hijos' };
    }

    const vista = canvasStore.vistaActiva || 'XY'
    const esVistaFrontal = vista === 'XZ'

    console.log('🔍 VALIDANDO CONTENCIÓN DE HIJOS:', {
      elementoPadre: elemento.id,
      cantidadHijos: hijos.length,
      vista: vista,
      esVistaFrontal: esVistaFrontal,
      dimensionesPadre: elemento.dimensiones
    });

    const dimensionesPadre = elemento.dimensiones;
    const problemasContención = [];

    // Obtener dimensiones del área disponible del padre según la vista
    // Para validar hijos, usamos las dimensiones 3D del elemento que está siendo redimensionado
    let anchoPadreCanvas, altoPadreCanvas;
    if (esVistaFrontal) {
      // Vista XZ: área disponible es ancho × alto
      anchoPadreCanvas = dimensionesPadre.ancho;
      altoPadreCanvas = dimensionesPadre.alto;
    } else {
      // Vista XY: área disponible es ancho × largo
      anchoPadreCanvas = dimensionesPadre.ancho;
      altoPadreCanvas = dimensionesPadre.largo;
    }

    for (const hijo of hijos) {
      // Obtener posición del hijo en el canvas (en cm)
      const posHijoX = (hijo.x || 0) / CM_TO_PX; // Posición X en canvas
      const posHijoY = (hijo.y || 0) / CM_TO_PX; // Posición Y en canvas

      // Obtener dimensiones del hijo según la vista
      const dimHijo = hijo.dimensiones || {};
      let anchoHijoCanvas, altoHijoCanvas;

      if (esVistaFrontal) {
        // Vista XZ: hijo ocupa ancho × alto en canvas
        anchoHijoCanvas = dimHijo.ancho || 0;
        altoHijoCanvas = dimHijo.alto || 0;
      } else {
        // Vista XY: hijo ocupa ancho × largo en canvas
        anchoHijoCanvas = dimHijo.ancho || 0;
        altoHijoCanvas = dimHijo.largo || 0;
      }

      // Calcular límites del hijo en el canvas
      const limiteDerechoHijo = posHijoX + anchoHijoCanvas;
      const limiteAbajoHijo = posHijoY + altoHijoCanvas;

      console.log(`🔍 Analizando hijo ${hijo.id} en vista ${vista}:`, {
        posicionCanvas: { x: posHijoX, y: posHijoY },
        dimensionesCanvas: { ancho: anchoHijoCanvas, alto: altoHijoCanvas },
        limitesCanvas: { derecho: limiteDerechoHijo, abajo: limiteAbajoHijo },
        areaDisponiblePadre: { ancho: anchoPadreCanvas, alto: altoPadreCanvas },
        validaciones: {
          cabeEnAncho: limiteDerechoHijo <= anchoPadreCanvas,
          cabeEnAlto: limiteAbajoHijo <= altoPadreCanvas
        }
      });

      // Verificar si el hijo se sale en ancho (eje X)
      if (limiteDerechoHijo > anchoPadreCanvas) {
        const exceso = limiteDerechoHijo - anchoPadreCanvas;
        problemasContención.push({
          hijo: hijo.id,
          tipo: 'ancho',
          exceso: exceso,
          posicion: posHijoX,
          dimension: anchoHijoCanvas,
          limite: limiteDerechoHijo,
          mensaje: `El elemento ${hijo.nombre || hijo.id} se sale ${exceso.toFixed(1)}cm en ancho`
        });
      }

      // Verificar si el hijo se sale en la segunda dimensión (eje Y)
      if (limiteAbajoHijo > altoPadreCanvas) {
        const exceso = limiteAbajoHijo - altoPadreCanvas;
        const nombreDimension = esVistaFrontal ? 'alto' : 'largo';
        problemasContención.push({
          hijo: hijo.id,
          tipo: nombreDimension,
          exceso: exceso,
          posicion: posHijoY,
          dimension: altoHijoCanvas,
          limite: limiteAbajoHijo,
          mensaje: `El elemento ${hijo.nombre || hijo.id} se sale ${exceso.toFixed(1)}cm en ${nombreDimension}`
        });
      }
    }

    if (problemasContención.length > 0) {
      const mensajesProblemas = problemasContención.map(p => p.mensaje);
      const excesoAncho = Math.max(0, ...problemasContención.filter(p => p.tipo === 'ancho').map(p => p.exceso));
      const excesoSegundo = Math.max(0, ...problemasContención.filter(p => p.tipo !== 'ancho').map(p => p.exceso));

      const sugerencias = [];
      if (excesoAncho > 0) {
        sugerencias.push(`Aumentar ancho ${excesoAncho.toFixed(1)}cm más`);
      }
      if (excesoSegundo > 0) {
        const nombreDimension = esVistaFrontal ? 'alto' : 'largo';
        sugerencias.push(`Aumentar ${nombreDimension} ${excesoSegundo.toFixed(1)}cm más`);
      }

      console.log('❌ PROBLEMAS DE CONTENCIÓN DETECTADOS:', mensajesProblemas);

      return {
        valida: false,
        razon: `Las nuevas dimensiones no son suficientes para contener a los elementos en su interior`,
        sugerencias: sugerencias,
        problemasDetallados: problemasContención
      };
    }

    return { valida: true, razon: `Todos los elementos hijos caben dentro de las nuevas dimensiones en vista ${vista}` };
  }

  /**
   * Valida que el elemento con sus nuevas dimensiones quepa dentro de su contenedor padre
   * Considera la vista actual para mapear correctamente posiciones 2D a dimensiones 3D
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

    const vista = canvasStore.vistaActiva || 'XY'
    const esVistaFrontal = vista === 'XZ'

    // Obtener el área real disponible del canvas
    const { width: widthCanvasPx, height: heightCanvasPx } = canvasStore.canvasAdaptativo
    const anchoAreaDisponible = widthCanvasPx / CM_TO_PX  // Convertir a cm
    const altoAreaDisponible = heightCanvasPx / CM_TO_PX   // Convertir a cm

    console.log('🔍 VALIDANDO CONTENCIÓN EN PADRE (CANVAS REAL):', {
      elemento: elemento.id,
      padre: padre.id,
      vista: vista,
      esVistaFrontal: esVistaFrontal,
      dimensionesElemento: elemento.dimensiones,
      dimensionesPadre: padre.dimensiones,
      areaRealDisponible: { ancho: anchoAreaDisponible, alto: altoAreaDisponible },
      canvasAdaptativo: { widthPx: widthCanvasPx, heightPx: heightCanvasPx },
      posicionKonva: { x: elemento.x, y: elemento.y }
    });

    const dimElemento = elemento.dimensiones;

    // Obtener posición del elemento en el canvas (en cm)
    const posCanvasX = (elemento.x || 0) / CM_TO_PX; // Posición X en canvas
    const posCanvasY = (elemento.y || 0) / CM_TO_PX; // Posición Y en canvas

    // Obtener dimensiones del elemento en el canvas según la vista
    let anchoCanvas, altoCanvas;
    if (esVistaFrontal) {
      // Vista XZ: canvas muestra ancho × alto
      anchoCanvas = dimElemento.ancho;
      altoCanvas = dimElemento.alto;
    } else {
      // Vista XY: canvas muestra ancho × largo
      anchoCanvas = dimElemento.ancho;
      altoCanvas = dimElemento.largo;
    }

    // Calcular límites del elemento en el canvas
    const limiteDerecho = posCanvasX + anchoCanvas;
    const limiteAbajo = posCanvasY + altoCanvas;

    const problemas = [];

    console.log(`🔍 Verificando elemento ${elemento.id} en padre ${padre.id} (Vista ${vista}):`, {
      posicionCanvas: { x: posCanvasX, y: posCanvasY },
      dimensionesCanvas: { ancho: anchoCanvas, alto: altoCanvas },
      limitesCanvas: { derecho: limiteDerecho, abajo: limiteAbajo },
      areaRealDisponible: { ancho: anchoAreaDisponible, alto: altoAreaDisponible },
      validaciones: {
        cabeEnAncho: limiteDerecho <= anchoAreaDisponible,
        cabeEnAlto: limiteAbajo <= altoAreaDisponible
      },
      vista: vista
    });

    // Verificar si se sale en ancho (eje X)
    if (limiteDerecho > anchoAreaDisponible) {
      const exceso = limiteDerecho - anchoAreaDisponible;
      problemas.push({
        tipo: 'ancho',
        exceso: exceso,
        mensaje: `El elemento se sale ${exceso.toFixed(1)}cm en ancho`
      });
    }

    // Verificar si se sale en la segunda dimensión (eje Y)
    if (limiteAbajo > altoAreaDisponible) {
      const exceso = limiteAbajo - altoAreaDisponible;
      const nombreDimension = esVistaFrontal ? 'alto' : 'largo';
      problemas.push({
        tipo: nombreDimension,
        exceso: exceso,
        mensaje: `El elemento se sale ${exceso.toFixed(1)}cm en ${nombreDimension}`
      });
    }

    if (problemas.length > 0) {
      const mensajesProblemas = problemas.map(p => p.mensaje);
      const sugerencias = [];

      problemas.forEach(p => {
        if (p.tipo === 'ancho') {
          sugerencias.push(`Reducir ancho ${p.exceso.toFixed(1)}cm o mover hacia la izquierda`);
        } else if (p.tipo === 'alto') {
          sugerencias.push(`Reducir alto ${p.exceso.toFixed(1)}cm o mover hacia arriba`);
        } else if (p.tipo === 'largo') {
          sugerencias.push(`Reducir largo ${p.exceso.toFixed(1)}cm o mover hacia arriba`);
        }
      });

      return {
        valida: false,
        razon: `El elemento no cabe dentro del área real disponible: ${mensajesProblemas.join(', ')}`,
        sugerencias: sugerencias,
        problemasDetallados: problemas
      };
    }

    return { valida: true, razon: `El elemento cabe correctamente dentro del área real disponible en vista ${vista}` };
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

  return {
    validarDimensiones
  }
}
