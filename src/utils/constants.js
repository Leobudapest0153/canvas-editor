/**
 * constants.js
 *
 * Constantes y elementos predefinidos para el catálogo del editor.
 */

// Elemento base para representar espacios dentro de los demás elementos
export const CONTENEDOR_BASE = {
  id: 'contenedor',
  nombre: 'Contenedor Base',
  categoria: 'contenedores',
  forma: 'rectangular',
  colorBase: '#3b82f6',
  dimensiones: {
    ancho: 10,
    largo: 10,
    alto: 10,
  },
  pesoMaximo: 10,
  ubicacion: 'interior',
  descripcion: 'Contenedor para almacenamiento',
  icono: 'box',
}

export const ELEMENTOS_PREDEFINIDOS = [
  // Anaqueles
  {
    id: 'anaquel_metalico_grande',
    nombre: 'Anaquel 2 x 2',
    categoria: 'anaqueles',
    forma: 'rectangular',
    colorBase: '#3b82f6',
    dimensiones: {
      ancho: 120,
      largo: 200,
      alto: 180,
    },
    pesoMaximo: 500, // kg
    ubicacion: 'suelo',
    descripcion: 'Anaquel metálico de alta capacidad para almacenamiento pesado',
    icono: 'rack',
    contenedores: [
      {
        id: 'contenedor_1',
        nombre: 'Contenedor 1',
        dimensiones: {
          ancho: 120,
          largo: 95,
          alto: 80,
        },
        posicion: {
          x: 24,
          y: 36,
          z: 0,
        },
        pesoMaximo: 250,
        ubicacion: 'interior',
        descripcion: 'Contenedor 1 del anaquel',
        icono: 'box',
        hijos: ['elemento_1221'],
      },
      {
        id: 'contenedor_2',
        nombre: 'Contenedor 2',
        dimensiones: {
          ancho: 120,
          largo: 95,
          alto: 80,
        },
        pesoMaximo: 250,
        ubicacion: 'interior',
        descripcion: 'Contenedor 2 del anaquel',
        icono: 'box',
        hijos: ['elemento_43421'],
      },
    ],
  },
]

export const CATEGORIAS = [
  { id: 'anaqueles', nombre: 'Anaqueles', color: '#3b82f6' },
  { id: 'estantes', nombre: 'Estantes', color: '#10b981' },
  { id: 'mesas', nombre: 'Mesas', color: '#f59e0b' },
  { id: 'armarios', nombre: 'Armarios', color: '#7c3aed' },
  { id: 'contenedores', nombre: 'Contenedores', color: '#dc2626' },
]

export const FORMAS_DISPONIBLES = [
  { id: 'rectangular', nombre: 'Rectangular' },
  { id: 'circular', nombre: 'Circular' },
]

export const UBICACIONES_DISPONIBLES = [
  { id: 'suelo', nombre: 'Suelo' },
  { id: 'pared', nombre: 'Pared' },
]

export const COLORES_DISPONIBLES = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#ec4899',
  '#6b7280',
]

// === Escalas y tolerancias de interacción ===
// Conversión de centímetros a pixeles en la visualización (usada para layer/planta)
export const CM_TO_PX = 2
// Tolerancia para aplicar "pegado" al borde en px
export const SNAP_EPS = 4
// Tamaño de grilla para snap y búsqueda en espiral
export const GRID_SIZE = 20

// Parámetros por defecto para guard de redimensionado
export const MARGIN_CM = 5 // margen perimetral interno en cm para packing
export const FACTOR_UTILIZACION = 0.9 // porcentaje máximo de ocupación de área
