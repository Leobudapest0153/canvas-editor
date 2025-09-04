// src/inventory-smart/composables/simulateProducts.js

import { nextTick } from 'vue';

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
  // Solo mostrar si el elemento tiene la propiedad 'uso' y al menos uno es mayor que cero
  if (!elemento.uso || (elemento.uso.volumen === 0 && elemento.uso.peso === 0)) {
    return null;
  }

  // Calcular porcentajes basados en los valores máximos del elemento
  const porcentajePeso = calcularPorcentajeUso(elemento.uso.peso, elemento.pesoMaximo || 0);
  const porcentajeVolumen = calcularPorcentajeUso(elemento.uso.volumen, elemento.volumenMaximo || 0);

  return [
    {
      tipo: 'Volumen',
      porcentaje: porcentajeVolumen,
      color: getUsoColor(porcentajeVolumen),
      valorActual: elemento.uso.volumen,
      valorMaximo: elemento.volumenMaximo || 0,
      unidad: 'm³'
    },
    {
      tipo: 'Peso',
      porcentaje: porcentajePeso,
      color: getUsoColor(porcentajePeso),
      valorActual: elemento.uso.peso,
      valorMaximo: elemento.pesoMaximo || 0,
      unidad: 'kg'
    },
  ];
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
   * @param {string} propiedad - La propiedad máxima a considerar ('pesoMaximo' o 'volumenTeorico').
   * @param {string} tipoValor - El tipo de valor ('peso' o 'volumen').
   * @returns {Array} - Array de valores asignados a cada elemento.
   */
  const distribuirValorProporcional = (valorTotal, elementos, propiedad, tipoValor = 'peso') => {
    if (elementos.length === 0) return [];

    // Obtener las capacidades máximas de cada elemento
    const capacidades = elementos.map(elemento => {
      if (tipoValor === 'volumen' && propiedad === 'volumenTeorico') {
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

    // Distribuir proporcionalmente respetando las capacidades individuales
    return elementos.map((elemento, index) => {
      const capacidadIndividual = capacidades[index];
      if (capacidadIndividual === 0) return 0;

      // Calcular valor proporcional
      const proporcion = capacidadIndividual / capacidadTotalDisponible;
      const valorProporcional = valorTotalAjustado * proporcion;

      // Asegurarse de no exceder la capacidad individual
      // Generar un valor aleatorio entre 10% y 90% de la capacidad individual
      const factorMinimo = 0.1;
      const factorMaximo = 0.9;
      const valorMaximoParaEsteElemento = capacidadIndividual * (factorMinimo + Math.random() * (factorMaximo - factorMinimo));

      // Usar el menor entre el valor proporcional y el valor máximo permitido para este elemento
      return Math.min(valorProporcional, valorMaximoParaEsteElemento);
    });
  };

  /**
   * Simula el llenado de un elemento asignando valores reales en Kg y m³.
   * Solo funciona si el elemento tiene contenedores.
   * @param {string} elementoId - El ID del elemento a llenar.
   */
  const simularLlenadoElemento = (elementoId) => {
    if (!elementoId) return;

    const elemento = canvasStore.elementoPorId(elementoId);
    if (!elemento) return;

    // RESTRICCIÓN: Solo permitir simulación si el elemento tiene contenedores
    if (!tieneContenedores(elementoId)) {
      showToast(
        `No se puede simular: ${elemento.nombre} no tiene contenedores.`,
        'warning'
      );
      return;
    }

    // Calcular el volumen teórico del elemento como límite máximo
    const volumenTeoricoMaximo = calcularVolumenTeorico(elemento);

    // Obtener todos los hijos de forma recursiva
    const hijos = obtenerHijosRecursivo(elementoId);

    let pesoTotalUsado, volumenTotalUsado;

    // Si tiene hijos, calcular los valores basándose en la capacidad de los hijos
    if (hijos.length > 0) {
      // Generar valores aleatorios iniciales como referencia para la distribución
      const pesoMaximo = elemento.pesoMaximo || 0;

      const factorMinimo = 0.1;
      const factorMaximo = 0.9;

      const pesoReferencia = pesoMaximo > 0
        ? parseFloat((pesoMaximo * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(2))
        : 0;

      // Para volumen, usar el volumen teórico como límite máximo
      const volumenReferencia = volumenTeoricoMaximo > 0
        ? parseFloat((volumenTeoricoMaximo * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(3))
        : 0;

      // Distribuir los valores entre los hijos respetando sus capacidades
      const pesosDistribuidos = distribuirValorProporcional(pesoReferencia, hijos, 'pesoMaximo', 'peso');
      const volumenesDistribuidos = distribuirValorProporcional(volumenReferencia, hijos, 'volumenTeorico', 'volumen');

      // Actualizar cada hijo con sus valores asignados
      hijos.forEach((hijo, index) => {
        const pesoAsignado = parseFloat(pesosDistribuidos[index].toFixed(2));
        const volumenAsignado = parseFloat(volumenesDistribuidos[index].toFixed(3));

        const nuevoUsoHijo = {
          peso: pesoAsignado,
          volumen: volumenAsignado,
        };

        canvasStore.actualizarElemento(
          hijo.id,
          { uso: nuevoUsoHijo },
          `Simulación distribuida para hijo: ${hijo.nombre}`
        );
      });

      // El valor real del padre es la suma de los valores asignados a los hijos
      pesoTotalUsado = parseFloat(pesosDistribuidos.reduce((suma, peso) => suma + peso, 0).toFixed(2));
      volumenTotalUsado = parseFloat(volumenesDistribuidos.reduce((suma, volumen) => suma + volumen, 0).toFixed(3));

      showToast(
        `Simulación completada para ${elemento.nombre} y ${hijos.length} elementos hijos.`,
        'success'
      );
    } else {
      // Si no tiene hijos pero es un contenedor, generar valores aleatorios
      const pesoMaximo = elemento.pesoMaximo || 0;

      const factorMinimo = 0.1;
      const factorMaximo = 0.9;

      pesoTotalUsado = pesoMaximo > 0
        ? parseFloat((pesoMaximo * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(2))
        : 0;

      // Para volumen, usar el volumen teórico como límite máximo
      volumenTotalUsado = volumenTeoricoMaximo > 0
        ? parseFloat((volumenTeoricoMaximo * (factorMinimo + Math.random() * (factorMaximo - factorMinimo))).toFixed(3))
        : 0;

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
