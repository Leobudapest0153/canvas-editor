<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-[var(--gap)] px-2 py-2 ui-surface"
    role="toolbar"
    aria-label="Toolbar de lienzo"
  >
    <!-- Grupo conmutador Mano / Edición -->
    <div
      class="relative flex items-center bg-[var(--ui-bg)]/0 border border-[var(--ui-border)] rounded-[12px] p-1"
      role="group"
      aria-label="Cambiar modo"
    >
      <div
        class="absolute left-1 top-1 z-0 h-[calc(var(--btn-size)-8px)] w-[calc(var(--btn-size)-8px)] rounded-[10px] bg-[var(--primary)] transition-transform will-change-transform"
        :style="{ transform: activeMode === 'edit' ? 'translateX(100%)' : 'translateX(0%)' }"
        aria-hidden="true"
      ></div>
      <button
        @click.stop="$emit('set-mode', 'drag')"
        class="relative z-10 h-[var(--btn-size)] w-[var(--btn-size)] rounded-[10px] grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 hover:bg-black/5 dark:hover:bg-white/5 transition text-slate-600 dark:text-slate-200"
        :class="{ '!text-white': activeMode === 'drag' }"
        aria-label="Modo mano (mover lienzo)"
      >
        <!-- Icono Mano -->
        <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" :class="{ '!text-white': activeMode === 'drag' }" fill="currentColor" aria-hidden="true">
          <path d="M8 11V6a1 1 0 1 1 2 0v4h1V5a1 1 0 1 1 2 0v5h1V6a1 1 0 1 1 2 0v4h1V8a1 1 0 1 1 2 0v5c0 3.5-2.8 6.5-6.3 6.5-2 0-3.8-1-5.3-2.6C4.7 15.3 4 14 4 13.3c0-.5.3-.9.8-1 .3 0 .6.1.9.4l1 .9A1 1 0 0 0 8 12v-1z" />
        </svg>
      </button>
      <button
        @click.stop="$emit('set-mode', 'edit')"
        class="relative z-10 h-[var(--btn-size)] w-[var(--btn-size)] rounded-[10px] grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 hover:bg-black/5 dark:hover:bg-white/5 transition text-slate-600 dark:text-slate-200"
        :class="{ '!text-white': activeMode === 'edit' }"
        aria-label="Modo edición"
      >
        <!-- Icono Cursor -->
        <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" :class="{ '!text-white': activeMode === 'edit' }" fill="currentColor" aria-hidden="true">
          <path d="M6 3l12 7-7 1-2 6-3-14z" />
        </svg>
      </button>
    </div>

    <!-- Snapping -->
    <button
      @click.stop="$emit('toggle-snapping')"
      class="relative z-10 h-[var(--btn-size)] w-[var(--btn-size)] rounded-[10px] grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 hover:bg-black/5 dark:hover:bg-white/5 transition text-slate-600 dark:text-slate-200"
      :aria-pressed="isSnappingEnabled ? 'true' : 'false'"
      aria-label="Alternar snapping"
    >
      <!-- Icono Snap (imán) -->
      <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
        <path d="M7 3h3v4H7a3 3 0 0 0-3 3v6a4 4 0 0 0 4 4h1v-3H8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2V7h4v2h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3h1a4 4 0 0 0 4-4v-6a3 3 0 0 0-3-3h-3V3H7z" />
      </svg>
    </button>

    <!-- Lock / Unlock -->
    <button
      v-if="isElementSelected"
      @click.stop="$emit('toggle-lock')"
      class="relative z-10 h-[var(--btn-size)] w-[var(--btn-size)] rounded-[10px] grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 hover:bg-black/5 dark:hover:bg-white/5 transition text-slate-600 dark:text-slate-200 disabled:opacity-40 disabled:pointer-events-none"
      :aria-label="isElementLocked ? 'Desbloquear elemento' : 'Bloquear elemento'"
    >
      <!-- Icono candado -->
      <svg v-if="isElementLocked" viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
        <path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zm-8 0V7a3 3 0 0 1 6 0v2H9z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
        <path d="M7 9V7a5 5 0 0 1 9.6-2H14a3 3 0 0 0-6 2v2H5v12h14V9H7z" />
      </svg>
    </button>

    <!-- Fill container -->
    <button
      v-if="isContainer && isElementSelected"
      @click.stop="$emit('fill-container')"
      class="relative z-10 h-[var(--btn-size)] w-[var(--btn-size)] rounded-[10px] grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 hover:bg-black/5 dark:hover:bg-white/5 transition text-slate-600 dark:text-slate-200 disabled:opacity-40"
      aria-label="Llenar contenedor"
    >
      <!-- Icono fill -->
      <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
        <path d="M4 4l8 8 3-3 5 5-3 3-5-5 3-3-8-8-3 3zM4 18h10v2H4v-2z" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  activeMode: { type: String, default: 'drag' },
  isElementSelected: { type: Boolean, default: false },
  isElementLocked: { type: Boolean, default: false },
  isContainer: { type: Boolean, default: false },
  isSnappingEnabled: { type: Boolean, default: true },
})

defineEmits(['set-mode', 'toggle-lock', 'toggle-snapping', 'fill-container'])
</script>
