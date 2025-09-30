<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    @click="toggle"
  >
    <span v-if="editingCapabilities.isEditing">Finalizar</span>
    <span v-else>Editar configuración</span>
  </button>
</template>

<script setup>
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useEditingCapabilities } from '@/inventory-smart/composables/useEditingCapabilities'

const canvasStore = useCanvasStore()
const { editingCapabilities } = useEditingCapabilities()

const toggle = () => {
  canvasStore.setModoEdicion(!editingCapabilities.value.isEditing)
}
</script>
