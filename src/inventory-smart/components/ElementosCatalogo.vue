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
  <div class="elementos-catalogo relative h-full flex flex-col bg-white border-r border-gray-200">
    <!-- Header del catálogo -->
    <div class="catalogo-header p-1 border-gray-200">
  <div class="relative px-4 mb-1" v-if="hayElementosEnTab">
        <div class="flex items-center justify-between" ref="filtrosBotonRef">
          <UiTooltip position="top" label="Desplegar filtros" :delay="200" class="w-full">
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
                />
              </svg>
              <span>Filtros</span>
              <span v-if="hayFiltrosActivos" class="w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
          </UiTooltip>
        </div>
        <transition name="unroll">
          <div
            v-if="filtrosVisibles"
            class="absolute top-full left-0 w-full bg-gray-50 shadow-lg z-10"
            ref="filtrosPanelRef"
          >
            <div class="p-3 grid grid-cols-1 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Buscar por nombre</label>
                <input
                  v-model="filtroTexto"
                  @keyup.enter="() => (filtrosVisibles = false)"
                  placeholder="Buscar..."
                  class="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div class="pt-1">
                <button
                  v-if="hayFiltrosActivos"
                  @click="limpiarFiltros"
                  class="px-3 py-2 bg-gray-100 rounded-md text-xs"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Botón modal agregar espacio/cuarto -->
    <div class="pb-2 flex justify-center">
      <UiTooltip
        :label="
          'Crea y guarda un nuevo ' + (modo === 'cuarto' ? 'cuarto' : 'espacio') + ' en el catálogo'
        "
        position="bottom"
        :delay="500"
      >
        <button
          @click="openAddModal" :disabled="catalogReadOnly"
          class="flex justify-center items-center flex-row px-2 py-1 cursor-pointer bg-primary hover:bg-primary-600 text-white rounded-xl text-xs"
        >
          <!-- icono de + -->
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span class="ml-1 text-sm">
            Agregar {{ modo === 'cuarto' ? 'cuarto' : 'espacio' }}
          </span>
        </button></UiTooltip
      >
    </div>

    <!-- Lista de elementos -->
    <div class="elementos-lista flex-1 overflow-y-auto px-4 py-2">
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="elemento in elementosFiltrados"
          :key="elemento.id"
          :draggable="canEditCanvas"
          @dragstart="iniciarArrastre(elemento, $event)"
          @dragend="finalizarArrastre"
          :class="[
            'group relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab mb-3 hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.02]',
            catalogReadOnly ? 'catalog-item--disabled cursor-not-allowed hover:scale-100' : ''
          ]"
          :style="{
            borderLeftColor:
              elemento.color || elemento.colorBase,
          }"
        >
          <!-- Botón de acciones (tres puntos) -->
          <button
            type="button"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 p-1 rounded cursor-pointer"
            aria-haspopup="menu"
            :aria-expanded="kebabMenu.visible && kebabMenu.item?.id === elemento.id ? 'true' : 'false'"
            :aria-controls="`el-menu-${elemento.id}`"
            title="Acciones"
            v-if="!isKebabRestricted(elemento)"
            @click.stop="toggleKebab($event, elemento)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
            </svg>
          </button>
          <!-- Preview del elemento -->
          <div class="flex items-center justify-center mb-3">
            <component
              :is="getIconComponentForElement(elemento)"
              :backgroundColor="elemento.color || elemento.colorBase"
              class="w-12 h-8"
            />
          </div>

          <!-- Información del elemento -->
          <div class="elemento-info space-y-1">
            <h3 class="font-semibold text-sm text-gray-800 mb-1">{{ elemento.nombre }}</h3>
            <p class="text-xs text-gray-500 mb-2">{{ elemento.descripcion }}</p>

            <!-- Dimensiones -->
            <div class="elemento-specs space-y-1">
              <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Dimensiones:</span>
                <span class="spec-value text-gray-700">
                  {{ formatLengthsCm([
                    getCardDims(elemento).ancho,
                    getCardDims(elemento).largo,
                    getCardDims(elemento).alto
                  ]) }}
                </span>
              </div>
              <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Capacidad de carga:</span>
                <span class="spec-value text-gray-700">{{ elemento.capacidadCarga }}kg</span>
              </div>
              <!-- <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Ubicación:</span>
                <span class="spec-value text-gray-700 capitalize">{{ elemento.ubicacion }}</span>
              </div> -->
            </div>
          </div>
        </div>
      </div>

      <!-- Mensaje cuando no hay elementos -->
      <div v-if="elementosFiltrados.length === 0" class="text-center py-12">
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

    <!-- Menú contextual para elementos (kebab) -->
    <div
      v-if="kebabMenu.visible"
      class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1"
      :style="{ left: kebabMenu.x + 'px', top: kebabMenu.y + 'px' }"
      role="menu"
      :id="`el-menu-${kebabMenu.item?.id || 'ctx'}`"
      @keydown.esc.stop.prevent="closeKebab"
    >
      <button
        class="block cursor-pointer w-full text-left px-3 py-2 rounded hover:bg-gray-50"
        role="menuitem"
        @click.stop="startEdit(kebabMenu.item)"
      >
        Editar
      </button>
      <button
        class="block cursor-pointer w-full text-left px-3 py-2 rounded text-red-600 hover:bg-red-50"
        role="menuitem"
        @click.stop="handleDeleteItem(kebabMenu.item)"
      >
        Eliminar
      </button>
    </div>

    <AgregarCuartoModal
      :visible="mostrarModalAgregarEspacio"
      :modo="editingItem ? (editingForm?.modo || modo) : modo"
      :initialForm="editingItem ? editingForm : null"
      @close="cancelEdit"
      @save="onGuardarEspacio"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useEditorMode } from '@/inventory-smart/composables/useEditorMode'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'
import AgregarCuartoModal from './AgregarCuartoModal.vue'
import {
  buildStructureFromForm,
  toCatalogItemFromStructure,
  toFormFromCatalogItem,
  buildUpdatedCatalogItem,
  removeCatalogItem,
} from '@/inventory-smart/composables/useStructureManager'
import { formatLengthsCm } from '../utils/units'
import SpaceIcon from '@/inventory-smart/icons/SpaceIcon.vue'
import SpaceOnWallIcon from '@/inventory-smart/icons/SpaceOnWallIcon.vue'
import RoomIcon from '@/inventory-smart/icons/RoomIcon.vue'
import { useToast } from '@/inventory-smart/composables/useToast'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'

// Props
const props = defineProps({
  modo: {
    type: String,
    default: 'espacio',
    validator: (v) => ['espacio', 'cuarto'].includes(v),
  },
})
const modo = computed(() => props.modo)

// Stores
const canvasStore = useCanvasStore()
const { modoEdicion } = storeToRefs(canvasStore)
const { showToast } = useToast();
const { canEditCanvas, canMutateCatalog } = useEditorMode()
const catalogReadOnly = computed(() => !canMutateCatalog.value)
const VISUAL_MODE_MESSAGE = 'No disponible en modo visualización'
const catalogStore = useCatalogStore()
const { filteredCatalogItems, searchText, items } =
  storeToRefs(catalogStore)
const confirmDialog = useConfirmDialog()

// Estado local
const filtroTexto = searchText
// Filtros UI
const filtrosVisibles = ref(false)
const filtrosBotonRef = ref(null)
const filtrosPanelRef = ref(null)

const hayFiltrosActivos = computed(() => {
  return !!(filtroTexto.value)
})

const toggleFiltros = () => {
  filtrosVisibles.value = !filtrosVisibles.value
}

const limpiarFiltros = () => {
  filtroTexto.value = ''
}

const handleClickOutside = (event) => {
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
const mostrarModalAgregarEspacio = ref(false)
const openAddModal = () => {
  if (catalogReadOnly.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    return
  }
  mostrarModalAgregarEspacio.value = true
}
const editingItem = ref(null) // item que se edita
const editingForm = ref(null) // formulario derivado del item
const kebabMenu = ref({ visible: false, x: 0, y: 0, item: null })

// Base por modo (sin filtros de texto/categoría/ubicación) — sirve para decidir si mostrar Filtros
const elementosBasePorModo = computed(() => {
  const base = Array.isArray(filteredCatalogItems.value)
    ? filteredCatalogItems.value.slice()
    : Array.isArray(items.value)
      ? items.value.slice()
      : []
  return modo.value === 'cuarto'
    ? base.filter((el) => el.tipo === 'cuartos')
    : base.filter((el) => el.tipo !== 'cuartos')
})

const hayElementosEnTab = computed(() => (elementosBasePorModo.value.length > 0))

// Computed local para filtrar los elementos del catálogo (igual que en CapasTab.vue)
const elementosFiltrados = computed(() => {
  // Partimos del base por modo y aplicamos filtros UI
  let out = elementosBasePorModo.value.slice()

  // Filtro por texto (nombre, código o código ESL)
  if (filtroTexto && filtroTexto.value) {
    const q = String(filtroTexto.value).toLowerCase()
    out = out.filter((el) => {
      const nombre = String(el.nombre || '').toLowerCase()
      const codigo = String(el.codigo || '').toLowerCase()
      const codigoESL = String(el.codigoESL || '').toLowerCase()
      return nombre.includes(q) || codigo.includes(q) || codigoESL.includes(q)
    })
  }

  return out
})

// Cerrar panel de filtros si el tab queda sin elementos base
watch(hayElementosEnTab, (val) => {
  if (!val) filtrosVisibles.value = false
})

const onGuardarEspacio = (datosEspacio) => {
  try {
    if (editingItem.value) {
      // Editar existente
      const updated = buildUpdatedCatalogItem(editingItem.value, datosEspacio)
      const idx = items.value.findIndex((it) => it.id === editingItem.value.id)
      if (idx !== -1) items.value[idx] = updated
    } else {
      // Crear nuevo
      const structure = buildStructureFromForm(datosEspacio)
      const kind = datosEspacio.tipo === 'cuarto' ? 'room' : 'space'
      const item = toCatalogItemFromStructure({
        name: datosEspacio.datosGenerales?.nombre,
        description: datosEspacio.datosGenerales?.descripcion,
        structure,
        kind,
        color: datosEspacio.datosGenerales?.color,
      })
      items.value.push(item)
    }
    filtroTexto.value = ''
    mostrarModalAgregarEspacio.value = false
  } catch (e) {
    console.error('No se pudo procesar estructura desde formulario', e)
  } finally {
    editingItem.value = null
    editingForm.value = null
  }
}

const getIconComponentForElement = (elemento) => {
  // Determinar el componente de icono basado en tipo y ubicación
  if (elemento.tipo === 'cuartos') {
    return RoomIcon
  } else if (elemento.ubicacion === 'pared') {
    return SpaceOnWallIcon
  } else {
    return SpaceIcon
  }
}

// Tipos para los que se oculta el menú de acciones
const isKebabRestricted = (item) => {
  const t = item?.tipo
  return t === 'pasillos' || t === 'contenedores' || t === 'pisos'
}

// const isSystemDefaultItem = (item) =>
//   !!(item?.props?.system === true && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(item.id))

// const getCardDims = (item) => {
//   try {
//     if (!item?.dimensiones) return { ancho: 0, largo: 0, alto: 0 }
//     // Solo escalar para tipos explícitos (pasillo/cuarto/piso). Para elementos regulares
//     // como estantes o anaqueles, mostrar dimensiones base del catálogo.
//     if (!(isSystemDefaultItem(item) && SCALE_WITH_PARENT_KEYS.includes(item.id))) {
//       return item.dimensiones
//     }
//     const planta = canvasStore.plantaActivaData
//     const dimsPlanta = planta?.dimensiones
//     if (!dimsPlanta) return item.dimensiones
//     const parentDims = { w: dimsPlanta.ancho, h: dimsPlanta.largo, d: dimsPlanta.alto }
//     const dims = computeDimsByAxisScale(item.id, parentDims, { snap: true })
//     return dims || item.dimensiones
//   } catch {
//     return item?.dimensiones || { ancho: 0, largo: 0, alto: 0 }
//   }
// }

// Comportamiento actual: sin escalado, siempre dimensiones base del catálogo
const getCardDims = (item) => item?.dimensiones || { ancho: 0, largo: 0, alto: 0 }

// Drag and Drop
const iniciarArrastre = (elemento, event) => {
  if (catalogReadOnly.value || !canEditCanvas.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    event.preventDefault()
    return
  }
  if (canvasStore.cambiosNoAplicados) {
    showToast('No puedes agregar elementos mientras hay cambios no aplicados.', 'warn');
    event.preventDefault()
    return
  }

  if (['cuartos', 'elementos'].includes(canvasStore.contextoNavegacion.tipo)) {
    showToast('No puedes arrastrar elementos mientras estás editando un cuarto o elemento.', 'warn');
    event.preventDefault()
    return
  }
  // Si el item trae payload de estructura (plantilla/room/space), arrastrar como 'plantilla-catalogo'
  const isStructured = !!elemento?.payload?.rootId && Array.isArray(elemento?.payload?.elements)
  const datosArrastre = isStructured
    ? {
        tipo: 'plantilla-catalogo',
        payload: elemento.payload,
        offset: { x: event.offsetX || 0, y: event.offsetY || 0 },
      }
    : {
        tipo: 'elemento-catalogo',
        elemento: elemento,
        offset: { x: event.offsetX || 0, y: event.offsetY || 0 },
      }

  try {
    const dataString = JSON.stringify(datosArrastre)
    event.dataTransfer.setData('application/json', dataString)
    event.dataTransfer.effectAllowed = 'copy'
    // Efecto visual de arrastre con Tailwind (sin clases en <style>)
    const card = event.currentTarget
    if (card && card.classList) card.classList.add('opacity-50', 'scale-95')
  } catch (error) {
    console.error('Error en iniciarArrastre:', error)
  }
}

const finalizarArrastre = (event) => {
  const card = event.currentTarget
  if (card && card.classList) card.classList.remove('opacity-50', 'scale-95')
}

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

// Observar cambios en el contexto para verificar validez del filtro de categoría
watch(
  () => canvasStore.contextoActual,
  (ctx) => {
    if (ctx.tipo === 'plantas') {
      catalogStore.setCatalogContext({ mode: 'root' })
    } else if (ctx.tipo === 'cuartos') {
      catalogStore.setCatalogContext({
        mode: 'detail-room',
        currentId: ctx.id,
        currentType: 'room',
      })
    } else if (ctx.tipo === 'pisos') {
      catalogStore.setCatalogContext({
        mode: 'detail-floor',
        currentId: ctx.id,
        currentType: 'floor',
      })
    } else if (ctx.tipo === 'elementos') {
      catalogStore.setCatalogContext({
        mode: 'detail-element',
        currentId: ctx.id,
        currentType: 'element',
      })
    } else if (ctx.tipo === 'contenedores') {
      catalogStore.setCatalogContext({
        mode: 'detail-container',
        currentId: ctx.id,
        currentType: 'container',
      })
    } else if (ctx.tipo === 'pasillos') {
      catalogStore.setCatalogContext({
        mode: 'detail-aisle',
        currentId: ctx.id,
        currentType: 'aisle',
      })
    }
  },
  { immediate: true },
)

// --- Lógica del menú kebab y edición/eliminación ---
const toggleKebab = (evt, item) => {
  evt.preventDefault()
  if (catalogReadOnly.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    return
  }
  if (isKebabRestricted(item)) return
  const isSame = kebabMenu.value.visible && kebabMenu.value.item?.id === item.id
  kebabMenu.value = isSame
    ? { visible: false, x: 0, y: 0, item: null }
    : { visible: true, x: evt.clientX, y: evt.clientY, item }
}

const closeKebab = () => {
  kebabMenu.value = { visible: false, x: 0, y: 0, item: null }
}

const startEdit = (item) => {
  if (catalogReadOnly.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    return closeKebab()
  }
  if (!item) return closeKebab()
  const form = toFormFromCatalogItem(item)
  if (!form) return closeKebab()
  editingItem.value = item
  editingForm.value = form
  mostrarModalAgregarEspacio.value = true
  closeKebab()
}

const cancelEdit = () => {
  mostrarModalAgregarEspacio.value = false
  editingItem.value = null
  editingForm.value = null
}

const handleDeleteItem = async (item) => {
  if (catalogReadOnly.value) {
    showToast(VISUAL_MODE_MESSAGE, 'warning')
    return closeKebab()
  }
  if (!item) return closeKebab()
  const ok = await confirmDialog.confirm({
    title: 'Eliminar elemento',
    message: `Se eliminará “${item.nombre}” del catálogo. Esta acción no afectará elementos ya colocados.`,
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return closeKebab()
  removeCatalogItem(items.value, item.id)
  closeKebab()
}

watch(modoEdicion, (isEditing) => {
  if (isEditing) return
  filtrosVisibles.value = false
  limpiarFiltros()
  cancelEdit()
  closeKebab()
})

// Cerrar kebab al hacer click fuera
const onGlobalClickKebab = (e) => {
  if (!kebabMenu.value.visible) return
  const menuId = `el-menu-${kebabMenu.value.item?.id || 'ctx'}`
  const path = e.composedPath ? e.composedPath() : (e.path || [])
  const clickedInside = path.some((n) => n?.id === menuId)
  if (!clickedInside) closeKebab()
}

onMounted(() => {
  window.addEventListener('click', onGlobalClickKebab, { capture: true })
})
onUnmounted(() => {
  window.removeEventListener('click', onGlobalClickKebab, { capture: true })
})
</script>

<style scoped>
.catalog-item--disabled {
  opacity: 0.6;
}

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
