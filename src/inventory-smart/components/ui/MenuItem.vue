<template>
  <button
    :type="type"
    :disabled="disabled"
    :role="role"
    :aria-label="ariaLabel"
    :title="title"
    :class="[
      'menu-item',
      {
        'menu-item--danger': variant === 'danger',
        'menu-item--disabled': disabled
      }
    ]"
    @click="$emit('click', $event)"
    @keydown="$emit('keydown', $event)"
    @blur="onBlur"
  >
    <span v-if="$slots.icon || icon" class="menu-item__icon">
      <slot name="icon">
        <component v-if="icon" :is="icon" />
      </slot>
    </span>
    <span class="menu-item__text">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<script setup>
defineOptions({ name: 'MenuItem' })

defineProps({
  /** Etiqueta de texto del elemento de menú */
  label: {
    type: String,
    default: ''
  },
  /** Componente de icono a mostrar */
  icon: {
    type: [String, Object, Function],
    default: null
  },
  /** Variante de estilo (normal, danger) */
  variant: {
    type: String,
    default: 'normal',
    validator: (value) => ['normal', 'danger'].includes(value)
  },
  /** Si el elemento está deshabilitado */
  disabled: {
    type: Boolean,
    default: false
  },
  /** Tipo de botón */
  type: {
    type: String,
    default: 'button'
  },
  /** Rol ARIA */
  role: {
    type: String,
    default: 'menuitem'
  },
  /** Etiqueta ARIA para accesibilidad */
  ariaLabel: {
    type: String,
    default: ''
  },
  /** Tooltip/title del elemento */
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click', 'keydown'])

function onBlur(e) {
  // Limpiar el fondo visual al perder el foco
  e.target.classList.remove('focus')
}
</script>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.375rem;
  color: #374151;
  transition: all 0.15s ease-in-out;
  min-height: 2.5rem;
}

.menu-item:hover {
  background-color: #f9fafb;
}

.menu-item:focus {
  outline: none;
  background-color: #f3f4f6;
}

.menu-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.menu-item__text {
  flex: 1;
  line-height: 1.25;
}

/* Variante de peligro */
.menu-item--danger {
  color: #dc2626;
}

.menu-item--danger:hover {
  background-color: #fef2f2;
}

.menu-item--danger:focus {
  background-color: #fef2f2;
}

.menu-item--danger .menu-item__icon {
  color: #dc2626;
}

/* Estado deshabilitado */
.menu-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
