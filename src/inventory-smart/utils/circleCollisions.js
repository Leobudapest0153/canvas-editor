// /inventory-smart/utils/circleCollisions.js
// Detección de colisiones específica para elementos circulares
// Permite tangencia en cualquier ángulo entre círculos

import { EPSILON } from './geometry'

/**
 * Calcula la distancia euclidiana entre dos puntos
 * @param {Object} p1 - Primer punto {x, y}
 * @param {Object} p2 - Segundo punto {x, y}
 * @returns {number} Distancia entre los puntos
 */
export function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

/**
 * Determina el estado de contacto entre dos círculos
 * @param {Object} c1 - Centro del primer círculo {x, y}
 * @param {number} r1 - Radio del primer círculo
 * @param {Object} c2 - Centro del segundo círculo {x, y}
 * @param {number} r2 - Radio del segundo círculo
 * @param {number} EPS - Tolerancia para determinar tangencia (default: EPSILON * 10)
 * @returns {'overlap'|'tangent'|'separate'} Estado de contacto
 */
export function circleCircleContact(c1, r1, c2, r2, EPS = EPSILON * 10) {
  const d = distance(c1, c2);
  const sum = r1 + r2;

  // Interpenetración (no permitido)
  if (d < sum - EPS) return 'overlap';

  // Tangentes (permitido) - incluye pequeña tolerancia por pixeles/zoom
  if (Math.abs(d - sum) <= EPS) return 'tangent';

  // Separados (permitido)
  return 'separate';
}

/**
 * Extrae las propiedades geométricas de un elemento circular
 * @param {Object} element - Elemento del canvas
 * @returns {Object} {center: {x, y}, radius: number} o null si no es circular
 */
export function getCircleGeometry(element) {
  if (!element || element.forma !== 'circular') {
    return null;
  }

  // Para elementos circulares, el radio es la mitad del menor de width/height
  const diameter = Math.min(element.width || 0, element.height || 0);
  const radius = diameter / 2;

  // El centro se calcula desde la posición top-left
  const center = {
    x: element.x + radius,
    y: element.y + radius
  };

  return { center, radius };
}

/**
 * Verifica si hay colisión entre dos elementos circulares
 * @param {Object} elementA - Primer elemento
 * @param {Object} elementB - Segundo elemento
 * @param {number} tolerance - Tolerancia para tangencia (default: EPSILON * 10)
 * @returns {Object} {hasOverlap: boolean, contact: string} o null si alguno no es circular
 */
export function detectCircleCircleCollision(elementA, elementB, tolerance = EPSILON * 10) {
  const geomA = getCircleGeometry(elementA);
  const geomB = getCircleGeometry(elementB);

  if (!geomA || !geomB) {
    return null; // Al menos uno no es circular
  }

  const contact = circleCircleContact(geomA.center, geomA.radius, geomB.center, geomB.radius, tolerance);

  return {
    hasOverlap: contact === 'overlap',
    contact,
    geometryA: geomA,
    geometryB: geomB
  };
}

/**
 * Verifica si dos elementos son circulares
 * @param {Object} elementA - Primer elemento
 * @param {Object} elementB - Segundo elemento
 * @returns {boolean} true si ambos son circulares
 */
export function areBothCircular(elementA, elementB) {
  return elementA?.forma === 'circular' && elementB?.forma === 'circular';
}
