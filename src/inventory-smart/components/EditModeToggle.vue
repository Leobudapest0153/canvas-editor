
<template>
  <button
    type="button"
    :class="buttonClasses"
    @click="toggleMode"
    :aria-pressed="isEditing"
  >
    <span>{{ label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useToast } from '@/inventory-smart/composables/useToast'

const canvasStore = useCanvasStore()
const { modoEdicion } = storeToRefs(canvasStore)
const { showToast } = useToast()

const isEditing = computed(() => modoEdicion.value === true)

const label = computed(() => (isEditing.value ? 'Finalizar' : 'Editar configuración'))

const buttonClasses = computed(() => [
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer',
  isEditing.value
    ? 'bg-ice-blue text-gray-600 hover:bg-ice-blue-300 hover:text-gray-500'
    : 'bg-primary-gray text-gray-100 hover:text-white hover:bg-primary-gray',
])

const setMode = (nextValue) => {
  const shouldEnable = Boolean(nextValue)
  canvasStore.setModoEdicion(shouldEnable)
  showToast(
    shouldEnable ? 'Modo edición activado' : 'Modo visualización activado',
    shouldEnable ? 'success' : 'info',
  )
}

const toggleMode = () => {
  setMode(!isEditing.value)
}
</script>
