<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-3 whitespace-nowrap max-w-max rounded-[20px] border border-white/12 dark:border-white/6 bg-white/50 dark:bg-slate-900/45 backdrop-blur-xl backdrop-saturate-150 px-3.5 py-2 shadow-[0_6px_18px_rgba(0,0,0,.08),inset_0_0_0_1px_rgba(255,255,255,.06)]"
    :class="{ 'translate-y-20': avoidOverlap }"
    role="toolbar"
    aria-label="Toolbar de lienzo"
  >
    <!-- Grupo conmutador Mano / Edición -->
    <div
      class="relative isolate flex items-center h-[40px] rounded-[14px] border border-white/10 dark:border-white/8 bg-white/35 dark:bg-white/5 overflow-hidden gap-2 px-[var(--seg-pad)]"
      role="group"
      aria-label="Cambiar modo"
      :style="{ '--seg-w':'36px','--seg-gap':'8px','--seg-pad':'2px','--seg-index': activeMode==='edit' ? 1 : 0 }"
    >
      <div
        class="seg-slider absolute top-1/2 left-[var(--seg-pad)] z-0 h-[36px] w-[36px] rounded-full bg-[var(--primary,theme(colors.blue.600))] shadow-[0_8px_24px_rgba(37,99,235,.35)] ring-2 ring-white/15 ring-[var(--primary,theme(colors.blue.600))]/20 -translate-y-1/2 transform transition-transform duration-220 ease-[cubic-bezier(.25,1.1,.4,1)] will-change-transform"
        :style="{ '--tw-translate-x': 'calc(var(--seg-index) * (var(--seg-w) + var(--seg-gap)))' }"
        aria-hidden="true"
      ></div>
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] p-0 m-0 bg-transparent hover:bg-transparent leading-none transform transition data-[state=on]:scale-100 data-[state=off]:scale-95"
        @click.stop="$emit('set-mode', 'drag')"
        :state="activeMode === 'drag' ? 'on' : 'off'"
        aria-label="Modo mano (mover lienzo)"
        :aria-pressed="activeMode === 'drag' ? 'true' : 'false'"
      >
        <!-- Icono Mano -->
        <svg
          viewBox="0 0 24 24"
          class="block h-[18px] w-[18px] pointer-events-none fill-current align-middle transition data-[state=on]:text-white data-[state=off]:text-slate-400/70 data-[state=off]:opacity-70 drop-shadow-[0_1px_1px_rgba(0,0,0,.25)]"
          :class="activeMode==='drag' ? '-ml-px' : ''"
          aria-hidden="true"
        >
          <path d="M8 11V6a1 1 0 1 1 2 0v4h1V5a1 1 0 1 1 2 0v5h1V6a1 1 0 1 1 2 0v4h1V8a1 1 0 1 1 2 0v5c0 3.5-2.8 6.5-6.3 6.5-2 0-3.8-1-5.3-2.6C4.7 15.3 4 14 4 13.3c0-.5.3-.9.8-1 .3 0 .6.1.9.4l1 .9A1 1 0 0 0 8 12v-1z" />
        </svg>
      </UiIconButton>
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] p-0 m-0 bg-transparent hover:bg-transparent leading-none transform transition data-[state=on]:scale-100 data-[state=off]:scale-95"
        @click.stop="$emit('set-mode', 'edit')"
        :state="activeMode === 'edit' ? 'on' : 'off'"
        aria-label="Modo edición"
        :aria-pressed="activeMode === 'edit' ? 'true' : 'false'"
      >
        <!-- Icono Cursor -->
        <svg viewBox="0 0 24 24" class="block h-[18px] w-[18px] pointer-events-none fill-current align-middle transition data-[state=on]:text-white data-[state=off]:text-slate-400/70 data-[state=off]:opacity-70 drop-shadow-[0_1px_1px_rgba(0,0,0,.25)]" aria-hidden="true">
          <g transform="translate(-0.5,0)">
            <path d="M6 3.75 17.25 11.2a.9.9 0 0 1-.23 1.63l-4.72 1.42-1.42 4.72a.9.9 0 0 1-1.63.23L3.75 7.5a.9.9 0 0 1 1.25-1.17Z" />
          </g>
        </svg>
      </UiIconButton>
    </div>

    <!-- Divider between group and secondary actions -->
    <div class="h-6 w-px bg-white/10 dark:bg-white/10 mx-1.5" aria-hidden="true" />

    <!-- Snapping -->
    <div class="relative group">
    <UiIconButton
      class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-black/[.05] dark:hover:bg-white/[.06] text-slate-600 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
      @click.stop="$emit('toggle-snapping')"
      :state="isSnappingEnabled ? 'on' : 'off'"
      :aria-label="'Alternar snapping'"
      :aria-pressed="isSnappingEnabled ? 'true' : 'false'"
    >
      <!-- Icono Snap (imÃ¡n) -->
      <svg viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
        <path d="M7 3h3v4H7a3 3 0 0 0-3 3v6a4 4 0 0 0 4 4h1v-3H8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2V7h4v2h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3h1a4 4 0 0 0 4-4v-6a3 3 0 0 0-3-3h-3V3H7z" />
      </svg>
    </UiIconButton>
    <span v-if="isSnappingEnabled" class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--primary,theme(colors.blue.600))] ring-2 ring-slate-900/60"></span>
    </div>

    <!-- Lock / Unlock -->
    <UiIconButton
      v-if="isElementSelected"
      class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-black/[.05] dark:hover:bg-white/[.06] text-slate-600 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
      @click.stop="$emit('toggle-lock')"
      :state="isElementLocked ? 'on' : 'off'"
      :aria-label="isElementLocked ? 'Desbloquear elemento' : 'Bloquear elemento'"
      :aria-pressed="isElementLocked ? 'true' : 'false'"
      :class="{ 'text-amber-600 dark:text-amber-400': isElementLocked }"
    >
      <!-- Icono candado -->
      <svg v-if="isElementLocked" viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
        <path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zm-8 0V7a3 3 0 0 1 6 0v2H9z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
        <path d="M7 9V7a5 5 0 0 1 9.6-2H14a3 3 0 0 0-6 2v2H5v12h14V9H7z" />
      </svg>
    </UiIconButton>

    <!-- Fill container -->
    <UiIconButton
      v-if="isContainer && isElementSelected"
      class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-black/[.05] dark:hover:bg-white/[.06] text-slate-600 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
      @click.stop="$emit('fill-container')"
      state="off"
      aria-label="Llenar contenedor"
    >
      <!-- Icono fill -->
      <svg viewBox="0 0 24 24" class="pointer-events-none h-[18px] w-[18px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
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

defineEmits(['set-mode', 'toggle-lock', 'toggle-snapping', 'fill-container', 'delete'])
</script>

<style>
@media (prefers-reduced-motion: reduce) {
  .seg-slider {
    transition: none !important;
  }
}
</style>
