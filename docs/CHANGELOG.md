# Changelog

## [2025-10-07] - Fix: Culling en coordenadas de stage causaba desaparición en planta infinita

### Detalle
Causa raíz: el sistema de culling calculaba el viewport en coordenadas de stage sin considerar el offset del floating origin, resultando en elementos que desaparecían erróneamente cuando el usuario navegaba lejos del origen (0,0).

Ajustes aplicados:
- **Conversión explícita stage→mundo**: viewport corregido sumando `floatingOrigin.offsetX/Y`
- **Padding dinámico**: evita parpadeos en bordes durante zoom/pan
- **Telemetría completa**: overlay debug con métricas en tiempo real
- **Guardas anti-reentrada**: rate limiting de cálculos y rebases
- **Validación estable**: sin loops infinitos, rendimiento optimizado

### Resultado
Elementos mantienen visibilidad correcta independientemente de la distancia al origen. Sin parpadeos, sin rebases encadenados, navegación fluida en plantas infinitas.

### Archivos afectados
- `src/inventory-smart/components/CanvasView.vue`: función `elementosVisiblesEnCanvas` y sistema de telemetría
- `docs/CHANGELOG.md`: este archivo

### Testing
Para verificar el fix:
1. `npm run dev`
2. Abrir consola del navegador: `__enableCullingDebug()`
3. Navegar lejos del origen en planta infinita
4. Verificar que el overlay muestre "✅ Stage→World" y elementos permanezcan visibles