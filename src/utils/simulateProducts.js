// src/composables/simulateProducts.js

import { nextTick } from 'vue';

/**
 * Determina el color de estado basado en un porcentaje.
 * @param {number} porcentaje - El porcentaje de 0 a 100.
 * @returns {string} - El código de color hexadecimal.
 */
const getUsoColor = (porcentaje) => {
  if (porcentaje < 50) return '#10b981'; // Verde
  if (porcentaje < 85) return '#f59e0b'; // Amarillo
  return '#ef4444'; // Rojo
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

  return [
    {
      tipo: 'Volumen',
      porcentaje: elemento.uso.volumen,
      color: getUsoColor(elemento.uso.volumen),
    },
    {
      tipo: 'Peso',
      porcentaje: elemento.uso.peso,
      color: getUsoColor(elemento.uso.peso),
    },
  ];
};

/**
 * Composable para manejar la lógica de simulación de llenado.
 * @param {Object} options - Dependencias.
 * @param {Object} options.canvasStore - La instancia del store.
 * @param {Function} options.showToast - Función para mostrar notificaciones.
 * @param {Function} options.forceRedraw - Función para forzar el redibujado.
 * @returns {{ simularLlenadoContenedor: Function }}
 */
export function useProductSimulation({ canvasStore, showToast, forceRedraw }) {
  /**
   * Simula el llenado de un contenedor asignando porcentajes aleatorios de uso.
   * @param {string} elementoId - El ID del contenedor a llenar.
   */
  const simularLlenadoContenedor = (elementoId) => {
    if (!elementoId) return;

    const contenedor = canvasStore.elementosVisibles.find((e) => e.id === elementoId);
    if (!contenedor) return;

    // Generar dos porcentajes aleatorios
    const volumenUsado = parseFloat((Math.random() * 100).toFixed(1));
    const pesoUsado = parseFloat((Math.random() * 100).toFixed(1));

    const nuevoUso = {
      volumen: volumenUsado,
      peso: pesoUsado,
    };

    // Actualizar el store con el nuevo objeto 'uso'
    canvasStore.actualizarElementoConHistorial(
      elementoId,
      { uso: nuevoUso },
      `Simulación de uso para: ${contenedor.nombre}`
    );

    showToast(`Simulación completada para ${contenedor.nombre}.`, 'success');
    nextTick(forceRedraw);
  };

  return {
    simularLlenadoContenedor,
  };
}
