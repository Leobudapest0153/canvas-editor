<!--
  BufferTab.vue
  Tab para almacén temporal de estructuras (buffer/clipboard).
  Permite copiar estructuras completas de elementos con todos sus hijos.
-->

<template>
  <div class="buffer-tab">
    <!-- Header del tab -->
    <div class="tab-header">
      <div class="header-info">
        <h3 class="tab-title">Portapapeles de Estructuras</h3>
        <div class="tab-subtitle">
          {{ itemCount }} estructura{{ itemCount !== 1 ? 's' : '' }} en portapapeles
        </div>
      </div>
      <div class="header-actions">
        <button
          v-if="hasItems"
          @click="handleClearBuffer"
          class="btn btn-clear"
          title="Limpiar buffer"
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
      </div>
    </div>

    <!-- Contenido del buffer -->
    <div class="tab-body">
      <!-- Estado vacío -->
      <div v-if="!hasItems" class="empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>

        <h4 class="empty-title">Portapapeles vacío</h4>
        <p class="empty-description">Selecciona elementos en el canvas y usa:</p>

        <div class="shortcuts">
          <div class="shortcut"><kbd>Ctrl</kbd> + <kbd>C</kbd> <span>Copiar estructura al portapapeles</span></div>
        </div>
      </div>

      <!-- Lista de elementos en portapapeles -->
      <div v-else class="buffer-list">
        <div
          v-for="item in bufferItems"
          :key="item.id"
          class="buffer-item"
          :draggable="true"
          @dragstart="handleDragStart($event, item)"
          @dragend="handleDragEnd"
        >
          <!-- Contenido del elemento -->
          <div class="item-content">
            <div class="item-visual">
              <div class="item-preview" :style="{ backgroundColor: item.elemento.color }"></div>
            </div>

            <div class="item-info">
              <div class="item-name">{{ item.elemento.nombre || item.elemento.tipo }}</div>
              <div class="item-details">
                <span class="item-size">
                  {{ Math.round(item.elemento.width) }}×{{ Math.round(item.elemento.height) }}
                </span>
                <span class="item-origin">
                  desde {{ getPlantaName(item.sourceInfo.plantaId) }}
                </span>
              </div>
              <div class="item-action">
                <span :class="['action-badge', 'action-copied']">
                  Copiado
                </span>
                <span class="item-time" :title="`Copiado el ${getFullTimestamp(item)}`">
                  {{ getFullTimestamp(item) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Acciones del elemento -->
          <div class="item-actions">
            <button
              @click="handleRemove(item.id)"
              class="action-btn btn-remove"
              title="Eliminar del portapapeles"
            >
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
        </div>
      </div>
    </div>

    <!-- Información de drag -->
    <div v-if="isDragging" class="drag-info">
      <div class="drag-message">Arrastra al canvas para pegar elemento</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCanvasBuffer } from '@/composables/useCanvasBuffer'
import { useCanvasStore } from '@/composables/useCanvasStore'

// Composables
const buffer = useCanvasBuffer()
const canvasStore = useCanvasStore()

// Estado local
const isDragging = ref(false)

// Computed
const bufferItems = computed(() => buffer.bufferItems.value)
const hasItems = computed(() => buffer.hasItems.value)
const itemCount = computed(() => buffer.itemCount.value)

// Métodos
const getPlantaName = (plantaId) => {
  const planta = canvasStore.plantaPorId(plantaId)
  return planta?.nombre || 'Planta desconocida'
}

const getFullTimestamp = (item) => {
  // Priorizar copiedAt del sourceInfo si existe, sino usar addedToBuffer
  if (item.sourceInfo?.copiedAt) {
    return item.sourceInfo.copiedAt
  }

  // Fallback: formatear addedToBuffer
  return new Date(item.addedToBuffer).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Handlers
const handleClearBuffer = () => {
  buffer.clearBuffer()
}

const handleRemove = (bufferItemId) => {
  buffer.removeFromBuffer(bufferItemId)
}

// Drag & Drop
const handleDragStart = (event, item) => {
  console.log('🔄 handleDragStart llamado con item:', item)
  isDragging.value = true

  // Configurar datos de drag
  const dragData = {
    tipo: 'buffer-element',
    bufferItemId: item.id,
    elemento: item.elemento,
  }

  console.log('🔄 dragData creado:', dragData)

  event.dataTransfer.setData('application/json', JSON.stringify(dragData))
  event.dataTransfer.effectAllowed = 'all'

  console.log('🔄 Iniciando drag desde buffer:', item.elemento.nombre)
}

const handleDragEnd = () => {
  isDragging.value = false
}
</script>

<style scoped>
.buffer-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-info {
  flex: 1;
}

.tab-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.tab-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  transition: all 0.2s;
  border: 1px solid;
  cursor: pointer;
}

/* Action buttons */
.header-actions {
  display: flex;
  gap: 8px;
}

.btn-clear {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.btn-clear:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.btn .icon {
  width: 1rem;
  height: 1rem;
}

.tab-body {
  flex: 1;
  overflow-y: auto;
}

/* Estado vacío */
.empty-state {
  padding: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.empty-icon .icon {
  width: 2rem;
  height: 2rem;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.empty-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}

.shortcuts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.shortcut kbd {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

/* Lista de buffer */
.buffer-list {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.buffer-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.75rem;
  transition: all 0.2s;
  cursor: move;
}

.buffer-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.item-visual {
  flex-shrink: 0;
}

.item-preview {
  width: 2rem;
  height: 2rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-weight: 500;
  color: #111827;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.item-size {
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.item-origin {
  font-style: italic;
}

.item-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.action-badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 9999px;
}

.action-moved {
  background: #fed7aa;
  color: #9a3412;
}

.action-copied {
  background: #dbeafe;
  color: #1e40af;
}

.item-time {
  font-size: 0.75rem;
  color: #9ca3af;
}

.item-timestamp {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: #f8fafc;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
}

.timestamp-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: #64748b;
  flex-shrink: 0;
}

.timestamp-text {
  font-size: 0.75rem;
  color: #475569;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
  flex-shrink: 0;
}

.action-btn {
  padding: 0.375rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  border: none;
  background: transparent;
  cursor: pointer;
}

.action-btn:hover {
  background: #f3f4f6;
}

.btn-restore {
  color: #059669;
}

.btn-restore:hover {
  background: #ecfdf5;
  color: #047857;
}

.btn-remove {
  color: #dc2626;
}

.btn-remove:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.action-btn .icon {
  width: 1rem;
  height: 1rem;
}

/* Información de drag */
.drag-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #2563eb;
  color: white;
  padding: 0.75rem;
  text-align: center;
}

.drag-message {
  font-size: 0.875rem;
  font-weight: 500;
}

/* Efectos de drag */
.buffer-item[draggable='true']:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}
</style>
