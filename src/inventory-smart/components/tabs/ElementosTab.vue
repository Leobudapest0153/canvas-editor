<!--
  ElementosTab.vue
  Tab que contiene el catálogo completo de elementos.
  Este componente encapsula todo el contenido del ElementosCatalogo original.
-->

<template>
  <div class="h-full flex flex-col">
    <!-- Conmutador de catálogo -->
    <div
      class="catalog-switch"
      :class="{ 'catalog-switch--compact': isCompact }"
    >
      <!-- Tabs para pantallas ≥480px -->
      <div v-if="!isCompact" role="tablist" class="flex gap-2">
        <button
          id="catalog-tab-elementos"
          role="tab"
          :aria-selected="selectedCatalog === 'elementos'"
          :tabindex="selectedCatalog === 'elementos' ? 0 : -1"
          :class="['catalog-tab', { 'is-active': selectedCatalog === 'elementos' }]"
          @click="selectCatalog('elementos')"
          @keydown="onTabKeydown"
          @focus="onFocus"
          @blur="onBlur"
        >
          📦 Catálogo de Elementos
        </button>
        <button
          id="catalog-tab-plantillas"
          role="tab"
          :aria-selected="selectedCatalog === 'plantillas'"
          :tabindex="selectedCatalog === 'plantillas' ? 0 : -1"
          :class="['catalog-tab', { 'is-active': selectedCatalog === 'plantillas' }]"
          @click="selectCatalog('plantillas')"
          @keydown="onTabKeydown"
          @focus="onFocus"
          @blur="onBlur"
        >
          📝 Catálogo de Plantillas
        </button>
      </div>
      <!-- Dropdown para pantallas <480px -->
      <select
        v-else
        v-model="selectedCatalog"
        aria-label="Catálogo"
      >
        <option value="elementos">Catálogo de Elementos</option>
        <option value="plantillas">Catálogo de Plantillas</option>
      </select>
    </div>

    <!-- Contenido del catálogo -->
    <div class="flex-1 overflow-hidden">
      <ElementosCatalogo v-if="selectedCatalog === 'elementos'" />
      <div
        v-else
        class="h-full flex items-center justify-center text-sm text-gray-500"
      >
        No hay plantillas aún
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'

const route = useRoute()
const router = useRouter()

const selectedCatalog = ref('elementos')

// Inicializar desde query param
const initial = route.query.catalog
if (initial === 'plantillas' || initial === 'elementos') {
  selectedCatalog.value = initial
}

// Persistir en la URL
watch(
  selectedCatalog,
  (val) => {
    router.replace({ query: { ...route.query, catalog: val } })
  },
  { immediate: true }
)

const selectCatalog = (val) => {
  selectedCatalog.value = val
}

const tabs = ['elementos', 'plantillas']

const onTabKeydown = (e) => {
  const idx = tabs.indexOf(selectedCatalog.value)
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    const next = tabs[(idx + 1) % tabs.length]
    selectedCatalog.value = next
    focusTab(next)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length]
    selectedCatalog.value = prev
    focusTab(prev)
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    selectCatalog(selectedCatalog.value)
  }
}

const focusTab = (val) => {
  const el = document.getElementById(`catalog-tab-${val}`)
  el?.focus()
}

const onFocus = (e) => e.target.classList.add('kb-focus')
const onBlur = (e) => e.target.classList.remove('kb-focus')

// Responsive: detectar si pantalla es compacta
const isCompact = ref(false)
let mediaQuery

const updateCompact = (e) => {
  isCompact.value = e.matches
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 479px)')
  updateCompact(mediaQuery)
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', updateCompact)
  } else {
    mediaQuery.addListener(updateCompact)
  }
})

onUnmounted(() => {
  if (mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', updateCompact)
    } else {
      mediaQuery.removeListener(updateCompact)
    }
  }
})
</script>

<style scoped>
</style>
