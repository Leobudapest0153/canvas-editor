<template>
  <div id="app">
    <InventorySmart :configCanvas="initialConfig" @configUpdated="handleConfigUpdated" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import InventorySmart from '@/inventory-smart/InventorySmart.vue'

// Estado inicial de la configuración del canvas
const initialConfig = null

// Variable reactiva para mantener la configuración actualizada
const currentConfig = ref(null)

// Manejador para cuando se actualiza la configuración desde InventorySmart
const handleConfigUpdated = (nuevaConfig) => {
  try {
    // Actualizar la referencia local de la configuración
    currentConfig.value = nuevaConfig

    console.log('Nueva configuración recibida en HomePage:', nuevaConfig)

    // Al implementar aqui se enviaría a la API
  } catch (error) {
    console.error('Error al manejar la configuración actualizada:', error)
  }
}
</script>

<style scoped></style>
