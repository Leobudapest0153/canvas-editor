
<template>
  <button
    v-if="!isEditing"
    type="button"
    class="edit-mode-toggle"
    @click="setMode(true)"
    title="Activar edición"
  >
    <span class="label">Editar configuración</span>
  </button>
  <button
    v-else
    type="button"
    class="edit-mode-toggle is-active"
    @click="setMode(false)"
    title="Finalizar edición"
  >
    <span class="label">Finalizar</span>
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

const setMode = (nextValue) => {
  const shouldEnable = Boolean(nextValue)
  canvasStore.setModoEdicion(shouldEnable)
  showToast(
    shouldEnable ? 'Modo edición activado' : 'Modo visualización activado',
    shouldEnable ? 'success' : 'info',
  )
}
</script>

<style scoped>
.edit-mode-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  background: rgba(148, 163, 184, 0.15);
  color: #0f172a;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-mode-toggle:hover {
  background: rgba(59, 130, 246, 0.15);
}

.edit-mode-toggle.is-active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #1e3a8a;
}
</style>
