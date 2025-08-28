<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-[var(--gap)] px-2 py-2 ui-surface"
    role="toolbar"
    aria-label="Toolbar de lienzo"
  >
    <!-- Grupo conmutador Mano / Edición -->
    <div
      class="relative flex items-center bg-[var(--ui-bg)]/0 border border-[var(--ui-border)] rounded-[14px] p-[6px] gap-[6px] ring-1 ring-black/0"
      role="group"
      aria-label="Cambiar modo"
    >
      <div
        class="absolute left-[6px] top-[6px] z-0 h-[calc(var(--btn-size)-8px)] w-[calc(var(--btn-size)-8px)] rounded-[12px] bg-[var(--primary)] transition-transform duration-200 ease-out will-change-transform"
        :style="{ transform: activeMode === 'edit' ? 'translateX(calc(var(--btn-size) + 6px))' : 'translateX(0%)' }"
        aria-hidden="true"
      ></div>
      <UiIconButton
        @click.stop="$emit('set-mode', 'drag')"
        :state="activeMode === 'drag' ? 'on' : 'off'"
        aria-label="Modo mano (mover lienzo)"
      >
        <!-- Icono Mano -->
        <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" :class="{ '!text-white': activeMode === 'drag' }" fill="currentColor" aria-hidden="true">
          <path d="M8 11V6a1 1 0 1 1 2 0v4h1V5a1 1 0 1 1 2 0v5h1V6a1 1 0 1 1 2 0v4h1V8a1 1 0 1 1 2 0v5c0 3.5-2.8 6.5-6.3 6.5-2 0-3.8-1-5.3-2.6C4.7 15.3 4 14 4 13.3c0-.5.3-.9.8-1 .3 0 .6.1.9.4l1 .9A1 1 0 0 0 8 12v-1z" />
        </svg>
      </UiIconButton>
      <UiIconButton
        @click.stop="$emit('set-mode', 'edit')"
        :state="activeMode === 'edit' ? 'on' : 'off'"
        aria-label="Modo edición"
      >
        <!-- Icono Cursor -->
        <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" :class="{ '!text-white': activeMode === 'edit' }" fill="currentColor" aria-hidden="true">
          <path d="M6 3l12 7-7 1-2 6-3-14z" />
        </svg>
      </UiIconButton>
    </div>

    <!-- Snapping -->
    <UiIconButton
      @click.stop="$emit('toggle-snapping')"
      :state="isSnappingEnabled ? 'on' : 'off'"
      :aria-label="'Alternar snapping'"
      :aria-pressed="isSnappingEnabled ? 'true' : 'false'"
    >
      <!-- Icono Snap (imán) -->
      <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
        <path d="M7 3h3v4H7a3 3 0 0 0-3 3v6a4 4 0 0 0 4 4h1v-3H8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2V7h4v2h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3h1a4 4 0 0 0 4-4v-6a3 3 0 0 0-3-3h-3V3H7z" />
      </svg>
    </UiIconButton>

    <!-- Lock / Unlock -->
    <UiIconButton
      v-if="isElementSelected"
      @click.stop="$emit('toggle-lock')"
      :state="isElementLocked ? 'on' : 'off'"
      :aria-label="isElementLocked ? 'Desbloquear elemento' : 'Bloquear elemento'"
    >
      <!-- Icono candado -->
      <svg v-if="isElementLocked" viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
        <path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zm-8 0V7a3 3 0 0 1 6 0v2H9z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
        <path d="M7 9V7a5 5 0 0 1 9.6-2H14a3 3 0 0 0-6 2v2H5v12h14V9H7z" />
      </svg>
    </UiIconButton>

    <!-- Fill container -->
    <UiIconButton
      v-if="isContainer && isElementSelected"
      @click.stop="$emit('fill-container')"
      state="off"
      aria-label="Llenar contenedor"
    >
      <!-- Icono fill -->
      <svg viewBox="0 0 24 24" class="h-5 w-5 pointer-events-none" fill="currentColor" aria-hidden="true">
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
})

defineEmits(['set-mode', 'toggle-lock', 'toggle-snapping', 'fill-container'])
</script>
