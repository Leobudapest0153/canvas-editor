# Sistema de Sugerencias Automáticas de Colocación

## Descripción General

El Sistema de Sugerencias Automáticas permite ajustar elementos que no pueden ser colocados debido a restricciones de espacio o capacidad, ofreciendo al usuario opciones de ajuste sin modificar las entidades padre (piso/cuarto/planta).

## Arquitectura del Sistema

### Componentes Principales

1. **usePlacementSuggestions.js** - Composable que calcula ajustes viables
2. **usePlacementWithSuggestions.js** - Composable que integra validaciones con sugerencias
3. **PlacementSuggestionsModal.vue** - Modal UI para mostrar opciones al usuario
4. **InventorySmart.vue** - Integración global del sistema

## Flujo de Funcionamiento

### 1. Intento de Colocación

Cuando el usuario intenta colocar un elemento (drag & drop desde catálogo o paste desde buffer):

```javascript
// El sistema intenta la colocación normal
const validationResult = validatePlacement(elemento, position, neighbors, areaBounds)
```

### 2. Detección de Falla

Si la validación falla, el sistema analiza la razón:

- **Problemas de espacio**: elemento no cabe, colisiona con otros
- **Problemas de altura**: excede altura de bodega o conflicto Z-stacking
- **Problemas de capacidad**: excede peso máximo soportado

### 3. Generación de Sugerencias

El sistema calcula automáticamente ajustes viables:

#### Ajuste de Dimensiones
- Reduce dimensiones en incrementos del 10% (de 90% a 30%)
- Mantiene proporción del elemento
- Valida cada iteración contra:
  - Colisiones con otros elementos
  - Altura máxima de bodega
  - Stacking Z (altura entre elementos)

#### Ajuste de Capacidad
- Calcula reducción de peso necesaria
- Verifica que no sea menor que el uso actual
- Propone nueva capacidad de carga

### 4. Presentación al Usuario

Si hay opciones viables, se muestra el modal con:

```vue
<PlacementSuggestionsModal
  :visible="true"
  :suggestions="{ dimensionAdjustment, weightAdjustment }"
  :element-name="elemento.nombre"
  :reason="validationResult.reason"
  @accept="handleAccept"
  @cancel="handleCancel"
/>
```

### 5. Aplicación de Ajustes

Si el usuario acepta:
```javascript
const adjustedElement = applySuggestedAdjustments(elemento, suggestions)
// Se coloca el elemento con las nuevas dimensiones/capacidad
```

## Uso del Sistema

### Método 1: Integración Manual

```javascript
import { inject } from 'vue'

export default {
  setup() {
    const placementSuggestions = inject('placementSuggestions')
    
    const handleDrop = async (elemento, position) => {
      const success = await placementSuggestions.tryPlaceWithSuggestions(
        elemento,
        position,
        {
          onSuccess: async (adjustedElement) => {
            // Colocar elemento (ajustado si fue necesario)
            await canvasStore.agregarElemento(adjustedElement)
          },
          onFailure: (reason) => {
            // Mostrar error final
            showToast(`No se puede colocar: ${reason}`, 'error')
          }
        }
      )
    }
    
    return { handleDrop }
  }
}
```

### Método 2: Uso en Composables Existentes

Modificar composables como `useAutoPaste.js` o `useCanvasBuffer.js`:

```javascript
import { inject } from 'vue'
import { usePlacementWithSuggestions } from './usePlacementWithSuggestions'

export function useAutoPaste() {
  const placementSuggestions = inject('placementSuggestions') || 
                                usePlacementWithSuggestions()
  
  const handlePaste = async (options = {}) => {
    // ...código existente...
    
    // En lugar de validación directa, usar sistema de sugerencias
    const success = await placementSuggestions.tryPlaceWithSuggestions(
      elemento,
      position,
      {
        areaBounds,
        neighbors,
        onSuccess: colocarElemento,
        onFailure: mostrarError
      }
    )
  }
}
```

## API Reference

### usePlacementSuggestions()

#### generatePlacementSuggestions(elemento, position, validationResult, availableSpace)

Genera sugerencias de ajuste para un elemento que no puede ser colocado.

**Parámetros:**
- `elemento` (Object): Elemento que se intenta colocar
- `position` (Object): Posición deseada `{x, y}`
- `validationResult` (Object): Resultado de validación fallida con `reason`
- `availableSpace` (Object): Bounds del área disponible

**Retorna:**
```javascript
{
  dimensionAdjustment: {
    ancho: 180,
    largo: 135,
    alto: 90,
    originalAncho: 200,
    originalLargo: 150,
    originalAlto: 100,
    reductionPercent: 10
  },
  weightAdjustment: {
    capacidadOriginal: 500,
    capacidadAjustada: 450,
    reductionPercent: 10,
    excesoEliminado: 50
  },
  hasViableOptions: true
}
```

#### applySuggestedAdjustments(elemento, suggestions)

Aplica los ajustes sugeridos a un elemento.

**Parámetros:**
- `elemento` (Object): Elemento original
- `suggestions` (Object): Sugerencias calculadas

**Retorna:** Elemento con ajustes aplicados

### usePlacementWithSuggestions()

#### tryPlaceWithSuggestions(elemento, position, options)

Intenta colocar un elemento con soporte para sugerencias automáticas.

**Parámetros:**
- `elemento` (Object): Elemento a colocar
- `position` (Object): Posición `{x, y}`
- `options` (Object):
  - `areaBounds` (Object): Bounds del área
  - `neighbors` (Array): Elementos vecinos
  - `onSuccess` (Function): Callback si coloca exitosamente
  - `onFailure` (Function): Callback si falla definitivamente
  - `autoApply` (Boolean): Si true, aplica primera sugerencia sin mostrar modal

**Retorna:** Promise<boolean> - True si se colocó o mostró modal

## Casos de Uso

### Caso 1: Elemento Demasiado Grande

**Escenario:** Usuario arrastra un estante de 200x150x100cm a un espacio de 180x180cm

**Flujo:**
1. Sistema detecta que no cabe (ancho > espacio disponible)
2. Calcula dimensión ajustada: 180x135x90cm (reducción 10%)
3. Muestra modal con sugerencia
4. Usuario acepta → elemento se coloca con nuevas dimensiones

### Caso 2: Exceso de Peso

**Escenario:** Usuario intenta agregar elemento de 100kg a piso con capacidad disponible de 80kg

**Flujo:**
1. Sistema detecta exceso de 20kg
2. Calcula ajuste: reducir capacidad de carga del elemento de 100kg a 80kg
3. Muestra modal explicando el ajuste
4. Usuario acepta → elemento se coloca con capacidad reducida

### Caso 3: Sin Opciones Viables

**Escenario:** Usuario intenta colocar elemento de 200kg en piso con capacidad disponible de 0kg

**Flujo:**
1. Sistema detecta exceso de peso
2. No puede reducir a 0kg (no viable)
3. No muestra modal
4. Muestra alerta: "No se puede colocar: capacidad disponible agotada"

## Principios de Diseño

### 1. Nunca Modificar Entidades Padre

El sistema **NUNCA** modifica:
- Capacidad de pisos/cuartos/plantas
- Dimensiones de contenedores padre
- Estructura jerárquica existente

Solo ajusta el elemento que se está intentando colocar.

### 2. Transparencia Total

El modal muestra claramente:
- Qué se está ajustando (dimensiones, capacidad)
- Valores originales vs. ajustados
- Porcentaje de reducción
- Razón del ajuste

### 3. Usuario en Control

- Usuario decide si acepta o rechaza ajustes
- No se aplican cambios silenciosos
- Siempre se puede cancelar

### 4. Ajustes Conservadores

- Intenta ajustes mínimos primero (10%)
- Solo reduce hasta donde sea necesario
- Mantiene proporciones cuando es posible

## Integración con Validaciones Existentes

El sistema se integra con:

- ✅ `usePlacementGuards` - Validaciones de placement
- ✅ `useWeightValidation` - Validaciones de peso
- ✅ `isPlacementValid` - Validación de colisiones
- ✅ `validateHeightWithinWarehouse` - Validación de altura
- ✅ `validateZStacking` - Validación de apilamiento Z

No reemplaza las validaciones existentes, las utiliza para calcular ajustes viables.

## Consideraciones de Rendimiento

- Cálculo de sugerencias es O(n) donde n = número de reducciones intentadas (max 7)
- Validaciones se cachean cuando es posible
- Modal solo se muestra si hay opciones viables
- No impacta el flujo normal (solo se activa en fallos)

## Próximos Pasos (Futuro)

1. **Ajustes de Ubicación**: Sugerir ubicación alternativa si dimensiones son correctas
2. **Ajustes Inteligentes**: Aprender de preferencias del usuario
3. **Múltiples Opciones**: Mostrar 2-3 opciones de ajuste diferentes
4. **Historial**: Recordar ajustes frecuentes para sugerir automáticamente

## Testing

Ver tests en: `src/inventory-smart/__tests__/placement-suggestions.spec.js`

Ejecutar:
```bash
npm run test:unit -- placement-suggestions
```

## Troubleshooting

### Modal no aparece aunque elemento no se puede colocar

**Posible causa:** No hay ajustes viables calculados
**Solución:** Verificar que la razón del fallo sea ajustable (espacio, altura, peso)

### Ajustes no se aplican correctamente

**Posible causa:** Callback `onSuccess` no está implementado
**Solución:** Verificar que se pase función válida en `onSuccess`

### Sistema no está disponible globalmente

**Posible causa:** `provide` no se ejecutó en `InventorySmart.vue`
**Solución:** Verificar que `onMounted` incluye `provide('placementSuggestions', ...)`

## Soporte

Para reportar bugs o sugerir mejoras, contactar al equipo de desarrollo o abrir issue en el repositorio.

