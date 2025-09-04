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
      class="flex-1 overflow-hidden"
    >
      <div class="h-full flex items-center justify-center text-slate-500 text-sm">
        No hay plantillas aún
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'

const catalogStore = useCatalogStore()
const { selectedCatalog } = storeToRefs(catalogStore)

const route = useRoute()
const router = useRouter()

const focusedTab = ref(null)
const tabElementos = ref(null)
const tabPlantillas = ref(null)

const selectCatalog = (value) => {
  selectedCatalog.value = value
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
  const param = route.query.catalog
  if (param === 'plantillas') {
    selectedCatalog.value = 'plantillas'
  } else {
    selectedCatalog.value = 'elementos'
  }
  router.replace({ query: { ...route.query, catalog: selectedCatalog.value } })
})

watch(
  selectedCatalog,
  (val) => {
    router.replace({ query: { ...route.query, catalog: val } })
  }
)
</script>

<style scoped>
</style>
