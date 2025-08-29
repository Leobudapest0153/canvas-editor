<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed inset-x-0 bottom-6 z-[60] mx-auto w-auto inline-flex items-center gap-2 whitespace-nowrap rounded-[20px] border border-white/20 dark:border-white/10 bg-white/65 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,.10)] px-2 py-2"
    :class="{ 'translate-y-20': avoidOverlap }"
    role="toolbar"
    aria-label="Toolbar de lienzo"
  >
    <!-- Grupo conmutador Mano / EdiciÃ³n -->
    <div
      class="relative isolate flex h-[40px] w-[88px] items-center rounded-[14px] border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 px-1 gap-2"
      role="group"
      aria-label="Cambiar modo"
      style="--seg-w:40px; --seg-gap:8px;"
    >
      <div
        class="seg-slider absolute left-1 top-1 z-0 h-[36px] w-[36px] rounded-[12px] bg-[var(--primary,theme(colors.blue.600))] shadow-[0_6px_16px_rgba(37,99,235,.35)] transition-transform duration-250 ease-out will-change-transform"
        :style="{ transform: activeMode === 'edit' ? 'translateX(calc(40px + 8px))' : 'translateX(0)' }"
        aria-hidden="true"
      ></div>
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-transparent text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 [data-state=on]:hover:opacity-95"
        @click.stop="$emit('set-mode', 'drag')"
        :state="activeMode === 'drag' ? 'on' : 'off'"
        aria-label="Modo mano (mover lienzo)"
        :aria-pressed="activeMode === 'drag' ? 'true' : 'false'"
      >
        <!-- Icono Mano -->
        <svg viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current" :class="{ 'text-white': activeMode === 'drag' }" aria-hidden="true">
          <path d="M8 11V6a1 1 0 1 1 2 0v4h1V5a1 1 0 1 1 2 0v5h1V6a1 1 0 1 1 2 0v4h1V8a1 1 0 1 1 2 0v5c0 3.5-2.8 6.5-6.3 6.5-2 0-3.8-1-5.3-2.6C4.7 15.3 4 14 4 13.3c0-.5.3-.9.8-1 .3 0 .6.1.9.4l1 .9A1 1 0 0 0 8 12v-1z" />
        </svg>
      </UiIconButton>
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-transparent text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 [data-state=on]:hover:opacity-95"
        @click.stop="$emit('set-mode', 'edit')"
        :state="activeMode === 'edit' ? 'on' : 'off'"
        aria-label="Modo edición"
        :aria-pressed="activeMode === 'edit' ? 'true' : 'false'"
      >
        <!-- Icono Cursor -->
        <svg viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current" :class="{ 'text-white': activeMode === 'edit' }" aria-hidden="true">
          <path d="M6 3l12 7-7 1-2 6-3-14z" />
        </svg>
      </UiIconButton>
    </div>

    <!-- Snapping -->
    <UiIconButton
      class="relative z-10 grid h-10 w-10 place-items-center rounded-xl bg-transparent hover:bg-black/[.04] dark:hover:bg-white/[.06] text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40"
      @click.stop="$emit('toggle-snapping')"
      :state="isSnappingEnabled ? 'on' : 'off'"
      :aria-label="'Alternar snapping'"
      :aria-pressed="isSnappingEnabled ? 'true' : 'false'"
    >
      <!-- Icono Snap (imÃ¡n) -->
      <svg viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current" aria-hidden="true">
        <path d="M7 3h3v4H7a3 3 0 0 0-3 3v6a4 4 0 0 0 4 4h1v-3H8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2V7h4v2h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3h1a4 4 0 0 0 4-4v-6a3 3 0 0 0-3-3h-3V3H7z" />
      </svg>
      <span
        v-if="isSnappingEnabled && isSnapping"
        class="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse"
      ></span>
    </UiIconButton>

    <!-- Lock / Unlock -->
    <UiIconButton
      v-if="isElementSelected"
      class="relative z-10 grid h-10 w-10 place-items-center rounded-xl bg-transparent hover:bg-black/[.04] dark:hover:bg-white/[.06] text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40"
      @click.stop="$emit('toggle-lock')"
      :state="isElementLocked ? 'on' : 'off'"
      :aria-label="isElementLocked ? 'Desbloquear elemento' : 'Bloquear elemento'"
      :aria-pressed="isElementLocked ? 'true' : 'false'"
      :class="{ 'text-amber-600 dark:text-amber-400': isElementLocked }"
    >
      <!-- Icono candado -->
      <svg v-if="isElementLocked" viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current" aria-hidden="true">
        <path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zm-8 0V7a3 3 0 0 1 6 0v2H9z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current" aria-hidden="true">
        <path d="M7 9V7a5 5 0 0 1 9.6-2H14a3 3 0 0 0-6 2v2H5v12h14V9H7z" />
      </svg>
    </UiIconButton>

    <!-- Fill container -->
    <UiIconButton
      v-if="isContainer && isElementSelected"
      class="relative z-10 grid h-10 w-10 place-items-center rounded-xl bg-transparent hover:bg-black/[.04] dark:hover:bg-white/[.06] text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40"
      @click.stop="$emit('fill-container')"
      state="off"
      aria-label="Llenar contenedor"
    >
      <!-- Icono fill -->
      <svg viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current" aria-hidden="true">
        <path d="M4 4l8 8 3-3 5 5-3 3-5-5 3-3-8-8-3 3zM4 18h10v2H4v-2z" />
      </svg>
    </UiIconButton>
  </div>
</template>

<script setup>
import UiIconButton from './ui/UiIconButton.vue'
defineProps({
  activeMode: { type: String, default: 'drag' },
  isElementSelected: { type: Boolean, default: false },
  isElementLocked: { type: Boolean, default: false },
  isContainer: { type: Boolean, default: false },
  isSnappingEnabled: { type: Boolean, default: true },
  isSnapping: { type: Boolean, default: false },
  avoidOverlap: { type: Boolean, default: false },
})

defineEmits(['set-mode', 'toggle-lock', 'toggle-snapping', 'fill-container'])
</script>

<style>
@media (prefers-reduced-motion: reduce) {
  .seg-slider {
    transition: none !important;
  }
}
</style>
