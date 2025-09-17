<template>
  <div id="app">
    <InventorySmart
      :configCanvas="initialConfig"
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

// Manejador para cuando se actualiza la configuración desde InventorySmart
const handleConfigUpdated = (nuevaConfig) => {
  try {
    // Actualizar la referencia local de la configuración

    currentConfig.value = nuevaConfig
    // DEV: Guardar en localStorage para simular persistencia
    localStorage.setItem(SERIALIZE_CONFIG.STORAGE_KEY, nuevaConfig)
    console.log('Configuración actualizada guardada en localStorage')
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
      console.log('Configuración inicial cargada desde localStorage')
    } catch (error) {
      console.error('Error al parsear la configuración guardada:', error)
    }
  }
})
</script>

<style scoped></style>
