<template>
  <div
    ref="containerRef"
    class="relative inline-block"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focus="onEnter"
    @blur="onLeave"
  >
    <slot />
    <transition name="fade">
      <div
        v-if="visible && !isDestroyed"
        :class="customPosition"
        class="pointer-events-none absolute z-50 px-2 py-1 rounded-md bg-slate-900 text-white text-xs shadow text-nowrap"
        role="tooltip"
      >
        {{ label }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onUnmounted, computed } from 'vue'
defineOptions({ name: 'UiTooltip' })

const props = defineProps({
  label: { type: String, required: true },
  delay: { type: Number, default: 200 },
  position: { type: String, default: 'top' }
})

const containerRef = ref(null)
const visible = ref(false)
const isDestroyed = ref(false)
let timer

const customPosition = computed(() => {
  switch(props.position) {
    case 'top':
      return '-top-2 left-1/2 -translate-x-1/2 -translate-y-full'
    case 'bottom':
      return '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full'
    case 'left':
      return '-left-2 top-1/2 -translate-y-1/2 -translate-x-full'
    case 'right':
      return '-right-2 top-1/2 -translate-y-1/2 translate-x-full'
    default:
      return '-top-2 left-1/2 -translate-x-1/2 -translate-y-full'
  }
})

function onEnter() {
  if (isDestroyed.value) return

  clearTimeout(timer)
  timer = setTimeout(() => {
    if (!isDestroyed.value && timer) {
      visible.value = true
    }
  }, props.delay)
}

function onLeave() {
  clearTimeout(timer)
  timer = null
  visible.value = false
}

function cleanup() {
  isDestroyed.value = true
  clearTimeout(timer)
  timer = null
  visible.value = false
}

onBeforeUnmount(() => {
  cleanup()
})

onUnmounted(() => {
  cleanup()
})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

