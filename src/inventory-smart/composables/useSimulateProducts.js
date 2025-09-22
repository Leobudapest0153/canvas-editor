// src/inventory-smart/composables/simulateProducts.js

import { nextTick } from 'vue';

// Debido a cambios en req, no es posible validar volumen real
// mantener desactivado
const ENABLE_VOLUME_SIMULATION = false;

/**
 * Determina el color de estado basado en un porcentaje de uso.
 * @param {number} porcentaje - El porcentaje de 0 a 100.
 * @returns {string} - El código de color hexadecimal.
 */
const getUsoColor = (porcentaje) => {
  if (porcentaje < 50) return '#10b981'; // Verde
  if (porcentaje < 85) return '#f59e0b'; // Amarillo
  return '#ef4444'; // Rojo
};

/**
 * Calcula el porcentaje de uso basado en valor actual y máximo.
 * @param {number} valorActual - El valor actual usado.
 * @param {number} valorMaximo - El valor máximo soportado.
 * @returns {number} - El porcentaje de uso (0-100).
 */
const calcularPorcentajeUso = (valorActual, valorMaximo) => {
  if (valorMaximo === 0) return 0;
  return Math.min(100, (valorActual / valorMaximo) * 100);
};

/**
 * Prepara los datos de uso (peso y volumen) para la visualización.
 * @param {Object} elemento - El elemento a evaluar.
 * @returns {Array|null} - Un array con objetos para cada barra de progreso o null.
 */
export const getUsoInfo = (elemento) => {
  // Solo mostrar si el elemento tiene la propiedad 'uso' y al menos el peso es mayor que cero
  if (!elemento.uso || elemento.uso.peso === 0) {
    return null;
  }

  // Calcular porcentajes basados en los valores máximos del elemento
  const porcentajePeso = calcularPorcentajeUso(elemento.uso.peso, elemento.capacidadCarga || 0);

  const result = [
    {
      tipo: 'Peso',
      porcentaje: porcentajePeso,
      color: getUsoColor(porcentajePeso),
      valorActual: elemento.uso.peso,
      valorMaximo: elemento.capacidadCarga || 0,
      unidad: 'kg'
    },
  ];

  // Solo incluir volumen si está habilitado
  if (ENABLE_VOLUME_SIMULATION && elemento.uso.volumen > 0) {
    const porcentajeVolumen = calcularPorcentajeUso(elemento.uso.volumen, elemento.volumenMaximo || 0);
    result.unshift({
      tipo: 'Volumen',
      porcentaje: porcentajeVolumen,
      color: getUsoColor(porcentajeVolumen),
      valorActual: elemento.uso.volumen,
      valorMaximo: elemento.volumenMaximo || 0,
      unidad: 'm³'
    });
  }

  return result;
};

/**
 * Obtiene el color del indicador de uso basado en el porcentaje de peso.
 * @param {Object} elemento - El elemento a evaluar.
 * @returns {string|null} - El color del indicador o null si no tiene datos de uso.
 */
export const getUsageIndicatorColor = (elemento) => {
  // Verificar si el elemento tiene datos de uso
  if (!elemento?.uso || elemento?.uso?.peso === 0) {
    return null;
  }

  const porcentajePeso = calcularPorcentajeUso(elemento.uso.peso, elemento.capacidadCarga || 0);
  return getUsoColor(porcentajePeso);
};

/**
 * Limpia los datos de uso de un elemento y sus hijos recursivamente.
 * @param {Object} elemento - El elemento a limpiar.
 * @param {Function} elementoPorId - Función para obtener elemento por ID.
 * @returns {Object} - El elemento limpio sin datos de uso.
 */
export const limpiarDatosUso = (elemento, elementoPorId = null) => {
  if (!elemento) return elemento;

  // Crear una copia del elemento sin datos de uso
  const elementoLimpio = { ...elemento };
  delete elementoLimpio.uso;

  // Si tiene hijos, limpiarlos recursivamente
  if (elementoLimpio.hijos && Array.isArray(elementoLimpio.hijos) && elementoPorId) {
    elementoLimpio.hijos = elementoLimpio.hijos.map(hijoId => {
      const hijo = elementoPorId(hijoId);
      if (hijo) {
        return limpiarDatosUso(hijo, elementoPorId);
      }
      return hijoId;
    });
  }

  return elementoLimpio;
};

/**
 * Limpia los datos de uso de una estructura de elementos.
 * @param {Object} estructura - La estructura que contiene elementos.
 * @returns {Object} - La estructura limpia sin datos de uso.
 */
export const limpiarDatosUsoEstructura = (estructura) => {
  if (!estructura || !estructura.elements) return estructura;

  const estructuraLimpia = { ...estructura };
  estructuraLimpia.elements = estructura.elements.map(elemento => {
    const elementoLimpio = { ...elemento };
    delete elementoLimpio.uso;
    return elementoLimpio;
  });

  return estructuraLimpia;
};

/**
 * Composable para manejar la lógica de simulación de llenado.
 * @param {Object} options - Dependencias.
 * @param {Object} options.canvasStore - La instancia del store.
 * @param {Function} options.showToast - Función para mostrar notificaciones.
 * @param {Function} options.forceRedraw - Función para forzar el redibujado.
 * @returns {{ simularLlenadoElemento: Function }}
 */
export function useProductSimulation({ canvasStore, showToast, forceRedraw }) {
  /**
   * Obtiene todos los elementos hijos de un elemento de forma recursiva.
   * @param {string} elementoId - El ID del elemento padre.
   * @returns {Array} - Array de elementos hijos.
   */
  const obtenerHijosRecursivo = (elementoId) => {
    const elemento = canvasStore.elementoPorId(elementoId);
    if (!elemento || !elemento.hijos || elemento.hijos.length === 0) {
      return [];
    }

    let todosLosHijos = [];

    for (const hijoId of elemento.hijos) {
      const hijo = canvasStore.elementoPorId(hijoId);
      if (hijo) {
        todosLosHijos.push(hijo);
        // Agregar los hijos de este hijo recursivamente
        todosLosHijos = todosLosHijos.concat(obtenerHijosRecursivo(hijoId));
      }
    }

    return todosLosHijos;
  };

  /**
   * Calcula el volumen teórico de un elemento según las reglas de negocio.
   * @param {Object} elemento - El elemento para calcular su volumen teórico.
   * @returns {number} - El volumen teórico en m³.
   */
  const calcularVolumenTeorico = (elemento) => {
    if (!elemento) return 0;

    // Para contenedores: siempre basado en sus propias dimensiones
    if (elemento.tipo === 'contenedores') {
      const d = elemento.dimensiones || {};
      if (elemento.forma === 'circular') {
        const diam = d.ancho || 0;
        const alto = d.alto || 0;
        return (Math.PI * Math.pow(diam / 2, 2) * alto) / 1_000_000; // cm³ a m³
      }
      return ((d.ancho || 0) * (d.largo || 0) * (d.alto || 0)) / 1_000_000; // cm³ a m³
    }

    // Para elementos: calcular basándose en el volumen de los contenedores que tiene dentro
    if (elemento.tipo === 'elementos') {
      let volumenTotal = 0;
      if (elemento.hijos && elemento.hijos.length > 0) {
        for (const hijoId of elemento.hijos) {
          const hijo = canvasStore.elementoPorId(hijoId);
          if (hijo && hijo.tipo === 'contenedores') {
            volumenTotal += calcularVolumenTeorico(hijo);
          }
        }
      }
      return volumenTotal;
    }

    return 0;
  };

  /**
   * Verifica si un elemento puede tener datos de uso simulados.
   * @param {string} elementoId - El ID del elemento a verificar.
   * @returns {boolean} - True si puede tener datos de uso, false en caso contrario.
   */
  const puedeSimularUso = (elementoId) => {
    const elemento = canvasStore.elementoPorId(elementoId);
    if (!elemento) return false;

    // Los pasillos no pueden tener datos de uso
    if (elemento.tipo === 'pasillos') return false;

    // Los demás tipos pueden tener datos de uso
    return true;
  };

  /**
   * Verifica si un elemento tiene contenedores (directos o indirectos).
   * @param {string} elementoId - El ID del elemento a verificar.
   * @returns {boolean} - True si tiene contenedores, false en caso contrario.
   */
  const tieneContenedores = (elementoId) => {
    const elemento = canvasStore.elementoPorId(elementoId);
    if (!elemento) return false;

    // Si es un contenedor, siempre retorna true
    if (elemento.tipo === 'contenedores') return true;

    // Si es un elemento, verificar si tiene contenedores como hijos
    if (elemento.tipo === 'elementos') {
      const hijos = obtenerHijosRecursivo(elementoId);
      return hijos.some(hijo => hijo.tipo === 'contenedores');
    }

    return false;
  };
  /**
   * Distribuye un valor total entre un array de elementos de forma proporcional,
   * respetando las capacidades máximas individuales de cada elemento.
   * @param {number} valorTotal - El valor total a distribuir.
   * @param {Array} elementos - Los elementos entre los que distribuir.
   * @param {string} propiedad - La propiedad máxima a considerar ('capacidadCarga' o 'volumenTeorico').
   * @param {string} tipoValor - El tipo de valor ('peso' o 'volumen').
   * @returns {Array} - Array de valores asignados a cada elemento.
   */
  const distribuirValorProporcional = (valorTotal, elementos, propiedad, tipoValor = 'peso') => {
    if (elementos.length === 0) return [];

    // Filtrar elementos que pueden tener datos de uso
    const elementosValidos = elementos.filter(elemento => puedeSimularUso(elemento.id));
    if (elementosValidos.length === 0) return elementos.map(() => 0);

    // Obtener las capacidades máximas de cada elemento válido
    const capacidades = elementosValidos.map(elemento => {
      if (ENABLE_VOLUME_SIMULATION && tipoValor === 'volumen' && propiedad === 'volumenTeorico') {
        return calcularVolumenTeorico(elemento);
      }
      return elemento[propiedad] || 0;
    });
    const capacidadTotalDisponible = capacidades.reduce((suma, cap) => suma + cap, 0);

    // Si no hay capacidades definidas, no asignar nada
    if (capacidadTotalDisponible === 0) {
      return elementos.map(() => 0);
    }

    // Si el valor total excede la capacidad total disponible, ajustar proporcionalmente
    const factorAjuste = Math.min(1, capacidadTotalDisponible / valorTotal);
    const valorTotalAjustado = valorTotal * factorAjuste;

    // Crear array de resultados con índices originales
    const resultados = elementos.map(() => 0);
    let indiceValido = 0;

    // Distribuir proporcionalmente respetando las capacidades individuales
    elementos.forEach((elemento, index) => {
      if (!puedeSimularUso(elemento.id)) {
        resultados[index] = 0;
        return;
      }

      const capacidadIndividual = capacidades[indiceValido];
      if (capacidadIndividual === 0) {
        resultados[index] = 0;
        indiceValido++;
        return;
      }

      // Calcular valor proporcional
      const proporcion = capacidadIndividual / capacidadTotalDisponible;
      const valorProporcional = valorTotalAjustado * proporcion;

      // Asegurarse de no exceder la capacidad individual
      // Generar un valor aleatorio entre 10% y 90% de la capacidad individual
      const factorMinimo = 0.1;
      const factorMaximo = 0.9;
      const valorMaximoParaEsteElemento = capacidadIndividual * (factorMinimo + Math.random() * (factorMaximo - factorMinimo));

      // Usar el menor entre el valor proporcional y el valor máximo permitido para este elemento
      resultados[index] = Math.min(valorProporcional, valorMaximoParaEsteElemento);
      indiceValido++;
    });

    return resultados;
  };

  /**
   * Simula el llenado de un elemento asignando valores reales en Kg.
   * Funciona con todos los elementos excepto pasillos.
   * @param {string} elementoId - El ID del elemento a llenar.
   */
  const simularLlenadoElemento = (elementoId) => {
    if (!elementoId) return;

    const elemento = canvasStore.elementoPorId(elementoId);
    if (!elemento) return;

    // RESTRICCIÓN: No permitir simulación en pasillos
    if (!puedeSimularUso(elementoId)) {
      showToast(
        `No se puede simular: ${elemento.nombre} es un pasillo.`,
        'warning'
      );
      return;
    }

    // Obtener todos los hijos de forma recursiva
    const hijos = obtenerHijosRecursivo(elementoId);

    let pesoTotalUsado = 0;
    let volumenTotalUsado = 0;

    // Si tiene hijos, calcular los valores basándose en la capacidad de los hijos
    if (hijos.length > 0) {
      // Generar valores aleatorios iniciales como referencia para la distribución
      const capacidadCarga = elemento.capacidadCarga || 0;

      const factorMinimo = 0.1;
      const factorMaximo = 0.9;

      const pesoReferencia = capacidadCarga > 0
        ? parseFloat((capacidadCarga * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(2))
        : 0;

      // Distribuir el peso entre los hijos respetando sus capacidades
      const pesosDistribuidos = distribuirValorProporcional(pesoReferencia, hijos, 'capacidadCarga', 'peso');

      let volumenesDistribuidos = [];
      if (ENABLE_VOLUME_SIMULATION) {
        // Calcular el volumen teórico del elemento como límite máximo
        const volumenTeoricoMaximo = calcularVolumenTeorico(elemento);

        // Para volumen, usar el volumen teórico como límite máximo
        const volumenReferencia = volumenTeoricoMaximo > 0
          ? parseFloat((volumenTeoricoMaximo * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(3))
          : 0;

        volumenesDistribuidos = distribuirValorProporcional(volumenReferencia, hijos, 'volumenTeorico', 'volumen');
      } else {
        volumenesDistribuidos = hijos.map(() => 0);
      }

      // Actualizar cada hijo con sus valores asignados
      hijos.forEach((hijo, index) => {
        if (!puedeSimularUso(hijo.id)) return; // Saltar pasillos

        const pesoAsignado = parseFloat(pesosDistribuidos[index].toFixed(2));
        const volumenAsignado = ENABLE_VOLUME_SIMULATION
          ? parseFloat(volumenesDistribuidos[index].toFixed(3))
          : 0;

        const nuevoUsoHijo = {
          peso: pesoAsignado,
          volumen: volumenAsignado,
        };

        canvasStore.actualizarElementoSinValidacion(
          hijo.id,
          { uso: nuevoUsoHijo },
          `Simulación distribuida para hijo: ${hijo.nombre}`
        );
      });

      // El valor real del padre es la suma de los valores asignados a los hijos válidos
      pesoTotalUsado = parseFloat(
        pesosDistribuidos
          .filter((_, index) => puedeSimularUso(hijos[index].id))
          .reduce((suma, peso) => suma + peso, 0)
          .toFixed(2)
      );

      if (ENABLE_VOLUME_SIMULATION) {
        volumenTotalUsado = parseFloat(
          volumenesDistribuidos
            .filter((_, index) => puedeSimularUso(hijos[index].id))
            .reduce((suma, volumen) => suma + volumen, 0)
            .toFixed(3)
        );
      }

      const hijosValidosCount = hijos.filter(hijo => puedeSimularUso(hijo.id)).length;
      showToast(
        `Simulación completada para ${elemento.nombre} y ${hijosValidosCount} elementos hijos.`,
        'success'
      );
    } else {
      // Si no tiene hijos, generar valores aleatorios para el elemento mismo
      const capacidadCarga = elemento.capacidadCarga || 0;

      const factorMinimo = 0.1;
      const factorMaximo = 0.9;

      pesoTotalUsado = capacidadCarga > 0
        ? parseFloat((capacidadCarga * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(2))
        : 0;

      if (ENABLE_VOLUME_SIMULATION) {
        // Calcular el volumen teórico del elemento como límite máximo
        const volumenTeoricoMaximo = calcularVolumenTeorico(elemento);

        // Para volumen, usar el volumen teórico como límite máximo
        volumenTotalUsado = volumenTeoricoMaximo > 0
          ? parseFloat((volumenTeoricoMaximo * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(3))
          : 0;
      }

      showToast(`Simulación completada para ${elemento.nombre}.`, 'success');
    }

    // Actualizar el elemento principal con el valor real calculado
    const nuevoUsoElemento = {
      peso: pesoTotalUsado,
      volumen: volumenTotalUsado,
    };

    canvasStore.actualizarElemento(
      elementoId,
      { uso: nuevoUsoElemento },
      `Simulación de uso para: ${elemento.nombre}`
    );

    nextTick(forceRedraw);
  };

  return {
    simularLlenadoElemento,
  };
}
