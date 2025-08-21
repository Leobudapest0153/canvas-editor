Perf: Arrastre con rAF y Modo Rendimiento

Objetivo
- Evitar writes al store en cada frame de arrastre.
- Desacoplar la validación pesada del ciclo de eventos de Konva.
- Reducir renders usando `layer.batchDraw()` solamente una vez por frame.

Piezas
- `src/composables/useRafDrag.js`: bucle `requestAnimationFrame` que, por frame, lee el BBox del shape en movimiento, ejecuta una validación ligera y hace `layer.batchDraw()` solo si cambió el BBox. Mantiene estado local del arrastre y no toca el store.
- `src/composables/usePerfMode.js`: activa/desactiva un “modo rendimiento” en el `Layer` durante `dragstart`, deshabilitando `hitGraph`, `listening` y efectos visuales (sombras/blur) del shape. Al finalizar restaura todo.
- `src/utils/dragMath.js`: helpers rápidos: `clampToAreaFast`, `computeSnapFast`, `shallowEqualBBox` y `throttleEveryNFrames(n)` para validar cada N frames (por defecto 2).

Flujo
1) `dragstart`:
   - `enablePerfMode(layer, { shape })`.
   - Crear controlador con `setupRafDrag({ stage, layer, getMovingShapeBBox, onValidateLight, onCommitEnd })` y `start()`.
2) `dragmove`:
   - No escribir en Pinia. Actualizar solo estado local y dejar al rAF leer coords y validar.
   - `onValidateLight` usa `throttleEveryNFrames(2)` y `detectConflictsFor` para pintar el borde rojo en conflictos.
3) `dragend`:
   - Clampear/snap final con `clampToAreaFast`/`computeSnapFast`.
   - `disablePerfMode(layer)` y hacer un único `actualizarPosicionConHistorial(...)`.

Notas
- Se eliminaron `batchDraw` redundantes en `dragmove`; el rAF controla los draws.
- Durante el arrastre no se muta Pinia; se conserva `lastValidPos` en variables locales y se persiste al finalizar.

Tests
- `src/__tests__/perf_drag.spec.js`: en ~120ms hay ≤8 validaciones y no existen commits durante dragmove.

