<template>
  <button
    :data-state="state"
    class="relative z-10 h-[38px] w-[38px] rounded-[10px] flex justify-center items-center outline-none transition text-slate-600 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 disabled:opacity-45 disabled:saturate-75 disabled:pointer-events-none [data-state=off]:hover:bg-black/5 dark:[data-state=off]:hover:bg-white/5 [data-state=on]:hover:opacity-95"
    :class="{ '!text-white': state === 'on' }"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    :disabled="disabled"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<script setup>
const props = defineProps({
  state: { type: String, default: 'off' }, // 'on' | 'off'
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, required: true },
})

const emit = defineEmits(['click'])
function onClick(e) {
  emit('click', e)
}
</script>

