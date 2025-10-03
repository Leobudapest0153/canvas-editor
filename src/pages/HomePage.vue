<template>
  <div id="app">
    <InventorySmart
      :configCanvas="initialConfig"
      :predefinedElements="ELEMENTOS_PREDEFINIDOS"
      :supportedProductTypes="tiposProductoAdmitidos"
      :externalServices="externalServices"
      :author="{ name: 'David Deras', id: '123' }"
      :themePalette="themePalette"
      @configUpdated="handleConfigUpdated"
      @back="handleBack"
      @printIdentifiers="handlePrintIdentifiers"
      @printIdentifier="handlePrintIdentifier"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import InventorySmart from '@/inventory-smart/InventorySmart.vue'
import { SERIALIZE_CONFIG } from '../inventory-smart/utils/constants'
import { ELEMENTOS_PREDEFINIDOS } from '../inventory-smart/utils/constants'

// Catálogo de tipos de producto admitidos (datos de ejemplo)
const tiposProductoAdmitidos = ref([
  { id: 'secos', nombre: 'Productos secos' },
  { id: 'refrigerados', nombre: 'Refrigerados' },
  { id: 'congelados', nombre: 'Congelados' },
  { id: 'fragiles', nombre: 'Frágiles' },
  { id: 'peligrosos', nombre: 'Peligrosos' },
  { id: 'voluminosos', nombre: 'Voluminosos' },
])

const themePalette = ref({
  primary: '#1c1e4d',
  primaryGray: '#8b98a8',
  secondary: '#e5e7eb',
  success: '#4ba345',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#0ea5e9',
})

// Estado inicial de la configuración del canvas
const initialConfig = ref(null)

// Variable reactiva para mantener la configuración actualizada
const currentConfig = ref(null)

// Factory para generar datos de productos de niveles
const createContainerProductsService = () => {
  // Datos de ejemplo para diferentes niveles
  const mockData = [
    { codigo: 'PROD001', descripcion: 'Producto A - Medicamento', cantidad: 150, fechaVencimiento: '2024-01-15' },
    { codigo: 'PROD002', descripcion: 'Producto B - Suplemento vitamínico', cantidad: 75, fechaVencimiento: '2024-10-30' },
    { codigo: 'PROD003', descripcion: 'Producto C - Antibiótico', cantidad: 25, fechaVencimiento: '2023-12-10' },
    { codigo: 'PROD004', descripcion: 'Producto D - Analgésico', cantidad: 200, fechaVencimiento: '2024-06-20' },
    { codigo: 'PROD005', descripcion: 'Producto E - Jarabe para la tos', cantidad: 60, fechaVencimiento: '2024-03-15' },
    { codigo: 'TOOL001', descripcion: 'Destornillador Phillips #2', cantidad: 50, fechaVencimiento: null },
    { codigo: 'TOOL002', descripcion: 'Llave inglesa 12mm', cantidad: 30, fechaVencimiento: null },
    { codigo: 'TOOL003', descripcion: 'Martillo de goma', cantidad: 20, fechaVencimiento: null },
    { codigo: 'TOOL004', descripcion: 'Alicate universal', cantidad: 15, fechaVencimiento: null },
    { codigo: 'FOOD001', descripcion: 'Arroz integral 1kg', cantidad: 80, fechaVencimiento: '2024-08-15' },
    { codigo: 'FOOD002', descripcion: 'Frijoles negros 500g', cantidad: 45, fechaVencimiento: '2024-07-22' },
    { codigo: 'FOOD003', descripcion: 'Aceite de oliva 750ml', cantidad: 25, fechaVencimiento: '2024-12-01' },
    { codigo: 'FOOD004', descripcion: 'Pasta integral 500g', cantidad: 60, fechaVencimiento: '2024-05-10' },
    { codigo: 'FOOD005', descripcion: 'Quinoa orgánica 1kg', cantidad: 30, fechaVencimiento: '2024-09-30' },
    { codigo: 'FOOD006', descripcion: 'Lentejas rojas 500g', cantidad: 40, fechaVencimiento: '2024-06-15' }
  ]

  return {
    name: 'containerProducts',
    type: 'container_products',
    description: 'Servicio de prueba para productos de niveles',
    handler: async ({ containerId, filter = '', pagination = {} }) => {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 800))

      const { page = 1, pageSize = 10 } = pagination

      // Obtener N productos random del nivel
      let products = mockData.sort(() => 0.5 - Math.random()).slice(0, 5)

      // Aplicar filtro si existe
      if (filter.trim()) {
        const filterLower = filter.toLowerCase()
        products = products.filter(product =>
          product.codigo.toLowerCase().includes(filterLower) ||
          product.descripcion.toLowerCase().includes(filterLower)
        )
      }

      // Calcular paginación
      const totalCount = products.length
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedProducts = products.slice(startIndex, endIndex)
      return {
        products: paginatedProducts,
        totalCount,
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      }
    }
  }
}

// Servicios externos
const externalServices = ref([createContainerProductsService()])

// Manejador para cuando se actualiza la configuración desde InventorySmart
const handleConfigUpdated = (nuevaConfig) => {
  try {
    console.log('\n========== [HomePage] handleConfigUpdated ==========')    
    console.log('[HomePage] Received config length:', nuevaConfig?.length)
    
    // Parse para inspeccionar contenido
    try {
      const parsed = JSON.parse(nuevaConfig)
      console.log('[HomePage] Config contains:')
      console.log('  - plantas:', parsed.plantas?.length || 0)
      console.log('  - elementos:', parsed.elementos?.length || 0)
      console.log('  - plantillas:', parsed.plantillas?.length || 0)
      console.log('  - catalogItems:', parsed.catalogItems?.length || 0)
      console.log('  - changeHistory:', parsed.changeHistory ? 'YES' : 'NO')
      console.log('  - changeHistory entries:', parsed.changeHistory?.entries?.length || 0)
    } catch (e) {
      console.error('[HomePage] Could not parse config:', e)
    }
    
    // Actualizar la referencia local de la configuración
    currentConfig.value = nuevaConfig
    // DEV: Guardar en localStorage para simular persistencia
    localStorage.setItem(SERIALIZE_CONFIG.STORAGE_KEY, nuevaConfig)
    console.log('[HomePage] Saved to localStorage')
    initialConfig.value = nuevaConfig
    console.log('====================================================\n')

    // Al implementar aqui se enviaría a la API
  } catch (error) {
    console.error('Error al manejar la configuración actualizada:', error)
  }
}

const handleBack = () => {
  // Aquí se manejaría la navegación de regreso en la aplicación real
  console.log('Navegando de regreso')
}

const handlePrintIdentifiers = () => {
  // Aquí se manejaría la acción de imprimir identificadores en la aplicación real
  console.log('Imprimiendo identificadores')
}

const handlePrintIdentifier = (value) => {
  console.log('Imprimiendo identificador:', value)
}

onMounted(() => {
  // Intercept localStorage.setItem to trace all saves
  const originalSetItem = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function(key, value) {
    if (key === SERIALIZE_CONFIG.STORAGE_KEY) {
      const stack = new Error().stack
      console.log('\n\n========== [INTERCEPTOR] localStorage.setItem called ==========')  
      console.log('[INTERCEPTOR] Key:', key)
      console.log('[INTERCEPTOR] Value length:', value?.length)
      
      try {
        const parsed = JSON.parse(value)
        console.log('[INTERCEPTOR] Value contains:')
        console.log('  - plantas:', parsed.plantas?.length || 0)
        console.log('  - elementos:', parsed.elementos?.length || 0)
        console.log('  - plantillas:', parsed.plantillas?.length || 0)
        console.log('  - catalogItems:', parsed.catalogItems?.length || 0)
        console.log('  - changeHistory:', parsed.changeHistory ? 'YES' : 'NO')
        console.log('  - changeHistory entries:', parsed.changeHistory?.entries?.length || 0)
      } catch (e) {
        console.error('[INTERCEPTOR] Could not parse value')
      }
      
      console.log('[INTERCEPTOR] Call stack:')
      console.log(stack)
      console.log('================================================================\n\n')
    }
    return originalSetItem(key, value)
  }
  
  // DEV: Simular carga desde localStorage
  const savedConfig = localStorage.getItem(SERIALIZE_CONFIG.STORAGE_KEY)
  if (savedConfig) {
    try {
      console.log('\n[HomePage onMounted] Loading config from localStorage')
      try {
        const parsed = JSON.parse(savedConfig)
        console.log('[HomePage onMounted] Loaded config contains:')
        console.log('  - plantas:', parsed.plantas?.length || 0)
        console.log('  - elementos:', parsed.elementos?.length || 0)
        console.log('  - plantillas:', parsed.plantillas?.length || 0)
        console.log('  - catalogItems:', parsed.catalogItems?.length || 0)
        console.log('  - changeHistory:', parsed.changeHistory ? 'YES' : 'NO')
        console.log('  - changeHistory entries:', parsed.changeHistory?.entries?.length || 0)
      } catch (e) {
        console.error('[HomePage onMounted] Could not parse loaded config')
      }
      initialConfig.value = savedConfig
    } catch (error) {
      console.error('Error al parsear la configuración guardada:', error)
    }
  } else {
    console.log('[HomePage onMounted] No saved config found in localStorage')
  }
})
</script>

<style scoped></style>
