# Guard de redimensionado de planta/bodega

Este documento describe el flujo de validación y reacomodo automático al cambiar las dimensiones (ancho/largo) de una planta/bodega.

Resumen:
- Validación previa debounced (200ms) mientras el usuario edita ancho/largo, mostrando un aviso inline.
- Al confirmar, se bloquea, se auto-ajusta o se aplica sin cambios según el resultado.
- El auto-ajuste usa un algoritmo shelf determinista que respeta grilla y margen perimetral.
- Post-apply validation pass: tras aplicar nuevas dimensiones se valida otra vez contra posiciones reales; si algo queda fuera, se reacomoda; si falla, se revierte.

## Parámetros clave
- GRID_SIZE (px): tamaño de la grilla visual (store.canvas.gridSize). Se convierte a cm usando CM_TO_PX.
- CM_TO_PX: factor de conversión (default 2 px por cm).
- MARGIN_CM: margen perimetral interno en cm aplicado a packing (default 5 cm).
- factorUtilización: porcentaje de ocupación máxima del área interior de la planta (default 0.9).

Fuentes:
- src/utils/constants.js: CM_TO_PX, MARGIN_CM, FACTOR_UTILIZACION.
- store: gridSize (px)

## API del guard
Archivo: src/composables/usePlantResizeGuard.ts

- usePlantResizeGuard(getDeps): retorna { simulateResize }
  - getDeps():
    - elements: Elementos de la planta activa (AABB, en cm), se filtran internamente a raíz + suelo + visibles.
    - gridSizePx: tamaño de grilla actual en px.
    - cmToPx?: override del factor de conversión.
    - rotPerm?: permitir rotación 90° (default true).
    - marginCm?: margen perimetral interno (default MARGIN_CM).
    - utilizationFactor?: factor de ocupación de área (default FACTOR_UTILIZACION).
    - excludeFilter?: función para excluir elementos (por defecto descarta decorativos de “suelo”).

- simulateResize(newW, newH, override?): Simula cambio de dimensiones (cm).
  - Pasos:
    1) fitsIndividually: cada elemento debe caber individualmente dentro de newW/newH considerando margen y rotación.
    2) Chequeo de área: suma áreas de elementos <= área interior (margen aplicado) * factorUtilización.
    3) pack: si la disposición actual no cabe, intenta empaquetar con algoritmo shelf determinista.
  - Retorno:
    - { status: 'block', reason }
    - { status: 'ok', reason }
    - { status: 'auto_adjust', reason, placements: {id,x,y,rotation,width,height}[] }

### helpers
- fitsIndividually(el,newW,newH,rotPerm,margin)
- pack(elements,bounds,{grid,margin,rotPerm})
  - Ordena por dimensión mayor descendente.
  - Coloca por filas (estantes), con desplazamientos por margen.
  - Respeta grilla (en cm) y margen; si desborda altura retorna null.

## Integración en UI
Archivo: src/components/PlantasPanel.vue

- Modal de editar/crear planta incluye inputs de Ancho/Largo/Alto.
- Aviso inline (debounce 200ms) al cambiar ancho/largo:
  - block: banner rojo “No es posible reducir…”.

  - auto_adjust: banner ámbar con N elementos a reacomodar.
  - ok: sin aviso.

- Confirmación de guardado (post-apply validation pass):
  1) Se aplican las nuevas dimensiones.
  2) Se verifica isInside(bounds, MARGIN_CM) para todos los elementos raíz en “suelo” (incluye invisibles; excluye “suelo” decorativo).
  3) Si hay fuera-de-límites o violaciones de margen, se ejecuta pack() y se aplican placements en la misma transacción con clamp→snap→clamp.
  4) Si pack falla, se revierten las dimensiones y se muestra toast error.
  5) Si pack aplica, toast warning “Se reacomodaron {n} elementos” y snapshot “Auto-adjust after resize (post-apply)”.

  6) Si simulateResize devolvió ok pero post-apply detecta fuera-de-límites, se trata como auto_adjust.

Toasts: componente ToastContainer (montado en App.vue) expone window.__toasts.show({ message, type }).

## Consideraciones
- Unidades: Entrada/salida de algoritmo en cm; la grilla se convierte a cm usando GRID_SIZE(px)/CM_TO_PX. El snap del pack se alinea con el margen perimetral para evitar posiciones < margen.
- Márgenes: MARGIN_CM se aplica como perímetro interno (2*margin en ancho/alto efectivos).
- Jerarquías: solo se consideran elementos raíz en “suelo”; se excluye “suelo” decorativo en packing post-apply.
- Determinismo: orden de packing por dimensión mayor descendente.
- Historial: snapshots sólo en confirmaciones, no en cambios inline.

## Pruebas
- src/__tests__/resize_guard.spec.ts: helpers + casos previos.
- src/__tests__/resize_post_apply.spec.ts: post-apply
  1) Esquina fuera→dentro automático.
  2) ok-but-out-of-bounds se convierte en auto_adjust.
  3) fallo de pack revierte planta.
