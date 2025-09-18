# Sistema de Plantillas con Posicionamiento Automático de Pisos

## Resumen

Se ha extendido el sistema de plantillas para manejar automáticamente la regeneración de posiciones de pisos/niveles internos cuando se instancia una plantilla de cuarto/espacio desde el catálogo al canvas.

## Funcionamiento Completo

### 1. Flujo de Guardado de Plantillas

```javascript
// Usuario crea cuarto/espacio con pisos internos
const cuarto = crearDesdeFormulario({
  tipo: "cuarto",
  datosGenerales: { nombre: "Almacén A" },
  dimensiones: { ancho: 3, largo: 4, alto: 5 }, // metros
  pisosNiveles: [
    { nombre: "Piso 1", alto: 2.5 },
    { nombre: "Piso 2", alto: 2.5 }
  ]
})
// ↓ Genera automáticamente:
// - cuarto_1234 (contenedor principal)
// - cuarto_1234_piso_1 (x=0, y=250cm, z=0cm)  
// - cuarto_1234_piso_2 (x=0, y=0cm, z=250cm)

// Usuario guarda como plantilla
serializeElementForTemplate(cuarto.id)
// ↓ Serializa estructura completa:
// - Elemento padre con meta.tienePisosGenerados = true
// - Pisos hijos con meta.esPisoInterno = true
// - Relaciones padre-hijo preservadas
// - Posiciones relativas guardadas
```

### 2. Flujo de Instanciación desde Plantilla

```javascript
// Usuario arrastra plantilla al canvas
createElementFromTemplate(templateData, dropEvent)
// ↓ Llama a:
pasteFromSerialized(payload, position)
// ↓ Llama a:
pasteStructureRecursive(elementoToPaste, position, allElementsMap)

// NUEVA LÓGICA IMPLEMENTADA:
if (elementoToPaste.meta?.tienePisosGenerados === true) {
  // Detecta elemento con pisos generados
  regenerarPisosEnPlantilla(elementoToPaste, allElementsMap, nuevoElementoId, dimensiones)
  // ↓ Recalcula posiciones en vista frontal (XZ)
}
```

### 3. Algoritmo de Regeneración de Posiciones

```javascript
const regenerarPisosEnPlantilla = (elementoPadre, allElementsMap, nuevoElementoPadreId, dimensionesPadre) => {
  // 1. Filtrar y ordenar pisos hijos
  const pisosHijos = elementoPadre.hijos
    .map(hijoId => allElementsMap.get(hijoId))
    .filter(hijo => hijo?.meta?.esPisoInterno === true)
    .sort((a, b) => (a.meta?.indicePiso || 0) - (b.meta?.indicePiso || 0))

  // 2. Aplicar lógica de apilamiento vertical
  let acumuladoAlto = 0
  pisosHijos.forEach((piso, idx) => {
    const altoPiso = piso.dimensiones?.alto || 0
    const anchoPiso = piso.dimensiones?.ancho || dimensionesPadre.ancho
    
    // 3. Calcular nuevas posiciones en vista frontal (XZ)
    const posX = (dimensionesPadre.ancho - anchoPiso) / 2  // Centrado horizontal
    const alturaDesdeAbajo = acumuladoAlto + altoPiso
    const posY = dimensionesPadre.alto - alturaDesdeAbajo   // Sistema coordenadas invertido
    
    // 4. Instanciar piso con nuevas posiciones
    const pisoReposicionado = {
      ...piso,
      x: posX * CM_TO_PX,
      y: posY * CM_TO_PX,
      alturaRespectoAlSuelo: acumuladoAlto,
      padre: nuevoElementoPadreId
    }
    
    addElementDirectly(pisoReposicionado, nuevoElementoPadreId)
    acumuladoAlto += altoPiso
  })
}
```

## Casos de Uso

### Caso 1: Plantilla Simple sin Pisos

```javascript
// Plantilla: Mesa de trabajo
Template = {
  elementos: [
    { id: "mesa_1", tipo: "elementos", meta: {} }
  ]
}

// Al arrastrar → Instanciación normal
// No se aplica lógica especial
```

### Caso 2: Plantilla con Pisos Generados

```javascript
// Plantilla: Cuarto con 3 pisos  
Template = {
  elementos: [
    { 
      id: "cuarto_1", 
      tipo: "cuartos",
      dimensiones: { ancho: 300, largo: 400, alto: 600 }, // cm
      meta: { tienePisosGenerados: true },
      hijos: ["piso_1", "piso_2", "piso_3"]
    },
    { 
      id: "piso_1", 
      tipo: "pisos",
      dimensiones: { ancho: 300, largo: 400, alto: 200 },
      meta: { esPisoInterno: true, indicePiso: 1 },
      padre: "cuarto_1"
    },
    { 
      id: "piso_2", 
      tipo: "pisos", 
      dimensiones: { ancho: 300, largo: 400, alto: 200 },
      meta: { esPisoInterno: true, indicePiso: 2 },
      padre: "cuarto_1"
    },
    { 
      id: "piso_3", 
      tipo: "pisos",
      dimensiones: { ancho: 300, largo: 400, alto: 200 },
      meta: { esPisoInterno: true, indicePiso: 3 },
      padre: "cuarto_1"
    }
  ]
}

// Al arrastrar → Aplicación de lógica especial:
// 1. Instancia cuarto_nuevo_1234
// 2. Detecta meta.tienePisosGenerados = true
// 3. Regenera posiciones de pisos:
//    - Piso 1: x=0cm, y=400cm, z=0cm    (desde abajo)
//    - Piso 2: x=0cm, y=200cm, z=200cm
//    - Piso 3: x=0cm, y=0cm,   z=400cm  (arriba)
```

### Caso 3: Redimensionamiento de Plantilla

```javascript
// Usuario modifica dimensiones del cuarto después de instanciar
// Dimensiones originales: 300×400×600 cm
// Nuevas dimensiones: 400×500×800 cm

regenerarPosicionesPisos("cuarto_nuevo_1234", { ancho: 400, largo: 500, alto: 800 })

// Recalcula automáticamente:
// - Piso 1: x=0cm,   y=600cm, z=0cm    (centrado en 400cm ancho)
// - Piso 2: x=0cm,   y=400cm, z=200cm
// - Piso 3: x=0cm,   y=200cm, z=400cm
// - Espacio libre: 200cm arriba (800 - 600)
```

## Ventajas del Sistema

### 1. **Automatización Completa**
- **Detección automática**: Identifica elementos con pisos generados
- **Regeneración inteligente**: Recalcula posiciones automáticamente
- **Preservación de datos**: Mantiene todas las propiedades originales

### 2. **Consistencia Visual**
- **Vista frontal optimizada**: Posiciones calculadas para vista XZ
- **Apilamiento correcto**: Respeta el orden vertical de los pisos
- **Centrado automático**: Pisos se centran horizontalmente

### 3. **Flexibilidad**
- **Reutilización**: Plantillas funcionan en cualquier contexto
- **Escalabilidad**: Maneja cualquier cantidad de pisos
- **Compatibilidad**: No afecta plantillas existentes sin pisos

### 4. **Integración Perfecta**
- **Sistema existente**: Extiende funcionalidad sin romper compatibilidad
- **Navegación jerárquica**: Mantiene relaciones padre-hijo
- **Validaciones**: Respeta todas las validaciones de peso y espacio

## Estructura de Metadatos

### Elemento Contenedor (Cuarto/Espacio)
```javascript
{
  id: "cuarto_1234",
  tipo: "cuartos",
  meta: {
    tienePisosGenerados: true,  // 🔑 Flag de identificación
    niveles: [...],             // Datos originales del formulario
  },
  hijos: ["piso_1", "piso_2"]   // Referencias a pisos internos
}
```

### Elemento Piso Interno
```javascript
{
  id: "piso_1", 
  tipo: "pisos",
  meta: {
    esPisoInterno: true,        // 🔑 Flag de identificación
    indicePiso: 1,              // Orden de apilamiento  
    contenedorPadre: "cuarto_1234"
  },
  padre: "cuarto_1234",         // Relación jerárquica
  x: 0,                         // Posición calculada
  y: 2500,                      // Posición calculada
  alturaRespectoAlSuelo: 0      // Altura Z en cm
}
```

## Logging y Debug

El sistema incluye logging detallado para debugging:

```javascript
// Durante guardado de plantilla:
🏗️ Clonando 2 pisos internos para Almacén Principal

// Durante instanciación:
🏗️ Regenerando posiciones de 2 pisos para plantilla: Almacén Principal
✅ Piso 1 reposicionado: x=0.0cm, y=250.0cm, z=0cm
✅ Piso 2 reposicionado: x=0.0cm, y=0.0cm, z=250cm  
🏁 Regeneración de pisos completada. Alto total acumulado: 500cm
```

## Compatibilidad

- ✅ **Plantillas existentes**: Sin pisos generados funcionan normalmente
- ✅ **Elementos manuales**: Pisos creados manualmente no se ven afectados  
- ✅ **Navegación jerárquica**: Funciona correctamente con el sistema existente
- ✅ **Validaciones**: Respeta todas las validaciones de peso, espacio y colisiones
- ✅ **Vistas**: Compatible con vistas XY y XZ
- ✅ **Buffer/Clipboard**: Funciona con copiar/pegar también

## Casos Extremos Manejados

1. **Plantilla sin pisos hijos**: Se comporta como antes
2. **Metadatos faltantes**: Graceful fallback a comportamiento normal
3. **Dimensiones inválidas**: Usa valores por defecto seguros
4. **Errores de instanciación**: Log de errores sin crashear la aplicación
5. **Pisos con dimensiones personalizadas**: Respeta dimensiones específicas

Esta implementación hace que las plantillas de cuartos/espacios con pisos sean completamente funcionales y reutilizables, manteniendo la consistencia visual y la integridad de la estructura jerárquica.