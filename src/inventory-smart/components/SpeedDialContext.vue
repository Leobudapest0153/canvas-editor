<!-- filepath: src/components/SpeedDialContext.vue -->
<template>
  <ContextMenu
    v-show="visible"
    :visible="visible"
    :x="pos.left"
    :y="pos.top"
    aria-label="Menú contextual"
    :close-on-click-outside="true"
    @close="emit('close')"
    @keydown.stop.prevent="onKeydown"
    @contextmenu.prevent
  >
    <MenuItem
      ref="itemRefs[0]"
      :icon="() => h(LockIcon, { locked: isLocked })"
      :label="isLocked ? 'Desbloquear' : 'Bloquear'"
      :aria-label="isLocked ? 'Desbloquear' : 'Bloquear'"
      @click="emitLock"
    />
    <MenuItem
      ref="itemRefs[1]"
      :icon="SaveTemplateIcon"
      label="Guardar como plantilla"
      aria-label="Guardar como plantilla"
      @click="emitSaveTemplate"
    />
    <MenuItem
      ref="itemRefs[2]"
      :icon="DeleteIcon"
      label="Eliminar"
      variant="danger"
      aria-label="Eliminar"
      @click="emitDelete"
    />
  </ContextMenu>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, h } from 'vue'
import ContextMenu from '@/inventory-smart/components/ui/ContextMenu.vue'
import MenuItem from '@/inventory-smart/components/ui/MenuItem.vue'
import LockIcon from '@/inventory-smart/components/ui/icons/LockIcon.vue'
import SaveTemplateIcon from '@/inventory-smart/components/ui/icons/SaveTemplateIcon.vue'
import DeleteIcon from '@/inventory-smart/components/ui/icons/DeleteIcon.vue'

defineOptions({ name: 'SpeedDialContext' })

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
})
const emit = defineEmits(['lockToggle', 'delete', 'saveTemplate', 'close'])

const itemRefs = [ref(null), ref(null), ref(null)]
const focusedIndex = ref(0)

const pos = ref({ left: 0, top: 0 })
const openedAt = ref(0)
const clampToViewport = () => {
  const pad = 8
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  const h = typeof window !== 'undefined' ? window.innerHeight : 768
  const mw = 160
  const mh = 88
  const left = Math.max(pad, Math.min(props.x, w - mw - pad))
  const top = Math.max(pad, Math.min(props.y, h - mh - pad))
  pos.value = { left, top }
}

watch(() => [props.visible, props.x, props.y], async () => {
  await nextTick()
  clampToViewport()
  if (props.visible) {
    focusedIndex.value = 0
    openedAt.value = (typeof performance !== 'undefined' ? performance.now() : Date.now())
    await nextTick()
    itemRefs[0].value?.$el?.focus?.()
  }
}, { immediate: true })

const onGlobalClick = (e) => {
  if (!props.visible) return
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  // Ignorar el primer click inmediatamente tras abrir (clic residual del clic derecho)
  if (now - openedAt.value < 50) return
  // El ContextMenu ya maneja el click outside
}

const onGlobalKeydown = (e) => {
  if (!props.visible) return
  if (e.key === 'Escape') emit('close')
}

const onGlobalScroll = () => {
  if (!props.visible) return
  emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('scroll', onGlobalScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('scroll', onGlobalScroll)
})

const onKeydown = (e) => {
  if (e.key === 'ArrowDown') {
    focusedIndex.value = (focusedIndex.value + 1) % itemRefs.length
    itemRefs[focusedIndex.value].value?.$el?.focus?.()
  } else if (e.key === 'ArrowUp') {
    focusedIndex.value = (focusedIndex.value - 1 + itemRefs.length) % itemRefs.length
    itemRefs[focusedIndex.value].value?.$el?.focus?.()
  } else if (e.key === 'Enter' || e.key === ' ') {
    if (focusedIndex.value === 0) emitLock()
    else if (focusedIndex.value === 1) emitSaveTemplate()
    else emitDelete()
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

const emitLock = () => {
  emit('lockToggle')
}
const emitSaveTemplate = () => {
  emit('saveTemplate')
}
const emitDelete = () => {
  emit('delete')
}
</script>
