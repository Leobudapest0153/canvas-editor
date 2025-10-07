# Guía del Sistema de Menús Unificado

Este documento describe el nuevo sistema de menús contextuales y dropdowns unificado implementado en el proyecto.

## Componentes Base

### MenuItem
**Ruta:** `src/inventory-smart/components/ui/MenuItem.vue`

Componente base para elementos de menú que sigue la especificación de diseño [icono] [acción].

#### Props
- `label` (String): Texto del elemento de menú
- `icon` (Component): Componente de icono a mostrar
- `variant` (String): 'normal' | 'danger' - Para acciones destructivas como "Eliminar"
- `disabled` (Boolean): Si el elemento está deshabilitado

#### Slots
- `icon`: Para iconos personalizados
- `default`: Para contenido personalizado del texto

#### Ejemplo de uso
```vue
<MenuItem
  :icon="EditIcon"
  label="Editar"
  @click="handleEdit"
/>

<MenuItem
  :icon="DeleteIcon"
  label="Eliminar"
  variant="danger"
  @click="handleDelete"
/>
```

### ContextMenu
**Ruta:** `src/inventory-smart/components/ui/ContextMenu.vue`

Contenedor base para menús contextuales con navegación por teclado y posicionamiento automático.

#### Props
- `visible` (Boolean): Si el menú está visible
- `x` (Number): Posición X
- `y` (Number): Posición Y
- `ariaLabel` (String): Etiqueta para accesibilidad
- `closeOnClickOutside` (Boolean): Si debe cerrar al hacer clic fuera

#### Ejemplo de uso
```vue
<ContextMenu
  :visible="menuVisible"
  :x="menuX"
  :y="menuY"
  aria-label="Opciones del elemento"
  @close="closeMenu"
>
  <MenuItem :icon="EditIcon" label="Editar" @click="edit" />
  <MenuItem :icon="DeleteIcon" label="Eliminar" variant="danger" @click="delete" />
</ContextMenu>
```

## Iconos Disponibles

### Iconos del Sistema
**Ruta:** `src/inventory-smart/components/ui/icons/`

- `EditIcon.vue` - Para acciones de edición
- `DeleteIcon.vue` - Para acciones de eliminación
- `LockIcon.vue` - Para bloquear/desbloquear (prop `locked`)
- `SaveTemplateIcon.vue` - Para guardar como plantilla

#### Ejemplo de icono personalizado
```vue
<template>
  <svg :width="size" :height="size" :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" :stroke-width="strokeWidth" d="..." />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [String, Number], default: 16 },
  strokeWidth: { type: [String, Number], default: 2 },
  iconClass: { type: String, default: '' }
})
</script>
```

## Lineamientos de Diseño

### Estructura Visual
- **Formato:** [icono] [acción] en la misma línea
- **Alineación:** Izquierda para texto e icono
- **Altura:** Uniforme (40px mínimo)
- **Padding:** Consistente (12px horizontal, 8px vertical)

### Colores
- **Acción "Eliminar":** `text-red-600` (color de peligro del tema)
- **Otras acciones:** `text-gray-700` (color de texto base)
- **Hover Eliminar:** `bg-red-50`
- **Hover Normal:** `bg-gray-50`

### Estados
- **Hover:** Cambio suave de fondo
- **Focus:** Anillo azul para navegación por teclado
- **Disabled:** Opacidad 50%, cursor not-allowed

## Navegación por Teclado

### Controles Estándar
- **Esc:** Cerrar menú
- **↑/↓:** Navegar entre elementos
- **Enter/Space:** Activar elemento seleccionado
- **Tab:** Navegar fuera del menú

### Implementación
Los componentes manejan automáticamente:
- Foco inicial en el primer elemento
- Navegación circular con flechas
- Manejo de foco al abrir/cerrar

## Migración de Menús Existentes

### Patrón Anterior
```vue
<div class="menu" v-if="visible">
  <button class="menu-item" @click="edit">Editar</button>
  <button class="menu-item danger" @click="delete">Eliminar</button>
</div>
```

### Patrón Nuevo
```vue
<ContextMenu :visible="visible" :x="x" :y="y" @close="close">
  <MenuItem :icon="EditIcon" label="Editar" @click="edit" />
  <MenuItem :icon="DeleteIcon" label="Eliminar" variant="danger" @click="delete" />
</ContextMenu>
```

## Menús Actualizados

### ✅ Componentes Migrados
1. **ContextMenu.vue** - Menú básico del canvas
2. **SpeedDialContext.vue** - Menú avanzado con bloquear/plantilla/eliminar
3. **ElementosCatalogo.vue** - Menús kebab del catálogo
4. **PlantasPanel.vue** - Menús de opciones de plantas
5. **ElementosTab.vue** - Menús de plantillas

### Funcionalidades Conservadas
- ✅ Todos los handlers de eventos originales
- ✅ Validaciones y permisos existentes
- ✅ Atajos de teclado
- ✅ Tooltips y mensajes de ayuda
- ✅ Confirmaciones de eliminación

## Casos de Uso Comunes

### Menú Simple (Solo Eliminar)
```vue
<ContextMenu :visible="visible" :x="x" :y="y" @close="close">
  <MenuItem :icon="DeleteIcon" label="Eliminar" variant="danger" @click="delete" />
</ContextMenu>
```

### Menú Completo (Editar + Eliminar)
```vue
<ContextMenu :visible="visible" :x="x" :y="y" @close="close">
  <MenuItem :icon="EditIcon" label="Editar" @click="edit" />
  <MenuItem :icon="DeleteIcon" label="Eliminar" variant="danger" @click="delete" />
</ContextMenu>
```

### Menú con Estados Condicionales
```vue
<ContextMenu :visible="visible" :x="x" :y="y" @close="close">
  <MenuItem 
    :icon="LockIcon" 
    :label="isLocked ? 'Desbloquear' : 'Bloquear'" 
    :disabled="!canModify"
    @click="toggleLock" 
  />
  <MenuItem :icon="SaveTemplateIcon" label="Guardar como plantilla" @click="saveTemplate" />
  <MenuItem :icon="DeleteIcon" label="Eliminar" variant="danger" @click="delete" />
</ContextMenu>
```

## Accesibilidad

### Roles ARIA
- Menú: `role="menu"`
- Elemento: `role="menuitem"`
- Etiquetas: `aria-label` descriptivas

### Navegación
- Foco gestionado automáticamente
- Orden de tabulación lógico
- Atajos de teclado estándar

### Contraste
- Cumple AA para todos los estados
- Indicadores visuales claros para foco
- Estados de disabled claramente diferenciados

## Depuración

### Flag de Debug (Opcional)
Para verificar alineaciones y paddings, añadir clase temporal:

```css
.context-menu {
  border: 2px dashed #f59e0b !important;
}
.menu-item {
  border: 1px solid #ef4444 !important;
}
```

### Snapshots Visuales
Verificar en contextos clave:
- Elementos del canvas
- Panel de niveles
- Panel lateral
- Menús con scroll