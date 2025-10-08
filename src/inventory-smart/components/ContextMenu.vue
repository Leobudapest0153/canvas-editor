<template>
  <ContextMenu
    :visible="visible"
    :x="x"
    :y="y"
    aria-label="Menú de elemento del canvas"
    @close="emit('close')"
  >
    <MenuItem
      :icon="DeleteIcon"
      label="Eliminar"
      variant="danger"
      :disabled="locked"
      :aria-label="locked ? 'Elemento bloqueado — desbloquéalo para eliminar' : 'Eliminar (Supr)'"
      :title="locked ? 'Elemento bloqueado — desbloquéalo para eliminar' : 'Eliminar (Supr)'"
      @click="onDelete"
    />
  </ContextMenu>
</template>

<script setup>
import { computed } from 'vue'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import ContextMenu from '@/inventory-smart/components/ui/ContextMenu.vue'
import MenuItem from '@/inventory-smart/components/ui/MenuItem.vue'
import DeleteIcon from '@/inventory-smart/components/ui/icons/DeleteIcon.vue'

defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
})

const emit = defineEmits(['close'])
const { deleteSelected } = useDeleteElement()
const store = useCanvasStore()

const locked = computed(() => {
  const el = store.elementoSeleccionadoCompleto
  return !!(el && (el.bloqueado === true || el.locked === true))
})

const onDelete = () => {
  if (locked.value) return
  deleteSelected({ withConfirm: true })
  emit('close')
}
</script>
