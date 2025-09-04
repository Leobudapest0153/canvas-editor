<!--
  NavegacionJerarquica.vue

  Componente para mostrar breadcrumbs y controles de navegación jerárquica.
  Permite navegar entre plantas → elementos → sub-elementos
-->

<template>
  <div class="navegacion-jerarquica">
    <!-- Breadcrumbs -->
    <div class="breadcrumbs">
      <template v-for="(crumb, index) in canvasStore.breadcrumbs" :key="`${crumb.tipo}-${crumb.id}`">
        <span class="crumb-group">
          <button
            class="breadcrumb-item"
            :class="{ active: index === canvasStore.breadcrumbs.length - 1 }"
            @click="navegarACrumb(crumb, index)"
          >
            <span class="crumb-icon">{{ crumb.icono }}</span>
            <span class="crumb-text">{{ crumb.nombre }}</span>
          </button>

          <!-- Separador entre elementos, no renderizar después del último -->
          <svg
            v-if="index < canvasStore.breadcrumbs.length - 1"
            class="breadcrumb-separator"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </template>

      <!-- Botón redondo con solo icono; tooltip indica a dónde regresa -->
      <UiIconButton
        v-if="canvasStore.puedeNavegar"
        :ariaLabel="previousCrumb ? `Volver a ${previousCrumb.nombre}` : 'Volver al nivel anterior'"
        :title="previousCrumb ? `Volver a ${previousCrumb.nombre}` : 'Volver al nivel anterior'"
        @click="canvasStore.navegarAlPadre()"
        class="breadcrumb-back"
      >
        <svg class="crumb-back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </UiIconButton>
    </div>

    <!-- Controles de navegación -->
    <div class="nav-controls">
      <!-- Información del contexto actual -->
      <div class="context-info">
        <div class="context-type">
          {{ getTipoContextoNombre() }}
        </div>
        <div class="context-details">
          <span v-if="canvasStore.estaEnPlanta">
            {{ canvasStore.elementosVisibles.length }} elementos
          </span>
          <span v-else-if="canvasStore.estaEnElemento">
            {{ canvasStore.elementosVisibles.length }} contenedores
            <br />
            <small>Interior de {{ elementoActual?.nombre }}</small>
          </span>
          <span v-else-if="canvasStore.estaEnContenedor">
            {{ canvasStore.elementosVisibles.length }} items (elementos + contenedores)
            <br />
            <small>Interior de {{ elementoActual?.nombre }}</small>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import UiIconButton from './ui/UiIconButton.vue'

// Composables
const canvasStore = useCanvasStore()

// Computed properties
const elementoActual = computed(() => {
  if (canvasStore.estaEnElemento || canvasStore.estaEnContenedor) {
    return canvasStore.elementoContenedorActual
  }
  return null
})

// Métodos
const getTipoContextoNombre = () => {
  if (canvasStore.estaEnPlanta) return 'Planta'
  if (canvasStore.estaEnElemento) return 'Elemento'
  if (canvasStore.estaEnContenedor) return 'Contenedor'
  return 'Desconocido'
}

// Métodos
// Métodos
const navegarACrumb = (crumb, index) => {
  // Si es el último crumb, no hacer nada (ya estamos ahí)
  if (index === canvasStore.breadcrumbs.length - 1) return

  if (crumb.tipo === 'plantas') {
    canvasStore.navegarAPlanta(crumb.id)
  } else if (crumb.tipo === 'elementos' || crumb.tipo === 'contenedores') {
    // Usar la función del store para navegar a un elemento/contenedor
    // Esto asegura que zoom/pan, selección y canvas adaptativo se actualicen correctamente
    // Reconstruir el path hasta este elemento y usar navegarAContexto para reemplazarlo
    const nuevoPath = canvasStore.breadcrumbs.slice(0, index + 1).map((breadcrumb) => ({
      tipo: breadcrumb.tipo,
      id: breadcrumb.id,
      nombre: breadcrumb.nombre,
    }))
    canvasStore.navegarAContexto(crumb.tipo, crumb.id, nuevoPath)
  }
}

// Computed: obtener el breadcrumb anterior (padre) para mostrar en el chip
const previousCrumb = computed(() => {
  const crumbs = canvasStore.breadcrumbs
  if (!crumbs || crumbs.length < 2) return null
  return crumbs[crumbs.length - 2]
})

</script>

<style scoped>
.navegacion-jerarquica {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
  gap: 1rem;
}

/* Breadcrumbs */
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

/* Estilos para el botón "Regresar" dentro de las breadcrumbs */
.breadcrumb-back {
  background: linear-gradient(180deg,#ffffff 0%, #f1fdf6 100%);
  border: 1px solid #c7e6d8;
  color: #065f46;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(6,95,70,0.08);
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.crumb-back-icon { width: 1.125rem; height: 1.125rem }

.breadcrumb-back:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(6,95,70,0.12);
}

/* Estilos del chip creativo */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(90deg,#ecfdf5 0%, #ffffff 100%);
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(6,95,70,0.08);
}
.chip-icon { width: 1rem; height: 1rem; color: #047857 }
.chip-text { font-weight: 600; color: #065f46 }

.breadcrumb-item:hover:not(.active) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.breadcrumb-item.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  cursor: default;
}

.crumb-icon {
  font-size: 1rem;
  line-height: 1;
}

.crumb-text {
  font-weight: 500;
}

.breadcrumb-separator {
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.crumb-group { display: inline-flex; align-items: center; gap: 0.5rem; }
.breadcrumb-separator { display: inline-block; vertical-align: middle; pointer-events: none; }

/* Controles de navegación */
.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.nav-back {
  color: #059669;
  border-color: #d1fae5;
}

.nav-back:hover {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.nav-btn .icon {
  width: 1rem;
  height: 1rem;
}

.context-info {
  text-align: right;
  font-size: 0.75rem;
}

.context-type {
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.context-details {
  color: #6b7280;
  margin-top: 0.125rem;
}

.context-details small {
  font-size: 0.625rem;
  color: #9ca3af;
}

.plant-selector {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
  color: #374151;
  min-width: 120px;
}

.plant-selector:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .navegacion-jerarquica {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .breadcrumbs {
    justify-content: center;
  }

  .nav-controls {
    justify-content: space-between;
  }

  .breadcrumb-item .crumb-text {
    display: none;
  }

  .breadcrumb-item .crumb-icon {
    font-size: 1.25rem;
  }
}
</style>
