<!--
  HistorialModal.vue
  Modal detallado con historial completo y opciones avanzadas.
-->

<template>
  <!-- Overlay del modal -->
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <!-- Contenido del modal -->
    <div class="modal-content" @click.stop>
      <!-- Header del modal -->
      <div class="modal-header">
        <div class="header-left">
          <h2 class="modal-title">Historial de Acciones</h2>
          <div class="header-info">
            <span class="position-info"> {{ currentPosition }} de {{ historySize }} acciones </span>
          </div>
        </div>

        <button @click="closeModal" class="close-btn" title="Cerrar">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Controles principales -->
      <div class="modal-controls">
        <div class="action-buttons">
          <button @click="undo" :disabled="!canUndo" class="control-btn btn-undo">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            Deshacer
          </button>

          <button @click="redo" :disabled="!canRedo" class="control-btn btn-redo">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
              />
            </svg>
            Rehacer
          </button>
        </div>

        <div class="utility-buttons">
          <button
            @click="clearHistory"
            class="control-btn btn-clear"
            title="Limpiar todo el historial"
          >
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Limpiar
          </button>

          <button @click="exportHistory" class="control-btn btn-export" title="Exportar historial">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      <!-- Lista detallada del historial -->
      <div class="history-list-container">
        <div class="list-header">
          <span class="header-item">Acción</span>
          <span class="header-item">Tiempo</span>
          <span class="header-item">Estado</span>
        </div>

        <div class="history-list">
          <div
            v-for="(item, index) in historyList"
            :key="item.id"
            @click="jumpToState(index)"
            :class="[
              'history-item',
              {
                current: item.isCurrent,
                future: index > currentIndex,
                past: index < currentIndex,
              },
            ]"
          >
            <div class="item-main">
              <div class="item-description">{{ item.description }}</div>
              <div class="item-timestamp">{{ formatDetailedTime(item.timestamp) }}</div>
            </div>

            <div class="item-status">
              <div v-if="item.isCurrent" class="status-current">
                <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                Actual
              </div>
              <div v-else-if="index < currentIndex" class="status-past">Anterior</div>
              <div v-else class="status-future">Futuro</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer con información -->
      <div class="modal-footer">
        <div class="footer-info">
          <span>💡 Usa Ctrl+Z y Ctrl+Y para navegar rápidamente</span>
        </div>
        <div class="footer-stats">
          <span>Límite: {{ historySize }}/50 acciones</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useCanvasWithHistory } from '@/composables/useCanvasWithHistory'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

// Emits
const emit = defineEmits(['close'])

// Composable
const {
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  getHistoryInfo,
  getHistoryList,
  jumpToState,
  history,
} = useCanvasWithHistory()

// Computed
const historySize = computed(() => history.historySize.value)
const currentPosition = computed(() => history.currentPosition.value)
const historyList = computed(() => getHistoryList())
const currentIndex = computed(() => history.currentPosition.value - 1)

// Métodos
const closeModal = () => {
  emit('close')
}

const formatDetailedTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

const exportHistory = () => {
  const historyData = getHistoryInfo()
  const blob = new Blob([JSON.stringify(historyData, null, 2)], {
    type: 'application/json',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `canvas-history-${new Date().toISOString().slice(0, 19)}.json`
  a.click()

  URL.revokeObjectURL(url)
}

// Atajos de teclado
const handleKeydown = (e) => {
  if (!props.isOpen) return

  if (e.key === 'Escape') {
    closeModal()
  } else if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
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
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.header-info {
  display: flex;
  gap: 16px;
}

.position-info {
  font-size: 0.875rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 12px;
  border-radius: 20px;
}

.close-btn {
  padding: 8px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.close-btn .icon {
  width: 20px;
  height: 20px;
}

.modal-controls {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.action-buttons,
.utility-buttons {
  display: flex;
  gap: 12px;
}

.control-btn {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 500;
}

.control-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-undo:not(:disabled) {
  color: #3b82f6;
  border-color: #bfdbfe;
}

.btn-undo:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

.btn-redo:not(:disabled) {
  color: #059669;
  border-color: #a7f3d0;
}

.btn-redo:hover:not(:disabled) {
  background: #ecfdf5;
  border-color: #059669;
}

.btn-clear:not(:disabled) {
  color: #dc2626;
}

.btn-clear:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #dc2626;
}

.btn-export:not(:disabled) {
  color: #7c3aed;
}

.btn-export:hover:not(:disabled) {
  background: #faf5ff;
  border-color: #7c3aed;
}

.control-btn .icon {
  width: 16px;
  height: 16px;
}

.history-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  background: #f9fafb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  padding: 16px 20px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  border: 1px solid transparent;
}

.history-item:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
}

.history-item.current {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.history-item.past {
  opacity: 0.8;
}

.history-item.future {
  opacity: 0.5;
  color: #6b7280;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-description {
  font-weight: 500;
  font-size: 0.875rem;
}

.item-timestamp {
  font-size: 0.75rem;
  color: #6b7280;
}

.item-status {
  text-align: right;
}

.status-current {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #3b82f6;
  font-weight: 500;
  font-size: 0.75rem;
}

.status-current .icon {
  width: 14px;
  height: 14px;
}

.status-past,
.status-future {
  font-size: 0.75rem;
  font-weight: 500;
}

.status-past {
  color: #6b7280;
}

.status-future {
  color: #9ca3af;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  font-size: 0.875rem;
  color: #6b7280;
}

.footer-stats {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}
</style>
