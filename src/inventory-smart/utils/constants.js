/**
 * constants.js
 *
 * Constantes y elementos predefinidos para el catálogo del editor.
 */

export const TIPOS_ENTIDAD = [
  { id: 'plantas', nombre: 'Plantas', color: '#10b981', icono: '🏢' },
  { id: 'cuartos', nombre: 'Cuartos', color: '#0ea5e9', icono: '🏠' },
  { id: 'pisos', nombre: 'Pisos', color: '#22c55e', icono: '🧱' },
  { id: 'pasillos', nombre: 'Pasillos', color: '#111827', icono: '🛣️' },
  { id: 'elementos', nombre: 'Elementos', color: '#3b82f6', icono: '📦' },
  { id: 'contenedores', nombre: 'Contenedores', color: '#dc2626', icono: '🗃️' },
]

// === REGLAS DE JERARQUÍA ===
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
  // === ESPACIOS / ESTRUCTURAS ===

  // Pasillo base (no navegable, altura = 100% de la planta)
  {
    id: 'pasillo_base',
    nombre: 'Pasillo',
    tipo: 'pasillos',
    categoria: 'pasillos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#ffffff',
    dimensiones: {
      ancho: 150,
      largo: 600,
      alto: 10, // será igualado a planta.alto
    },
    pesoMaximo: 0,
    ubicacion: 'suelo',
    descripcion: 'Pasillo de circulación',
    icono: 'road',
    props: { system: true, catalogVisible: true },
  },

  // Cuarto frío (navegable)
  {
    id: 'cuarto_frio',
    nombre: 'Cuarto frío',
    tipo: 'cuartos',
    categoria: 'cuartos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#e0f2fe',
    dimensiones: {
      ancho: 400,
      largo: 400,
      alto: 250,
    },
    pesoMaximo: 0,
    ubicacion: 'suelo',
    descripcion: 'Cuarto especial',
    icono: 'home',
    props: { system: true, catalogVisible: true },
  },

  // Piso base (navegable)
  {
    id: 'piso_base',
    nombre: 'Piso',
    tipo: 'pisos',
    categoria: 'pisos',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#f1f5f9',
    dimensiones: {
      ancho: 100,
      largo: 100,
      alto: 10,
    },
    pesoMaximo: 0,
    ubicacion: 'suelo',
    descripcion: 'Piso interno de cuarto',
    icono: 'brick',
    props: { system: true, catalogVisible: true },
  },

  // === ELEMENTOS (visibles cuando el contexto lo permita) ===

  // Anaqueles
  {
    id: 'anaquel_metalico_grande',
    nombre: 'Anaquel 2 x 2',
    tipo: 'elementos', // NUEVO CAMPO
    categoria: 'anaqueles',
    forma: 'rectangular',
    orientacion: 0,
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
    props: { system: true },
  },

  // Estante de pared
  {
    id: 'estante_pared_pequeno',
    nombre: 'Estante de Pared',
    tipo: 'elementos', // NUEVO CAMPO
    categoria: 'estantes',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#10b981',
    dimensiones: {
      ancho: 80,
      largo: 25,
      alto: 20,
    },
    pesoMaximo: 50, // kg
    ubicacion: 'pared',
    alturaRespectoAlSuelo: 150, // cm - altura típica para estantes de pared
    descripcion: 'Estante montado en pared para almacenamiento ligero',
    icono: 'shelf',
    props: { system: true },
  },

  // Armario de pared
  {
    id: 'armario_pared_alto',
    nombre: 'Armario de Pared Alto',
    tipo: 'elementos', // NUEVO CAMPO
    categoria: 'armarios',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#7c3aed',
    dimensiones: {
      ancho: 60,
      largo: 30,
      alto: 80,
    },
    pesoMaximo: 100, // kg
    ubicacion: 'pared',
    alturaRespectoAlSuelo: 50, // cm - altura moderada para armarios
    descripcion: 'Armario montado en pared para almacenamiento vertical',
    icono: 'cabinet',
    props: { system: true },
  },

  // Barril
  {
    id: 'barril_basico',
    nombre: 'Barril',
    tipo: 'elementos',
    categoria: 'contenedores',
    forma: 'circular',
    orientacion: 0,
    colorBase: '#f97316',
    dimensiones: {
      ancho: 60,
      largo: 60,
      alto: 90,
    },
    pesoMaximo: 200, // kg
    ubicacion: 'suelo',
    descripcion: 'Barril estándar de madera',
    icono: 'barrel',
    props: { system: true },
  },

  // === CONTENEDORES (solo pueden ir en elementos) ===

  // Contenedor básico (único disponible)
  {
    id: 'contenedor_base',
    nombre: 'Contenedor Base',
    tipo: 'contenedores',
    categoria: 'contenedores',
    forma: 'rectangular',
    orientacion: 0,
    colorBase: '#F0FAFF',
    dimensiones: {
      ancho: 10,
      largo: 10,
      alto: 10,
    },
    pesoMaximo: 1,
    ubicacion: 'interior',
    descripcion: 'Contenedor básico para almacenamiento organizado (nivel de elemento)',
    icono: 'box',
    props: { system: true },
  },
]

// === CATEGORÍAS POR TIPO ===
export const CATEGORIAS_ELEMENTOS = [
  { id: 'anaqueles', nombre: 'Anaqueles', color: '#3b82f6', tipo: 'elementos' },
  { id: 'estantes', nombre: 'Estantes', color: '#10b981', tipo: 'elementos' },
  { id: 'mesas', nombre: 'Mesas', color: '#f59e0b', tipo: 'elementos' },
  { id: 'armarios', nombre: 'Armarios', color: '#7c3aed', tipo: 'elementos' },
]

export const CATEGORIAS_CONTENEDORES = [
  { id: 'contenedores', nombre: 'Contenedores', color: '#dc2626', tipo: 'contenedores' },
]

export const CATEGORIAS_CUARTOS = [
  { id: 'cuartos', nombre: 'Cuartos', color: '#0ea5e9', tipo: 'cuartos' },
]

export const CATEGORIAS_PISOS = [
  { id: 'pisos', nombre: 'Pisos', color: '#22c55e', tipo: 'pisos' },
]

export const CATEGORIAS_PASILLOS = [
  { id: 'pasillos', nombre: 'Pasillos', color: '#111827', tipo: 'pasillos' },
]

// === CATEGORÍAS LEGACY (mantener por compatibilidad temporal) ===
export const CATEGORIAS = [
  { id: 'anaqueles', nombre: 'Anaqueles', color: '#3b82f6' },
  { id: 'estantes', nombre: 'Estantes', color: '#10b981' },
  { id: 'mesas', nombre: 'Mesas', color: '#f59e0b' },
  { id: 'armarios', nombre: 'Armarios', color: '#7c3aed' },
  { id: 'contenedores', nombre: 'Contenedores', color: '#dc2626' },
  { id: 'cuartos', nombre: 'Cuartos', color: '#0ea5e9' },
  { id: 'pisos', nombre: 'Pisos', color: '#22c55e' },
  { id: 'pasillos', nombre: 'Pasillos', color: '#111827' },
]

export const FORMAS_DISPONIBLES = [
  { id: 'rectangular', nombre: 'Rectangular' },
  { id: 'circular', nombre: 'Circular' },
]

export const UBICACIONES_DISPONIBLES = [
  { id: 'suelo', nombre: 'Suelo', aplicaA: ['elementos', 'cuartos', 'pisos', 'pasillos'] },
  { id: 'pared', nombre: 'Pared', aplicaA: ['elementos'] },
  { id: 'interior', nombre: 'Interior', aplicaA: ['contenedores'] },
]

// === CATÁLOGOS PARA CUARTOS Y ESPACIOS ===

export const TIPOS_CUARTO = [
  { id: 'almacen', nombre: 'Almacén General' },
  { id: 'cuarto_frio', nombre: 'Cuarto Frío' },
  { id: 'oficina', nombre: 'Oficina' },
  { id: 'recepcion', nombre: 'Recepción' },
  { id: 'despacho', nombre: 'Despacho' },
  { id: 'mantenimiento', nombre: 'Mantenimiento' },
]

export const TIPOS_ESPACIO = [
  { id: 'zona_picking', nombre: 'Zona de Picking' },
  { id: 'zona_packing', nombre: 'Zona de Packing' },
  { id: 'zona_carga', nombre: 'Zona de Carga/Descarga' },
  { id: 'zona_clasificacion', nombre: 'Zona de Clasificación' },
  { id: 'zona_temporal', nombre: 'Almacenamiento Temporal' },
  { id: 'pasillo_principal', nombre: 'Pasillo Principal' },
]

export const TIPOS_ZONA_CUARTO = [
  { id: 'almacenaje', nombre: 'Zona de almacenaje' },
  { id: 'cross_docking', nombre: 'Zona de Cross-docking' },
]

export const TIPOS_ZONA_ESPACIO = [
  { id: 'picking', nombre: 'Zona de picking' },
]

// === TODAS LAS CATEGORÍAS UNIFICADAS ===
export const TODAS_LAS_CATEGORIAS = [
  ...CATEGORIAS_ELEMENTOS,
  ...CATEGORIAS_CONTENEDORES,
  ...CATEGORIAS_CUARTOS,
  ...CATEGORIAS_PISOS,
  ...CATEGORIAS_PASILLOS,
  ...TIPOS_CUARTO,
  ...TIPOS_ESPACIO
]

// Orientaciones para cuartos (grados)
export const ORIENTACIONES = [
  { id: '0', nombre: '0°' },
  { id: '90', nombre: '90°' },
  { id: '180', nombre: '180°' },
  { id: '270', nombre: '270°' },
]

// Tipos de productos que se pueden admitir en un piso/nivel
export const TIPOS_PRODUCTO_ADMITIDOS = [
  { id: 'secos', nombre: 'Productos secos' },
  { id: 'refrigerados', nombre: 'Refrigerados' },
  { id: 'congelados', nombre: 'Congelados' },
  { id: 'fragiles', nombre: 'Frágiles' },
  { id: 'peligrosos', nombre: 'Peligrosos' },
  { id: 'voluminosos', nombre: 'Voluminosos' },
]

// === FUNCIONES DE UTILIDAD ===

/**
 * Obtiene las categorías permitidas según el tipo de entidad
 */
export const getCategoriasPorTipo = (tipo) => {
  switch (tipo) {
    case 'elementos':
      return CATEGORIAS_ELEMENTOS
    case 'contenedores':
      return CATEGORIAS_CONTENEDORES
    case 'cuartos':
      return CATEGORIAS_CUARTOS
    case 'pisos':
      return CATEGORIAS_PISOS
    case 'pasillos':
      return CATEGORIAS_PASILLOS
    default:
      return []
  }
}

/**
 * Verifica si un tipo puede contener otro según la jerarquía
 */
export const puedeContener = (tipoPadre, tipoHijo) => {
  return JERARQUIA_PERMITIDA[tipoPadre]?.includes(tipoHijo) || false
}

/**
 * Obtiene el color por defecto para un tipo
 */
export const getColorPorTipo = (tipo) => {
  const tipoInfo = TIPOS_ENTIDAD.find((t) => t.id === tipo)
  return tipoInfo?.color || '#6b7280'
}

/**
 * Obtiene el icono por defecto para un tipo
 */
export const getIconoPorTipo = (tipo) => {
  const tipoInfo = TIPOS_ENTIDAD.find((t) => t.id === tipo)
  return tipoInfo?.icono || '📦'
}

/**
 * Obtiene el color asociado a una categoría del catálogo
 */
export const getColorCategoria = (categoriaId) => {
  const cat = TODAS_LAS_CATEGORIAS.find((c) => c.id === categoriaId)
  return cat?.color || '#3b82f6'
}

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
export const TOLERANCE_CM = 0.1 // tolerancia en cm para colisiones y ajustes
// Conversión de centímetros a pixeles en la visualización (usada para layer/planta)
export const CM_TO_PX = 10
// Tolerancia para aplicar "pegado" al borde en px
export const SNAP_EPS = 4
// Tamaño de grilla para snap y búsqueda en espiral
export const GRID_SIZE = 0

// === CONFIGURACIÓN DE PRECISIÓN ===
// Precisión decimal para dimensiones en centímetros (0.01 = 2 decimales)
export const PRECISION_CM = 0.01
// Número de decimales para redondeo
export const DECIMAL_PLACES = 2

// Parámetros por defecto para guard de redimensionado
export const MARGIN_CM = 5 // margen perimetral interno en cm para packing
export const FACTOR_UTILIZACION = 0.9 // porcentaje máximo de ocupación de área

// === CONFIGURACIÓN DE AUTOSAVE ===
export const AUTOSAVE_CONFIG = {
  INTERVAL_MS: 60000, // 30 segundos
  MAX_BACKUPS: 10, // máximo número de copias de seguridad
  STORAGE_KEY: 'canvas_autosave_backups',
  ENABLED: true, // habilitar/deshabilitar autosave
}

export const SERIALIZE_CONFIG = {
  STORAGE_KEY: 'SERIALIZE_CONFIG.STORAGE_KEY',
}

// === POLÍTICAS DE DIMENSIONES (escalado por eje) ===
// Nota: Reusar constantes existentes; no duplicar conversiones.
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
  // Reusar conversión de cm→px existente
  gridPxPerCm: CM_TO_PX,
}

// Offset configurable por tipo (porcentaje de altura de planta desde el suelo)
export const OFFSETS = {
  offsetByType: {
    // Estante de pared al 50% de la altura de la planta
    estante_pared_pequeno: { zOffsetShare: 0.5 },
  },
}

// (Opcional) Política de peso — OFF por defecto
export const WEIGHT = {
  enableDefaultShareFromParent: false,
  defaultShare: 0.2,
}

// === VERSIONADO DE EXPORT / SCHEMAS ===
export const EXPORT_FORMAT_VERSION = '1.1.0'
export const SCHEMA_VERSION_PLANTILLAS = 1
