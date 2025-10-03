# Sistema de Alertas de Contexto

## Descripción

El sistema de alertas de contexto proporciona retroalimentación visual clara y amigable al usuario sobre su ubicación actual dentro de la jerarquía de navegación del inventario. Las alertas aparecen automáticamente cuando el usuario navega entre diferentes niveles (plantas, cuartos, pisos, elementos, etc.).

## Características

- **Alertas automáticas**: Se muestran automáticamente al cambiar de contexto
- **Mensajes contextuales**: Cada nivel tiene un mensaje personalizado y amigable
- **Información de vista**: Indica si estás viendo desde arriba (vista aérea) o de frente (vista frontal)
- **Diseño consistente**: Usa los mismos colores y posicionamiento que los toasts del sistema
- **Auto-ocultar**: Las alertas desaparecen automáticamente después de 10 segundos
- **Cierre manual**: El usuario puede cerrar la alerta en cualquier momento
- **Barra de progreso**: Indica visualmente el tiempo restante
- **Responsive**: Se adapta a diferentes tamaños de pantalla
- **Posición óptima**: Ubicada en la parte inferior central, sin interferir con el contenido

## Arquitectura

### Composable: `useContextAlert.js`

Maneja toda la lógica del sistema de alertas:

- **Generación de mensajes**: Crea mensajes contextuales según el tipo de navegación
- **Detección de cambios**: Escucha cambios en `contextoNavegacion` del store
- **Control de visibilidad**: Maneja la aparición y desaparición de alertas
- **Temporización**: Gestiona timers para auto-ocultar

### Componente: `ContextAlert.vue`

Componente de UI que renderiza la alerta:

- **Diseño consistente**: Usa el mismo color (#1f2937) y estilo que los toasts del sistema
- **Posicionamiento correcto**: Ubicado en la misma posición que los toasts (inferior central)
- **Animaciones suaves**: Transiciones de entrada/salida
- **Accesibilidad**: Atributos ARIA correctos
- **Responsive**: Se adapta a móviles y tablets

## Mensajes por Tipo de Contexto

### Planta Principal
```
🏢 Planta: [Nombre]
Vista aérea (desde arriba) · Aquí puedes organizar espacios, cuartos y pasillos
```

### Cuarto
```
🚪 Interior: [Nombre del Cuarto]
Vista frontal · Espacio dentro de [Nombre Planta] · Organiza sus pisos internos
```

### Piso
```
📦 Piso: [Nombre del Piso]
Vista aérea (desde arriba) · Dentro de [Nombre Cuarto] · Coloca elementos como estantes o cajas
```

### Elemento
```
📐 Interior: [Nombre del Elemento]
Vista frontal (de frente) · Ubicado [contexto] · Organiza su contenido
```

### Contenedor
```
🗃️ Contenedor: [Nombre]
Vista [aérea/frontal] · Pertenece a [Nombre Elemento] · Administra su distribución
```

### Pasillo
```
🛤️ Pasillo: [Nombre]
Vista [aérea/frontal] · En [Nombre Planta] · Gestiona accesos y circulación
```

## Uso

El sistema se inicializa automáticamente en `InventorySmart.vue`:

```vue
<script setup>
import { useContextAlert } from './composables/useContextAlert'
import ContextAlert from './components/ContextAlert.vue'

// Inicializar
const contextAlert = useContextAlert()
</script>

<template>
  <!-- Agregar el componente -->
  <ContextAlert
    :show="contextAlert.showAlert.value"
    :message="contextAlert.alertMessage.value"
    :duration="contextAlert.alertDuration.value"
    @close="contextAlert.hideAlert"
  />
</template>
```

## API del Composable

### Estado Reactivo

- `showAlert`: Boolean que indica si la alerta está visible
- `alertMessage`: Objeto con `{ message, subtext, icon }`
- `alertDuration`: Duración en milisegundos antes de auto-ocultar

### Métodos

- `displayAlert(duration)`: Muestra la alerta manualmente
- `hideAlert()`: Oculta la alerta inmediatamente

## Personalización

### Cambiar duración por defecto

```javascript
const contextAlert = useContextAlert()
contextAlert.displayAlert(15000) // 15 segundos
```

### Estilos

Los estilos están en `ContextAlert.vue` y siguen el mismo patrón que `ToastContainer.vue`:

- Color de fondo: `#1f2937` (mismo que toast.info)
- Posición: Inferior central (igual que los toasts)
- Ancho máximo: `min(90vw, 420px)`
- Z-index: `1100` (mismo nivel que los toasts)

## Consideraciones de UX

1. **Posición estratégica**: La alerta aparece en la parte inferior central, misma ubicación que los toasts del sistema
2. **Timing adecuado**: 300ms de delay evita mostrar alertas durante transiciones
3. **Duración óptima**: 10 segundos de visualización antes de ocultarse automáticamente
4. **Información clara**: Los mensajes son descriptivos pero concisos
5. **Contexto de vista**: Indica explícitamente si el usuario está viendo desde arriba o de frente
6. **Jerarquía visual**: El nombre del elemento está claramente identificado
7. **Feedback continuo**: La barra de progreso indica el tiempo restante
8. **Consistencia**: Usa el mismo sistema de diseño que las notificaciones existentes

## Testing

Los tests se encuentran en `__tests__/context_alert.spec.js` y cubren:

- Generación correcta de mensajes para cada tipo de contexto
- Inclusión de información de vista (aérea/frontal)
- Visibilidad y ocultamiento de alertas
- Auto-ocultamiento después de 10 segundos
- No mostrar alertas cuando no hay cambio de contexto

## Futuras Mejoras

- [ ] Permitir configurar mensajes personalizados por usuario
- [ ] Agregar sonidos opcionales
- [ ] Historial de navegación reciente
- [ ] Shortcuts desde la alerta (ej: "Regresar al nivel anterior")
- [ ] Modo "tour guiado" para nuevos usuarios
