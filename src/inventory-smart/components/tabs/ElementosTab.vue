<!--
  ElementosTab.vue
  Tab que contiene el catálogo completo de elementos.
  Este componente encapsula todo el contenido del ElementosCatalogo original.
-->

<template>
  <div class="h-full flex flex-col">
    <div class="p-2">
      <!-- Conmutador Catálogo de Elementos | Catálogo de Plantillas -->
      <div
        class="catalog-switch"
        role="tablist"
        aria-label="Cambiar catálogo"
      >
        <button
          ref="tabElementos"
          class="catalog-tab"
          :class="{
            'is-active': selectedCatalog === 'elementos',
            'kb-focus': focusedTab === 'elementos',
          }"
          role="tab"
          :aria-selected="selectedCatalog === 'elementos'"
          :tabindex="selectedCatalog === 'elementos' ? 0 : -1"
          @click="selectCatalog('elementos')"
          @keydown="onTabKeydown($event, 'elementos')"
          @focus="focusedTab = 'elementos'"
          @blur="focusedTab = null"
        >
          📦 Catálogo de Elementos
        </button>
        <button
          ref="tabPlantillas"
          class="catalog-tab"
          :class="{
            'is-active': selectedCatalog === 'plantillas',
            'kb-focus': focusedTab === 'plantillas',
          }"
          role="tab"
          :aria-selected="selectedCatalog === 'plantillas'"
          :tabindex="selectedCatalog === 'plantillas' ? 0 : -1"
          @click="selectCatalog('plantillas')"
          @keydown="onTabKeydown($event, 'plantillas')"
          @focus="focusedTab = 'plantillas'"
          @blur="focusedTab = null"
        >
          📝 Catálogo de Plantillas
        </button>
      </div>

      <!-- Fallback móvil: dropdown -->
      <div class="catalog-switch catalog-switch--compact">
        <label for="catalogSelect" class="sr-only">Catálogo</label>
        <select
          id="catalogSelect"
          v-model="selectedCatalog"
          aria-label="Catálogo"
        >
          <option value="elementos">📦 Catálogo de Elementos</option>
          <option value="plantillas">📝 Catálogo de Plantillas</option>
        </select>
      </div>
    </div>

    <!-- Contenido dinámico según catálogo -->
    <div
      v-if="selectedCatalog === 'elementos'"
      class="flex-1 overflow-hidden"
    >
      <ElementosCatalogo />
    </div>
    <div
      v-else
      class="flex-1 overflow-hidden flex flex-col"
    >
      <div class="catalogo-header p-1 border-b border-gray-200">
        <div class="relative">
          <input
            v-model="searchText"
            type="text"
            placeholder="Buscar plantillas..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
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
      <div class="elementos-lista flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="tpl in filteredTemplates"
            :key="tpl.id"
            :draggable="true"
            @dragstart="onTemplateDragStart(tpl, $event)"
            @dragend="onTemplateDragEnd"
            @contextmenu.prevent="openTemplateContextMenu($event, tpl)"
            class="group relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab mb-3 hover:shadow-md border-l-4 hover:scale-[1.02] hover:bg-gray-50 transition duration-200"
            :style="{ borderLeftColor: getTemplateColor(tpl) }"
          >
            <!-- Botón de acciones (tres puntos) -->
            <button
              type="button"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
              <div
                :class="[
                  'preview-shape rounded-sm flex items-center justify-center relative shadow-sm border border-white/20',
                  'w-12 h-8',
                ]"
                :style="{ backgroundColor: getTemplateColor(tpl) }"
              >
                <component :is="getIconComponent('box')" class="w-4 h-4 text-white" />
              </div>
            </div>

            <div class="elemento-info space-y-1">
              <h3 class="font-semibold text-sm text-gray-800 mb-1">{{ tpl.name }}</h3>
              <p class="text-xs text-gray-500 mb-2">{{ templateDescription(tpl) }}</p>

              <div class="elemento-specs space-y-1">
                <div class="spec-item flex justify-between text-xs">
                  <span class="spec-label text-gray-500 font-medium">Dim:</span>
                  <span class="spec-value text-gray-700">
                    {{ getTemplateDims(tpl).ancho }}x{{ getTemplateDims(tpl).largo }}x{{ getTemplateDims(tpl).alto }}
                  </span>
                </div>
                <div class="spec-item flex justify-between text-xs">
                  <span class="spec-label text-gray-500 font-medium">Peso:</span>
                  <span class="spec-value text-gray-700">{{ formatTemplateWeight(tpl) }}</span>
                </div>
                <div class="spec-item flex justify-between text-xs">
                  <span class="spec-label text-gray-500 font-medium">Ubic:</span>
                  <span class="spec-value text-gray-700 capitalize">{{ formatTemplateLocation(tpl) }}</span>
                </div>
              </div>

              <div class="mt-2 flex gap-1">
                <span
                  class="inline-block px-2 py-1 text-xs rounded-full text-white"
                  :style="{ backgroundColor: getTemplateColor(tpl) }"
                >
                  Plantillas
                </span>
                <span
                  v-for="tag in tpl.tags"
                  :key="tag"
                  class="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredTemplates.length === 0" class="text-center py-12">
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
          <p class="text-gray-500 text-center">Aún no hay plantillas</p>
          <p class="text-gray-400 text-sm text-center mt-1">
            Crea una desde un elemento
          </p>
        </div>
      </div>

      <!-- Menú contextual para plantillas (clic derecho o kebab) -->
      <div
        v-if="ctxMenu.visible"
        class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1"
        :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
        role="menu"
        :id="`tpl-menu-${ctxMenu.template?.id || 'ctx'}`"
        @keydown.esc.stop.prevent="closeTemplateContextMenu"
      >
        <button
          class="block w-full text-left px-3 py-2 rounded text-red-600 hover:bg-red-50"
          role="menuitem"
          @click.stop="handleDeleteTemplate(ctxMenu.template)"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'
import { getColorCategoria } from '@/inventory-smart/utils/constants'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'
import { useToast } from '@/inventory-smart/composables/useToast'

const catalogStore = useCatalogStore()
const { selectedCatalog, searchText } = storeToRefs(catalogStore)

const { showSuccess, showInfo, showError } = useToast()
const confirmDialog = useConfirmDialog()

const focusedTab = ref(null)
const tabElementos = ref(null)
const tabPlantillas = ref(null)

// Estado de menú contextual de plantillas
const ctxMenu = ref({ visible: false, x: 0, y: 0, template: null })

const selectCatalog = (value) => {
  catalogStore.setSelectedCatalog(value)
}

const onTabKeydown = (e, current) => {
  const order = ['elementos', 'plantillas']
  const idx = order.indexOf(current)
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    const next = order[(idx + dir + order.length) % order.length]
    selectCatalog(next)
    const refMap = { elementos: tabElementos, plantillas: tabPlantillas }
    refMap[next].value?.focus()
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    selectCatalog(current)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('inventory.selectedCatalog')
  if (saved === 'plantillas' || saved === 'elementos') {
    catalogStore.setSelectedCatalog(saved)
  }
  localStorage.setItem('inventory.selectedCatalog', selectedCatalog.value)
  catalogStore.loadTemplatesFromLocalStorage()
  window.addEventListener('click', onGlobalClick, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onGlobalClick, { capture: true })
})

watch(selectedCatalog, (val) => {
  localStorage.setItem('inventory.selectedCatalog', val)
})

const filteredTemplates = computed(() =>
  catalogStore.searchTemplates(searchText.value)
)

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

const getIconComponent = () => 'svg'

const getTemplateRoot = (tpl) => {
  const elems = tpl.payload?.elements || []
  return elems.find((e) => e.id === tpl.payload?.rootId) || elems[0] || {}
}

const getTemplateColor = (tpl) => {
  const root = getTemplateRoot(tpl)
  return root.color || root.colorBase || getColorCategoria(root.categoria)
}

const getTemplateWeightVal = (tpl) => {
  if (tpl.meta?.weight != null) return tpl.meta.weight
  const root = getTemplateRoot(tpl)
  return root.pesoMaximo
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
const handleDeleteTemplate = async (tpl) => {
  if (!tpl) return closeTemplateContextMenu()

  // Si la plantilla ya no existe
  const exists = !!catalogStore.templates.find((t) => t.id === tpl.id)
  if (!exists) {
    showInfo('La plantilla ya no existe — refrescando lista')
    catalogStore.loadTemplatesFromLocalStorage()
    return closeTemplateContextMenu()
  }

  const ok = await confirmDialog.confirm({
    title: 'Eliminar plantilla',
    message: `Se eliminará la plantilla “${tpl.name}”. Esta acción no afectará los elementos ya colocados en el lienzo.`,
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
</style>
