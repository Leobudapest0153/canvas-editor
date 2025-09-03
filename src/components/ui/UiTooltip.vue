<template>
  <div
    class="relative inline-block"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onEnter"
    @focusout="onLeave"
  >
    <slot />
    <div
      v-if="visible"
      role="tooltip"
      class="pointer-events-none absolute z-20 -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-slate-900/95 px-2 py-1 text-xs text-white"
    >
      {{ label }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  delay: { type: Number, default: 0 },
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
</script>
