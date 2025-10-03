/**
 * constants.js
 *
 * Constantes y elementos predefinidos para el catálogo del editor.
 */

/**
 * Las restricciones pueden tomar los siguientes valores
 * enter: Limita que se pueda acceder usando doble clic
 * drag: Limita arrastrar el elemento y que este pueda ser redimensionado. Restringe las acciones en la barra flotante
 * open-properties: No permite que se pueda seleccionar un elemento, lo que conlleva a que no se
 * puedan abrir las propiedades ni tampoco ser redimensionado o activar las acciones de la barra
 * flotante
 * read-only-properties: Coloca las campos de propiedades como disable (Requiere que no esté
 * presente open-properties)
 */
export const TIPOS_ENTIDAD = [
  {
    id: 'plantas',
    nombre: 'Plantas',
    nombreSingular: 'Planta',
    color: '#1C1E4D',
    icono: 'warehouse',
    restrictions: [],
    contextView: 'XY',
  },
  {
    id: 'cuartos',
    nombre: 'Cuartos',
    nombreSingular: 'Cuarto',
    color: '#1C1E4D',
    icono: 'room',
    restrictions: [],
    contextView: 'XZ',
  },
  {
    id: 'pisos',
    nombre: 'Pisos',
    nombreSingular: 'Piso',
    color: '#1C1E4D',
    icono: 'mezzanine',
    restrictions: ['read-only-properties', 'right-click', 'drag'],
    contextView: 'XY',
  },
  {
    id: 'pasillos',
    nombre: 'Pasillos',
    nombreSingular: 'Pasillo',
    color: '#1C1E4D',
    icono: 'space',
    restrictions: [],
    contextView: 'XY', // No tiene hijos, pero se incluye para consistencia
  },
  {
    id: 'elementos',
    nombre: 'Espacios',
    nombreSingular: 'Espacio',
    color: '#1C1E4D',
    icono: 'space',
    restrictions: [],
    contextView: 'XZ',
  },
  {
    id: 'contenedores',
    nombre: 'Niveles',
    nombreSingular: 'Nivel',
    color: '#1C1E4D',
    icono: 'space',
    restrictions: ['read-only-properties', 'right-click', 'drag'],
    contextView: 'XZ', // No tiene hijos, pero se incluye para consistencia
  },
]

export const JERARQUIA_PERMITIDA = {
  plantas: ['cuartos', 'elementos', 'pasillos'],
  cuartos: ['pisos'],
  pisos: ['elementos'],
  elementos: ['contenedores'],
  contenedores: [],
  pasillos: [],
}

export const CATALOGO = {
  // Tipos base visibles en el catálogo raíz (plantas)
  SISTEMA_BASE_KEYS: [
    'pasillo_base',
    'cuarto_frio',
    'anaquel_metalico_grande',
    'estante_pared_pequeno',
    'barril_basico',
  ],
}

export const ELEMENTOS_PREDEFINIDOS = [
  // Pasillo base
  {
    id: 'pasillo_base',
    nombre: 'Pasillo',
    tipo: 'pasillos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#EDEDED',
    dimensiones: {
      ancho: 150,
      largo: 600,
      alto: 10,
    },
    capacidadCarga: 0,
    ubicacion: 'suelo',
    descripcion: 'Pasillo de circulación',
    icono: 'road',
    props: { system: true, catalogVisible: true },
  },
  // Cuarto frío
  {
    id: 'cuarto_frio',
    nombre: 'Cuarto frío',
    tipo: 'cuartos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#e0f2fe',
    dimensiones: {
      ancho: 400,
      largo: 400,
      alto: 250,
    },
    capacidadCarga: 1500,
    ubicacion: 'suelo',
    descripcion: 'Cuarto especial',
    icono: 'home',
    props: { system: true, catalogVisible: true },
    pisosNiveles: [
      {
        nombre: 'Piso 1',
        tiposProductos: ['refrigerados', 'congelados'],
        tipoZona: 'almacenaje',
        permiteFragiles: false,
      },
    ],
  },
  // Piso de cuarto
  {
    id: 'piso_base',
    nombre: 'Piso',
    tipo: 'pisos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#f1f5f9',
    dimensiones: {
      ancho: 100,
      largo: 100,
      alto: 10,
    },
    capacidadCarga: 500,
    ubicacion: 'suelo',
    descripcion: 'Piso interno de cuarto',
    icono: 'brick',
    props: { system: true, catalogVisible: true },
  },
  // Anaqueles
  {
    id: 'anaquel_metalico_grande',
    nombre: 'Anaquel',
    tipo: 'elementos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#3b82f6',
    dimensiones: {
      ancho: 120,
      largo: 200,
      alto: 180,
    },
    capacidadCarga: 500,
    ubicacion: 'suelo',
    descripcion: 'Anaquel metálico de alta capacidad para almacenamiento pesado',
    icono: 'rack',
    props: { system: true },
    pisosNiveles: [
      {
        nombre: 'Nivel 1',
        tiposProductos: ['secos', 'voluminosos'],
        tipoZona: 'almacenaje',
        permiteFragiles: false,
      },
    ],
  },
  // Estante de pared
  {
    id: 'estante_pared_pequeno',
    nombre: 'Estante de Pared',
    tipo: 'elementos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#10b981',
    dimensiones: {
      ancho: 80,
      largo: 25,
      alto: 20,
    },
    capacidadCarga: 50,
    ubicacion: 'pared',
    alturaRespectoAlSuelo: 150,
    descripcion: 'Estante montado en pared para almacenamiento ligero',
    icono: 'shelf',
    props: { system: true },
    pisosNiveles: [
      {
        nombre: 'Nivel 1',
        tiposProductos: ['secos', 'fragiles'],
        tipoZona: 'almacenaje',
        permiteFragiles: true,
      },
    ],
  },
  // Armario de pared
  {
    id: 'armario_pared_alto',
    nombre: 'Armario de Pared Alto',
    tipo: 'elementos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#7c3aed',
    dimensiones: {
      ancho: 60,
      largo: 30,
      alto: 80,
    },
    capacidadCarga: 100,
    ubicacion: 'pared',
    alturaRespectoAlSuelo: 50,
    descripcion: 'Armario montado en pared para almacenamiento vertical',
    icono: 'cabinet',
    props: { system: true },
    pisosNiveles: [
      {
        nombre: 'Nivel 1',
        tiposProductos: ['secos'],
        tipoZona: 'almacenaje',
        permiteFragiles: false,
      },
    ],
  },
  // Barril
  {
    id: 'barril_basico',
    nombre: 'Barril',
    tipo: 'elementos',
    forma: 'circular',
    orientacion: 0,
    colorBase: '#f97316',
    dimensiones: {
      ancho: 60,
      largo: 60,
      alto: 90,
    },
    capacidadCarga: 200,
    ubicacion: 'suelo',
    descripcion: 'Barril estándar de madera',
    icono: 'barrel',
    props: { system: true },
    pisosNiveles: [
      {
        nombre: 'Nivel 1',
        tiposProductos: ['secos'],
        tipoZona: 'almacenaje',
        permiteFragiles: false,
      },
    ],
  },
  // Contenedor básico (único disponible)
  {
    id: 'nivel_base',
    nombre: 'Nivel Base',
    tipo: 'contenedores',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#F0FAFF',
    dimensiones: {
      ancho: 10,
      largo: 10,
      alto: 10,
    },
    capacidadCarga: 1,
    ubicacion: 'interior',
    descripcion: 'Contenedor básico para almacenamiento organizado (nivel de elemento)',
    icono: 'box',
    props: { system: true },
  },
]

export const FORMAS_DISPONIBLES = [
  { id: 'rectangular', nombre: 'Rectangular' },
  { id: 'circular', nombre: 'Circular' },
]

// Catálogo de plantillas de forma permitidas para crear una planta (WorkspaceEditor)
// NOTA: Usamos ids alineados con el modelo interno existente ('rectangle' y 'circle')
export const PLANTILLAS_PLANTA = [
  { id: 'rectangle', nombre: 'Rectángulo' },
  { id: 'circle', nombre: 'Círculo' },
]

export const UBICACIONES_DISPONIBLES = [
  { id: 'suelo', nombre: 'Suelo', aplicaA: ['elementos', 'cuartos', 'pisos', 'pasillos'] },
  { id: 'pared', nombre: 'Pared', aplicaA: ['elementos'] },
]

export const TIPOS_ZONA_CUARTO = [
  { id: 'almacenaje', nombre: 'Zona de almacenaje' },
  { id: 'cross_docking', nombre: 'Zona de Cross-docking' },
]

export const TIPOS_ZONA_ESPACIO = [
  { id: 'picking', nombre: 'Zona de picking' }
]

export const DEFAULT_TIPOS_PRODUCTO_ADMITIDOS = [
  { id: 'secos', nombre: 'Productos secos' },
  { id: 'refrigerados', nombre: 'Refrigerados' },
  { id: 'congelados', nombre: 'Congelados' },
  { id: 'fragiles', nombre: 'Frágiles' },
  { id: 'peligrosos', nombre: 'Peligrosos' },
  { id: 'voluminosos', nombre: 'Voluminosos' },
]

export const ORIENTACIONES = [
  { id: '0', nombre: 'Abajo' },
  { id: '90', nombre: 'Derecha' },
  { id: '180', nombre: 'Arriba' },
  { id: '270', nombre: 'Izquierda' },
]

// Tolerancia para colisiones y ajustes
export const TOLERANCE_CM = 0.1
// Conversión de centímetros a pixeles
export const CM_TO_PX = 10
// Tolerancia para aplicar "pegado" al borde en px
export const SNAP_EPS = 4
// Tamaño de grilla para snap y búsqueda en espiral
export const GRID_SIZE = 0
// Precisión decimal para dimensiones (0.01 = 2 decimales)
export const PRECISION_CM = 0.01
// Número de decimales para redondeo
export const DECIMAL_PLACES = 2
// MARGEN POR DEFECTO PARA CAPACIDAD DE CARGA AL AUTOCOMPLETAR (5% = 0.05)
export const LOAD_MARGIN = 0.05
export const INFINITE_VIEW_PADDING_PX = 40

// Parámetros por defecto para guard de redimensionado
export const MARGIN_CM = 5 // margen perimetral interno en cm para packing
export const FACTOR_UTILIZACION = 0.9 // porcentaje máximo de ocupación de área

// === CONFIGURACIÓN DE AUTOSAVE ===
// !DEPRECATED: Se eliminó la lógica de copias de seguridad automáticas.
export const AUTOSAVE_CONFIG = {
  INTERVAL_MS: 60000,
  MAX_BACKUPS: 10,
  STORAGE_KEY: 'canvas_autosave_backups',
  ENABLED: true,
}

export const SERIALIZE_CONFIG = {
  STORAGE_KEY: 'canvas_data',
}

// === POLÍTICAS DE DIMENSIONES (escalado por eje) ===
export const DIMENSIONS = {
  axisScaleDefault: { x: 0.2, y: 0.2, z: 0.2 },
  // Overrides por tipo (usar keys reales del catálogo/base)
  axisScaleByType: {
    // Elementos de sistema por defecto
    anaquel_metalico_grande: { x: 0.2, y: 0.2, z: 0.2 },
    // Estante de pared: w=20% ancho, d=10% largo (profundidad), h=20% alto
    estante_pared_pequeno: { x: 0.2, y: 0.1, z: 0.2 },
    barril_basico: { x: 0.2, y: 0.2, z: 0.2 },
    // Nuevos predefinidos
    pasillo_base: { x: 0.2, y: 0.2, z: 1 },
    cuarto_frio: { x: 0.3, y: 0.3, z: 0.5 },
    piso_base: { x: 0.2, y: 0.2, z: 0.1 },
  },
  // Límites por tipo
  minMax: {
    anaquel_metalico_grande: { min: { w: 30, h: 50, d: 30 }, max: { w: 500, h: 500, d: 500 } },
    estante_pared_pequeno: { min: { w: 40, h: 30, d: 20 }, max: { w: 500, h: 500, d: 500 } },
    barril_basico: { min: { w: 30, h: 30, d: 30 }, max: { w: 500, h: 500, d: 500 } },
    // Nuevos predefinidos
    pasillo_base: { min: { w: 100, h: 10, d: 100 }, max: { w: 2000, h: 500, d: 2000 } },
    cuarto_frio: { min: { w: 100, h: 100, d: 100 }, max: { w: 2000, h: 500, d: 2000 } },
    piso_base: { min: { w: 50, h: 10, d: 50 }, max: { w: 2000, h: 500, d: 2000 } },
  },
  autoResizeOnParentChange: true,
  gridPxPerCm: CM_TO_PX,
}

// Offset configurable por tipo (porcentaje de altura de planta desde el suelo)
export const OFFSETS = {
  offsetByType: {
    // Estante de pared al 50% de la altura de la planta
    estante_pared_pequeno: { zOffsetShare: 0.5 },
  },
}

// Política de peso — OFF por defecto
export const WEIGHT = {
  enableDefaultShareFromParent: false,
  defaultShare: 0.2,
}

export const EXPORT_FORMAT_VERSION = '1.1.0'
export const SCHEMA_VERSION_PLANTILLAS = 1

export const getContrastTextColor = (hexColor) => {
  if (!hexColor || typeof hexColor !== 'string') return '#ffffff'
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5 ? '#ffffff' : '#000000'
}
