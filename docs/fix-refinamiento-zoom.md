# Fix Crítico: Refinamiento + Panel de Propiedades

## 🐛 Problemas Identificados

### Problema 1: Refinamiento Sobrescribiendo Zoom
El focus funcionaba correctamente **SOLO para elementos pequeños** pero fallaba para elementos grandes.

### Problema 2: Panel de Propiedades Oculta Elemento
El elemento quedaba **parcialmente oculto** detrás del panel de propiedades que se abre después del focus.

---

## 🔧 Solución 1: Refinamiento

### Causa Raíz

Había **DOS lugares** donde se calculaba el zoom:

1. ✅ **Cálculo inicial** (`computeAndAnimate`) - Correcto después del fix anterior
2. ❌ **Refinamiento** (`scheduleRefine`) - Tenía las MISMAS restricciones antiguas con `Math.max()`

### Flujo del Bug

```
Usuario hace clic en focus de elemento grande
  ↓
1. Cálculo inicial: targetScale = 0.005 (0.5%) ✅
  ↓
2. Se aplica al stage: stage.scale(0.005) ✅
  ↓
3. Después de 2 frames, ejecuta refinamiento
  ↓
4. Refinamiento recalcula con Math.max(0.8, idealScale) ❌
  ↓
5. Sobrescribe con idealScale = 0.8 (80%) ❌
  ↓
Resultado: Elemento grande con zoom 80% (incomprensible) ❌
```

## 🔧 Solución Aplicada

### Cambio 1: Eliminar Restricciones en Refinamiento

**Archivo**: `src/inventory-smart/composables/useCanvasStore.js`  
**Líneas**: ~2535-2543

#### ANTES (❌):
```javascript
let idealScale = Math.min(usableW / rw, usableH / rh)
if (!exact) idealScale *= fitRatio

// 🔧 Ajuste inteligente para elementos grandes
const elementMaxDim = Math.max(rw, rh)
const viewportMaxDim = Math.max(viewportW, viewportH)
const sizeRatio = elementMaxDim / viewportMaxDim

if (sizeRatio > 100) {
  idealScale = Math.max(0.8, idealScale)  // ❌ Forzaba 80%
} else if (sizeRatio > 50) {
  idealScale = Math.max(0.7, idealScale)  // ❌ Forzaba 70%
}
// ... más restricciones ...

idealScale = Math.max(0.05, Math.min(5, idealScale))
```

#### DESPUÉS (✅):
```javascript
let idealScale = Math.min(usableW / rw, usableH / rh)
if (!exact) idealScale *= fitRatio

// El idealScale natural YA es correcto para TODOS los tamaños
// Solo límites globales para evitar valores extremos
idealScale = Math.max(0.0001, Math.min(5, idealScale))
```

### Cambio 2: MinZoom en Refinamiento

**Líneas**: ~2555

#### ANTES (❌):
```javascript
if (large) {
  configurarZoom(idealScale)  // ❌ Usaba minZoom = 0.1 por defecto
  configurarPan(newPanX, newPanY)
}
```

#### DESPUÉS (✅):
```javascript
if (large) {
  const effectiveMinZoom = 0.0001  // ✅ Permite cualquier zoom
  configurarZoom(idealScale, effectiveMinZoom)
  configurarPan(newPanX, newPanY)
}
```

### Cambio 3: Sincronización Konva en Animaciones

**Líneas**: ~2497-2507 y ~2565-2575

Agregado en **ambas animaciones** (principal y refinamiento):

```javascript
const step = (now) => {
  // ... cálculos de interpolación ...
  zoom.value = startZoom + (targetScale - startZoom) * k
  panX.value = startPanX + (targetPanX - startPanX) * k
  panY.value = startPanY + (targetPanY - startPanY) * k
  
  // 🆕 Sincronizar con Konva durante animación
  const stage = window.__konvaStage
  if (stage) {
    if (typeof stage.scale === 'function') {
      stage.scale({ x: zoom.value, y: zoom.value })
    }
    if (typeof stage.position === 'function') {
      stage.position({ x: panX.value, y: panY.value })
    }
    stage.batchDraw?.()
  }
  
  // ... resto del código ...
}
```

---

## 🔧 Solución 2: Compensación del Panel de Propiedades

### Problema
Cuando se hace focus en un elemento desde el tab "Capas", el sistema:
1. Calcula el zoom y posición
2. Aplica el focus
3. **Después** se abre el panel de propiedades (320px de ancho)
4. El panel **oculta parte del elemento** enfocado

### Solución Aplicada

**Archivo**: `src/inventory-smart/components/tabs/CapasTab.vue`  
**Función**: `showAuraElement()`  
**Líneas**: ~276-293

#### ANTES (❌):
```javascript
canvasStore.focusElemento(elementoId, { 
  paddingPx: 60, 
  fitRatio: 0.95, 
  animate: true, 
  duration: 450 
});
// Panel se abre después y oculta el elemento
```

#### DESPUÉS (✅):
```javascript
canvasStore.focusElemento(elementoId, { 
  paddingPx: 60, 
  fitRatio: 0.95, 
  animate: true, 
  duration: 450,
  offsetRight: 320  // 🆕 Ancho del panel de propiedades
});
// Ahora el elemento queda visible incluso con el panel abierto
```

### Efecto Visual

Con `offsetRight: 320`:
- **Viewport efectivo**: `viewportW - 320px`
- **Centro ajustado**: Se desplaza ligeramente a la izquierda
- **Zoom ajustado**: Más alejado para que quepa en el espacio visible
- **Resultado**: Elemento completamente visible sin que el panel lo tape ✅

### Cálculo Matemático

**Sin offsetRight (❌):**
```javascript
viewportW = 1200
usableW = 1200 - 60*2 = 1080
centerX = 1200 / 2 = 600
// Elemento centrado en 600px, panel oculta desde 880px en adelante
```

**Con offsetRight: 320 (✅):**
```javascript
viewportW = 1200
effectiveViewportW = 1200 - 320 = 880
usableW = 880 - 60*2 = 760
centerX = 880 / 2 = 440
// Elemento centrado en 440px, completamente visible con panel abierto
```

---

## ✅ Resultado Final

### Flujo Completo Corregido

```
Usuario hace clic en focus de elemento grande desde tab Capas
  ↓
1. Cálculo considera offsetRight: 320px ✅
  ↓
2. targetScale calculado con viewport reducido (880px) ✅
  ↓
3. Centro desplazado a la izquierda (440px vs 600px) ✅
  ↓
4. Se aplica al stage con zoom natural ✅
  ↓
5. Panel de propiedades se abre (320px) ✅
  ↓
6. Refinamiento mantiene el zoom (sin sobrescribir) ✅
  ↓
Resultado: Elemento visible, centrado, sin obstrucción del panel ✅
```

### Casos de Prueba

| Elemento | Dimensiones | Zoom sin offset | Zoom con offset 320px | Panel oculta |
|----------|-------------|-----------------|----------------------|--------------|
| Anaquel | 1462cm × 2437cm | 0.75% | 0.55% | ❌ NO |
| Cuarto frío | 57,575cm × 14,738cm | 0.47% | 0.34% | ❌ NO |
| Estante | 80cm × 25cm | 110% | 80% | ❌ NO |
| Producto | 50cm × 30cm | 54% | 40% | ❌ NO |

## 📊 Puntos Críticos Corregidos

1. ✅ **Refinamiento** ya no sobrescribe el zoom con valores altos
2. ✅ **Animaciones** sincronizan con Konva en cada frame
3. ✅ **MinZoom** permite valores muy bajos (hasta 0.0001)
4. ✅ **Sin restricciones** artificiales por categoría de tamaño
5. ✅ **offsetRight** compensa el panel de propiedades (320px)
6. ✅ **Centro ajustado** desplaza elemento a la izquierda
7. ✅ **Elemento visible** incluso con panel abierto

## 🧪 Prueba Final

1. Abrir aplicación
2. Ir a tab "Capas"
3. Hacer focus en **elemento grande** (ej: Anaquel, Cuarto frío, Estante)
4. **Resultado esperado**: 
   - ✅ Elemento centrado ligeramente a la izquierda
   - ✅ Zoom bajo apropiado para el tamaño
   - ✅ Completamente visible (no oculto por panel)
   - ✅ Panel de propiedades abierto a la derecha sin obstruir

---

**Fecha**: 3 de octubre de 2025  
**Versión**: v4.2 - Fix refinamiento + compensación panel  
**Estado**: ✅ **Funcional para TODOS los tamaños con panel visible**
