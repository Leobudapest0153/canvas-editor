# Inventory Smart - Estructura del Proyecto

Editor visual jerárquico para distribuir elementos (anaqueles, estantes, etc.) en plantas de un edificio, con soporte de jerarquía padre-hijo, propiedades dinámicas y vistas XY / XZ. El paquete funcional se encuentra bajo `src/inventory-smart` que encapsula la mayor parte de la lógica y UI del editor.

## Tecnologías

- Vue 3 (Composition API)
- Vite 7
- Pinia
- Konva.js + vue-konva para canvas 2D
- Tailwind CSS v4
- Vitest
- ESLint

## Arquitectura de carpetas

Estructura relevante:

- `src/`
  - `App.vue`, `main.js`, `router/`, `pages/`, `styles/`
  - `inventory-smart/`
    - `InventorySmart.vue` (componente raíz del editor)
    - `components/` (componentes UI del editor)
    - `composables/` (hooks y lógica reutilizable)
    - `stores/` (estado con Pinia)
    - `utils/` (utilidades para validaciones, motor geométrico y más)
    - `plugins/` (plugins)
    - `validation/` (orquestación y validadores)
    - `__tests__/` (pruebas)

## Componentes clave (`src/inventory-smart/components/`)

- `CanvasView.vue` — Lienzo con vue-konva
  - Eventos de interacción (drag, drop, select)
  - Transformaciones, zoom, reglas (`RulersOverlay.vue`) y guías (`SnapGuides.vue`)
  - Capa de grid (`GridLayer.vue`)
- `FloatingToolbar.vue`, `FloatingControls.vue`, `SpeedDialContext.vue` — Controles flotantes/contextuales
- `PlantasPanel.vue`, `SidebarPanel.vue`, `NavegacionJerarquica.vue` — Navegación y paneles
- `ElementosCatalogo.vue` — Catálogo y drag & drop al canvas
- `PropiedadesPanel.vue` — Edición de propiedades del elemento seleccionado
- `HistorialPanel.vue` — UI de undo/redo
- `ToastContainer.vue` — Render de toasts del plugin
- `WorkspaceEditor.vue` — Editor de plantas
- `MarqueeHint.vue` — Hint visual para selección múltiple con marquesina

## Composables (`src/inventory-smart/composables/`)

Algunos hooks destacados:

- `useCanvasStore.js` — Store/estado principal, con helpers del canvas
- `useCanvasHistory.js`, `useCanvasWithHistory.js` — Historial y Undo/Redo
- `useElementDrag.js`, `useRafDrag.js`, `useObjectSnapping.js` — Drag y snapping
- `useMarqueeSelection.js` — Selección múltiple por marquesina (Shift + Arrastrar)
- `usePlacementGuards.js`, `usePlantResizeGuard.js` — Reglas de placement y resize
- `useContextMenu.js`, `useConfirmDialog.js`, `useToast.js` — UX y diálogo
- `useStatePersistence.js`, `useCanvasImportExport.js` — Persistencia
- `usePerfMode.js`, `useCacheOnDrag.js` — Rendimiento
- `useWeightValidation.js`, `useDimensionValidation.js` — Validaciones de negocio

## Stores (`src/inventory-smart/stores/`)

- `catalog.js` — Catálogo de elementos y metadatos
- `viewport.js` — Estado de viewport/zoom/scroll

## Plugins (`src/inventory-smart/plugins/`)

- `toast.js` — Plugin de toasts reactivo con API global (provide/inject y `app.config.globalProperties.$toast`). Consumido por `ToastContainer.vue` y utilizable desde composables.

## Utilidades (`src/inventory-smart/utils/`)

Conjunto de utilidades para geometría, colisiones y precisión numérica:

- Colisiones/colocación: `collision.js`, `circleCollisions.js`, `isPlacementValid.js`, `placementValidity.js`, `obstacleClamp.js`, `edgeConstraint.js`, `innerAABB.js`
- Geometría y bounds: `geometry.js`, `geom.js`, `polygonBounds.js`, `polygonInset.js`, `bounds.js`, `finalIntervals.js`, `innerLocalCoords.js`, `innerViewDims.js`
- Drag/RAF/math: `dragMath.js`, `finalizeDrag.js`, `activeBounds.js`, `precision.js`
- Constantes y helpers: `constants.js`, `units.js`, `object.js`, `idGenerator.js`, `translator.js`

## Validación (`src/inventory-smart/validation/`)

- `placementOrchestrator.js` — Orquestador de validaciones de placement
- `fieldResolvers.js` — Resolución de campos y reglas

## Rutas y página host (para probar el paquete localmente)

- `src/router/index.js` define la ruta raíz `/` que carga `src/pages/HomePage.vue`.
- `HomePage.vue` instancia `<InventorySmart />` y orquesta la persistencia de `configCanvas` vía `localStorage` usando `SERIALIZE_CONFIG`.

## Pruebas (`src/inventory-smart/__tests__/`)

Cobertura de dominio y UI: hotkeys, colisiones, snapping, orden de capas, resize guards, z-stacking, serialización de plantillas y más. Ejecutadas con Vitest + jsdom.

## Estado actual

✅ Implementado

- Estructura modular bajo `src/inventory-smart`
- Integración de Pinia, Router, vue-konva y plugin de toasts
- Motor geométrico y validaciones base
- Suite de pruebas unitarias amplia (Vitest)
- Configuración de Vite con alias `@` y Tailwind v4 plugin

🔧 Pendiente

- Completar integración UI de algunos modales/paneles
- Afinar validaciones de negocio y performance en drag/snapping
- Serialización/persistencia estable para producción (actualmente demo con `localStorage`)

## Próximos pasos

1. Optimizar hot paths de drag/snapping (memorización, estructuras espaciales si es necesario).
2. Añadir pruebas de regresión para casos límite de colisión y clamps.
3. Completar funcionalidad de panel de propiedades y validaciones asociadas.
4. Agregar lógica para obtener datos de uso reales (peso, dimensiones, listado de productos, etc.) desde un API o fuente externa.

## Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Previsualización build
npm run build
npm run preview

# Tests unitarios
npm run test:unit

# Lint y formato
npm run lint
npm run format
```
