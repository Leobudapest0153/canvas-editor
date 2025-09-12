<!--
  ImportExportModal.vue

  Modal para importar y exportar el estado del canvas.
  Proporciona UI para todas las funcionalidades de serialización.
-->

<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrar">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Importar / Exportar Canvas</h2>
        <button @click="cerrar" class="modal-close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Sección de Exportar -->
        <div class="section">
          <h3 class="section-title">
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            Exportar
          </h3>

          <div class="button-grid">
            <button @click="exportarCanvasCompleto" class="btn-action btn-primary">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
              Exportar Canvas
            </button>

            <button @click="copiarPortapapeles" class="btn-action btn-info">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copiar JSON
            </button>
          </div>
        </div>

        <!-- Sección de Importar -->
        <div class="section">
          <h3 class="section-title">
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Importar
          </h3>

          <div class="import-area">
            <div
              class="file-drop-zone"
              @click="triggerFileInput"
              @dragover.prevent
              @drop="onFileDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".json"
                @change="onFileSelect"
                style="display: none"
              />
              <svg
                class="w-12 h-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p class="text-gray-600 text-center">
                <span class="font-medium">Haz clic para seleccionar</span> o arrastra un archivo
                JSON aquí
              </p>
              <p class="text-sm text-gray-500 mt-2">Solo archivos JSON del canvas completo</p>
            </div>

            <button @click="pegarPortapapeles" class="btn-action btn-info w-full mt-3">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Pegar desde Portapapeles
            </button>
          </div>
        </div>

        <!-- Información del estado actual -->
        <div class="section">
          <h3 class="section-title">
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Estado Actual
          </h3>

          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Plantas:</span>
              <span class="stat-value">{{ canvasStore.plantas.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Elementos:</span>
              <span class="stat-value">{{ canvasStore.elementos.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Contexto:</span>
              <span class="stat-value">{{ contextoActual }}</span>
            </div>
          </div>
        </div>

        <!-- Mensajes de estado -->
        <div v-if="mensaje" :class="['mensaje', mensaje.tipo]">
          <svg
            v-if="mensaje.tipo === 'exito'"
            class="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <svg v-else class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ mensaje.texto }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useCanvasImportExport } from '@/inventory-smart/composables/useCanvasImportExport'

const props = defineProps({
  mostrar: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['cerrar'])

// Composables
const canvasStore = useCanvasStore()
const importExport = useCanvasImportExport()

// Estado local
const fileInput = ref(null)
const mensaje = ref(null)

// Computed
const plantaActivaNombre = computed(() => {
  const planta = canvasStore.plantaPorId(canvasStore.plantaActiva)
  return planta?.nombre || 'Ninguna'
})

const contextoActual = computed(() => {
  const contexto = canvasStore.contextoNavegacion
  if (contexto.tipo === 'plantas') {
    return `Planta: ${plantaActivaNombre.value}`
  } else if (contexto.tipo === 'pisos') {
    const piso = canvasStore.elementoPorId(contexto.id)
    return `Piso: ${piso?.nombre || 'Desconocido'}`
  } else if (contexto.tipo === 'cuartos') {
    const cuarto = canvasStore.elementoPorId(contexto.id)
    return `Cuarto: ${cuarto?.nombre || 'Desconocido'}`
  } else if (contexto.tipo === 'elementos') {
    const elemento = canvasStore.elementoPorId(contexto.id)
    return `Elemento: ${elemento?.nombre || 'Desconocido'}`
  } else if (contexto.tipo === 'contenedores') {
    const contenedor = canvasStore.elementoPorId(contexto.id)
    return `Contenedor: ${contenedor?.nombre || 'Desconocido'}`
  }
  return 'Desconocido'
})

// Métodos
const cerrar = () => {
  emit('cerrar')
  limpiarMensaje()
}

const mostrarMensaje = (texto, tipo = 'info') => {
  mensaje.value = { texto, tipo }
  setTimeout(() => {
    mensaje.value = null
  }, 3000)
}

const limpiarMensaje = () => {
  mensaje.value = null
}

// Funciones de exportación
const exportarCanvasCompleto = async () => {
  try {
    const exito = await importExport.exportarCanvas()
    if (exito) {
      mostrarMensaje('Canvas exportado exitosamente', 'exito')
    } else {
      mostrarMensaje('Error al exportar el canvas', 'error')
    }
  } catch (error) {
    mostrarMensaje(`Error: ${error.message}`, 'error')
  }
}

const copiarPortapapeles = async () => {
  try {
    const exito = await importExport.copiarAlPortapapeles()
    if (exito) {
      mostrarMensaje('JSON copiado al portapapeles', 'exito')
    } else {
      mostrarMensaje('Error al copiar al portapapeles', 'error')
    }
  } catch (error) {
    mostrarMensaje(`Error: ${error.message}`, 'error')
  }
}

// Funciones de importación
const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = (event) => {
  const archivo = event.target.files[0]
  if (archivo) {
    procesarArchivo(archivo)
  }
}

const onFileDrop = (event) => {
  event.preventDefault()
  const archivo = event.dataTransfer.files[0]
  if (archivo) {
    procesarArchivo(archivo)
  }
}

const procesarArchivo = async (archivo) => {
  try {
    const exito = await importExport.importarCanvas(archivo)
    if (exito) {
      mostrarMensaje('Canvas importado exitosamente', 'exito')
    } else {
      mostrarMensaje('Error al importar el canvas', 'error')
    }
  } catch (error) {
    mostrarMensaje(`Error: ${error.message}`, 'error')
  }
}

const pegarPortapapeles = async () => {
  try {
    const exito = await importExport.pegarDesdePortapapeles()
    if (exito) {
      mostrarMensaje('Canvas importado desde portapapeles', 'exito')
    } else {
      mostrarMensaje('Error al importar desde portapapeles', 'error')
    }
  } catch (error) {
    mostrarMensaje(`Error: ${error.message}`, 'error')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  max-width: 42rem;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.modal-close {
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #4b5563;
}

.modal-body {
  padding: 1.5rem;
}

.section {
  margin-bottom: 2rem;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #2563eb;
  color: white;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.btn-info {
  background-color: #0891b2;
  color: white;
}

.btn-info:hover {
  background-color: #0e7490;
}

.import-area {
  margin-top: 1rem;
}

.file-drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-drop-zone:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-item {
  padding: 0.75rem;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
  color: #1f2937;
}

.mensaje {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.mensaje.exito {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.mensaje.error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.mensaje.info {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.w-full {
  width: 100%;
}

.mt-3 {
  margin-top: 0.75rem;
}

.mr-2 {
  margin-right: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-2 {
  margin-top: 0.5rem;
}
</style>
