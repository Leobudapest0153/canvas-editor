# Diagnóstico: Pérdida de Plantillas, Historial y CatalogItems

## Problema

Al guardar en localStorage y recargar la página:
1. ✅ Plantas y elementos SÍ se recuperan
2. ❌ Plantillas (`templates`) se pierden
3. ❌ Historial de cambios (`changeHistory`) se pierde
4. ❌ Items del catálogo creados por usuario (`catalogItems`) se pierden

---

## Flujo actual

### 1. Guardar (PlantasPanel.vue → línea 796)

```javascript
const guardarCambios = async () => {
  const configSerializada = canvasStore.serialize(true)  // ← Genera JSON
  emit('configChanged', configSerializada)               // ← Envía a HomePage
}
```

### 2. HomePage recibe y guarda (HomePage.vue → línea 120)

```javascript
const handleConfigUpdated = (nuevaConfig) => {
  localStorage.setItem(SERIALIZE_CONFIG.STORAGE_KEY, nuevaConfig)  // ← Guarda en localStorage
  initialConfig.value = nuevaConfig
}
```

### 3. HomePage carga al montar (HomePage.vue → línea 145)

```javascript
onMounted(() => {
  const savedConfig = localStorage.getItem(SERIALIZE_CONFIG.STORAGE_KEY)
  if (savedConfig) {
    initialConfig.value = savedConfig  // ← Asigna a prop
  }
})
```

### 4. InventorySmart recibe y deserializa (InventorySmart.vue → línea 512)

```javascript
watch(() => props.configCanvas, (json) => {
  if (typeof json !== 'string' || json.trim().length === 0) return
  const ok = canvasStore.deserialize(json)  // ← Deserializa
})
```

---

## Análisis del bug

### useCanvasStore.serialize() - Líneas 1735-1775

```javascript
const serialize = (saveTimestamp = false) => {
  const state = {
    plantas: plantas.value.map(p => p?._custom?.value || p),
    elementos: elementos.value.map(e => e?._custom?.value || e),
    templates: catalogStore.templates?.map?.(t => t?._custom?.value || t) || [],
    catalogItems: catalogStore.items?.map?.(i => i?._custom?.value || i) || [],
    modoEdicion: modoEdicion.value,
  }
  
  // ✅ PASO 1: Agregar historial al state
  const ch = changeHistoryStore?.serialize?.()
  if (ch) state.changeHistory = ch
  
  // ❌ PROBLEMA: _serialize NO procesa templates, catalogItems ni changeHistory
  const jsonStr = _serialize(state, { ... })
  
  // ✅ PASO 2: Parsear y agregar plantillas/catalogItems DESPUÉS
  const parsed = JSON.parse(jsonStr)
  
  if (state.templates.length > 0) {
    parsed.plantillas = exportTemplatesToDTO(state.templates)  // ← Se AGREGA aquí
  }
  
  const itemsDTO = exportCatalogItemsToDTO(state.catalogItems)
  if (itemsDTO.length > 0) {
    parsed.catalogItems = itemsDTO  // ← Se AGREGA aquí
  }
  
  return JSON.stringify(parsed, null, 2)
}
```

### useStatePersistence.serialize() - Líneas 28-205

```javascript
const serialize = (state, options = {}) => {
  const serializedState = {
    meta: { ... },
    modoEdicion: state.modoEdicion === true,
    plantas: state.plantas.map((planta) => { ... }),  // ✅ Se serializa
    elementos: state.elementos.map((elemento) => { ... }),  // ✅ Se serializa
  }
  
  // ❌ NO incluye templates
  // ❌ NO incluye catalogItems
  // ❌ NO incluye changeHistory
  
  return JSON.stringify(serializedState, null, 2)
}
```

### El problema:

1. `useCanvasStore.serialize()` construye un `state` con `templates`, `catalogItems` y `changeHistory`
2. Llama a `_serialize(state)` que usa `useStatePersistence.serialize()`
3. **`useStatePersistence.serialize()` IGNORA `templates`, `catalogItems` y `changeHistory`**
4. Se parsea el JSON y se agregan `plantillas` y `catalogItems` DESPUÉS
5. Pero **`changeHistory` nunca se agrega al JSON final**

---

## Solución

### Opción A: Agregar a useStatePersistence.serialize()

```javascript
const serialize = (state, options = {}) => {
  const serializedState = {
    meta: { ... },
    modoEdicion: state.modoEdicion === true,
    plantas: state.plantas.map((planta) => { ... }),
    elementos: state.elementos.map((elemento) => { ... }),
  }
  
  // NUEVO: Incluir changeHistory si existe
  if (includeChangeHistory && state.changeHistory) {
    try {
      const changeHistoryData = typeof state.changeHistory.serialize === 'function'
        ? state.changeHistory.serialize()
        : state.changeHistory

      if (changeHistoryData && changeHistoryData.entries) {
        serializedState.changeHistory = {
          entries: changeHistoryData.entries,
          meta: {
            totalEntries: changeHistoryData.entries.length,
            exportedAt: timestamp
          }
        }
      }
    } catch (error) {
      console.warn('Error al serializar historial de cambios:', error)
    }
  }
  
  return JSON.stringify(serializedState, null, 2)
}
```

**Problema con Opción A:**
- `useStatePersistence` ya tiene lógica para `changeHistory` (líneas 171-189)
- Pero NO está siendo llamada correctamente

### Opción B: Agregar changeHistory en useCanvasStore después del parse ✅

```javascript
const serialize = (saveTimestamp = false) => {
  const state = { ... }
  
  // Incluir historial de cambios si existe
  try {
    const ch = changeHistoryStore?.serialize?.()
    if (ch) state.changeHistory = ch
  } catch (e) { /* ignore */ }

  const jsonStr = _serialize(state, { ... })
  
  try {
    const parsed = JSON.parse(jsonStr)
    
    // Agregar plantillas
    if (state.templates.length > 0) {
      parsed.plantillas = exportTemplatesToDTO(state.templates)
    }
    
    // Agregar catalogItems
    const itemsDTO = exportCatalogItemsToDTO(state.catalogItems)
    if (itemsDTO.length > 0) {
      parsed.catalogItems = itemsDTO
    }
    
    // ✅ NUEVO: Agregar changeHistory SI existe
    if (state.changeHistory) {
      parsed.changeHistory = state.changeHistory
    }
    
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return jsonStr
  }
}
```

---

## Verificación post-corrección

### JSON guardado debe contener:

```json
{
  "meta": { "version": "1.1.0", ... },
  "modoEdicion": true,
  "plantas": [ ... ],
  "elementos": [ ... ],
  "plantillas": [ ... ],           // ✅ Plantillas en formato DTO
  "catalogItems": [ ... ],         // ✅ Items de usuario en formato DTO
  "changeHistory": {               // ✅ Historial de cambios
    "entries": [ ... ],
    "meta": { ... }
  }
}
```

### Deserialización debe:

1. ✅ Restaurar plantas y elementos (ya funciona)
2. ✅ Importar `plantillas` con `importTemplatesFromDTO()` (línea 1867)
3. ✅ Importar `catalogItems` con `importCatalogItemsFromDTO()` (línea 1870)
4. ✅ Deserializar `changeHistory` (línea 1858-1862)

---

## Código a corregir

### Archivo: `src/inventory-smart/composables/useCanvasStore.js`

**Línea 1770:** Agregar `changeHistory` al JSON parseado antes de stringify final

```javascript
// Después de agregar catalogItems (línea ~1769)
// NUEVO: Agregar changeHistory si existe
if (state.changeHistory) {
  parsed.changeHistory = state.changeHistory
  if (parsed.meta?.metrics) {
    parsed.meta.metrics.totalChangeHistoryEntries = 
      state.changeHistory.entries?.length || 0
  }
}

return JSON.stringify(parsed, null, 2)
```
