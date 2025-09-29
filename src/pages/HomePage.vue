<template>
  <div id="app">
    <nav class="three-entry">
      <RouterLink class="three-entry__link" to="/three-preview">Abrir visor 3D</RouterLink>
    </nav>
    <InventorySmart
      :configCanvas="initialConfig"
      :externalServices="externalServices"
      :author="{ name: 'David Deras', id: '123' }"
      @configUpdated="handleConfigUpdated"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import InventorySmart from '@/inventory-smart/InventorySmart.vue'
import { SERIALIZE_CONFIG } from '../inventory-smart/utils/constants'

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
    // Actualizar la referencia local de la configuración

    currentConfig.value = nuevaConfig
    // DEV: Guardar en localStorage para simular persistencia
    localStorage.setItem(SERIALIZE_CONFIG.STORAGE_KEY, nuevaConfig)
    initialConfig.value = nuevaConfig

    // Al implementar aqui se enviaría a la API
  } catch (error) {
    console.error('Error al manejar la configuración actualizada:', error)
  }
}

onMounted(() => {
  // DEV: Simular carga desde localStorage
  const savedConfig = localStorage.getItem(SERIALIZE_CONFIG.STORAGE_KEY)
  if (savedConfig) {
    try {
      initialConfig.value = savedConfig
    } catch (error) {
      console.error('Error al parsear la configuración guardada:', error)
    }
  }
})
</script>

<style scoped>
.three-entry {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.three-entry__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, #2563eb, #22d3ee);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.three-entry__link:hover {
  transform: translateY(-1px);
  box-shadow: 0 15px 40px rgba(45, 212, 191, 0.3);
}
</style>
