<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Contenedor para el botón y el panel de filtros -->
    <div class="relative border-b border-gray-200">
      <!-- Botón para mostrar/ocultar filtros -->
      <div class="p-4 bg-white" ref="filtrosBotonRef">
        <UiTooltip
          label="Desplegar filtros"
          position="bottom"
          :delay="700"
          class="w-full"
        >
        <button
          @click="toggleFiltros"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16a1 1 0 01-.293.707l-2 2A1 1 0 0112 18v-1.586l-3.707-3.707A1 1 0 018 12V6.414L3.293 4.707A1 1 0 013 4z"
            ></path>
          </svg>
          <span>Filtros</span>
          <span v-if="hayFiltrosActivos" class="w-2 h-2 bg-blue-500 rounded-full"></span>
        </button>
        </UiTooltip>
        <span class="text-center w-full pt-2 block -mb-2 text-gray-700 text-sm">
          Elementos en la capa: {{ canvasStore.elementosVisibles?.length ?? 0 }}
        </span>
      </div>

      <!-- Panel de filtros desplegable -->
      <transition name="unroll">
        <div
          v-if="filtrosVisibles"
          class="absolute top-full left-0 w-full bg-gray-50 shadow-lg z-10"
          ref="filtrosPanelRef"
        >
          <div class="p-4 space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1 tracking-wide">
                Nombre de elemento
              </label>
              <input
                v-model="filtroNombre"
                @keyup.enter="() => filtrosVisibles = false"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-100"
                placeholder="Nombre del elemento..."
              />
            </div>
            <!-- Filtro por tipo (internamente manejado como categoría) -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1 tracking-wide"
                >Tipo:</label
              >
              <select
                v-model="filtroCategoria"
                class="w-full cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-100"
              >
                <option value="">Todos los tipos</option>
                <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">
                  {{ categoria.nombre }}
                </option>
              </select>
            </div>

            <!-- Filtro por ubicación -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1 tracking-wide"
                >Ubicación:</label
              >
              <select
                v-model="filtroUbicacion"
                class="w-full cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-100"
              >
                <option value="">Todas las ubicaciones</option>
                <option value="suelo">Suelo</option>
                <option value="pared">Pared</option>
              </select>
            </div>

            <!-- FILTRO DE ETIQUETAS -->
            <TagFilter
              :selected-ids="canvasStore.etiquetasSeleccionadas"
              @add="canvasStore.seleccionarEtiqueta"
              @remove="canvasStore.deseleccionarEtiqueta"
              @create="abrirModalCrearEtiqueta"
            />

            <!-- Botón para limpiar filtros -->
            <UiTooltip
              position="right"
              label="Limpiar filtros"
              :delay="200"
            >
            <button
              v-if="hayFiltrosActivos"
              @click="limpiarFiltros"
              class="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-xs text-gray-600 cursor-pointer mt-2 hover:bg-gray-200 hover:text-gray-700 transition-colors"
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
            </UiTooltip>
          </div>
        </div>
      </transition>
    </div>

    <!-- Lista de elementos -->
    <div class="flex-1 overflow-y-auto bg-white">
      <div v-if="elementosFiltrados.length === 0 && hayFiltrosActivos" class="py-8 px-4 text-center text-gray-600">
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

      <div v-else-if="elementosFiltrados.length === 0" class="py-8 px-4 text-center text-gray-600">
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
        <p class="m-0 text-sm">No hay elementos en el área de trabajo. Añade algunos desde el Catálogo</p>
      </div>


      <div v-else class="p-2">
        <div
          v-for="elemento in elementosFiltrados"
          :key="elemento.id"
          class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg mb-2 bg-white cursor-pointer transition-all hover:border-gray-300 hover:bg-gray-50"
          :class="{
            'border-blue-500 !bg-blue-100 ring ring-blue-600': esElementoSeleccionado(elemento.id),
            'opacity-60 bg-gray-100': elemento.visible === false,
          }"
          @click="seleccionarElemento(elemento.id)"
        >
          <!-- Visual -->
          <div class="flex-shrink-0">
            <component
              :is="getIconComponent(elemento)"
              :backgroundColor="elemento.colorBase || elemento.color || '#E0E0E0'"
              class="w-10 h-10"
            />
          </div>
          <!-- Info -->
          <div class="flex-1 overflow-hidden">
            <p class="text-sm font-semibold text-gray-800 truncate">{{ elemento.nombre }}</p>
            <p class="text-xs text-gray-500 truncate">{{ getTipoNombre(elemento.tipo) }}</p>
          </div>
          <!-- Controles -->
          <div class="flex items-center gap-2">
            <UiTooltip
              position="left"
              label="Buscar elemento"
              :delay="200"
            >
            <button
              @click.stop="showAuraElement(elemento.id)"
              class="p-0 text-gray-400 hover:text-blue-600 cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </button>
            </UiTooltip>
            <UiTooltip
              position="left"
              :label="elemento.visible === false ? 'Mostrar' : 'Ocultar'"
            >
            <button
              @click.stop="toggleVisibilidad(elemento.id)"
              class="p-0 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg
                v-if="elemento.visible !== false"
                class="w-5 h-5"
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
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <g
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="2"
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

                <path d="m4 4l16 16"/>

                </g>
              </svg>
            </button>
            </UiTooltip>
            <UiTooltip
              position="left"
              label="Eliminar elemento"
            >
            <button
              @click.stop="onDelete(elemento.id)" :disabled="!canMutateLayers"
              class="p-0 text-gray-400 hover:text-red-700 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 1024 1024"><path fill="currentColor" d="M360 184h-8c4.4 0 8-3.6 8-8zh304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32M731.3 840H292.7l-24.2-512h487z"/></svg>
            </button>
            </UiTooltip>

          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear etiquetas -->
    <CreateTagModal
      :show="modalVisible"
      :initial-text="textoNuevaEtiqueta"
      @close="modalVisible = false"
      @save="guardarNuevaEtiqueta"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useEditorMode } from '@/inventory-smart/composables/useEditorMode'
import { TODAS_LAS_CATEGORIAS, TIPOS_ENTIDAD } from '@/inventory-smart/utils/constants'
import TagFilter from '@/inventory-smart/components/TagFilter.vue'
import CreateTagModal from '@/inventory-smart/components/CreateTagModal.vue'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'
import {useDeleteElement} from '@/inventory-smart/composables/useDeleteElement'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'
import { useToast } from '@/inventory-smart/composables/useToast'
import SpaceIcon from '@/inventory-smart/icons/SpaceIcon.vue'
import SpaceOnWallIcon from '@/inventory-smart/icons/SpaceOnWallIcon.vue'
import RoomIcon from '@/inventory-smart/icons/RoomIcon.vue'
const { showToast } = useToast()
// Composables
const canvasStore = useCanvasStore()

const deleteElement = useDeleteElement();
const { canMutateLayers } = useEditorMode()
const VISUAL_MODE_MESSAGE = 'No disponible en modo visualización'
const confirmDialog = useConfirmDialog();

// Estado local
const filtroCategoria = ref('')
const filtroUbicacion = ref('')
const filtrosVisibles = ref(false)
const filtroNombre = ref('');
const modalVisible = ref(false)
const textoNuevaEtiqueta = ref('')

// Refs para la lógica de click-outside
const filtrosBotonRef = ref(null)
const filtrosPanelRef = ref(null)

// Computed properties
const categorias = computed(() => TODAS_LAS_CATEGORIAS)

const showAuraElement = (elementoId) => {
  if (canvasStore.cambiosNoAplicados) {
    showToast('No puedes buscar un elemento si tienes cambios pendientes', 'warn');
    return;
  }
  // Primero enfocar (zoom+pan) para garantizar que el nodo esté en viewport
  canvasStore.focusElemento(elementoId, { paddingPx: 60, fitRatio: 0.95, animate: true, duration: 450 });
  // Luego (en el siguiente frame) destacar para tomar bounding correcto tras animación inicial
  requestAnimationFrame(() => canvasStore.destacarElemento(elementoId));
  // Seleccionar
  canvasStore.seleccionarElemento(elementoId);
}

const getTipoNombre = (tipo) => {
  const tipoInfo = TIPOS_ENTIDAD.find((t) => t.id === tipo)
  return tipoInfo?.nombre || 'Desconocido'
}

const getIconComponent = (elemento) => {
  // Determinar el componente de icono basado en tipo y ubicación
  if (elemento.tipo === 'cuartos') {
    return RoomIcon
  } else if (elemento.ubicacion === 'pared') {
    return SpaceOnWallIcon
  } else {
    return SpaceIcon
  }
}

const elementosFiltrados = computed(() => {
  // --- CAMBIO CLAVE AQUÍ ---
  // Usamos la nueva computed property segura del store
  let elementos = [...canvasStore.elementosVisiblesParaCapas].sort(
    (a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0)
  )

  if (filtroNombre.value) {
    elementos = elementos.filter((elemento) => elemento.nombre.toLowerCase().includes(filtroNombre.value.toLowerCase()));
  }

  if (filtroCategoria.value) {
    elementos = elementos.filter((elemento) => elemento.categoria === filtroCategoria.value)
  }

  if (filtroUbicacion.value) {
    elementos = elementos.filter((elemento) => {
      // Asumimos que la propiedad 'ubicacion' está en la raíz del objeto limpio
      return elemento.ubicacion === filtroUbicacion.value
    })
  }

  if (canvasStore.etiquetasSeleccionadas.length > 0) {
    elementos = elementos.filter((elemento) => {
      if (!elemento.etiquetas || !Array.isArray(elemento.etiquetas)) {
        return false
      }
      return canvasStore.etiquetasSeleccionadas.every((tagId) =>
        elemento.etiquetas.includes(tagId)
      )
    })
  }

  return elementos
})

const hayFiltrosActivos = computed(() => {
  return !!(
    filtroCategoria.value ||
    filtroUbicacion.value ||
    filtroNombre.value ||
    canvasStore.etiquetasSeleccionadas.length > 0
  )
})

// Métodos
const toggleFiltros = () => {
  filtrosVisibles.value = !filtrosVisibles.value
}

const limpiarFiltros = () => {
  filtroCategoria.value = ''
  filtroUbicacion.value = ''
  filtroNombre.value = '';
  canvasStore.limpiarSeleccion()
}

const onDelete = async (id) => {
  if (!canMutateLayers.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    return
  }
  if (!id) return
  if (canvasStore.cambiosNoAplicados) {
    showToast('No se pueden eliminar elementos con cambios pendientes de guardar', 'warn')
    return
  }
  if (['elementos', 'cuartos'].includes(canvasStore.contextoNavegacion.tipo)) {
    showToast('No se pueden eliminar elementos en la vista actual', 'warn');
    return
  }
  const el = canvasStore.elementosVisibles.find((e) => e.id === id) || canvasStore.elementoPorId?.(id)
  if (el && (el.bloqueado === true || el.locked === true)) {
    showToast('Elemento bloqueado — desbloquéalo para eliminar', 'warning', { timeout: 5000 })
    return
  }
  // Si no está seleccionado, seleccionarlo primero
  if (canvasStore.elementoSeleccionado !== id) {
    canvasStore.seleccionarElemento(id)
  }
  await deleteElement.deleteSelected({ withConfirm: true })
}

const toggleVisibilidad = (id) => {
  if (!canMutateLayers.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    return
  }
  canvasStore.toggleElementoVisibilidad(id)
}

const abrirModalCrearEtiqueta = (texto) => {
  textoNuevaEtiqueta.value = texto
  modalVisible.value = true
}

const guardarNuevaEtiqueta = (nuevaEtiqueta) => {
  if (!canMutateLayers.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    return
  }
  canvasStore.agregarYSeleccionarEtiqueta(nuevaEtiqueta)
  modalVisible.value = false;
}

const handleClickOutside = (event) => {
  if (modalVisible.value) {
    return
  }

  if (
    filtrosVisibles.value &&
    filtrosBotonRef.value &&
    !filtrosBotonRef.value.contains(event.target) &&
    filtrosPanelRef.value &&
    !filtrosPanelRef.value.contains(event.target)
  ) {
    filtrosVisibles.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

watch(
  [elementosFiltrados, hayFiltrosActivos],
  ([filtrados, activos]) => {
    if (activos) {
      // Si hay filtros, pasamos la lista de IDs que los cumplen
      const ids = filtrados.map((el) => el.id)
      canvasStore.actualizarIdsFiltrados(ids)
    } else {
      // Si no hay filtros, pasamos null para desactivar el efecto de opacidad
      canvasStore.actualizarIdsFiltrados(null)
    }
  },
  { immediate: true }, // immediate para que se ejecute al cargar el componente
)

const esElementoSeleccionado = (elementoId) => {
  return canvasStore.elementoSeleccionado === elementoId
}

const seleccionarElemento = (elementoId) => {
  canvasStore.seleccionarElemento(elementoId)
}
</script>

<style scoped>
.unroll-enter-active,
.unroll-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 500px;
  opacity: 1;
  transform: translateY(0);
}
.unroll-enter-from,
.unroll-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
  overflow: hidden;
}
</style>
