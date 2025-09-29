# Visor 3D del Canvas

El visor 3D permite validar la jerarquía, dimensiones y orientaciones exportadas por `useStatePersistence.serialize` dentro de una escena WebGL basada en Three.js.

## Instalación

1. Instala la dependencia necesaria:

   ```bash
   npm install three
   ```

2. Ejecuta el entorno de desarrollo habitual:

   ```bash
   npm run dev
   ```

## Flujo de uso

1. Desde la vista principal (`/`) utiliza el botón **Abrir visor 3D** para navegar a `/three-preview`.
2. La página consulta al store `useCanvasStore` mediante la acción `serializeForThreePreview`, que devuelve el JSON serializado sin métricas ni historial.
3. `ThreePreviewPage.vue` entrega dicho JSON a `ThreeScene.vue`, que levanta la escena con cámara, luces, OrbitControls y el mapeo jerárquico completo.
4. Usa el botón **Recargar datos** para re-sincronizar el visor con el estado actual del canvas.

## Cobertura de datos

- `useStatePersistence.serialize` conserva las dimensiones (`ancho`, `largo`, `alto`), orientación (`orientacion`) y relaciones padre/hijo (`padre`, `hijos`) necesarias para reconstruir el espacio tridimensional.
- Las unidades se normalizan de centímetros a metros y se trasladan del plano 2D (X/Y) al espacio 3D (X/Z), elevando las alturas en el eje Y.

## Componentes clave

- `src/pages/ThreePreviewPage.vue`: página dedicada para el visor.
- `src/inventory-smart/components/three/ThreeScene.vue`: escena Three.js con cámara, luces y controles.
- `src/inventory-smart/utils/three/mapElementToMesh.js`: helper para traducir nodos del JSON a geometrías/mallas.

