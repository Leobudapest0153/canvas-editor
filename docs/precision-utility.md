# Utilidad de Corrección de Precisión

## Descripción

La utilidad `precision.js` proporciona funciones para corregir errores de precisión de punto flotante que pueden ocurrir durante operaciones de transformación en el canvas, especialmente cuando se trabaja con elementos Konva.

## Problema que resuelve

Durante las transformaciones (redimensionamiento, movimiento, rotación) de elementos en el canvas usando Konva, los valores de coordenadas y dimensiones pueden acumular pequeños errores de punto flotante. Por ejemplo:

```javascript
// Valores que deberían ser exactos pero tienen errores de precisión
const x = 100.00000000001
const y = 200.00000000002
const width = 150.00000000001
```

Estos errores microscópicos pueden causar problemas en:
- Validaciones de posicionamiento
- Cálculos de colisiones
- Comparaciones exactas
- Serialización/deserialización

## Funciones disponibles

### `correctPrecision(value, precision)`
Corrige un valor numérico individual.

### `correctCoordinates(x, y, precision)`
Corrige coordenadas (x, y) simultáneamente.

### `correctDimensions(width, height, precision)`
Corrige dimensiones (width, height) simultáneamente.

### `correctTransformValues(transform, precision)`
Corrige todas las propiedades de transformación en un objeto (x, y, width, height, rotation).

### `calculatePrecisionDifferences(original, corrected)`
Calcula las diferencias entre valores originales y corregidos para debugging.

## Uso en useTransformer

La utilidad se usa principalmente en `useTransformer.js` en los siguientes puntos:

1. **handleTransformEnd**: Corregir valores finales antes de validaciones y persistencia
2. **Aplicación al nodo Konva**: Asegurar valores exactos en el canvas
3. **Persistencia en store**: Guardar valores corregidos en el estado
4. **revertTransform**: Aplicar corrección también en operaciones de reversión

## Configuración de precisión

Por defecto se usa `PRECISION_PIXELS = 1000000` (6 decimales de precisión), que es suficiente para operaciones de píxeles en interfaces de usuario.

## Ejemplo de uso

```javascript
import { correctTransformValues } from '@/inventory-smart/utils/precision'

// Valores con errores de precisión
const valores = {
  x: 100.00000000001,
  y: 200.00000000002,
  width: 150.00000000001,
  height: 250.00000000002
}

// Corrección aplicada
const corregidos = correctTransformValues(valores)
// Resultado: { x: 100, y: 200, width: 150, height: 250 }
```
