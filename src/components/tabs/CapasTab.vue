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
  <div class="h-full flex flex-col bg-white">
    <!-- Controles de filtro -->
    <div class="p-4 border-b border-gray-200 bg-gray-50">
      <!-- Filtro por categoría -->
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1 tracking-wide">Categoría:</label>
        <select
          v-model="filtroCategoria"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-100"
        >
          <option value="">Todas las categorías</option>
          <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">
            {{ categoria.nombre }}
          </option>
        </select>
      </div>

      <!-- Filtro por ubicación -->
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1 tracking-wide">Ubicación:</label>
        <select
          v-model="filtroUbicacion"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-100"
        >
          <option value="">Todas las ubicaciones</option>
          <option value="suelo">Suelo</option>
          <option value="pared">Pared</option>
        </select>
      </div>

      <!-- Botón para limpiar filtros -->
      <button
        v-if="hayFiltrosActivos"
        @click="limpiarFiltros"
        class="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs text-gray-600 cursor-pointer mt-2 hover:bg-gray-200 hover:text-gray-700 transition-colors"
        title="Limpiar filtros"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div class="flex-1 overflow-y-auto bg-white">
      <div v-if="elementosFiltrados.length === 0" class="py-8 px-4 text-center text-gray-600">
        <div
          class="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-6 h-6">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p class="m-0 text-sm">No hay elementos que coincidan con los filtros</p>
      </div>

      <div v-else class="p-2">
        <div
          v-for="elemento in elementosFiltrados"
          :key="elemento.id"
          class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg mb-2 bg-white cursor-pointer transition-all hover:border-gray-300 hover:bg-gray-50"
          :class="{
            'border-blue-500 bg-blue-50 ring ring-blue-100': esElementoSeleccionado(elemento.id),
            'opacity-60 bg-gray-100': elemento.visible === false,
          }"
          @click="seleccionarElemento(elemento.id)"
        >
          <!-- Visual del elemento -->
          <div class="flex-shrink-0">
            <div
              class="w-10 h-10 rounded-md border border-gray-300 flex items-center justify-center relative overflow-hidden"
              :style="{
                backgroundColor: elemento.color,
                opacity: elemento.visible === false ? 0.3 : 1,
              }"
              :class="{
                'rounded-sm': elemento.forma === 'rectangular',
                'rounded-full': elemento.forma === 'circular',
              }"
            >
              <span class="text-base brightness-0 invert mix-blend-difference">{{
                getIconoCategoria(elemento.tipo)
              }}</span>
            </div>
          </div>

          <!-- Info del elemento -->
          <div class="flex-1 min-w-0">
            <div
              class="font-medium text-gray-900 text-sm mb-1 whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {{ elemento.nombre }}
            </div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded capitalize">{{
                getCategoriaNombre(elemento.tipo)
              }}</span>
              <span
                class="text-xs px-1.5 py-0.5 rounded capitalize font-medium"
                :class="{
                  'bg-blue-100 text-blue-800':
                    (elemento.metadata?.ubicacion || 'suelo') === 'suelo',
                  'bg-green-100 text-green-800':
                    (elemento.metadata?.ubicacion || 'suelo') === 'pared',
                }"
              >
                {{ elemento.metadata?.ubicacion || 'suelo' }}
              </span>
            </div>
            <div class="text-xs text-gray-400 font-mono">
              X: {{ Math.round(elemento.x) }}, Y: {{ Math.round(elemento.y) }}
            </div>
          </div>

          <!-- Controles -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <!-- Toggle visibilidad -->
            <button
              @click.stop="toggleVisibilidad(elemento.id)"
              class="p-1.5 border border-gray-200 rounded-md bg-white text-gray-600 cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700"
              :class="{
                'text-green-600 border-green-200 hover:bg-green-50': elemento.visible !== false,
              }"
              :title="elemento.visible !== false ? 'Ocultar elemento' : 'Mostrar elemento'"
            >
              <svg
                v-if="elemento.visible !== false"
                class="w-4 h-4"
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
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              class="p-1.5 border border-gray-200 rounded-md bg-white text-gray-600 cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700"
              title="Enfocar elemento"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div class="p-4 border-t border-gray-200 bg-gray-50">
      <div class="grid grid-cols-2 gap-3">
        <div
          class="flex justify-between items-center p-2 bg-white border border-gray-200 rounded-md"
        >
          <span class="text-xs text-gray-600 font-medium">Total:</span>
          <span class="text-sm font-semibold text-gray-900">{{
            canvasStore.elementosVisibles.length
          }}</span>
        </div>
        <div
          class="flex justify-between items-center p-2 bg-white border border-gray-200 rounded-md"
        >
          <span class="text-xs text-gray-600 font-medium">Visibles:</span>
          <span class="text-sm font-semibold text-gray-900">{{ elementosVisibles }}</span>
        </div>
        <div
          class="flex justify-between items-center p-2 bg-white border border-gray-200 rounded-md"
        >
          <span class="text-xs text-gray-600 font-medium">Suelo:</span>
          <span class="text-sm font-semibold text-gray-900">{{ elementosPorUbicacion.suelo }}</span>
        </div>
        <div
          class="flex justify-between items-center p-2 bg-white border border-gray-200 rounded-md"
        >
          <span class="text-xs text-gray-600 font-medium">Pared:</span>
          <span class="text-sm font-semibold text-gray-900">{{ elementosPorUbicacion.pared }}</span>
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
