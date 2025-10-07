<template>
  <div
    v-if="visible"
    ref="menuRef"
    :class="[
      'context-menu',
      menuClass
    ]"
    :style="menuStyle"
    role="menu"
    :aria-label="ariaLabel"
    @keydown.esc.stop.prevent="$emit('close')"
    @keydown.arrow-down.prevent="navigateDown"
    @keydown.arrow-up.prevent="navigateUp"
    @keydown.enter.prevent="activateItem"
    @keydown.space.prevent="activateItem"
  >
    <slot />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

defineOptions({ name: 'ContextMenu' })

const props = defineProps({
  /** Si el menú está visible */
  visible: {
    type: Boolean,
    default: false
  },
  /** Posición X del menú */
  x: {
    type: Number,
    default: 0
  },
  /** Posición Y del menú */
  y: {
    type: Number,
    default: 0
  },
  /** Clase CSS adicional para el menú */
  menuClass: {
    type: String,
    default: ''
  },
  /** Etiqueta ARIA para el menú */
  ariaLabel: {
    type: String,
    default: 'Menú contextual'
  },
  /** Si debe cerrar al hacer clic fuera */
  closeOnClickOutside: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

const menuRef = ref(null)
const focusedIndex = ref(0)

// Calcular posición ajustada al viewport
const menuStyle = computed(() => {
  if (!props.visible) return {}

  const padding = 8
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768

  // Estimamos el tamaño del menú
  const menuWidth = 160
  const menuHeight = 120

  const left = Math.max(padding, Math.min(props.x, windowWidth - menuWidth - padding))
  const top = Math.max(padding, Math.min(props.y, windowHeight - menuHeight - padding))

  return {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    zIndex: 50
  }
})

// Navegación por teclado
const getMenuItems = () => {
  if (!menuRef.value) return []
  return Array.from(menuRef.value.querySelectorAll('[role="menuitem"]:not([disabled])'))
}

const navigateDown = () => {
  const items = getMenuItems()
  if (items.length === 0) return

  focusedIndex.value = (focusedIndex.value + 1) % items.length
  items[focusedIndex.value]?.focus()
}

const navigateUp = () => {
  const items = getMenuItems()
  if (items.length === 0) return

  focusedIndex.value = focusedIndex.value <= 0 ? items.length - 1 : focusedIndex.value - 1
  items[focusedIndex.value]?.focus()
}

const activateItem = () => {
  const items = getMenuItems()
  items[focusedIndex.value]?.click()
}

// Gestión del foco cuando se abre/cierra el menú
watch(() => props.visible, async (visible) => {
  if (visible) {
    focusedIndex.value = 0
    await nextTick()
    const items = getMenuItems()
    if (items.length > 0) {
      items[0].focus()
    }
  } else {
    // Limpiar el foco de todos los items al cerrar
    const items = getMenuItems()
    items.forEach(item => item.blur && item.blur())
  }
}, { immediate: true })

// Cerrar al hacer clic fuera
const handleClickOutside = (event) => {
  if (!props.visible || !props.closeOnClickOutside) return

  if (menuRef.value && !menuRef.value.contains(event.target)) {
    emit('close')
  }
}

onMounted(() => {
  if (props.closeOnClickOutside) {
    document.addEventListener('click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  if (props.closeOnClickOutside) {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<style scoped>
.context-menu {
  min-width: 160px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 4px;
  max-height: 320px;
  overflow-y: auto;
}

/* Scroll styling para menús largos */
.context-menu::-webkit-scrollbar {
  width: 6px;
}

.context-menu::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.context-menu::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.context-menu::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
