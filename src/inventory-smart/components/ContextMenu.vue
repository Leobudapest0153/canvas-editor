<template>
  <div class="context-menu" v-if="visible" :style="{ left: x + 'px', top: y + 'px' }">
    <button
      class="ctx-item text-red-600 hover:bg-red-50"
      @click="onDelete"
      :disabled="locked || viewOnly"
      :aria-label="ariaLabel"
      :title="tooltip"
    >
      Eliminar
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useEditingCapabilities } from '@/inventory-smart/composables/useEditingCapabilities'

defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
})

const emit = defineEmits(['close'])
const { deleteSelected } = useDeleteElement()
const store = useCanvasStore()
const { editingCapabilities, viewOnlyTooltip } = useEditingCapabilities()

const locked = computed(() => {
  const el = store.elementoSeleccionadoCompleto
  return !!(el && (el.bloqueado === true || el.locked === true))
})

const viewOnly = computed(() => editingCapabilities.value.isViewOnly)

const ariaLabel = computed(() => {
  if (locked.value) return 'Elemento bloqueado — desbloquéalo para eliminar'
  if (viewOnly.value) return viewOnlyTooltip.value
  return 'Eliminar (Supr)'
})

const tooltip = ariaLabel

const onDelete = () => {
  if (locked.value || viewOnly.value) return
  deleteSelected({ withConfirm: true })
  emit('close')
}
</script>

<style scoped>
.context-menu {
  position: absolute;
  z-index: 50;
  min-width: 160px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  padding: 4px;
}
.ctx-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border-radius: 6px;
}
</style>
