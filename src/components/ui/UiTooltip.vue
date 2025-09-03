<template>
  <div
    class="relative inline-block"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focus="onEnter"
    @blur="onLeave"
  >
    <slot />
    <transition name="fade">
      <div
        v-if="visible"
        class="pointer-events-none absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full px-2 py-1 rounded-md bg-slate-900 text-white text-xs shadow"
        role="tooltip"
      >
        {{ label }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
defineOptions({ name: 'UiTooltip' })

const props = defineProps({
  label: { type: String, required: true },
  delay: { type: Number, default: 200 },
})

const visible = ref(false)
let timer

function onEnter() {
  timer = setTimeout(() => {
    visible.value = true
  }, props.delay)
}

function onLeave() {
  clearTimeout(timer)
  visible.value = false
}

onBeforeUnmount(() => {
  clearTimeout(timer)
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

