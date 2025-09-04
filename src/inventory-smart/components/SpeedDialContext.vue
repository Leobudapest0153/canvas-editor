<!-- filepath: src/components/SpeedDialContext.vue -->
<template>
  <div
    v-show="visible"
    ref="menuRef"
    class="sdx-container"
    :style="{ left: `${pos.left}px`, top: `${pos.top}px` }"
    role="menu"
    aria-label="Menú contextual"
    @keydown.stop.prevent="onKeydown"
    @contextmenu.prevent
  >
    <button
      ref="itemRefs[0]"
      class="sdx-item"
      role="menuitem"
      :aria-label="isLocked ? 'Desbloquear' : 'Bloquear'"
      @click="emitLock"
    >
      {{ isLocked ? 'Desbloquear' : 'Bloquear' }}
    </button>
    <button
      ref="itemRefs[1]"
      class="sdx-item"
      role="menuitem"
      aria-label="Guardar como plantilla"
      @click="emitSaveTemplate"
    >
      Guardar como plantilla
    </button>
    <button
      ref="itemRefs[2]"
      class="sdx-item sdx-danger"
      role="menuitem"
      aria-label="Eliminar"
      @click="emitDelete"
    >
      Eliminar
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, defineOptions } from 'vue'

defineOptions({ name: 'SpeedDialContext' })

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
})
const emit = defineEmits(['lockToggle', 'save-template', 'delete', 'close'])

const menuRef = ref(null)
const itemRefs = [ref(null), ref(null), ref(null)]
const focusedIndex = ref(0)

const pos = ref({ left: 0, top: 0 })
const openedAt = ref(0)
const clampToViewport = () => {
  const menu = menuRef.value
  const pad = 8
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  const h = typeof window !== 'undefined' ? window.innerHeight : 768
  const mw = menu?.offsetWidth || 160
  const mh = menu?.offsetHeight || 88
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
    itemRefs[0].value?.focus?.()
  }
}, { immediate: true })

const onGlobalClick = (e) => {
  if (!props.visible) return
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  // Ignorar el primer click inmediatamente tras abrir (clic residual del clic derecho)
  if (now - openedAt.value < 50) return
  const el = menuRef.value
  if (el && !el.contains(e.target)) emit('close')
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
  document.addEventListener('click', onGlobalClick, true)
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('scroll', onGlobalScroll, { passive: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGlobalClick, true)
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('scroll', onGlobalScroll)
})

const onKeydown = (e) => {
  if (e.key === 'ArrowDown') {
    focusedIndex.value = (focusedIndex.value + 1) % itemRefs.length
    itemRefs[focusedIndex.value].value?.focus?.()
  } else if (e.key === 'ArrowUp') {
    focusedIndex.value = (focusedIndex.value - 1 + itemRefs.length) % itemRefs.length
    itemRefs[focusedIndex.value].value?.focus?.()
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
const emitDelete = () => {
  emit('delete')
}
const emitSaveTemplate = () => {
  emit('save-template')
}
</script>

<style scoped>
.sdx-container {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(255,255,255,0.98);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  min-width: 160px;
}
.sdx-item {
  appearance: none;
  border: 0;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
  cursor: pointer;
}
.sdx-item:hover, .sdx-item:focus {
  outline: none;
  background: #eff6ff;
}
.sdx-danger {
  color: #dc2626;
}
.sdx-danger:hover, .sdx-danger:focus {
  background: #fee2e2;
}
</style>
