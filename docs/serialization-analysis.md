# Análisis de Serialización/Deserialización

## Problema Principal

1. **Propiedades faltantes en serialización**: Algunas propiedades utilizadas en el código no se guardan/recuperan
2. **Catálogo predefinido se guarda innecesariamente**: Los items de `predefinedElements` no deberían guardarse

---

## Propiedades de Elementos

### ✅ Propiedades actualmente serializadas

```javascript
{
  // Identificación
  id,
  nombre,
  descripcion,
  tipo,
  plantaId,
  
  // Etiquetado y ESL
  etiquetas: [],
  codigoEsl: '',
  
  // Orientación y posición
  orientacion: 0,
  alturaRespectoAlSuelo: 0,
  posicion: { x, y, z, rotation },
  
  // Dimensiones
  dimensiones: { ancho, largo, alto },
  
  // Apariencia
  color,
  colorBase,
  forma,
  visible,
  
  // Capacidad
  capacidadCarga,
  volumenMaximo,
  ubicacion,
  
  // Política dimensiones
  dimensionLock,
  systemTypeKey,
  
  // Canvas
  canvas: { width, height },
  
  // Uso
  uso: { peso, volumen },
  
  // Jerarquía
  padre,
  hijos: [],
  
  // Custom
  propiedadesPersonalizadas: {}
}
```

### ❌ Propiedades FALTANTES (usadas pero no serializadas)

```javascript
{
  // Código único (CRÍTICO - se usa en toda la app)
  codigo: 'PAS-001',
  
  // Asignación de pasillo (CRÍTICO - sistema de pasillos)
  pasilloId: 'pasillo_123',
  
  // Timestamps (útil para auditoría)
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  
  // Tipos de productos admitidos (para niveles/contenedores)
  tiposProductos: ['secos', 'refrigerados'],
  
  // Tipo de zona (para pisos/espacios)
  tipoZona: 'almacenaje',
  
  // Permisos especiales
  permiteFragiles: false,
  
  // Props adicionales del catálogo
  props: { system: true, catalogVisible: true },
  
  // Metadatos internos
  meta: { 
    tienePisosGenerados: true,
    esPisoInterno: true,
    indicePiso: 1
  }
}
```

---

## Propiedades de Plantas

### ✅ Propiedades actualmente serializadas

```javascript
{
  id,
  nombre,
  descripcion,
  dimensiones: { alto, ancho, largo },
  poligono: [],
  capacidadCargaSoportado,
  elementos: [],
  activa,
  isInfinite,
  propiedadesPersonalizadas: {}
}
```

### ❌ Propiedades FALTANTES

```javascript
{
  // Código único (CRÍTICO)
  codigo: 'PLA-001',
  
  // Timestamps
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z'
}
```

---

## Problema con Catálogo

### Situación actual

```javascript
// En serialize():
templates: catalogStore.templates, // ✅ Correcto
catalogItems: catalogStore.items,  // ❌ Incluye TODO (predefinidos + personalizados)
```

### Lo que sucede

1. `catalogStore.items` contiene:
   - Items predefinidos de `ELEMENTOS_PREDEFINIDOS`
   - Items predefinidos de la prop `predefinedElements`
   - Items personalizados creados por el usuario (espacios/cuartos custom)

2. Al serializar, **se guardan TODOS los items**, incluyendo los predefinidos

3. Al deserializar, se duplican los items predefinidos porque:
   - Se importan desde el JSON
   - Se vuelven a crear desde la prop

---

## Solución Propuesta

### 1. Marcar items predefinidos vs personalizados

```javascript
// Al normalizar predefinidos en catalog.js
mapped.props = { 
  system: true, 
  catalogVisible: true,
  source: 'predefined' // ← NUEVO
}

// Items personalizados creados por el usuario
customItem.props = {
  system: true,
  catalogVisible: true,
  source: 'user' // ← NUEVO
}
```

### 2. Filtrar en exportCatalogItemsToDTO

```javascript
export const exportCatalogItemsToDTO = (items = []) => {
  if (!Array.isArray(items)) return []
  return items
    .filter(i => 
      i && 
      i.payload && 
      i.payload.rootId && 
      Array.isArray(i.payload.elements) && 
      i.catalogKind && 
      i.catalogKind !== 'template' &&
      i.props?.source === 'user' // ← SOLO items de usuario
    )
    .map((i) => { /* ... */ })
}
```

### 3. Agregar propiedades faltantes a serialización

#### En useStatePersistence.js - elementos

```javascript
elementos: state.elementos.map((elemento) => ({
  // ... propiedades existentes ...
  
  // NUEVAS propiedades
  codigo: elemento.codigo || null,
  pasilloId: elemento.pasilloId || null,
  createdAt: elemento.createdAt || new Date().toISOString(),
  updatedAt: elemento.updatedAt || new Date().toISOString(),
  tiposProductos: Array.isArray(elemento.tiposProductos) 
    ? elemento.tiposProductos 
    : [],
  tipoZona: elemento.tipoZona || null,
  permiteFragiles: Boolean(elemento.permiteFragiles),
  props: elemento.props || {},
  meta: elemento.meta || {},
}))
```

#### En useStatePersistence.js - plantas

```javascript
plantas: state.plantas.map((planta) => ({
  // ... propiedades existentes ...
  
  // NUEVAS propiedades
  codigo: planta.codigo || null,
  createdAt: planta.createdAt || new Date().toISOString(),
  updatedAt: planta.updatedAt || new Date().toISOString(),
}))
```

### 4. Restaurar propiedades en deserialización

```javascript
// Elementos
const elementoSeguro = {
  // ... propiedades existentes ...
  
  // NUEVAS propiedades
  codigo: elementoData.codigo || null,
  pasilloId: elementoData.pasilloId || null,
  createdAt: elementoData.createdAt || new Date().toISOString(),
  updatedAt: elementoData.updatedAt || new Date().toISOString(),
  tiposProductos: Array.isArray(elementoData.tiposProductos) 
    ? elementoData.tiposProductos 
    : [],
  tipoZona: elementoData.tipoZona || null,
  permiteFragiles: Boolean(elementoData.permiteFragiles),
  props: elementoData.props || {},
  meta: elementoData.meta || {},
}

// Plantas
const plantaSegura = {
  // ... propiedades existentes ...
  
  // NUEVAS propiedades
  codigo: plantaData.codigo || null,
  createdAt: plantaData.createdAt || new Date().toISOString(),
  updatedAt: plantaData.updatedAt || new Date().toISOString(),
}
```

---

## Migración de datos existentes

### Retrocompatibilidad

Los cambios deben ser **100% retrocompatibles**:

1. Si una propiedad no existe en el JSON antiguo, se genera/asigna por defecto
2. Los códigos faltantes se regeneran al deserializar
3. Los timestamps faltantes usan la fecha actual
4. Las propiedades opcionales tienen fallbacks seguros

### Validación post-deserialización

```javascript
// Ya existe en useCanvasStore.js
try {
  // Plantas: asignar códigos únicos
  if (Array.isArray(plantas.value)) {
    const existentes = plantas.value.filter(p => !!p)
    const existentesConCodigo = existentes.filter(p => !!p.codigo)
    for (const p of existentes) {
      if (!p.codigo) {
        p.codigo = generateCodigo('plantas', { existing: existentesConCodigo })
        existentesConCodigo.push(p)
      }
    }
  }
  // Elementos
  if (Array.isArray(elementos.value)) {
    for (const el of elementos.value) {
      try { 
        assignCodigoNombre(el, elementos.value) 
      } catch { /* ignore */ }
    }
  }
} catch (e) {
  console.warn('Post-procesamiento fallido:', e)
}
```

---

## Resumen de cambios necesarios

### Archivos a modificar

1. ✅ `src/inventory-smart/composables/useStatePersistence.js`
   - Agregar propiedades faltantes en `serialize()`
   - Agregar propiedades faltantes en `deserialize()`

2. ✅ `src/inventory-smart/stores/catalog.js`
   - Marcar items con `props.source = 'predefined'` o `'user'`

3. ✅ `src/inventory-smart/modules/catalog/catalogItems.serializer.js`
   - Filtrar por `props.source === 'user'` en export

4. ✅ Test de serialización/deserialización
   - Verificar que todas las propiedades se guardan/restauran
   - Verificar que catalogItems predefinidos no se guardan

---

## Prioridad

### Crítico (bloquea funcionalidad)
- ❗ `codigo` - Se usa en toda la app para identificar elementos
- ❗ `pasilloId` - Sistema de asignación de pasillos no funciona sin esto
- ❗ Filtrar catalogItems predefinidos - Evita duplicación

### Importante (mejora calidad)
- `tiposProductos`, `tipoZona`, `permiteFragiles` - Configuración de espacios
- `props`, `meta` - Metadatos necesarios para funcionamiento correcto
- `timestamps` - Auditoría y control de cambios

### Nice to have
- Timestamps mejorados con tracking de cambios
- Validaciones adicionales post-deserialización
