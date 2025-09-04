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
      <div class="p-4 border-b">
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
      <div class="flex-1 overflow-y-auto p-4">
        <div
          v-if="filteredTemplates.length === 0"
          class="h-full flex items-center justify-center text-slate-500 text-sm"
        >
          No hay plantillas aún
        </div>
        <div v-else class="grid grid-cols-1 gap-3">
          <div
            v-for="tpl in filteredTemplates"
            :key="tpl.id"
            :draggable="true"
            @dragstart="onTemplateDragStart(tpl, $event)"
            @dragend="onTemplateDragEnd"
            @contextmenu.prevent="openTplContext(tpl, $event)"
            tabindex="0"
            class="group relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab mb-3 hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.02]"
            :style="{ borderLeftColor: '#3b82f6' }"
          >
            <div class="elemento-preview flex items-center justify-center mb-3">
              <div
                class="preview-shape rounded flex items-center justify-center relative shadow-sm border border-white/20 w-12 h-8"
                :style="{ backgroundColor: '#3b82f6' }"
              >
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16v16H4z" />
                </svg>
              </div>
            </div>
            <div class="elemento-info space-y-1">
              <h3 class="font-semibold text-sm text-gray-800 mb-1">{{ tpl.name }}</h3>
              <p class="text-xs text-gray-500 mb-2">
                {{ tpl.notes || `Plantilla guardada • ${formatDate(tpl.createdAt)}` }}
              </p>
              <div class="elemento-specs space-y-1">
                <div class="spec-item flex justify-between text-xs">
                  <span class="spec-label text-gray-500 font-medium">Dim:</span>
                  <span class="spec-value text-gray-700">
                    {{ formatDims(tpl.meta) }}
                  </span>
                </div>
                <div class="spec-item flex justify-between text-xs">
                  <span class="spec-label text-gray-500 font-medium">Peso:</span>
                  <span class="spec-value text-gray-700">{{ tpl.meta?.weight || '—' }}</span>
                </div>
                <div class="spec-item flex justify-between text-xs">
                  <span class="spec-label text-gray-500 font-medium">Ubic:</span>
                  <span class="spec-value text-gray-700">{{ tpl.meta?.location || '—' }}</span>
                </div>
              </div>
              <div class="mt-2 flex gap-1">
                <span class="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Plantillas</span>
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
      </div>
      <SpeedDialContext
        :visible="tplContext.visible"
        :x="tplContext.x"
        :y="tplContext.y"
        :isLocked="false"
        :showLock="false"
        :showSaveTemplate="false"
        @delete="onTemplateDelete"
        @close="tplContext.visible = false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'
import SpeedDialContext from '@/inventory-smart/components/SpeedDialContext.vue'

const catalogStore = useCatalogStore()
const { selectedCatalog, searchText, templates } = storeToRefs(catalogStore)

const focusedTab = ref(null)
const tabElementos = ref(null)
const tabPlantillas = ref(null)

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
})

watch(selectedCatalog, (val) => {
  localStorage.setItem('inventory.selectedCatalog', val)
})

const filteredTemplates = computed(() =>
  catalogStore.searchTemplates(searchText.value)
)

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

const tplContext = ref({ visible: false, x: 0, y: 0, tpl: null })

const openTplContext = (tpl, event) => {
  tplContext.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    tpl,
  }
}

const onTemplateDelete = () => {
  const tpl = tplContext.value.tpl
  if (tpl) catalogStore.removeTemplate(tpl.id)
  tplContext.value.visible = false
}

const formatDims = (meta) => {
  const w = meta?.width || 0
  const h = meta?.height || 0
  const d = meta?.depth || 0
  return `${w}x${h}${d ? `x${d}` : ''}`
}

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}
</script>

<style scoped>
</style>
