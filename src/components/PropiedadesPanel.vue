<!--
  PropiedadesPanel.vue
  Panel de propiedades del elemento seleccionado en el canvas.
-->

<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200" data-properties-panel>
    <!-- Header -->
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800">Propiedades</h2>
    </div>

    <!-- Contenido (scroll) -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Sin elemento seleccionado -->
      <div v-if="!elementoSeleccionado" class="text-center py-12">
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
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z"
          />
        </svg>
        <p class="text-gray-500 text-sm">
          Selecciona un elemento en el canvas<br />
          para ver sus propiedades
        </p>
      </div>

      <!-- Panel de propiedades -->
      <div v-else class="space-y-6">
        <!-- Información básica -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Información Básica</h3>

          <!-- ID (solo lectura) -->
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1"> ID del Elemento </label>
            <input
              :value="elementoSeleccionado.id"
              type="text"
              disabled
              class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 mt-1">
              El ID se genera automáticamente y no puede modificarse
            </p>
          </div>

          <TagFilter
            class="pb-3"
            :selected-ids="elementoSeleccionado.etiquetas || []"
            @add="handleAgregarEtiqueta"
            @remove="handleQuitarEtiqueta"
            @create="abrirModalCrearEtiqueta"
          />

          <!-- Tipo y Categoría -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <input
                :value="getTipoNombre(elementoSeleccionado.tipo)"
                type="text"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <input
                :value="getCategoriaDisplay(elementoSeleccionado.categoria)"
                type="text"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed capitalize"
              />
            </div>
          </div>

          <!-- Nombre editable -->
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1"> Nombre </label>
            <input
              v-model="propiedadesEditables.nombre"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del elemento"
              @input="actualizarPropiedad('nombre', $event.target.value)"
            />
          </div>

          <!-- Color editable -->
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1"> Color </label>
            <div class="flex items-center gap-3">
              <input
                v-model="propiedadesEditables.color"
                type="color"
                class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                @input="actualizarPropiedad('color', $event.target.value)"
              />
              <input
                v-model="propiedadesEditables.color"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="#3B82F6"
                @input="actualizarPropiedad('color', $event.target.value)"
              />
            </div>
          </div>
        </div>

        <!-- Posición y dimensiones -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Posición y Dimensiones</h3>

          <div class="grid grid-cols-2 gap-3">
            <!-- Posición X -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> X (px) </label>
              <input
                :value="Math.round(elementoSeleccionado.x)"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <!-- Posición Y -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> Y (px) </label>
              <input
                :value="Math.round(elementoSeleccionado.y)"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <!-- Ancho -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> Ancho (px) </label>
              <input
                :value="elementoSeleccionado.width"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <!-- Largo -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> Largo (px) </label>
              <input
                :value="elementoSeleccionado.height"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-2">
            Vista desde arriba: Ancho=X, Largo=Y. Las dimensiones se modifican directamente en el
            canvas
          </p>

          <!-- Dimensiones físicas adicionales (si están disponibles) -->
          <div v-if="elementoSeleccionado.dimensiones" class="mt-3 pt-3 border-t border-gray-200">
            <h4 class="text-xs font-medium text-gray-600 mb-2">Dimensiones Físicas</h4>
            <div class="grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div>Ancho: {{ elementoSeleccionado.dimensiones.ancho }}cm</div>
              <div>Largo: {{ elementoSeleccionado.dimensiones.largo }}cm</div>
              <div>Alto: {{ elementoSeleccionado.dimensiones.alto }}cm</div>
            </div>
          </div>

          <!-- Información específica para elementos de pared -->
          <div
            v-if="
              elementoSeleccionado.ubicacion === 'pared' &&
              elementoSeleccionado.alturaRespectoAlSuelo !== undefined
            "
            class="mt-3 pt-3 border-t border-gray-200"
          >
            <h4 class="text-xs font-medium text-gray-600 mb-2">Posicionamiento en Pared</h4>
            <div class="text-xs text-gray-500">
              <div>Altura del suelo: {{ elementoSeleccionado.alturaRespectoAlSuelo }}cm</div>
              <div class="text-xs text-gray-400 mt-1">
                Base del elemento a {{ elementoSeleccionado.alturaRespectoAlSuelo }}cm del suelo
              </div>
            </div>
          </div>
        </div>

        <!-- Jerarquía -->
        <div
          v-if="elementoSeleccionado.padre || elementoSeleccionado.hijos?.length"
          class="bg-gray-50 rounded-lg p-4"
        >
          <h3 class="text-sm font-medium text-gray-700 mb-3">Jerarquía</h3>

          <!-- Elemento padre -->
          <div v-if="elementoSeleccionado.padre" class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1"> Elemento Padre </label>
            <div
              class="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-blue-700">{{
                obtenerNombreElementoPorId(elementoSeleccionado.padre)
              }}</span>
            </div>
          </div>

          <!-- Elementos hijos -->
          <div v-if="elementoSeleccionado.hijos?.length" class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">
              Elementos Hijos ({{ elementoSeleccionado.hijos.length }})
            </label>
            <div class="space-y-1">
              <div
                v-for="hijoId in elementoSeleccionado.hijos"
                :key="hijoId"
                class="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
              >
                <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm text-green-700">{{ obtenerNombreElementoPorId(hijoId) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Vista Previa -->
        <!-- <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Vista Previa</h3>
          <div
            class="flex items-center justify-center p-4 bg-white border border-gray-200 rounded-lg overflow-hidden isolate shadow-sm"
            style="transform: translateZ(0)"
          >
            <div
              class="flex items-center justify-center border border-gray-300 rounded"
              :style="{
                backgroundColor: propiedadesEditables.color,
                width: Math.min(120, elementoSeleccionado.width / 2) + 'px',
                height: Math.min(80, elementoSeleccionado.height / 2) + 'px',
              }"
            >
              <span class="text-white font-bold text-xs">
                {{
                  propiedadesEditables.nombre?.charAt(0)?.toUpperCase() ||
                  elementoSeleccionado.tipo.charAt(0).toUpperCase()
                }}
              </span>
            </div>
          </div>
        </div> -->
      </div>
    </div>

    <!-- Footer fijo con acciones -->
    <div v-if="elementoSeleccionado" class="p-4 border-t border-gray-200 bg-white">
      <div class="flex gap-2 mb-2">
        <button
          @click="onDeleteClick"
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          :aria-label="isLockedSelected ? 'Elemento bloqueado — desbloquéalo para eliminar' : 'Eliminar (Supr)'"
          :title="isLockedSelected ? 'Elemento bloqueado — desbloquéalo para eliminar' : 'Eliminar (Supr)'"
        >
          Eliminar
        </button>
      </div>
      <div class="flex gap-2">
        <button
          @click="resetearPropiedades"
          class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Restablecer
        </button>
        <button
          @click="deseleccionarElemento"
          class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          Deseleccionar
        </button>
      </div>
    </div>
  </div>
  <CreateTagModal
    :show="modalCrearEtiquetaVisible"
    :initial-text="textoNuevaEtiqueta"
    @close="modalCrearEtiquetaVisible = false"
    @save="guardarYAsignarNuevaEtiqueta"
  />
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore.js'
import { TIPOS_ENTIDAD, TODAS_LAS_CATEGORIAS } from '@/utils/constants'
import { useDeleteElement } from '@/composables/useDeleteElement'
import TagFilter from './TagFilter.vue'
import CreateTagModal from './CreateTagModal.vue'

// Store
const canvasStore = useCanvasStore()
const { deleteSelected } = useDeleteElement()

// Referencias reactivas
const propiedadesEditables = ref({
  nombre: '',
  color: '#3B82F6',
})

const modalCrearEtiquetaVisible = ref(false);
const textoNuevaEtiqueta = ref('');

// Computed
const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)
const isLockedSelected = computed(() => {
  const el = elementoSeleccionado.value
  return !!(el && (el.bloqueado === true || el.locked === true))
})

// Watchers
watch(
  elementoSeleccionado,
  (nuevoElemento) => {
    if (nuevoElemento) {
      // Inicializar propiedades editables con los valores actuales
      propiedadesEditables.value = {
        nombre: nuevoElemento.nombre || generarNombrePorDefecto(nuevoElemento),
        color: nuevoElemento.color || '#3B82F6',
      }
    }
  },
  { immediate: true },
)

// Métodos
const getTipoNombre = (tipo) => {
  const tipoInfo = TIPOS_ENTIDAD.find((t) => t.id === tipo)
  return tipoInfo?.nombre || tipo || 'Desconocido'
}

const getCategoriaDisplay = (categoria) => {
  const categoriaInfo = TODAS_LAS_CATEGORIAS.find((c) => c.id === categoria)
  return categoriaInfo?.nombre || categoria || 'Sin categoría'
}

const generarNombrePorDefecto = (elemento) => {
  return `${elemento.tipo.charAt(0).toUpperCase() + elemento.tipo.slice(1)} ${elemento.id.split('_')[1] || ''}`
}

const actualizarPropiedad = (propiedad, valor) => {
  if (!elementoSeleccionado.value) return

  // Actualizar el valor local
  propiedadesEditables.value[propiedad] = valor

  // Actualizar en el store (tiempo real)
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, {
    [propiedad]: valor,
  })
}

const resetearPropiedades = () => {
  if (!elementoSeleccionado.value) return

  const propiedadesOriginales = {
    nombre: generarNombrePorDefecto(elementoSeleccionado.value),
    color: '#3B82F6',
  }

  propiedadesEditables.value = { ...propiedadesOriginales }
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, propiedadesOriginales)
}

const deseleccionarElemento = () => {
  canvasStore.seleccionarElemento(null)
}

const onDeleteClick = () => {
  deleteSelected({ withConfirm: true })
}

// Funciones para obtener nombres de elementos por ID
const obtenerNombreElementoPorId = (elementoId) => {
  const elemento = canvasStore.elementoPorId(elementoId)
  return elemento ? elemento.nombre || generarNombrePorDefecto(elemento) : `ID: ${elementoId}`
}

const handleAgregarEtiqueta = (etiquetaId) => {
  if (!elementoSeleccionado.value) return
  canvasStore.agregarEtiquetaAElemento(elementoSeleccionado.value.id, etiquetaId)
}

const handleQuitarEtiqueta = (etiquetaId) => {
  if (!elementoSeleccionado.value) return
  canvasStore.quitarEtiquetaDeElemento(elementoSeleccionado.value.id, etiquetaId)
}

const abrirModalCrearEtiqueta = (texto) => {
  textoNuevaEtiqueta.value = texto
  modalCrearEtiquetaVisible.value = true
}

const guardarYAsignarNuevaEtiqueta = (nuevaEtiqueta) => {
  if (!elementoSeleccionado.value) return
  canvasStore.crearYAsignarEtiquetaAElemento(elementoSeleccionado.value.id, nuevaEtiqueta)
  modalCrearEtiquetaVisible.value = false
}
</script>

<style scoped>
/* Estilos personalizados para mejor UX */
input[type='color'] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  cursor: pointer;
}

input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type='color']::-webkit-color-swatch {
  border: none;
  border-radius: 0.375rem;
}

input[type='color']::-moz-color-swatch {
  border: none;
  border-radius: 0.375rem;
}

input[disabled] {
  cursor: not-allowed;
}

.cursor-not-allowed {
  cursor: not-allowed !important;
}
</style>
