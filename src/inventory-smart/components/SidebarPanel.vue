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
  <div class="h-full flex flex-col bg-white">
    <!-- Header con tabs -->
    <div class="flex border-b border-slate-200 bg-slate-50">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex-1 flex items-center justify-center gap-2 px-2 py-3 border-none bg-transparent cursor-pointer transition-all duration-200 text-slate-500 text-sm font-medium border-b-2 border-transparent',
          'hover:bg-slate-100 hover:text-slate-600',
          'relative',
          {
            'text-blue-500 bg-white border-b-blue-500': activeTab === tab.id
          }
        ]"
        :title="tab.tooltip"
      >
        <!-- Icono Cubo para Elementos -->
        <svg
          v-if="tab.id === 'elementos'"
          class="w-[18px] h-[18px] shrink-0"
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
          class="w-[18px] h-[18px] shrink-0"
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
          class="w-[18px] h-[18px] shrink-0"
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
          class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
        ></span>
        <span class="font-medium max-[360px]:hidden">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Contenido de los tabs -->
    <div class="flex-1 overflow-hidden">
      <!-- Tab Elementos -->
      <div v-show="activeTab === 'elementos'" class="h-full overflow-y-auto">
        <ElementosTab />
      </div>

      <!-- Tab Capas -->
      <div v-show="activeTab === 'capas'" class="h-full overflow-y-auto">
        <CapasTab />
      </div>

      <!-- Tab Buffer -->
      <div v-show="activeTab === 'buffer'" class="h-full overflow-y-auto">
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
import {useCanvasStore} from '@/inventory-smart/composables/useCanvasStore'

const canvasStore = useCanvasStore();

// Estado del tab activo
const activeTab = ref('elementos')

// Configuración de los tabs
const tabs = [
  {
    id: 'elementos',
    label: 'Catálogos',
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
/* Breakpoint personalizado para pantallas muy pequeñas */
@media (max-width: 360px) {
  .max-\[360px\]\:hidden {
    display: none !important;
  }
}
</style>
