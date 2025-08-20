<!--
  ElementosCatalogo.vue

  Panel lateral con catálogo de elementos predefinidos para arrastrar al canvas.

  Responsabilidades:
  - Mostrar catálogo organizado de elementos (anaqueles, estantes, mesas, etc.)
  - Categorizar elementos por tipo o función
  - Permitir búsqueda y filtrado de elementos
  - Implementar drag and drop desde el catálogo al canvas
  - Mostrar preview/thumbnail de cada elemento
  - Gestionar propiedades predefinidas de elementos del catálogo
  - Integrar con el buffer panel para movimientos temporales
-->

<template>
  <div class="elementos-catalogo">
    <!-- Header del catálogo -->
    <div class="catalogo-header">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Catálogo de Elementos</h2>

      <!-- Barra de búsqueda -->
      <div class="search-container">
        <div class="relative">
          <input
            v-model="filtroTexto"
            type="text"
            placeholder="Buscar elementos..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <!-- Filtros por categoría -->
      <div class="filtros-categoria mt-4">
        <div class="flex flex-wrap gap-2">
          <button
            @click="categoriaSeleccionada = null"
            :class="[
              'px-3 py-1 text-sm rounded-full transition-colors',
              categoriaSeleccionada === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
          >
            Todos
          </button>
          <button
            v-for="categoria in CATEGORIAS"
            :key="categoria.id"
            @click="categoriaSeleccionada = categoria.id"
            :class="[
              'px-3 py-1 text-sm rounded-full transition-colors',
              categoriaSeleccionada === categoria.id
                ? 'text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ]"
            :style="
              categoriaSeleccionada === categoria.id ? { backgroundColor: categoria.color } : {}
            "
          >
            {{ categoria.nombre }}
          </button>
        </div>
      </div>

      <!-- Botón para crear nuevo elemento -->
      <button
        @click="mostrarModalCrear = true"
        class="w-full mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Crear Nuevo Elemento
      </button>
    </div>

    <!-- Lista de elementos -->
    <div class="elementos-lista">
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="elemento in elementosFiltrados"
          :key="elemento.id"
          :draggable="true"
          @dragstart="iniciarArrastre(elemento, $event)"
          @dragend="finalizarArrastre"
          class="elemento-card relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab mb-3 hover:shadow-md transition-all duration-200"
          :style="{
            borderLeftColor:
              elemento.color || elemento.colorBase || getColorCategoria(elemento.categoria),
          }"
        >
          <!-- Preview del elemento -->
          <div class="elemento-preview">
            <div
              class="preview-shape"
              :class="[
                `shape-${elemento.forma}`,
                elemento.ubicacion === 'pared' ? 'wall-mounted' : '',
              ]"
              :style="{
                backgroundColor:
                  elemento.color || elemento.colorBase || getColorCategoria(elemento.categoria),
              }"
            >
              <component :is="getIconComponent(elemento.icono)" class="w-4 h-4 text-white" />
            </div>
          </div>

          <!-- Información del elemento -->
          <div class="elemento-info">
            <h3 class="font-semibold text-sm text-gray-800 mb-1">{{ elemento.nombre }}</h3>
            <p class="text-xs text-gray-500 mb-2">{{ elemento.descripcion }}</p>

            <!-- Dimensiones -->
            <div class="elemento-specs">
              <div class="spec-item">
                <span class="spec-label">Dim:</span>
                <span class="spec-value"
                  >{{ elemento.dimensiones.ancho }}×{{ elemento.dimensiones.largo }}×{{
                    elemento.dimensiones.alto
                  }}</span
                >
              </div>
              <div class="spec-item">
                <span class="spec-label">Peso:</span>
                <span class="spec-value">{{ elemento.pesoMaximo }}kg</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Ubic:</span>
                <span class="spec-value capitalize">{{ elemento.ubicacion }}</span>
              </div>
            </div>

            <!-- Badge de categoría -->
            <div class="mt-2">
              <span
                class="inline-block px-2 py-1 text-xs rounded-full text-white"
                :style="{ backgroundColor: getCategoriaColor(elemento.categoria) }"
              >
                {{ getCategoriaName(elemento.categoria) }}
              </span>
            </div>
          </div>

          <!-- Indicador de arrastre -->
          <div class="drag-indicator">
            <svg
              class="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Mensaje cuando no hay elementos -->
      <div v-if="elementosFiltrados.length === 0" class="no-elementos">
        <svg
          class="w-12 h-12 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0v5m0-5v-5"
          />
        </svg>
        <p class="text-gray-500 text-center">No se encontraron elementos</p>
        <p class="text-gray-400 text-sm text-center mt-1">
          Prueba con otros filtros o crea uno nuevo
        </p>
      </div>
    </div>

    <ElementEditor
      :visible="mostrarModalCrear"
      :categorias="CATEGORIAS"
      :formas="FORMAS_DISPONIBLES"
      :ubicaciones="UBICACIONES_DISPONIBLES"
      :value="nuevoElemento"
      @cancel="cerrarModal"
      @save="onGuardarElemento"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  ELEMENTOS_PREDEFINIDOS,
  CATEGORIAS,
  FORMAS_DISPONIBLES,
  UBICACIONES_DISPONIBLES,
} from '@/utils/constants'

import ElementEditor from './modals/ElementEditor.vue'
// Estado local
const filtroTexto = ref('')
const categoriaSeleccionada = ref(null)
const mostrarModalCrear = ref(false)
const elementosPersonalizados = ref([])
// Formulario para nuevo elemento
const nuevoElemento = ref({
  nombre: '',
  categoria: '',
  forma: '',
  colorBase: '#3b82f6',
  dimensiones: {
    ancho: 100,
    largo: 100,
    alto: 75,
  },
  pesoMaximo: 50,
  ubicacion: 'suelo',
  descripcion: '',
  icono: 'box',
})

const onGuardarElemento = (elemento) => {
  const elementoNuevo = {
    ...elemento,
    id: `custom_${Date.now()}`,
    icono: 'box',
    personalizado: true,
  }
  elementosPersonalizados.value.push(elementoNuevo)
  cerrarModal()
  categoriaSeleccionada.value = elementoNuevo.categoria
  filtroTexto.value = ''
}

// Todos los elementos (predefinidos + personalizados)
const todosLosElementos = computed(() => {
  return [...ELEMENTOS_PREDEFINIDOS, ...elementosPersonalizados.value]
})

// Elementos filtrados
const elementosFiltrados = computed(() => {
  let elementos = todosLosElementos.value

  // Filtrar por texto
  if (filtroTexto.value) {
    const texto = filtroTexto.value.toLowerCase()
    elementos = elementos.filter(
      (elemento) =>
        elemento.nombre.toLowerCase().includes(texto) ||
        elemento.descripcion.toLowerCase().includes(texto) ||
        elemento.categoria.includes(texto),
    )
  }

  // Filtrar por categoría
  if (categoriaSeleccionada.value) {
    elementos = elementos.filter((elemento) => elemento.categoria === categoriaSeleccionada.value)
  }

  return elementos
})

// Métodos
const getCategoriaColor = (categoriaId) => {
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId)
  return categoria ? categoria.color : '#6b7280'
}

const getCategoriaName = (categoriaId) => {
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId)
  return categoria ? categoria.nombre : 'Sin categoría'
}

const getIconComponent = (iconType) => {
  // Retornamos un componente SVG simple para el icono
  const icons = {
    rack: 'svg',
    shelf: 'svg',
    table: 'svg',
    cabinet: 'svg',
    box: 'svg',
  }
  return icons[iconType] || 'svg'
}

// Drag and Drop
const iniciarArrastre = (elemento, event) => {
  console.log('Iniciando arrastre del elemento:', elemento)

  // Datos que se envían al canvas
  const datosArrastre = {
    tipo: 'elemento-catalogo',
    elemento: elemento,
    offset: {
      x: event.offsetX || 0,
      y: event.offsetY || 0,
    },
  }

  console.log('Datos de arrastre:', datosArrastre)

  try {
    const dataString = JSON.stringify(datosArrastre)
    event.dataTransfer.setData('application/json', dataString)
    event.dataTransfer.effectAllowed = 'copy'
    console.log('Data set en dataTransfer:', dataString)

    // Agregar clase visual de arrastre
    event.target.classList.add('dragging')
  } catch (error) {
    console.error('Error en iniciarArrastre:', error)
  }
}

const finalizarArrastre = (event) => {
  console.log('Finalizando arrastre')
  event.target.classList.remove('dragging')
}

const cerrarModal = () => {
  mostrarModalCrear.value = false
  // El formulario se resetea automáticamente al abrir el modal
}

// Cargar elementos personalizados del localStorage
onMounted(() => {
  const elementosGuardados = localStorage.getItem('elementos-personalizados')
  if (elementosGuardados) {
    try {
      elementosPersonalizados.value = JSON.parse(elementosGuardados)
    } catch (error) {
      console.error('Error cargando elementos personalizados:', error)
    }
  }
})

// Guardar elementos personalizados en localStorage
const guardarElementosPersonalizados = () => {
  localStorage.setItem('elementos-personalizados', JSON.stringify(elementosPersonalizados.value))
}

// Observar cambios en elementos personalizados para guardar
watch(
  () => elementosPersonalizados.value,
  () => {
    guardarElementosPersonalizados()
  },
  { deep: true },
)
</script>

<style scoped>
@reference '@/styles/index.css';

.elementos-catalogo {
  @apply h-full flex flex-col bg-white border-r border-gray-200;
}

.catalogo-header {
  @apply p-4 border-b border-gray-200;
}

.elementos-lista {
  @apply flex-1 overflow-y-auto p-4;
}

.elemento-card {
  @apply relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab mb-3;
  @apply hover:shadow-md transition-all duration-200 border-l-4;
}

.elemento-card:hover {
  @apply scale-[1.02];
}

.elemento-card.dragging {
  @apply opacity-50 scale-95;
}

.elemento-preview {
  @apply flex items-center justify-center mb-3;
}

.preview-shape {
  @apply w-12 h-8 rounded flex items-center justify-center relative;
  @apply shadow-sm border border-white/20;
}

.shape-rectangular {
  @apply rounded-sm;
}

.shape-circular {
  @apply rounded-full;
}

.shape-triangular {
  @apply rounded-sm;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.shape-cuadrado {
  @apply rounded-sm aspect-square;
}

.wall-mounted::after {
  content: '';
  @apply absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full;
}

.elemento-info {
  @apply space-y-1;
}

.elemento-specs {
  @apply space-y-1;
}

.spec-item {
  @apply flex justify-between text-xs;
}

.spec-label {
  @apply text-gray-500 font-medium;
}

.spec-value {
  @apply text-gray-700;
}

.drag-indicator {
  @apply absolute top-2 right-2 opacity-0 transition-opacity;
}

.elemento-card:hover .drag-indicator {
  @apply opacity-100;
}

.no-elementos {
  @apply text-center py-12;
}

/* Modal */
.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4;
}

.modal-content {
  @apply bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto;
}

.modal-header {
  @apply flex justify-between items-center p-6 border-b border-gray-200;
}

.modal-body {
  @apply p-6;
}

.form-group {
  @apply space-y-1;
}

.form-label {
  @apply block text-sm font-medium text-gray-700;
}

.form-input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.form-textarea {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg resize-none;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.preview-container {
  @apply bg-gray-50 rounded-lg p-4;
}

.preview-card {
  @apply flex items-center p-3 bg-white rounded border;
}
</style>
