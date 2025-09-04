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
    <div v-else class="flex-1 overflow-hidden flex flex-col">
      <div class="p-2 border-b">
        <input
          v-model="searchText"
          type="text"
          placeholder="Buscar plantillas..."
          class="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
      <div class="flex-1 overflow-auto p-2">
        <div
          v-if="filteredTemplates.length === 0"
          class="h-full flex items-center justify-center text-slate-500 text-sm"
        >
          No hay plantillas aún
        </div>
        <ul v-else class="grid grid-cols-1 gap-2">
          <li
            v-for="tpl in filteredTemplates"
            :key="tpl.id"
            class="p-2 border border-gray-200 rounded bg-white"
          >
            {{ tpl.name }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'

const catalogStore = useCatalogStore()
const { selectedCatalog, searchText, filteredTemplates } = storeToRefs(catalogStore)

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
})

watch(selectedCatalog, (val) => {
  localStorage.setItem('inventory.selectedCatalog', val)
})
</script>

<style scoped>
</style>
