# Documentación de Serialización/Deserialización

## 🎯 Funciones Implementadas

### `serialize(state)` → JSON

Convierte el estado completo del canvas a formato JSON, incluyendo todas las plantas, elementos, configuración y metadatos.

#### Estructura del JSON generado:

```javascript
{
  "meta": {
    "version": "1.0.0",
    "timestamp": "2025-08-15T13:30:00.000Z",
    "app": "dv-canva-editor"
  },
  "plantas": [
    {
      "id": "planta_1",
      "nombre": "Planta Baja",
      "descripcion": "Nivel principal del edificio",
      "dimensiones": {
        "alto": 300,
        "ancho": 1000,
        "largo": 1200
      },
      "capacidadCargaSoportado": 5000,
      "elementos": [],
      "activa": true,
      "propiedadesPersonalizadas": {}
    }
  ],
  "elementos": [
    {
      "id": "elem_123",
      "nombre": "Anaquel Principal",
      "tipo": "anaquel",
      "categoria": "anaqueles",
      "plantaId": "planta_1",
      "dimensiones": {
        "ancho": 80,
        "largo": 120,
        "alto": 160
      },
      "posicion": {
        "x": 100,
        "y": 150,
        "z": 0,
        "rotation": 0
      },
      "visual": {
        "colorBase": "#3b82f6",
        "forma": "rectangular",
        "visible": true
      },
      "propiedades": {
        "capacidadCarga": 300,
        "ubicacion": "suelo",
        "descripcion": "Anaquel metálico de capacidad media"
      },
      "jerarquia": {
        "padre": null,
        "hijos": ["elem_124", "elem_125"],
        "nivel": 0
      },
      "propiedadesPersonalizadas": {
        "material": "metal",
        "responsable": "Juan Pérez",
        "fechaInstalacion": "2025-01-15"
      },
      "metadatos": {
        "fechaCreacion": "2025-08-15T10:30:00.000Z",
        "fechaModificacion": "2025-08-15T13:15:00.000Z",
        "creador": "usuario"
      }
    }
  ],
  "configuracion": {
    "plantaActiva": "planta_1",
    "elementoSeleccionado": null,
    "vistaActiva": "XY",
    "zoom": 1,
    "panX": 0,
    "panY": 0,
    "contextoNavegacion": {
      "tipo": "planta",
      "id": "planta_1",
      "path": []
    },
    "canvasAdaptativo": {
      "width": 800,
      "height": 600,
      "escala": 1
    }
  }
}
```

### `deserialize(json)` → Boolean

Reconstruye el estado del canvas desde un JSON, con validación y manejo de errores.

#### Características:

- ✅ **Validación de estructura**: Verifica que el JSON tenga la estructura correcta
- ✅ **Limpieza de estado**: Borra el estado actual antes de cargar el nuevo
- ✅ **Valores por defecto**: Aplica valores por defecto para propiedades faltantes
- ✅ **Manejo de errores**: Devuelve `false` si hay problemas en la deserialización
- ✅ **Logging**: Registra en consola el resultado de la operación
- ✅ **Historial**: Guarda la acción en el historial del canvas

## 🔧 Funciones de Utilidad (useCanvasImportExport)

### `exportarCanvas(nombreArchivo?)`

Exporta el estado completo a un archivo JSON descargable.

```javascript
import { useCanvasImportExport } from './composables/useCanvasImportExport'

const importExport = useCanvasImportExport()

// Exportar con nombre automático
await importExport.exportarCanvas()

// Exportar con nombre personalizado
await importExport.exportarCanvas('mi-backup-canvas.json')
```

### `importarCanvas(archivo)`

Importa el estado desde un archivo JSON seleccionado por el usuario.

```javascript
// En un input file handler
const handleFileSelect = async (event) => {
  const archivo = event.target.files[0]
  if (archivo) {
    try {
      const exito = await importExport.importarCanvas(archivo)
      if (exito) {
        console.log('Canvas importado exitosamente')
      }
    } catch (error) {
      console.error('Error al importar:', error.message)
    }
  }
}
```

### `exportarPlantas(nombreArchivo?)`

Exporta solo la configuración de plantas (sin elementos).

```javascript
// Útil para compartir configuraciones de plantas entre proyectos
await importExport.exportarPlantas('plantas-edificio-central.json')
```

### `copiarAlPortapapeles()`

Copia el JSON del estado actual al portapapeles.

```javascript
const copiar = async () => {
  const exito = await importExport.copiarAlPortapapeles()
  if (exito) {
    // Mostrar notificación "Copiado"
  }
}
```

### `pegarDesdePortapapeles()`

Pega y deserializa JSON desde el portapapeles.

```javascript
const pegar = async () => {
  try {
    const exito = await importExport.pegarDesdePortapapeles()
    if (exito) {
      // Canvas actualizado
    }
  } catch (error) {
    // Manejar error (JSON inválido, etc.)
  }
}
```

### `validarJSON(jsonString)`

Valida la estructura de un JSON antes de importar.

```javascript
const validacion = importExport.validarJSON(jsonString)

console.log(validacion)
// {
//   valido: true,
//   tipo: 'completo', // 'completo' | 'plantas' | 'desconocido'
//   version: '1.0.0',
//   plantas: 3,
//   elementos: 15,
//   fecha: '2025-08-15T13:30:00.000Z'
// }
```

## 📋 Casos de Uso

### 1. Backup y Recuperación

```javascript
// Crear backup automático
const crearBackup = () => {
  const fecha = new Date().toISOString().split('T')[0]
  importExport.exportarCanvas(`backup-${fecha}.json`)
}

// Programar backups automáticos
setInterval(crearBackup, 30 * 60 * 1000) // Cada 30 minutos
```

### 2. Plantillas de Proyecto

```javascript
// Exportar como plantilla
const crearPlantilla = async () => {
  await importExport.exportarCanvas('plantilla-almacen-tipo-a.json')
}

// Usar plantilla para nuevo proyecto
const usarPlantilla = async (archivo) => {
  await importExport.importarCanvas(archivo)
  // Personalizar según necesidades específicas
}
```

### 3. Colaboración

```javascript
// Desarrollador A exporta su trabajo
await importExport.copiarAlPortapapeles()

// Desarrollador B importa los cambios
await importExport.pegarDesdePortapapeles()
```

### 4. Migración de Datos

```javascript
// Migrar desde formato anterior
const migrarDatos = (datosAntiguos) => {
  const datosNuevos = convertirFormato(datosAntiguos)
  const jsonString = JSON.stringify(datosNuevos)
  return canvasStore.deserialize(jsonString)
}
```

## ⚠️ Consideraciones Importantes

### Compatibilidad de Versiones

- El campo `meta.version` permite manejar migraciones futuras
- Siempre validar la versión antes de deserializar
- Implementar conversores para versiones anteriores

### Propiedades Personalizadas

- Cualquier propiedad adicional se guarda en `propiedadesPersonalizadas`
- Permite extensibilidad sin romper la estructura base
- Los plugins pueden agregar sus propios datos

### Rendimiento

- La serialización es síncrona pero puede ser lenta con muchos elementos
- Para proyectos grandes, considerar serialización parcial
- El JSON generado puede ser grande (comprimir si es necesario)

### Seguridad

- **No serializar funciones o referencias circulares**
- Validar datos al deserializar (especialmente `propiedadesPersonalizadas`)
- Sanitizar nombres de archivo al exportar

## 🧪 Testing

### Casos de Prueba Recomendados

```javascript
// 1. Estado vacío
const estadoVacio = { plantas: [], elementos: [], configuracion: {} }

// 2. Estado con jerarquía compleja
const estadoComplejo = {
  plantas: [
    /* ... */
  ],
  elementos: [
    /* con padres e hijos */
  ],
  configuracion: {
    /* ... */
  },
}

// 3. Datos corruptos
const datosCorruptos = {
  plantas: [{ id: null }], // ID inválido
  elementos: [{ posicion: { x: 'invalid' } }], // Tipo incorrecto
}

// 4. JSON malformado
const jsonMalformado = '{"plantas": [}'

// 5. Estructura incompleta
const estructuraIncompleta = { plantas: [] } // Falta elementos y configuración
```

### Validaciones Automáticas

```javascript
const validarEstado = (estado) => {
  // Validar IDs únicos
  const ids = estado.elementos.map((el) => el.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('IDs duplicados encontrados')
  }

  // Validar referencias de jerarquía
  estado.elementos.forEach((elemento) => {
    if (elemento.padre && !ids.includes(elemento.padre)) {
      throw new Error(`Padre ${elemento.padre} no encontrado`)
    }
  })

  // Validar plantas existentes
  const plantaIds = estado.plantas.map((p) => p.id)
  estado.elementos.forEach((elemento) => {
    if (!plantaIds.includes(elemento.plantaId)) {
      throw new Error(`Planta ${elemento.plantaId} no encontrada`)
    }
  })
}
```

## 📝 Ejemplo Completo

```javascript
import { useCanvasStore } from './composables/useCanvasStore'
import { useCanvasImportExport } from './composables/useCanvasImportExport'

// Configurar canvas
const canvasStore = useCanvasStore()
const importExport = useCanvasImportExport()

// Agregar datos de prueba
canvasStore.agregarElemento({
  tipo: 'anaquel',
  nombre: 'Anaquel Principal',
  plantaId: 'planta_1',
  propiedadesPersonalizadas: {
    responsable: 'Juan Pérez',
    zona: 'A1',
    material: 'metal',
  },
})

// Serializar y guardar
const jsonState = canvasStore.serialize()
localStorage.setItem('backup', jsonState)

// Restaurar desde backup
const backup = localStorage.getItem('backup')
if (backup) {
  const exito = canvasStore.deserialize(backup)
  console.log('Backup restaurado:', exito)
}

// Exportar archivo
await importExport.exportarCanvas('proyecto-almacen.json')

// Crear plantilla solo de plantas
await importExport.exportarPlantas('plantilla-plantas.json')
```
