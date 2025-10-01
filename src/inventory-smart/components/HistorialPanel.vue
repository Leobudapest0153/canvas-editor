<!--
  HistorialPanel.vue
  Panel de historial de acciones con botones undo/redo y lista de historial.

  Funcionalidades:
  - Botones undo/redo con shortcuts de teclado
  - Lista visual del historial con navegación
  - Información del estado actual
  - Limpieza del historial
-->

<template>
  <div class="historial-panel">
    <!-- Header con botones principales -->
    <div class="header">
      <h3 class="title">Historial</h3>

      <div class="actions">
        <button @click="undo" :disabled="!canUndo || historyDisabled" class="btn btn-undo" title="Deshacer (Ctrl+Z)">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>

        <button @click="redo" :disabled="!canRedo || historyDisabled" class="btn btn-redo" title="Rehacer (Ctrl+Y)">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
            />
          </svg>
        </button>

        <button @click="clearHistory" :disabled="historyDisabled" class="btn btn-clear" title="Limpiar historial">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Información del estado -->
    <div class="status">
      <span class="status-item"> Posición: {{ currentPosition }} / {{ historySize }} </span>
    </div>

    <!-- Lista del historial -->
    <div class="history-list">
      <div
        v-for="(item, index) in historyList"
        :key="item.id"
        @click="jumpToState(index)"
        :class="['history-item', { current: item.isCurrent, future: index > currentIndex }]"
      >
        <div class="item-content">
          <div class="description">{{ item.description }}</div>
          <div class="timestamp">{{ formatTime(item.timestamp) }}</div>
        </div>

        <div v-if="item.isCurrent" class="current-indicator">
          <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Debug info (solo en desarrollo) -->
    <div v-if="showDebug" class="debug-info">
      <details>
        <summary>Debug Info</summary>
        <pre>{{ JSON.stringify(getHistoryInfo(), null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useCanvasWithHistory } from '@/inventory-smart/composables/useCanvasWithHistory'
import { useEditorMode } from '@/inventory-smart/composables/useEditorMode'

// Props
const props = defineProps({
  showDebug: {
    type: Boolean,
    default: false,
  },
})

// Composable
const {
  history,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  getHistoryInfo,
  getHistoryList,
  jumpToState,
} = useCanvasWithHistory()

const { canUseShortcuts } = useEditorMode()
const historyDisabled = computed(() => !canUseShortcuts.value)

// Computed
const historySize = computed(() => history.historySize.value)
const currentPosition = computed(() => history.currentPosition.value)
const historyList = computed(() => getHistoryList())
const currentIndex = computed(() => history.currentPosition.value - 1)

// Métodos
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// Atajos de teclado
const handleKeydown = (e) => {
  if (!canUseShortcuts.value) return
  if (e.ctrlKey || e.metaKey) {
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
.historial-panel {
  width: 300px;
  height: 100%;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-undo:not(:disabled) {
  color: #2563eb;
}

.btn-redo:not(:disabled) {
  color: #059669;
}

.btn-clear:not(:disabled) {
  color: #dc2626;
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}

.status {
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.status-item {
  font-size: 0.875rem;
  color: #4b5563;
  font-weight: 500;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.history-item {
  padding: 0.75rem;
  margin-bottom: 0.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
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
  color: #1e40af;
}

.history-item.future {
  opacity: 0.6;
  color: #6b7280;
}

.item-content {
  flex: 1;
}

.description {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.timestamp {
  font-size: 0.75rem;
  color: #6b7280;
}

.current-indicator {
  color: #2563eb;
}

.current-indicator .icon {
  width: 1rem;
  height: 1rem;
}

.debug-info {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.debug-info summary {
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.debug-info pre {
  font-size: 0.75rem;
  background: white;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  overflow-x: auto;
}
</style>
