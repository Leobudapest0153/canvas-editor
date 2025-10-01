# Selección Múltiple por Marquesina (Marquee Selection)

## 📋 Descripción

Funcionalidad que permite seleccionar múltiples elementos en el canvas mediante el arrastre de un rectángulo de selección (marquesina), similar al comportamiento del escritorio de Windows.

## 🎯 Características

- **Activación con Shift**: Mantén presionada la tecla `Shift` y arrastra el cursor en el canvas para dibujar la marquesina
- **Feedback Visual**: Rectángulo azul semi-transparente con borde punteado que indica el área de selección
- **Intersección Inteligente**: Detecta todos los elementos que intersectan con el área de marquesina (incluso parcialmente)
- **Cancelación con Escape**: Presiona `Esc` para cancelar la selección sin aplicar cambios
- **No Interfiere con Drag**: Deshabilita temporalmente el arrastre del canvas mientras se dibuja la marquesina

## 🚀 Cómo Usar

### Seleccionar elementos con marquesina:

1. **Mantén presionada** la tecla `Shift`
2. **Haz clic** en un área vacía del canvas (no sobre un elemento)
3. **Arrastra** el cursor para dibujar el rectángulo de selección
4. **Suelta** el botón del mouse para finalizar la selección

### Cancelar la selección:

- Presiona la tecla `Esc` en cualquier momento mientras estás dibujando la marquesina

## 🔧 Implementación Técnica

### Composable: `useMarqueeSelection`

Ubicación: `src/inventory-smart/composables/useMarqueeSelection.js`

#### API Pública:

```javascript
const {
  // Estado
  isMarqueeActive,        // ref<boolean> - Si la marquesina está activa
  marqueeRect,            // computed - Rectángulo normalizado {x, y, width, height}
  selectedElementIds,     // ref<Set> - IDs de elementos seleccionados
  
  // Métodos
  startMarquee,           // (stagePos) => void - Inicia la marquesina
  updateMarquee,          // (stagePos) => void - Actualiza durante el arrastre
  endMarquee,             // () => void - Finaliza y aplica la selección
  cancelMarquee,          // () => void - Cancela sin aplicar
  stageToLayerCoords,     // (stagePoint) => layerPoint - Conversión de coordenadas
} = useMarqueeSelection({ canvasStore, stageRef })
```

### Integración en CanvasView

La funcionalidad está integrada en `CanvasView.vue`:

1. **Eventos del Stage**:
   - `@mousedown` → Detecta Shift + clic para iniciar marquesina
   - `@mousemove` → Actualiza la posición de la marquesina
   - `@mouseup` → Finaliza la marquesina y aplica selección

2. **Renderizado**:
   - Se dibuja en el layer `overlaysLayerRef` junto con las guías de snapping
   - Usa propiedades de Konva para visualización escalable según zoom

3. **Manejo de Teclado**:
   - `Esc` cancela la marquesina activa

## 📊 Lógica de Intersección

La detección de intersección usa el algoritmo AABB (Axis-Aligned Bounding Box):

```javascript
// Un elemento intersecta si NO está completamente fuera
!(
  elemX + elemWidth < rect.x ||      // Elemento a la izquierda
  rect.x + rect.width < elemX ||     // Elemento a la derecha
  elemY + elemHeight < rect.y ||     // Elemento arriba
  rect.y + rect.height < elemY       // Elemento abajo
)
```

## 🎨 Estilo Visual

```javascript
{
  stroke: '#3b82f6',                          // Azul primario
  strokeWidth: 2 / canvasStore.zoom,          // Escalado según zoom
  fill: 'rgba(59, 130, 246, 0.1)',           // Relleno semi-transparente
  dash: [4 / canvasStore.zoom, 4 / canvasStore.zoom], // Línea punteada
}
```

## 🔒 Restricciones

La marquesina NO se activa en los siguientes casos:

- ✖️ Hay cambios pendientes sin guardar (`canvasStore.cambiosNoAplicados`)
- ✖️ Modo de configuración ESL activo (`canvasStore.modoConfigurarEsl`)
- ✖️ Se hace clic sobre un elemento (solo funciona en área vacía)

## 🧪 Testing

Tests ubicados en: `src/inventory-smart/__tests__/marquee_selection.spec.js`

Casos cubiertos:
- ✅ Inicialización correcta
- ✅ Inicio y actualización de marquesina
- ✅ Cálculo de rectángulo normalizado (arrastre en todas direcciones)
- ✅ Detección de intersección múltiple
- ✅ Finalización con selección
- ✅ Cancelación sin selección
- ✅ Marquesina vacía (sin elementos)
- ✅ Intersección parcial

## 🚧 Próximas Mejoras

1. **Selección Múltiple Real**: 
   - Actualmente solo selecciona el primer elemento
   - Extender `canvasStore` para soportar array de elementos seleccionados

2. **Modos de Selección**:
   - `Shift + Arrastrar` → Agregar a selección
   - `Ctrl + Arrastrar` → Remover de selección
   - `Alt + Arrastrar` → Selección inversa

3. **Acciones en Lote**:
   - Mover múltiples elementos simultáneamente
   - Eliminar múltiples elementos
   - Bloquear/desbloquear en lote
   - Agrupar elementos seleccionados

4. **Indicadores Visuales**:
   - Mostrar contador de elementos seleccionados
   - Resaltar elementos dentro de la marquesina durante el arrastre

## 📝 Notas de Desarrollo

### Seguimiento de Reglas del Proyecto:

✅ **Componentes Grandes**: La lógica se extrajo a un composable separado en lugar de agregar más código a `CanvasView.vue`

✅ **Testing**: Se incluyeron tests unitarios completos

✅ **Documentación**: Documentación detallada de la funcionalidad

✅ **Codificación**: Se mantuvo la codificación UTF-8, comentarios en español, y estilo del proyecto

### Archivos Modificados:
- `src/inventory-smart/composables/useMarqueeSelection.js` (nuevo)
- `src/inventory-smart/components/CanvasView.vue` (modificado)
- `src/inventory-smart/__tests__/marquee_selection.spec.js` (nuevo)
- `docs/marquee-selection.md` (nuevo)

---

**Fecha de Creación**: Octubre 2025  
**Versión**: 1.0.0
