# Troubleshooting: Out of Memory en Copy/Paste

## 🚨 Problema

Después de las optimizaciones, el navegador arroja error "Out of Memory" durante copy/paste.

## 🔍 Root Cause

Valores inválidos en `areaBounds` o dimensiones de elementos causaban:
- Bucles infinitos en `createOccupancyGrid()`
- Grids masivos (millones de celdas)
- NaN o Infinity en cálculos de iteración

## ✅ Soluciones Implementadas

### 1. Validaciones en `createOccupancyGrid()`

```javascript
// 🛡️ VALIDACIÓN 1: areaBounds debe ser válido
if (!areaBounds || !Number.isFinite(areaBounds.minX) || ...) {
  return { grid: [[false]], gridWidth: 1, gridHeight: 1, ... }
}

// 🛡️ VALIDACIÓN 2: Área debe ser positiva y razonable (<100,000px)
if (areaWidth <= 0 || areaWidth > 100000 || ...) {
  return grid vacío
}

// 🛡️ VALIDACIÓN 3: Grid no debe exceder 1 millón de celdas
const MAX_GRID_CELLS = 1000000
if (gridWidth * gridHeight > MAX_GRID_CELLS) {
  // Aumentar gridResolution recursivamente
  return createOccupancyGrid(areaBounds, neighbors, newResolution)
}
```

### 2. Validaciones en `getElementDimensions()`

```javascript
// 🛡️ VALIDACIÓN: Dimensiones deben ser finitas y positivas
if (Number.isFinite(width) && width > 0 && ...) {
  return { width, height }
}

// 🛡️ VALIDACIÓN FINAL: Siempre retornar valores válidos (mínimo 50px)
return {
  width: Number.isFinite(width) && width > 0 ? width : 50,
  height: Number.isFinite(height) && height > 0 ? height : 50
}
```

### 3. Validaciones en `findAvailableSpace()`

```javascript
// 🛡️ VALIDACIÓN: areaBounds debe ser válido
if (!areaBounds || !Number.isFinite(areaBounds.minX) || ...) {
  return { found: false }
}

// 🛡️ VALIDACIÓN: Element dimensions deben ser válidas
if (!Number.isFinite(elementWidth) || elementWidth <= 0 || ...) {
  return { found: false }
}

// 🛡️ VALIDACIÓN: Área debe tener dimensiones válidas
if (!Number.isFinite(areaWidth) || areaWidth <= 0 || ...) {
  return { found: false }
}
```

### 4. Validaciones en Búsqueda Exhaustiva

```javascript
// 🛡️ VALIDACIÓN: smallGridSize no debe ser 0 o negativo
if (!Number.isFinite(smallGridSize) || smallGridSize <= 0) {
  return { found: false }
}

// 🛡️ VALIDACIÓN: Prevenir bucles infinitos
for (let y = ...; y <= ...; y += smallGridSize) {
  if (!Number.isFinite(y)) {
    return { found: false }
  }
  
  for (let x = ...; x <= ...; x += smallGridSize) {
    if (!Number.isFinite(x)) {
      return { found: false }
    }
    // ... resto del código
  }
}
```

## 🧪 Testing

### Escenarios que ahora están protegidos:

1. ✅ **areaBounds con NaN/Infinity**
   - Antes: Bucle infinito → Out of Memory
   - Ahora: Return early con error en consola

2. ✅ **Dimensiones de elemento = 0**
   - Antes: División por 0 → NaN → Bucle infinito
   - Ahora: Fallback a 50px mínimo

3. ✅ **Grid masivo (>1M celdas)**
   - Antes: Intentaba crear array enorme → Out of Memory
   - Ahora: Aumenta gridResolution automáticamente

4. ✅ **Área extremadamente grande**
   - Antes: Grid 10,000 × 10,000 celdas
   - Ahora: Limita a 100,000px máximo por dimensión

## 📊 Métricas de Seguridad

| Validación | Límite | Acción |
|------------|--------|--------|
| Grid cells | 1,000,000 | Aumentar gridResolution |
| Área width/height | 100,000px | Return empty grid |
| Element dimensions | 1px mínimo | Fallback a 50px |
| Iterations | 5,000 | Cancelar búsqueda |

## 🔮 Próximos Pasos

Si el problema persiste:

1. **Revisar valores de entrada:**
   ```javascript
   console.log('areaBounds:', areaBounds)
   console.log('elemento.dimensiones:', elemento.dimensiones)
   console.log('elemento.width/height:', elemento.width, elemento.height)
   ```

2. **Monitorear en consola:**
   - Buscar mensajes `❌` de validaciones fallidas
   - Verificar valores reportados

3. **Casos edge a investigar:**
   - Plantas con `isInfinite = true` y viewport muy grande
   - Elementos sin dimensiones (templates corruptos)
   - Zoom extremo (< 0.01 o > 100)

## 📝 Archivos Modificados

- `src/inventory-smart/composables/useAutoPaste.js`
  - `createOccupancyGrid()` - 3 validaciones agregadas
  - `getElementDimensions()` - 2 validaciones agregadas
  - `findAvailableSpace()` - 3 validaciones agregadas
  - Búsqueda exhaustiva - 2 validaciones agregadas

---

**Fecha:** Octubre 2, 2025
**Tipo:** Critical Bug Fix - Memory Safety
**Status:** ✅ Fixed with comprehensive validations
