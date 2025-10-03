# Fix: Focus en Elementos Grandes desde Tab de Capas (v3 - Ultra Masivos)

## 🎯 Problema Identificado

Al hacer focus en elementos desde el tab de capas (`CapasTab.vue`), el comportamiento era inconsistente según el tamaño del elemento:

- **Elementos pequeños**: Se centraban correctamente con un zoom apropiado
- **Elementos grandes** (>800px): El zoom resultante era excesivamente alejado
- **Elementos extremadamente grandes** (miles de píxeles): Con límite de 0.3-0.5, seguía siendo insuficiente
- **Elementos ultra masivos** (>100,000px - cuartos, plantas): Zoom de 50% era completamente inadecuado

### Caso Real Reportado
**Cuarto frío CRT-001**:
- Dimensiones: **57,575.02 cm × 14,737.56 cm** 
- En píxeles: **~217,569 px × 55,697 px**
- Relación viewport: **217,569px / 1200px = 181× viewport**
- Con zoom 50%: Elemento prácticamente invisible
- Necesario: Zoom 80% para ver contenido útil

## 🔧 Solución Implementada (v3)

Se implementaron **límites mínimos de zoom escalados** en la función `focusElemento` del `useCanvasStore.js`, basados en la **relación entre el tamaño del elemento y el viewport**:

### Límites de Zoom Escalados por Relación Elemento/Viewport (v3 - Ultra Masivos)

| Relación Elemento/Viewport | Condición | Zoom Mínimo | Ejemplo (viewport 1200x800) | Caso de Uso |
|----------------------------|-----------|-------------|------------------------------|-------------|
| Ultra masivo | >100x viewport | **0.8** (80%) | Elemento >120,000px | Cuartos, plantas completas |
| Masivo | 50-100x viewport | **0.7** (70%) | Elemento 60,000-120,000px | Zonas grandes, edificios |
| Muy muy grande | 20-50x viewport | **0.6** (60%) | Elemento 24,000-60,000px | Secciones extensas |
| Muy grande | 10-20x viewport | **0.55** (55%) | Elemento 12,000-24,000px | Áreas amplias |
| Extremadamente grande | 6-10x viewport | **0.5** (50%) | Elemento 7,200-12,000px | Anaqueles gigantes |
| Muy grande | 4-6x viewport | **0.45** (45%) | Elemento 4,800-7,200px | |
| Grande | 2-4x viewport | **0.4** (40%) | Elemento 2,400-4,800px | |
| Grande absoluto | >800px pero <2x | **0.35** (35%) | Elemento 800-2,400px | |
| Mediano-grande | >500px | **0.4** (40%) | Elemento 500-800px | |
| Pequeño/mediano | <500px | Sin restricción adicional | Comportamiento original | Productos, cajas |

### ¿Por qué Escalar por Relación Viewport/Elemento?

**Problema del límite fijo**: Un zoom de 0.3 puede ser aceptable para un elemento de 1500px en un viewport de 1200px, pero es completamente insuficiente para un elemento de 9000px.

**Solución escalada**: Al calcular la relación `elementMaxDim / viewportMaxDim`, ajustamos el zoom mínimo proporcionalmente:
- Un elemento 6× más grande que el viewport necesita al menos 0.5 de zoom (50%)
- Un elemento 2× más grande necesita al menos 0.4 de zoom (40%)
- Esto garantiza que el elemento sea **claramente visible** independientemente de su tamaño absoluto

### Cambios en el Código

**Archivo modificado**: `src/inventory-smart/composables/useCanvasStore.js`

**Función**: `focusElemento(elementoId, opts)`

#### 1. En la función `computeAndAnimate`:

```javascript
// 🔧 Ajuste inteligente para elementos grandes: límites escalados según relación viewport/elemento
const elementMaxDim = Math.max(bbox.w, bbox.h)
const viewportMaxDim = Math.max(viewportW, viewportH)
const sizeRatio = elementMaxDim / viewportMaxDim

// Para elementos muy grandes, escalar el zoom mínimo según la relación viewport/elemento
// Con límites más agresivos para elementos ultra masivos (cuartos, plantas completas, etc)
if (sizeRatio > 100) {
  // Elementos ultra masivos (>100x viewport): zoom mínimo 0.8 - muestra sección útil
  targetScale = Math.max(0.8, targetScale)
} else if (sizeRatio > 50) {
  // Elementos masivos (50-100x viewport): zoom mínimo 0.7
  targetScale = Math.max(0.7, targetScale)
} else if (sizeRatio > 20) {
  // Elementos muy muy grandes (20-50x viewport): zoom mínimo 0.6
  targetScale = Math.max(0.6, targetScale)
} else if (sizeRatio > 10) {
  // Elementos muy grandes (10-20x viewport): zoom mínimo 0.55
  targetScale = Math.max(0.55, targetScale)
} else if (sizeRatio > 6) {
  // Elementos extremadamente grandes (6-10x viewport): zoom mínimo 0.5
  targetScale = Math.max(0.5, targetScale)
} else if (sizeRatio > 4) {
  // Elementos muy grandes (4-6x viewport): zoom mínimo 0.45
  targetScale = Math.max(0.45, targetScale)
} else if (sizeRatio > 2) {
  // Elementos grandes (2-4x viewport): zoom mínimo 0.4
  targetScale = Math.max(0.4, targetScale)
} else if (elementMaxDim > 800) {
  // Elementos grandes absolutos (>800px pero <2x viewport): zoom mínimo 0.35
  targetScale = Math.max(0.35, targetScale)
} else if (elementMaxDim > 500) {
  // Elementos medianos-grandes: zoom mínimo 0.4
  targetScale = Math.max(0.4, targetScale)
}
```

#### 2. En la función `scheduleRefine`:

Se aplicó la misma lógica escalada para mantener consistencia cuando se recalcula el zoom con el bounding box real del nodo Konva.

## ✅ Validación

Se actualizó el test suite: `focus_elemento_large.spec.js`

### Casos de Prueba Actualizados

1. **Elementos extremadamente grandes (>6x viewport)**: Verifica zoom mínimo de 0.5
2. **Elementos grandes (2-4x viewport)**: Verifica zoom mínimo de 0.4
3. **Elementos pequeños (<500px)**: Verifica que mantienen comportamiento original
4. **Zoom razonable sin importar posición**: Verifica límites superiores e inferiores

**Resultado**: ✅ Todos los tests pasan (4/4)

## 🎨 Experiencia de Usuario

### Antes (v1 - Límites fijos)
- Focus en elemento pequeño → ✅ Zoom apropiado
- Focus en elemento grande (1500px) → ⚠️ Zoom 0.3 (justo)
- Focus en elemento enorme (9000px) → ❌ Zoom 0.3 (demasiado alejado)

### v2 (Límites escalados)
- Focus en elemento pequeño → ✅ Zoom apropiado
- Focus en elemento grande (1500px) → ✅ Zoom 0.35-0.4
- Focus en elemento enorme (9000px) → ✅ Zoom 0.5
- Focus en cuarto (200,000px) → ❌ Zoom 0.5 (insuficiente)

### Ahora v3 (Ultra masivos)
- Focus en elemento pequeño → ✅ Zoom apropiado (sin cambios)
- Focus en elemento grande (1500px) → ✅ Zoom 0.35-0.4
- Focus en elemento enorme (9000px) → ✅ Zoom 0.5
- **Focus en cuarto (200,000px) → ✅ Zoom 0.8 (sección visible y útil)** ⭐

### Ejemplo Real: Cuarto frío CRT-001
**Dimensiones**: 57,575.02cm × 14,737.56cm  
**En píxeles**: ~217,569px × 55,697px  
**Relación viewport**: 217,569px / 1200px = **181× viewport**

**v1**: Zoom mínimo 0.3 (30%) → Elemento apenas visible  
**v2**: Zoom mínimo 0.5 (50%) → Mejora pero insuficiente  
**v3**: Zoom mínimo 0.8 (80%) → Contenido claramente visible ✅

## 📊 Impacto

- **Archivos modificados**: 1 (`useCanvasStore.js`)
- **Líneas agregadas**: ~25 líneas de lógica + comentarios
- **Tests actualizados**: 1 archivo con 4 casos de prueba (todos pasan)
- **Regresión**: ❌ Ninguna (elementos pequeños mantienen comportamiento original)

## 🔄 Compatibilidad

Este cambio es **100% compatible** con el comportamiento existente:
- No afecta la API de `focusElemento`
- Los parámetros opcionales siguen funcionando igual
- Elementos pequeños mantienen el comportamiento previo
- Solo mejora el comportamiento para elementos grandes y enormes

## 📝 Notas Técnicas

### Cálculo de la Relación de Tamaño

```javascript
const elementMaxDim = Math.max(bbox.w, bbox.h)
const viewportMaxDim = Math.max(viewportW, viewportH)
const sizeRatio = elementMaxDim / viewportMaxDim
```

Esta relación es independiente de la orientación y permite decisiones consistentes.

### Ventajas del Enfoque Escalado

1. **Adaptativo**: Se ajusta automáticamente al tamaño del viewport
2. **Proporcional**: Elementos más grandes reciben zoom mayor
3. **Futuro-proof**: Funciona con cualquier tamaño de pantalla o elemento
4. **Predecible**: La relación es intuitiva y fácil de ajustar

### Invocación desde CapasTab.vue

```javascript
canvasStore.focusElemento(elementoId, { 
  paddingPx: 60, 
  fitRatio: 0.95, 
  animate: true, 
  duration: 450 
});
```

Los parámetros existentes siguen funcionando normalmente.

## 🚀 Próximos Pasos (Opcional)

Posibles mejoras futuras:
- Ajustar los umbrales de relación (6×, 4×, 2×) según feedback
- Considerar zoom máximo dinámico para elementos muy pequeños
- Agregar configuración de límites en settings de usuario
- Telemetría para optimizar umbrales basado en uso real

---

**Fecha**: 2 de octubre de 2025  
**Versión**: 3.0 (Soporte para elementos ultra masivos)  
**Casos soportados**: Desde productos pequeños hasta plantas/edificios completos  
**Relacionado**: Tab de Capas, Sistema de Focus, UX de Navegación
