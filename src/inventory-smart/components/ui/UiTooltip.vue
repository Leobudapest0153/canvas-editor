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
        :style="tooltipStyle"
  class="pointer-events-none absolute z-50 px-2 py-1 rounded-md bg-slate-900 text-white text-xs shadow whitespace-normal leading-snug normal-case"
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
  position: { type: String, default: 'top' },
  maxWidth: { type: [Number, String], default: 320 },
  minWidth: { type: [Number, String], default: 140 }
})

const containerRef = ref(null)
const visible = ref(false)
const isDestroyed = ref(false)
let timer

const customPosition = computed(() => {
  switch (props.position) {
    case 'top':
      return 'left-1/2 -translate-x-1/2 -translate-y-full -top-2'
    case 'bottom':
      return 'left-1/2 -translate-x-1/2 translate-y-full -bottom-2'
    case 'left':
      // Ubicamos totalmente a la izquierda sin forzar shrink
      return 'right-full mr-2 top-1/2 -translate-y-1/2'
    case 'right':
      return 'left-full ml-2 top-1/2 -translate-y-1/2'
    default:
      return 'left-1/2 -translate-x-1/2 -translate-y-full -top-2'
  }
})

const tooltipStyle = computed(() => {
  let mw = props.maxWidth
  let mnw = props.minWidth
  if (typeof mw === 'number') mw = `${mw}px`
  if (typeof mnw === 'number') mnw = `${mnw}px`
  return { maxWidth: mw, minWidth: mnw }
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

