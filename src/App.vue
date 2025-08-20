<template>
  <div id="app">
    <!-- Panel de plantas -->
    <PlantasPanel />

    <!-- Navegación jerárquica -->
    <NavegacionJerarquica />

    <main class="app-main relative">
      <!-- Sidebar con tabs -->
      <div class="app-sidebar-left">
        <SidebarPanel />
      </div>

      <!-- Canvas principal -->
      <div class="app-canvas">
        <CanvasView
          @select="handleElementSelect"
          @drill-down="handleDrillDown"
          :safeRight="showPropiedadesPanel ? 320 : 20"
        />
      </div>

      <!-- Panel de propiedades (superpuesto para no empujar el canvas) -->
      <div
        class="app-sidebar-right absolute inset-y-0 right-0"
        v-if="showPropiedadesPanel"
        data-properties-panel
      >
        <PropiedadesPanel />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import SidebarPanel from './components/SidebarPanel.vue'
import CanvasView from './components/CanvasView.vue'
import PlantasPanel from './components/PlantasPanel.vue'
import PropiedadesPanel from './components/PropiedadesPanel.vue'
import NavegacionJerarquica from './components/NavegacionJerarquica.vue'
import { useCanvasWithHistory } from './composables/useCanvasWithHistory'
import { useCanvasBuffer } from './composables/useCanvasBuffer'


// Composable para undo/redo global
const { undo, redo, store: canvasStore } = useCanvasWithHistory()
const buffer = useCanvasBuffer()

const showPropiedadesPanel = computed(() => canvasStore.elementoSeleccionadoCompleto)

const selectedElement = ref(null)

const handleElementSelect = (elemento) => {
  selectedElement.value = elemento
  console.log('Elemento seleccionado:', elemento)
}

const handleDrillDown = (elemento) => {
  console.log('Drill down a elemento:', elemento)
  // TODO: Implementar navegación a vista hija
  alert(`Navegando a vista hija de: ${elemento.tipo} (${elemento.id})`)
}

// Atajos de teclado globales
const handleKeydown = (e) => {
  // Solo procesar si no estamos en un input
  if (e.target.matches('input, textarea, select, [contenteditable]')) {
    return
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
    } else if (e.key === 'c') {
      e.preventDefault()
      handleCopyToBuffer()
    } else if (e.key === 'x') {
      e.preventDefault()
      handleMoveToBuffer()
    }
  }
}

// Handlers para buffer
const handleCopyToBuffer = () => {
  const elementoSeleccionado = canvasStore.elementoSeleccionado
  if (elementoSeleccionado) {
    buffer.copyToBuffer(elementoSeleccionado)
    console.log('📋 Elemento copiado al buffer')
  }
}

const handleMoveToBuffer = () => {
  const elementoSeleccionado = canvasStore.elementoSeleccionado
  if (elementoSeleccionado) {
    buffer.moveToBuffer(elementoSeleccionado)
    console.log('🔄 Elemento movido al buffer')
  }
}

onMounted(() => {
  // Inicializar contexto de navegación con planta por defecto
  const plantaInicial = canvasStore.plantas.find((p) => p.activa) || canvasStore.plantas[0]
  if (plantaInicial) {
    canvasStore.navegarAPlanta(plantaInicial.id)
  }

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.app-header {
  background: #1e293b;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-btn:hover {
  background: rgba(59, 130, 246, 1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.header-btn .icon {
  width: 16px;
  height: 16px;
}

.import-export-btn {
  background: rgba(34, 197, 94, 0.8) !important;
}

.import-export-btn:hover {
  background: rgba(34, 197, 94, 1) !important;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
}

.header-info span {
  font-size: 0.875rem;
  opacity: 0.8;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-sidebar-left {
  width: 320px;
  min-width: 320px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

.app-sidebar-right {
  width: 300px;
  min-width: 300px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
}

.app-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.main-canvas {
  width: 100%;
  height: 100%;
}
</style>
