<template>
  <div class="space-y-3">
    <!-- Filtro de búsqueda -->
    <div class="flex gap-2">
      <input
        v-model="filterText"
        type="text"
        placeholder="Escriba código o descripción"
        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        @input="debouncedSearch"
      />
    </div>

    <!-- Lista de productos -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="flex items-center gap-2 text-gray-500">
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span class="text-sm">Cargando productos...</span>
      </div>
    </div>

    <div v-else-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button @click="loadProducts" class="mt-2 text-red-600 text-sm underline hover:no-underline">
        Reintentar
      </button>
    </div>

    <div v-else-if="products.length === 0" class="text-center py-8 text-gray-500">
      <svg
        class="w-12 h-12 mx-auto mb-3 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        ></path>
      </svg>
      <p class="text-sm">No hay productos en este nivel</p>
    </div>

    <div v-else class="space-y-3">
      <div class="elementos-lista flex-1 py-2">
        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="product in products"
            :key="product.codigo"
            class="group relative bg-white border border-gray-200 rounded-lg p-3 mb-3 hover:shadow-md border-l-8"
            :style="{
              borderLeftColor: '#1c1e4d',
            }"
          >
            <!-- Grid de 2x2 con Codigo, Descripcion, Cantidad almacenada, Fecha de vencimiento. Sin iconos ni indicadores, solo label + dato debajo -->
            <div class="grid grid-cols-2 gap-2">
              <div>
                <div class="flex items-center text-xs font-medium text-gray-700">
                  Código
                </div>
                <div class="text-xs text-gray-500">{{ product.codigo }}</div>
              </div>
              <div>
                <div class="flex items-center text-xs font-medium text-gray-700">
                  Descripción
                </div>
                <div class="text-xs text-gray-500">{{ product.descripcion }}</div>
              </div>
              <div>
                <div class="flex items-center text-xs font-medium text-gray-700">
                  Cantidad almacenada
                </div>
                <div class="text-xs text-gray-500">{{ product.cantidad }}</div>
              </div>
              <div>
                <div class="flex items-center text-xs font-medium text-gray-700">
                  Fecha de vencimiento
                </div>
                <div class="text-xs text-gray-500">{{ product.fechaVencimiento }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensaje cuando no hay elementos -->
        <div v-if="products.length === 0" class="text-center py-12">
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
          <p class="text-gray-500 text-center">No se encontraron productos</p>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div
      v-if="totalCount > 0"
      class="flex items-center justify-between pt-3 border-t border-gray-200"
    >
      <span class="text-xs text-gray-500">
        {{ products.length }} de {{ totalCount }} productos
      </span>
      <div class="flex gap-1">
        <button
          @click="previousPage"
          :disabled="currentPage <= 1 || isLoading"
          class="p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            ></path>
          </svg>
        </button>
        <span class="px-2 py-1 text-xs text-gray-600">{{ currentPage }}</span>
        <button
          @click="nextPage"
          :disabled="!hasMorePages || isLoading"
          class="p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useExternalServices } from '../composables/useExternalServices.js'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'

const props = defineProps({
  containerId: {
    type: String,
    required: true,
  },
})

const { getContainerProducts, isLoading: serviceIsLoading, getError } = useExternalServices()

// Estado local
const products = ref([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterText = ref('')
const error = ref(null)
const isLoading = ref(false)

// Computed
const hasMorePages = computed(() => {
  return currentPage.value * pageSize.value < totalCount.value
})

// Debounce para búsqueda
let searchTimeout = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadProducts()
  }, 300)
}

// Cargar productos
const loadProducts = async () => {
  if (!props.containerId) return

  try {
    isLoading.value = true
    error.value = null

    const params = {
      containerId: props.containerId,
      filter: filterText.value,
      pagination: {
        page: currentPage.value,
        pageSize: pageSize.value,
      },
    }

    const response = await getContainerProducts(
      params.containerId,
      params.filter,
      params.pagination,
    )

    products.value = response.products || []
    totalCount.value = response.totalCount || 0
  } catch (err) {
    error.value = err.message || 'Error al cargar productos'
    products.value = []
    totalCount.value = 0
  } finally {
    isLoading.value = false
  }
}

// Paginación
const nextPage = () => {
  if (hasMorePages.value) {
    currentPage.value++
    loadProducts()
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    loadProducts()
  }
}

// Formatear fecha
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

// Obtener clase CSS según fecha de vencimiento
const getExpirationClass = (dateString) => {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'text-red-600' // Vencido
    if (diffDays <= 7) return 'text-orange-600' // Por vencer (7 días)
    if (diffDays <= 30) return 'text-yellow-600' // Próximo a vencer (30 días)
    return 'text-green-600' // Normal
  } catch {
    return 'text-gray-600'
  }
}

// Watchers
watch(
  () => props.containerId,
  () => {
    currentPage.value = 1
    filterText.value = ''
    loadProducts()
  },
)

// Inicializar
onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
/* Ocultar scrollbar pero mantener funcionalidad de scroll */
.scrollbar-hide {
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  scrollbar-width: none;  /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Safari y Chrome */
}
</style>
