<!--
  CapasTab.vue
  Tab para gestión de capas y visualización de elementos en el canvas.

  Funcionalidades:
  - Mostrar todos los elementos del canvas activo
  - Filtrar por categoría
  - Filtrar por ubicación (suelo/pared)
  - Control visual de visibilidad de elementos
  - Selección de elementos desde la lista
-->

<template>
  <div class="capas-tab">
    <!-- Controles de filtro -->
    <div class="filtros-section">
      <!-- Filtro por categoría -->
      <div class="filter-group">
        <label class="filter-label">Categoría:</label>
        <select v-model="filtroCategoria" class="filter-select">
          <option value="">Todas las categorías</option>
          <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">
            {{ categoria.nombre }}
          </option>
        </select>
      </div>

      <!-- Filtro por ubicación -->
      <div class="filter-group">
        <label class="filter-label">Ubicación:</label>
        <select v-model="filtroUbicacion" class="filter-select">
          <option value="">Todas las ubicaciones</option>
          <option value="suelo">Suelo</option>
          <option value="pared">Pared</option>
        </select>
      </div>

      <!-- Botón para limpiar filtros -->
      <button
        v-if="hayFiltrosActivos"
        @click="limpiarFiltros"
        class="btn-clear-filters"
        title="Limpiar filtros"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        Limpiar
      </button>
    </div>

    <!-- Lista de elementos -->
    <div class="elementos-section">
      <div v-if="elementosFiltrados.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p class="empty-text">No hay elementos que coincidan con los filtros</p>
      </div>

      <div v-else class="elementos-list">
        <div
          v-for="elemento in elementosFiltrados"
          :key="elemento.id"
          class="elemento-item"
          :class="{
            selected: esElementoSeleccionado(elemento.id),
            hidden: !elemento.visible,
          }"
          @click="seleccionarElemento(elemento.id)"
        >
          <!-- Visual del elemento -->
          <div class="elemento-visual">
            <div
              class="elemento-preview"
              :style="{
                backgroundColor: elemento.color,
                opacity: elemento.visible !== false ? 1 : 0.3,
              }"
              :class="elemento.forma"
            >
              <span class="elemento-icon">{{ getIconoCategoria(elemento.tipo) }}</span>
            </div>
          </div>

          <!-- Info del elemento -->
          <div class="elemento-info">
            <div class="elemento-nombre">{{ elemento.nombre }}</div>
            <div class="elemento-detalles">
              <span class="elemento-tipo">{{ getCategoriaNombre(elemento.tipo) }}</span>
              <span class="elemento-ubicacion" :class="elemento.metadata?.ubicacion">
                {{ elemento.metadata?.ubicacion || 'suelo' }}
              </span>
            </div>
            <div class="elemento-posicion">
              X: {{ Math.round(elemento.x) }}, Y: {{ Math.round(elemento.y) }}
            </div>
          </div>

          <!-- Controles -->
          <div class="elemento-controls">
            <!-- Toggle visibilidad -->
            <button
              @click.stop="toggleVisibilidad(elemento.id)"
              class="control-btn"
              :class="{ visible: elemento.visible !== false }"
              :title="elemento.visible !== false ? 'Ocultar elemento' : 'Mostrar elemento'"
            >
              <svg
                v-if="elemento.visible !== false"
                class="icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <svg v-else class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m0 0l3.121-3.121M12 12l4.242 4.242"
                />
              </svg>
            </button>

            <!-- Zoom al elemento -->
            <button
              @click.stop="enfocarElemento(elemento.id)"
              class="control-btn"
              title="Enfocar elemento"
            >
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total:</span>
          <span class="stat-value">{{ canvasStore.elementosVisibles.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Visibles:</span>
          <span class="stat-value">{{ elementosVisibles }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Suelo:</span>
          <span class="stat-value">{{ elementosPorUbicacion.suelo }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Pared:</span>
          <span class="stat-value">{{ elementosPorUbicacion.pared }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { CATEGORIAS } from '@/utils/constants'

// Composables
const canvasStore = useCanvasStore()

// Estado local
const filtroCategoria = ref('')
const filtroUbicacion = ref('')

// Computed properties
const categorias = computed(() => CATEGORIAS)

const elementosFiltrados = computed(() => {
  let elementos = canvasStore.elementosVisibles

  // Filtrar por categoría
  if (filtroCategoria.value) {
    elementos = elementos.filter((elemento) => elemento.tipo === filtroCategoria.value)
  }

  // Filtrar por ubicación
  if (filtroUbicacion.value) {
    elementos = elementos.filter((elemento) => {
      const ubicacion = elemento.metadata?.ubicacion || 'suelo'
      return ubicacion === filtroUbicacion.value
    })
  }

  return elementos
})

const hayFiltrosActivos = computed(() => {
  return filtroCategoria.value || filtroUbicacion.value
})

const elementosVisibles = computed(() => {
  return canvasStore.elementosVisibles.filter((el) => el.visible !== false).length
})

const elementosPorUbicacion = computed(() => {
  const elementos = canvasStore.elementosVisibles
  return {
    suelo: elementos.filter((el) => (el.metadata?.ubicacion || 'suelo') === 'suelo').length,
    pared: elementos.filter((el) => (el.metadata?.ubicacion || 'suelo') === 'pared').length,
  }
})

// Métodos
const esElementoSeleccionado = (elementoId) => {
  return canvasStore.elementoSeleccionado === elementoId
}

const seleccionarElemento = (elementoId) => {
  canvasStore.seleccionarElemento(elementoId)
}

const toggleVisibilidad = (elementoId) => {
  const elemento = canvasStore.elementoPorId(elementoId)
  if (elemento) {
    // Implementar toggle de visibilidad en el store
    canvasStore.toggleElementoVisibilidad(elementoId)
  }
}

const enfocarElemento = (elementoId) => {
  // Seleccionar el elemento
  seleccionarElemento(elementoId)

  // Aquí podrías agregar lógica para hacer pan/zoom al elemento
  // Por ahora solo lo seleccionamos
  console.log('Enfocando elemento:', elementoId)
}

const limpiarFiltros = () => {
  filtroCategoria.value = ''
  filtroUbicacion.value = ''
}

const getCategoriaNombre = (tipo) => {
  const categoria = categorias.value.find((cat) => cat.id === tipo)
  return categoria ? categoria.nombre : tipo
}

const getIconoCategoria = (tipo) => {
  const iconos = {
    anaqueles: '📚',
    estantes: '📋',
    mesas: '🗄️',
    armarios: '🗃️',
    contenedores: '📦',
  }
  return iconos[tipo] || '📦'
}
</script>

<style scoped>
.capas-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

/* Header */
.tab-header {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.tab-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.tab-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Filtros */
.filtros-section {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.filter-group {
  margin-bottom: 0.75rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
  text-transform: none;
  letter-spacing: 0.05em;
}

.filter-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  color: #111827;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-clear-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn-clear-filters:hover {
  background: #e5e7eb;
  color: #374151;
}

.btn-clear-filters .icon {
  width: 0.875rem;
  height: 0.875rem;
}

/* Elementos */
.elementos-section {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon .icon {
  width: 24px;
  height: 24px;
}

.empty-text {
  margin: 0;
  font-size: 0.875rem;
}

.elementos-list {
  padding: 0.5rem;
}

.elemento-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.elemento-item:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.elemento-item.selected {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.elemento-item.hidden {
  opacity: 0.6;
  background: #f3f4f6;
}

/* Visual del elemento */
.elemento-visual {
  flex-shrink: 0;
}

.elemento-preview {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.elemento-preview.rectangular {
  border-radius: 0.25rem;
}

.elemento-preview.circular {
  border-radius: 50%;
}

.elemento-preview.triangular {
  border-radius: 0.125rem;
  background: linear-gradient(45deg, transparent 45%, currentColor 50%, transparent 55%);
}

.elemento-icon {
  font-size: 1rem;
  filter: brightness(0) invert(1);
  mix-blend-mode: difference;
}

/* Info del elemento */
.elemento-info {
  flex: 1;
  min-width: 0;
}

.elemento-nombre {
  font-weight: 500;
  color: #111827;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.elemento-detalles {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.elemento-tipo {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  text-transform: capitalize;
}

.elemento-ubicacion {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  text-transform: capitalize;
  font-weight: 500;
}

.elemento-ubicacion.suelo {
  background: #dbeafe;
  color: #1e40af;
}

.elemento-ubicacion.pared {
  background: #d1fae5;
  color: #065f46;
}

.elemento-posicion {
  font-size: 0.625rem;
  color: #9ca3af;
  font-family: monospace;
}

/* Controles */
.elemento-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.control-btn {
  padding: 0.375rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.control-btn.visible {
  color: #059669;
  border-color: #d1fae5;
}

.control-btn.visible:hover {
  background: #ecfdf5;
}

.control-btn .icon {
  width: 1rem;
  height: 1rem;
}

/* Estadísticas */
.stats-section {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}
</style>
