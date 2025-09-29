# Historial de Cambios en Serialización

## Descripción

El sistema de serialización/deserialización del canvas ahora soporta la inclusión opcional del historial de cambios. Esta funcionalidad permite exportar e importar archivos que mantengan el rastro completo de modificaciones realizadas.

## Características

### ✅ Serialización con Historial
- Parámetro opcional `includeChangeHistory` en la función `serialize()`
- El historial se incluye solo si se solicita explícitamente
- Validación automática de la estructura del historial antes de incluirlo
- Métricas adicionales cuando se incluye el historial

### ✅ Deserialización con Historial
- Detección automática de la presencia del historial en archivos importados
- Restauración opcional usando `storeActions.setChangeHistory()`
- Logging detallado del proceso de restauración
- Manejo robusto de errores (el historial no impide la importación)

### ✅ Validación Mejorada
- La función `validateStructure()` valida la estructura del historial
- Advertencias (no errores críticos) para problemas en el historial
- Información detallada sobre el historial en las métricas de validación

## Uso

### Serialización Incluyendo Historial

```javascript
import { useStatePersistence } from '@/composables/useStatePersistence'
import { useChangeHistoryStore } from '@/stores/changeHistory'

const { serialize } = useStatePersistence()
const changeHistoryStore = useChangeHistoryStore()

// Obtener estado completo incluyendo historial
const state = {
  plantas: canvasStore.plantas,
  elementos: canvasStore.elementos,
  catalogos: canvasStore.catalogos,
  changeHistory: changeHistoryStore // Pasar el store completo
}

// Serializar con historial
const jsonData = serialize(state, {
  includeChangeHistory: true,    // ✨ Nuevo parámetro
  includeMetrics: true,
  validateBeforeSerialize: true
})

console.log('📝 Archivo exportado con historial de cambios')
```

### Deserialización Restaurando Historial

```javascript
const { deserialize } = useStatePersistence()

// Preparar acciones del store incluyendo historial
const storeActions = {
  clearState: () => canvasStore.clearState(),
  setCatalogos: (catalogos) => canvasStore.setCatalogos(catalogos),
  setChangeHistory: (entries) => changeHistoryStore.setEntries(entries), // ✨ Nueva acción
  setInitialNavigation: (plantaId, nombre) => canvasStore.setActiveFloor(plantaId)
}

// Deserializar (restaurará historial automáticamente si está presente)
const success = deserialize(jsonData, storeActions)

if (success) {
  console.log('✅ Estado restaurado incluyendo historial de cambios')
}
```

### Validación de Archivos con Historial

```javascript
const { validateStructure } = useStatePersistence()

const validation = validateStructure(jsonData, true)

if (validation.valid) {
  console.log('Información del historial:', validation.info.changeHistory)
  // Output:
  // {
  //   hasChangeHistory: true,
  //   entries: 15,
  //   exportedAt: "2025-09-25T10:30:00.000Z"
  // }
}
```

## Estructura del Historial en JSON

Cuando se incluye el historial, el archivo JSON tendrá esta estructura adicional:

```json
{
  "meta": {
    "version": "1.0.0",
    "timestamp": "2025-09-25T10:30:00.000Z",
    "app": "inventory-smart",
    "metrics": {
      "totalPlantas": 2,
      "totalElementos": 45,
      "totalChangeHistory": 15
    }
  },
  "catalogos": { ... },
  "plantas": [ ... ],
  "elementos": [ ... ],
  "changeHistory": {
    "entries": [
      {
        "id": 1,
        "timestamp": "2025-09-25T09:15:00.000Z",
        "author": {
          "id": "user123",
          "name": "Juan Pérez"
        },
        "summary": {
          "total": 3,
          "created": 1,
          "updated": 2,
          "deleted": 0
        },
        "changes": [
          {
            "entityType": "elementos",
            "op": "create",
            "id": "elem_001",
            "name": "Estantería A1",
            "plantaId": "planta_001",
            "fields": [ ... ]
          }
        ]
      }
    ],
    "meta": {
      "totalEntries": 15,
      "exportedAt": "2025-09-25T10:30:00.000Z"
    }
  }
}
```

## Consideraciones

### 🔒 Retrocompatibilidad
- Los archivos SIN historial siguen funcionando normalmente
- La deserialización es 100% compatible con archivos antiguos
- No hay cambios en la API existente, solo extensiones opcionales

### ⚡ Rendimiento
- El historial solo se procesa si se solicita explícitamente
- Validación ligera que no afecta el rendimiento de archivos sin historial
- Manejo de errores que no bloquea la importación principal

### 🛡️ Robustez
- Errores en el historial no impiden la importación del canvas
- Validación independiente de la estructura del historial
- Logging detallado para debugging

### 📊 Métricas
- Nuevas métricas en `meta.metrics.totalChangeHistory`
- Información detallada en validación sobre el historial presente
- Logging completo del proceso de exportación/importación

## Limitaciones

- El historial puede aumentar significativamente el tamaño del archivo
- Solo funciona si el store de historial está correctamente configurado
- Requiere que `storeActions.setChangeHistory` esté disponible para la restauración