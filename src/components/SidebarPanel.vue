<!--
  SidebarPanel.vue
  Panel lateral izquierdo con sistema de tabs para organizar diferentes funcionalidades.

  Funcionalidades:
  - Sistema de tabs con navegación
  - Tab Elementos: Catálogo de elementos para arrastrar al canvas
  - Tab Capas: Gestión de capas y jerarquías (por implementar)
  - Tab Buffer: Almacén temporal de elementos (por implementar)
-->

<template>
  <div class="sidebar-panel">
    <!-- Header con tabs -->
    <div class="tab-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-btn', 'relative' ,{ active: activeTab === tab.id }]"
        :title="tab.tooltip"
      >
        <!-- Icono Cubo para Elementos -->
        <svg
          v-if="tab.id === 'elementos'"
          class="tab-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>

        <!-- Icono Capas para Capas -->
        <svg
          v-else-if="tab.id === 'capas'"
          class="tab-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >

          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>

        <!-- Icono Clipboard para Buffer -->
        <svg
          v-else-if="tab.id === 'buffer'"
          class="tab-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>

        <span
          v-if="tab.id === 'capas' && activeFilters"
          class="absolute top-0 right-0  w-2 h-2 bg-red-500 rounded-full"
        ></span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Contenido de los tabs -->
    <div class="tab-content">
      <!-- Tab Elementos -->
      <div v-show="activeTab === 'elementos'" class="tab-pane">
        <ElementosTab />
      </div>

      <!-- Tab Capas -->
      <div v-show="activeTab === 'capas'" class="tab-pane">
        <CapasTab />
      </div>

      <!-- Tab Buffer -->
      <div v-show="activeTab === 'buffer'" class="tab-pane">
        <BufferTab />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ElementosTab from './tabs/ElementosTab.vue'
import CapasTab from './tabs/CapasTab.vue'
import BufferTab from './tabs/BufferTab.vue'
import {useCanvasStore} from '@/composables/useCanvasStore'

const canvasStore = useCanvasStore();

// Estado del tab activo
const activeTab = ref('elementos')

// Configuración de los tabs
const tabs = [
  {
    id: 'elementos',
    label: 'Elementos',
    tooltip: 'Catálogo de elementos para agregar al canvas',
  },
  {
    id: 'capas',
    label: 'Capas',
    tooltip: 'Gestión de capas y jerarquías',
  },
  {
    id: 'buffer',
    label: 'Portapapeles',
    tooltip: 'Almacén temporal de elementos',
  },
]

const activeFilters = computed(() => {
  const elementsNotVisible = canvasStore.elementosVisibles.find((element) => element?.visible == false);
  return canvasStore.elementoDestacadoId || canvasStore.idsElementosFiltrados || elementsNotVisible;
});
</script>

<style scoped>
.sidebar-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.tab-header {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  background: #f1f5f9;
  color: #475569;
}

.tab-btn.active {
  color: #3b82f6;
  background: white;
  border-bottom-color: #3b82f6;
}

.tab-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.tab-label {
  font-weight: 500;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.tab-pane {
  height: 100%;
  overflow-y: auto;
}

/* Responsive para tabs pequeños */
@media (max-width: 360px) {
  .tab-label {
    display: none;
  }

  .tab-btn {
    padding: 0.75rem 0.25rem;
  }
}
</style>
