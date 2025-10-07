<template>
  <div v-if="isContextoInvalido" class="h-full flex flex-col items-center justify-center p-6 text-center bg-gray-50">
    <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
    <h3 class="text-lg font-semibold text-gray-800 mb-2">
      Acción no disponible
    </h3>
    <p class="text-sm text-gray-600 max-w-xs">
      No es posible añadir elementos dentro de un cuarto o de otro elemento directamente desde este catálogo.
    </p>
  </div>

  <div v-else class="h-full flex flex-col">
    <div class="p-2 flex items-center justify-center">
      <div class="catalog-switch !mb-0">
        <div role="tablist" aria-label="Cambiar catálogo" class="flex gap-1">
          <button
            ref="tabElementos"
            class="catalog-tab flex items-center gap-1 px-2 py-0.5 rounded-md text-gray-600 hover:bg-gray-100 text-xs"
            :class="{
              'is-active': selectedCatalog === 'elementos' && currentModo === 'espacio',
            }"
            role="tab"
            :aria-selected="selectedCatalog === 'elementos' && currentModo === 'espacio'"
            :tabindex="selectedCatalog === 'elementos' ? 0 : -1"
            @click="selectEspacios()"
            @keydown="onTabKeydown($event, 'espacios')"
            @focus="focusedTab = 'elementos'"
            @blur="focusedTab = null"
            aria-label="Catálogo de elementos"
          >
            <span class="ml-1">Espacios</span>
          </button>

          <button
            ref="tabCuartos"
            class="catalog-tab flex items-center gap-1 px-2 py-0.5 rounded-md text-gray-600 hover:bg-gray-100 text-xs"
            :class="{
              'is-active': selectedCatalog === 'elementos' && currentModo === 'cuarto',
            }"
            role="tab"
            :aria-selected="selectedCatalog === 'elementos' && currentModo === 'cuarto'"
            :tabindex="selectedCatalog === 'elementos' ? 0 : -1"
            v-if="isPlantaContext"
            @click="selectCuartos()"
            @keydown="onTabKeydown($event, 'cuartos')"
            @focus="focusedTab = 'cuartos'"
            @blur="focusedTab = null"
            aria-label="Catálogo de cuartos"
          >
            <span class="ml-1">Cuartos</span>
          </button>

          <button
            ref="tabPlantillas"
            class="catalog-tab flex items-center gap-1 px-2 py-0.5 rounded-md text-gray-600 hover:bg-gray-100 text-xs"
            :class="{
              'is-active': selectedCatalog === 'plantillas'
            }"
            role="tab"
            :aria-selected="selectedCatalog === 'plantillas'"
            :tabindex="selectedCatalog === 'plantillas' ? 0 : -1"
            @click="selectCatalog('plantillas')"
            @keydown="onTabKeydown($event, 'plantillas')"
            @focus="focusedTab = 'plantillas'"
            @blur="focusedTab = null"
            aria-label="Catálogo de plantillas"
          >
            <span class="ml-1">Plantillas</span>
          </button>
        </div>
      </div>

      <div class="catalog-switch catalog-switch--compact">
        <label for="catalogSelect" class="sr-only">Catálogo</label>
        <select
          id="catalogSelect"
          v-model="selectedCatalog"
          aria-label="Catálogo"
        >
          <option value="elementos">Catálogo de elementos</option>
          <option value="plantillas">Catálogo de plantillas</option>
        </select>
      </div>
    </div>

    <div
      v-if="selectedCatalog === 'elementos'"
      class="flex-1 overflow-hidden"
    >
      <ElementosCatalogo :modo="currentModo" />
    </div>
    <div
      v-else
      class="flex-1 overflow-hidden flex flex-col"
    >
      <div class="catalogo-header border-b border-gray-200" v-if="templates && templates.length > 0">
        <div class="relative">
          <div class="px-4 mb-1 bg-white" ref="filtrosBotonRef">
            <UiTooltip label="Desplegar filtros" position="bottom" :delay="200" class="w-full">
              <button
                @click="toggleFiltros"
                class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16a1 1 0 01-.293.707l-2 2A1 1 0 0112 18v-1.586l-3.707-3.707A1 1 0 018 12V6.414L3.293 4.707A1 1 0 013 4z" />
                </svg>
                <span>Filtros</span>
                <span v-if="hayFiltrosActivos" class="w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
            </UiTooltip>
          </div>

          <transition name="unroll">
            <div v-if="filtrosVisibles" class="absolute top-full left-0 w-full bg-gray-50 shadow-lg z-10" ref="filtrosPanelRef">
              <div class="p-3 grid grid-cols-1 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Buscar por nombre</label>
                  <input
                    v-model="filtroNombre"
                    @keyup.enter="() => (filtrosVisibles = false)"
                    placeholder="Buscar..."
                    class="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div class="pt-1">
                  <button v-if="hayFiltrosActivos" @click="limpiarFiltros" class="px-3 py-2 bg-gray-100 rounded-md text-xs">Limpiar filtros</button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <div class="elementos-lista flex-1 overflow-y-auto p-4">
        <div v-if="!templates || !Array.isArray(templates) || templates.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center">
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

        <div v-else>
          <div class="grid grid-cols-1 gap-3">
            <div
              v-for="tpl in plantillasFiltradas"
              :key="tpl.id"
              :draggable="true"
              @dragstart="onTemplateDragStart(tpl, $event)"
              @dragend="onTemplateDragEnd"
              @contextmenu.prevent="openTemplateContextMenu($event, tpl)"
              class="catalog-card group relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab mb-3 hover:shadow-md border-l-4 hover:scale-[1.02] hover:bg-gray-50 transition duration-200"
              :style="{ borderLeftColor: getTemplateColor(tpl) }"
            >
              <button
                type="button"
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 p-1 rounded cursor-pointer"
                aria-haspopup="menu"
                :aria-expanded="ctxMenu.visible && ctxMenu.template?.id === tpl.id ? 'true' : 'false'"
                :aria-controls="`tpl-menu-${tpl.id}`"
                title="Acciones"
                @click.stop="toggleTemplateKebab($event, tpl)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                  <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                </svg>
              </button>

              <div class="elemento-preview flex items-center justify-center mb-3">
                <component
                  :is="getIconComponentForTemplate(tpl)"
                  :backgroundColor="getTemplateColor(tpl)"
                  class="w-12 h-8"
                />
              </div>

              <div class="elemento-info space-y-1">
                <h3 class="font-semibold text-sm text-gray-800 mb-1">{{ tpl.name }}</h3>
                <p class="text-xs text-gray-500 mb-2">{{ templateDescription(tpl) }}</p>

                <div class="elemento-specs space-y-1">
                  <div class="spec-item flex justify-between text-xs">
                    <span class="spec-label text-gray-500 font-medium">Dimensiones:</span>
                    <span class="spec-value text-gray-700">
                      {{ getTemplateDims(tpl).ancho }}x{{ getTemplateDims(tpl).largo }}x{{ getTemplateDims(tpl).alto }}
                    </span>
                  </div>
                  <div class="spec-item flex justify-between text-xs">
                    <span class="spec-label text-gray-500 font-medium">Capacidad de carga:</span>
                    <span class="spec-value text-gray-700">{{ formatTemplateWeight(tpl) }}</span>
                  </div>
                  </div>
              </div>
            </div>
          </div>

          <div v-if="plantillasFiltradas.length === 0" class="text-center py-12">
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
            <p class="text-gray-500 text-center">No hay resultados con los filtros aplicados</p>
            <p class="text-gray-400 text-sm text-center mt-1">
              Ajusta o limpia los filtros para ver resultados
            </p>
          </div>
        </div>
      </div>

      <ContextMenu
        :visible="ctxMenu.visible"
        :x="ctxMenu.x"
        :y="ctxMenu.y"
        aria-label="Opciones de plantilla"
        @close="closeTemplateContextMenu"
      >
        <MenuItem
          :icon="DeleteIcon"
          label="Eliminar"
          variant="danger"
          @click="handleDeleteTemplateWrapper"
        />
      </ContextMenu>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'
import ContextMenu from '@/inventory-smart/components/ui/ContextMenu.vue'
import MenuItem from '@/inventory-smart/components/ui/MenuItem.vue'
import DeleteIcon from '@/inventory-smart/components/ui/icons/DeleteIcon.vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'
import { useToast } from '@/inventory-smart/composables/useToast'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'
import SpaceIcon from '@/inventory-smart/icons/SpaceIcon.vue'
import SpaceOnWallIcon from '@/inventory-smart/icons/SpaceOnWallIcon.vue'
import RoomIcon from '@/inventory-smart/icons/RoomIcon.vue'

const catalogStore = useCatalogStore()
const { selectedCatalog, searchText, templates } = storeToRefs(catalogStore)

const { showSuccess, showInfo, showError } = useToast()
const confirmDialog = useConfirmDialog()

const focusedTab = ref(null)
const tabElementos = ref(null)
const tabCuartos = ref(null)
const tabPlantillas = ref(null)

// Modo actual del catálogo de elementos: 'espacio' | 'cuarto'
const currentModo = ref('espacio')

// Estado de menú contextual de plantillas
const ctxMenu = ref({ visible: false, x: 0, y: 0, template: null })

// --- Filtros (patrón tomado de CapasTab.vue)
const filtrosVisibles = ref(false)
const filtrosBotonRef = ref(null)
const filtrosPanelRef = ref(null)
// Reutilizamos searchText del store para el filtro por nombre
const filtroNombre = searchText

const hayFiltrosActivos = computed(() => {
  return !!((filtroNombre && filtroNombre.value))
})

const toggleFiltros = () => {
  filtrosVisibles.value = !filtrosVisibles.value
}

const limpiarFiltros = () => {
  if (filtroNombre) filtroNombre.value = ''
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

const selectCatalog = (value) => {
  catalogStore.setSelectedCatalog(value)
}

const onTabKeydown = (e, current) => {
  // current puede ser 'espacios' | 'cuartos' | 'plantillas'
  const order = tabsOrder.value
  const idx = order.indexOf(current)
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    const next = order[(idx + dir + order.length) % order.length]
    if (next === 'plantillas') {
      selectCatalog('plantillas')
    } else {
      selectCatalog('elementos')
      currentModo.value = next === 'espacios' ? 'espacio' : 'cuarto'
    }
    const refMap = { espacios: tabElementos, cuartos: tabCuartos, plantillas: tabPlantillas }
    refMap[next].value?.focus()
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (current === 'plantillas') {
      selectCatalog('plantillas')
    } else if (current === 'espacios') {
      selectCatalog('elementos')
      currentModo.value = 'espacio'
    } else if (current === 'cuartos') {
      selectCatalog('elementos')
      currentModo.value = 'cuarto'
    }
  }
}

const selectEspacios = () => {
  currentModo.value = 'espacio'
  if (selectedCatalog.value !== 'elementos') selectCatalog('elementos')
}

const selectCuartos = () => {
  currentModo.value = 'cuarto'
  if (selectedCatalog.value !== 'elementos') selectCatalog('elementos')
}

const canvasStore = useCanvasStore()

// Determinar si el contexto actual deshabilita el tab.
const isContextoInvalido = computed(() => {
  const tipoContexto = canvasStore.contextoActual?.tipo
  return tipoContexto === 'cuartos' || tipoContexto === 'elementos'
})

const isPlantaContext = computed(() => canvasStore.contextoActual?.tipo === 'plantas')
const tabsOrder = computed(() => ['espacios', ...(isPlantaContext.value ? ['cuartos'] : []), 'plantillas'])

onMounted(() => {
  const saved = localStorage.getItem('canvas_selected_catalog')
  if (saved === 'plantillas' || saved === 'elementos') {
    catalogStore.setSelectedCatalog(saved)
  }
  localStorage.setItem('canvas_selected_catalog', selectedCatalog.value)
  catalogStore.loadTemplatesFromLocalStorage()
  window.addEventListener('click', onGlobalClick, { capture: true })
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onGlobalClick, { capture: true })
  document.removeEventListener('mousedown', handleClickOutside)
})

watch(selectedCatalog, (val) => {
  localStorage.setItem('canvas_selected_catalog', val)
})

// Si salimos del contexto de planta, forzar modo 'espacio' (ocultamos Cuartos)
watch(isPlantaContext, (enPlanta) => {
  if (!enPlanta && currentModo.value === 'cuarto') {
    selectEspacios()
  }
})

// Resultado de búsqueda global (texto) sobre plantillas
const filteredTemplates = computed(() => catalogStore.searchTemplates(searchText.value))

// Computed local para filtrar plantillas por nombre/código/ESL (patrón CapasTab)
const plantillasFiltradas = computed(() => {
  // Lista visible = búsqueda global (si hay) + filtros locales (nombre/código/ESL)
  const base = Array.isArray(filteredTemplates.value) ? filteredTemplates.value.slice() : []
  let out = base

  // Filtro por texto (nombre, código o código ESL)
  if (filtroNombre && filtroNombre.value) {
    const q = String(filtroNombre.value).toLowerCase()
    out = out.filter((tpl) => {
      const nombre = String(tpl.name || '').toLowerCase()
      // Intentamos derivar código y codigoESL de la raíz de la plantilla
      const root = (tpl.payload?.elements || []).find((e) => e.id === tpl.payload?.rootId) || (tpl.payload?.elements || [])[0] || {}
      const codigo = String(root.codigo || '').toLowerCase()
      const codigoESL = String(root.codigoESL || '').toLowerCase()
      return nombre.includes(q) || codigo.includes(q) || codigoESL.includes(q)
    })
  }

  return out
})

// Cerrar filtros si ya no hay plantillas base
watch(templates, (arr) => {
  if (!arr || arr.length === 0) filtrosVisibles.value = false
})

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}

const templateDescription = (tpl) =>
  tpl.notes || `Plantilla guardada • ${formatDate(tpl.updatedAt)}`

const getTemplateDims = (tpl) => ({
  ancho: tpl.meta?.width || 0,
  largo: tpl.meta?.depth || 0,
  alto: tpl.meta?.height || 0,
})

const getIconComponentForTemplate = (tpl) => {
  // Determinar el componente de icono basado en el elemento raíz de la plantilla
  const root = getTemplateRoot(tpl)
  if (root.tipo === 'cuartos') {
    return RoomIcon
  } else if (root.ubicacion === 'pared') {
    return SpaceOnWallIcon
  } else {
    return SpaceIcon
  }
}

const getTemplateRoot = (tpl) => {
  const elems = tpl.payload?.elements || []
  return elems.find((e) => e.id === tpl.payload?.rootId) || elems[0] || {}
}

const getTemplateColor = (tpl) => {
  const root = getTemplateRoot(tpl)
  return root.color || root.colorBase
}

const getTemplateWeightVal = (tpl) => {
  if (tpl.meta?.weight != null) return tpl.meta.weight
  const root = getTemplateRoot(tpl)
  return root.capacidadCarga
}

const getTemplateLocationVal = (tpl) => {
  if (tpl.meta?.location) return tpl.meta.location
  const root = getTemplateRoot(tpl)
  return root.ubicacion
}

const formatTemplateWeight = (tpl) => {
  const w = getTemplateWeightVal(tpl)
  return w != null ? `${w}kg` : '—'
}

const formatTemplateLocation = (tpl) => {
  const loc = getTemplateLocationVal(tpl)
  return loc || '—'
}

const onTemplateDragStart = (tpl, event) => {
  const dragData = {
    tipo: 'plantilla-catalogo',
    plantillaId: tpl.id,
    payload: tpl.payload,
  }
  event.dataTransfer.setData('application/json', JSON.stringify(dragData))
  event.dataTransfer.effectAllowed = 'copy'
  const card = event.currentTarget
  if (card && card.classList) card.classList.add('opacity-50', 'scale-95')
}

const onTemplateDragEnd = (event) => {
  const card = event.currentTarget
  if (card && card.classList) card.classList.remove('opacity-50', 'scale-95')
}

// Abrir menú contextual (clic derecho)
const openTemplateContextMenu = (evt, tpl) => {
  ctxMenu.value = {
    visible: true,
    x: evt.clientX,
    y: evt.clientY,
    template: tpl,
  }
}

// Abrir/cerrar menú desde botón de acciones (kebab)
const toggleTemplateKebab = (evt, tpl) => {
  evt.preventDefault()
  const isSame = ctxMenu.value.visible && ctxMenu.value.template?.id === tpl.id
  ctxMenu.value = isSame
    ? { visible: false, x: 0, y: 0, template: null }
    : { visible: true, x: evt.clientX, y: evt.clientY, template: tpl }
}

const closeTemplateContextMenu = () => {
  ctxMenu.value = { visible: false, x: 0, y: 0, template: null }
}

const onGlobalClick = (e) => {
  if (!ctxMenu.value.visible) return
  // Si el click no proviene del propio menú, cerramos
  const menuId = `tpl-menu-${ctxMenu.value.template?.id || 'ctx'}`
  const path = e.composedPath ? e.composedPath() : (e.path || [])
  const clickedInside = path.some((n) => n?.id === menuId)
  if (!clickedInside) closeTemplateContextMenu()
}

// Eliminar plantilla con confirmación reutilizando ConfirmModal
const handleDeleteTemplateWrapper = () => {
  handleDeleteTemplate(ctxMenu.value.template)
}

const handleDeleteTemplate = async (tpl) => {
  if (!tpl) return closeTemplateContextMenu()

  // Si la plantilla ya no existe
  const exists = !!templates.value.find((t) => t.id === tpl.id)
  if (!exists) {
    showInfo('La plantilla ya no existe — refrescando lista')
    catalogStore.loadTemplatesFromLocalStorage()
    return closeTemplateContextMenu()
  }

  const ok = await confirmDialog.confirm({
    title: 'Eliminar plantilla',
    message: `Se eliminará la plantilla “${tpl.name}”. Esta acción no afectará los elementos ya colocados en el lienzo`,
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    // Usamos los mismos estilos de botón peligro que el flujo de eliminar elemento (valores por defecto ya son rojo)
  })
  if (!ok) return closeTemplateContextMenu()

  try {
    catalogStore.removeTemplate(tpl.id)
    showSuccess('Plantilla eliminada')
  } catch (e) {
    showError('No se pudo eliminar la plantilla')
  } finally {
    closeTemplateContextMenu()
  }
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

.catalog-card,
.catalog-card * {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
</style>
