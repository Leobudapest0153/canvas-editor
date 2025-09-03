<template>
  <div id="inventory-smart">
    <!-- Panel de plantas -->
    <PlantasPanel @configChanged="handleConfigChanged" />

    <!-- Navegación jerárquica -->
    <NavegacionJerarquica />

    <main class="app-main relative">
      <!-- Sidebar con tabs -->
      <div class="app-sidebar-left">
        <SidebarPanel />
      </div>

      <!-- Canvas principal -->
      <div class="app-canvas">
        <CanvasView :safeRight="canvasStore.mostrarPropiedades ? 320 : 20" />
      </div>

      <!-- Panel de propiedades (superpuesto para no empujar el canvas) -->
      <div
        class="app-sidebar-right absolute inset-y-0 right-0"
        v-if="canvasStore.mostrarPropiedades && canvasStore.elementoSeleccionado"
        data-properties-panel
      >
        <PropiedadesPanel />
      </div>
    </main>
    <!-- Contenedor de toasts -->
    <ToastContainer />
    <!-- Modal de confirmación global -->
    <ConfirmModal />
    <!-- Loader global -->
    <LoaderOverlay />
    <WorkspaceEditor />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import SidebarPanel from './components/SidebarPanel.vue'
import CanvasView from './components/CanvasView.vue'
import PlantasPanel from './components/PlantasPanel.vue'
import PropiedadesPanel from './components/PropiedadesPanel.vue'
import NavegacionJerarquica from './components/NavegacionJerarquica.vue'
import WorkspaceEditor from './components/WorkspaceEditor.vue'
import { useCanvasImportExport } from './composables/useCanvasImportExport'
import { useCanvasWithHistory } from './composables/useCanvasWithHistory'
import { useCanvasBuffer } from './composables/useCanvasBuffer'
import { useDeleteElement } from './composables/useDeleteElement'
import { useAutoPaste } from './composables/useAutoPaste'
import { useToast } from './composables/useToast'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import LoaderOverlay from './components/LoaderOverlay.vue'

const props = defineProps({
  configCanvas: {
    type: [Object, null],
    required: true,
    default: () => null,
  },
})

// Definir emits para comunicar cambios al componente padre
const emit = defineEmits(['configUpdated'])

const { exportarCanvas, importarCanvas, validarJSON } = useCanvasImportExport()
const { undo, redo, store: canvasStore } = useCanvasWithHistory()
const buffer = useCanvasBuffer()
const { deleteSelected } = useDeleteElement()
const { handlePaste } = useAutoPaste()
const { showToast } = useToast()

// Manejador para cuando PlantasPanel emite cambios de configuración
const handleConfigChanged = (configSerializada) => {
  try {
    // Validar que se recibió una configuración
    if (!configSerializada) {
      console.warn('No se recibió configuración para actualizar')
      return
    }
    
    // Emitir al componente padre la configuración actualizada
    emit('configUpdated', configSerializada)
    
    console.log('Configuración actualizada emitida al componente padre:', configSerializada)
  } catch (error) {
    console.error('Error al procesar la configuración actualizada:', error)
    showToast('Error al procesar la configuración actualizada', 'error')
  }
}

// Atajos de teclado globales
const handleKeydown = (e) => {
  // Solo procesar si no estamos en un input
  if (e.target.matches('input, textarea, select, [contenteditable]')) {
    return
  }

  // Bloquear si hay drag global activo
  if (typeof window !== 'undefined' && window.__dvCanvasDragActive) {
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
    } else if (e.key === 'v') {
      e.preventDefault()
      handlePaste()
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    // Supr o Retroceso -> eliminar seleccionado
    const hasSelection = !!canvasStore.elementoSeleccionado
    if (hasSelection) {
      e.preventDefault()
      // No es necesario await; el modal gestiona la interacción
      deleteSelected({ withConfirm: true })
    }
  }
}

// Handlers para buffer
const handleCopyToBuffer = () => {
  const elementoSeleccionado = canvasStore.elementoSeleccionado
  if (elementoSeleccionado) {
    buffer.copyToBuffer(elementoSeleccionado)
    console.log('📋 Estructura copiada al buffer')
  }
}

onMounted(async () => {
  try {
    // Si no se provee una configuracion inicial
    if (!props.configCanvas) {
      showToast('Iniciando entorno', { type: 'info' })
      const plantaInicial = canvasStore.plantas.find((p) => p.activa) || canvasStore.plantas[0]
      if (plantaInicial) {
        canvasStore.navegarAPlanta(plantaInicial.id)
      }
      return
    }

    // Validar la prop con validarJSON de useCanvasImportExport
    const isValid = validarJSON(props.configCanvas)
    if (!isValid) {
      showToast('La configuración importada no es válida', { type: 'error' })
      return
    }

    showToast('Iniciando entorno', { type: 'info' })
    // Restaurar estado
    await canvasStore.deserialize(props.configCanvas)

  } catch (error) {
    showToast('Ha ocurrido un error al importar la configuración', { type: 'error' })
    console.error('Error al importar la configuración:', error)
  }

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
#inventory-smart {
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
