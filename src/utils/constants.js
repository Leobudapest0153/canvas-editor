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
    nombre: 'Anaquel Metálico Grande',
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
  },
  {
    id: 'anaquel_metalico_mediano',
    nombre: 'Anaquel Metálico Mediano',
    categoria: 'anaqueles',
    forma: 'rectangular',
    colorBase: '#2563eb',
    dimensiones: {
      ancho: 100,
      largo: 150,
      alto: 160,
    },
    pesoMaximo: 300,
    ubicacion: 'suelo',
    descripcion: 'Anaquel metálico de capacidad media',
    icono: 'rack',
  },
  {
    id: 'anaquel_madera_pequeño',
    nombre: 'Anaquel de Madera Pequeño',
    categoria: 'anaqueles',
    forma: 'rectangular',
    colorBase: '#92400e',
    dimensiones: {
      ancho: 80,
      largo: 120,
      alto: 140,
    },
    pesoMaximo: 150,
    ubicacion: 'suelo',
    descripcion: 'Anaquel de madera para elementos ligeros',
    icono: 'rack',
  },

  // Estantes
  {
    id: 'estante_flotante_largo',
    nombre: 'Estante Flotante Largo',
    categoria: 'estantes',
    forma: 'rectangular',
    colorBase: '#10b981',
    dimensiones: {
      ancho: 15,
      largo: 120,
      alto: 3,
    },
    pesoMaximo: 25,
    ubicacion: 'pared',
    descripcion: 'Estante flotante para elementos ligeros',
    icono: 'shelf',
  },
  {
    id: 'estante_flotante_mediano',
    nombre: 'Estante Flotante Mediano',
    categoria: 'estantes',
    forma: 'rectangular',
    colorBase: '#059669',
    dimensiones: {
      ancho: 15,
      largo: 80,
      alto: 3,
    },
    pesoMaximo: 15,
    ubicacion: 'pared',
    descripcion: 'Estante flotante de tamaño mediano',
    icono: 'shelf',
  },
  {
    id: 'estante_esquinero',
    nombre: 'Estante Esquinero',
    categoria: 'estantes',
    forma: 'triangular',
    colorBase: '#047857',
    dimensiones: {
      ancho: 12,
      largo: 60,
      alto: 3,
    },
    pesoMaximo: 10,
    ubicacion: 'pared',
    descripcion: 'Estante especial para esquinas',
    icono: 'shelf',
  },

  // Mesas
  {
    id: 'mesa_trabajo_grande',
    nombre: 'Mesa de Trabajo Grande',
    categoria: 'mesas',
    forma: 'rectangular',
    colorBase: '#f59e0b',
    dimensiones: {
      ancho: 80,
      largo: 160,
      alto: 75,
    },
    pesoMaximo: 200,
    ubicacion: 'suelo',
    descripcion: 'Mesa amplia para trabajo y almacenamiento',
    icono: 'table',
  },
  {
    id: 'mesa_trabajo_mediana',
    nombre: 'Mesa de Trabajo Mediana',
    categoria: 'mesas',
    forma: 'rectangular',
    colorBase: '#d97706',
    dimensiones: {
      ancho: 60,
      largo: 120,
      alto: 75,
    },
    pesoMaximo: 150,
    ubicacion: 'suelo',
    descripcion: 'Mesa de tamaño estándar para trabajo',
    icono: 'table',
  },
  {
    id: 'mesa_redonda',
    nombre: 'Mesa Redonda',
    categoria: 'mesas',
    forma: 'circular',
    colorBase: '#b45309',
    dimensiones: {
      ancho: 100,
      largo: 100,
      alto: 75,
    },
    pesoMaximo: 100,
    ubicacion: 'suelo',
    descripcion: 'Mesa redonda para reuniones',
    icono: 'table',
  },

  // Armarios
  {
    id: 'armario_alto',
    nombre: 'Armario Alto',
    categoria: 'armarios',
    forma: 'rectangular',
    colorBase: '#7c3aed',
    dimensiones: {
      ancho: 60,
      largo: 40,
      alto: 200,
    },
    pesoMaximo: 80,
    ubicacion: 'suelo',
    descripcion: 'Armario alto con múltiples compartimentos',
    icono: 'cabinet',
  },
  {
    id: 'armario_bajo',
    nombre: 'Armario Bajo',
    categoria: 'armarios',
    forma: 'rectangular',
    colorBase: '#6d28d9',
    dimensiones: {
      ancho: 80,
      largo: 40,
      alto: 90,
    },
    pesoMaximo: 60,
    ubicacion: 'suelo',
    descripcion: 'Armario bajo para almacenamiento accesible',
    icono: 'cabinet',
  },

  // Contenedores
  {
    id: 'contenedor_plastico_grande',
    nombre: 'Contenedor Plástico Grande',
    categoria: 'contenedores',
    forma: 'rectangular',
    colorBase: '#dc2626',
    dimensiones: {
      ancho: 40,
      largo: 60,
      alto: 30,
    },
    pesoMaximo: 50,
    ubicacion: 'suelo',
    descripcion: 'Contenedor resistente para almacenamiento',
    icono: 'box',
  },
  {
    id: 'contenedor_metalico',
    nombre: 'Contenedor Metálico',
    categoria: 'contenedores',
    forma: 'rectangular',
    colorBase: '#b91c1c',
    dimensiones: {
      ancho: 50,
      largo: 70,
      alto: 40,
    },
    pesoMaximo: 100,
    ubicacion: 'suelo',
    descripcion: 'Contenedor metálico de alta resistencia',
    icono: 'box',
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
  { id: 'triangular', nombre: 'Triangular' },
  { id: 'cuadrado', nombre: 'Cuadrado' },
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
