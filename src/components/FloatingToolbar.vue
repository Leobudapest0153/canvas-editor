<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[49] inline-flex items-center gap-3 whitespace-nowrap max-w-max rounded-[20px] border border-white/12 dark:border-white/6 bg-white/50 dark:bg-slate-900/45 backdrop-blur-xl backdrop-saturate-150 px-3.5 py-2 shadow-[0_6px_18px_rgba(0,0,0,.08),inset_0_0_0_1px_rgba(255,255,255,.06)]"
    :class="{ 'translate-y-20': avoidOverlap }"
    role="toolbar"
    aria-label="Toolbar de lienzo"
  >
    <!-- Grupo conmutador Mano / Edición -->
    <div
      class="relative isolate flex items-center h-[40px] rounded-[14px] border border-white/10 dark:border-white/8 bg-white/35 dark:bg-white/5 overflow-hidden"
      role="group"
      aria-label="Cambiar modo"
      :style="{ '--seg-w':'36px','--seg-gap':'8px','--seg-pad':'0px','--seg-index': activeMode==='edit' ? 1 : 0 }"
    >
      <div
        class="seg-slider absolute top-1/2 left-0 z-0 h-[36px] w-[36px] ml-px rounded-full bg-[var(--primary,theme(colors.blue.600))] shadow-[0_8px_24px_rgba(37,99,235,.35)] ring-2 ring-white/15 ring-[var(--primary,theme(colors.blue.600))]/20 -translate-y-1/2 transform transition-all duration-220 ease-[cubic-bezier(.25,1.1,.4,1)] will-change-transform"
        :style="{ left: 'calc(var(--seg-index) * 50%)' }"
        aria-hidden="true"
      ></div>
      <UiTooltip label="Mover lienzo (D)" :delay="200">
        <UiIconButton
          class="relative z-10 grid h-[34px] w-[34px] place-items-center rounded-[12px] p-0 m-0 bg-transparent hover:bg-transparent leading-none transform transition data-[state=on]:scale-100 data-[state=off]:scale-95"
          @click.stop="$emit('set-mode', 'drag')"
          :state="activeMode === 'drag' ? 'on' : 'off'"
          aria-label="Mover lienzo (D)"
          title="Mover lienzo (D)"
          :aria-pressed="activeMode === 'drag' ? 'true' : 'false'"
        >
          <!-- Icono Mano -->
          <svg
            viewBox="0 0 512 512"
            class="block h-[14px] w-[14px] pointer-events-none fill-current align-middle transition data-[state=on]:text-white data-[state=off]:text-slate-400/70 data-[state=off]:opacity-70 drop-shadow-[0_1px_1px_rgba(0,0,0,.25)]"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32v208c0 8.8-7.2 16-16 16s-16-7.2-16-16V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v272c0 1.5 0 3.1.1 4.6L67.6 283c-16-15.2-41.3-14.6-56.6 1.4s-14.6 41.3 1.4 56.6l112.4 107c43.1 41.1 100.4 64 160 64H304c97.2 0 176-78.8 176-176V128c0-17.7-14.3-32-32-32s-32 14.3-32 32v112c0 8.8-7.2 16-16 16s-16-7.2-16-16V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v176c0 8.8-7.2 16-16 16s-16-7.2-16-16z"
            />
          </svg>
        </UiIconButton>
      </UiTooltip>
      <UiTooltip label="Editar elementos (E)" :delay="200">
        <UiIconButton
          class="relative z-10 grid h-[34px] w-[34px] place-items-center rounded-[12px] p-0 m-0 bg-transparent hover:bg-transparent leading-none transform transition data-[state=on]:scale-100 data-[state=off]:scale-95"
          @click.stop="$emit('set-mode', 'edit')"
          :state="activeMode === 'edit' ? 'on' : 'off'"
          aria-label="Editar elementos (E)"
          title="Editar elementos (E)"
          :aria-pressed="activeMode === 'edit' ? 'true' : 'false'"
        >
          <!-- Icono Cursor -->
          <svg
            viewBox="0 0 24 24"
            class="block h-[18px] w-[18px] pointer-events-none fill-current align-middle transition data-[state=on]:text-white data-[state=off]:text-slate-400/70 data-[state=off]:opacity-70 drop-shadow-[0_1px_1px_rgba(0,0,0,.25)]"
            aria-hidden="true">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M4.38 3.075a1 1 0 0 0-1.305 1.306l7 17a1 1 0 0 0 1.844.013l2.685-6.265a1 1 0 0 1 .525-.525l6.265-2.685a1 1 0 0 0-.013-1.844z"
              clip-rule="evenodd"
            />
          </svg>
        </UiIconButton>
      </UiTooltip>
    </div>

    <!-- Divider between group and secondary actions -->
    <div class="h-6 w-px bg-white/10 dark:bg-white/10 mx-1.5" aria-hidden="true" />

    <!-- Snapping -->
    <UiTooltip label="Ajuste automático (S)" :delay="200">
      <div class="relative group">
        <UiIconButton
          class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-black/[.05] dark:hover:bg-white/[.06] text-slate-600 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
          @click.stop="$emit('toggle-snapping')"
          :state="isSnappingEnabled ? 'on' : 'off'"
          aria-label="Alternar ajuste automático (S)"
          title="Alternar ajuste automático (S)"
          :aria-pressed="isSnappingEnabled ? 'true' : 'false'"
        >
          <!-- Icono Snap (imán) -->
          <svg viewBox="0 0 24 24" class="pointer-events-none h-[20px] w-[20px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
            <path d="M20 19.88V22l-1.8-1.17l-4.79-9a4.9 4.9 0 0 0 1.78-1M15 7a3 3 0 0 1-3 3a3 3 0 0 1-.44 0L5.8 20.83L4 22v-2.12L9.79 9A3 3 0 0 1 12 4V2a1 1 0 0 1 1 1v1.18A3 3 0 0 1 15 7m-2 0a1 1 0 1 0-1 1a1 1 0 0 0 1-1m-8.78 3L6 11.8l-1.44 2.76L2.1 12.1m9.9 5.66l-1.5-1.51L9 19l3 3l3-3l-1.47-2.77M19.78 10L18 11.8l1.5 2.76l2.4-2.46Z" />
          </svg>
        </UiIconButton>
        <span v-if="isSnappingEnabled" class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--primary,theme(colors.blue.600))] ring-2 ring-slate-900/60"></span>
      </div>
    </UiTooltip>

    <!-- Lock / Unlock -->
    <UiTooltip
      v-if="isElementSelected"
      :label="isElementLocked ? 'Desbloquear elemento (L)' : 'Bloquear elemento (L)'"
      :delay="200"
    >
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-black/[.05] dark:hover:bg-white/[.06] text-slate-600 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
        @click.stop="$emit('toggle-lock')"
        :state="isElementLocked ? 'on' : 'off'"
        :aria-label="isElementLocked ? 'Desbloquear elemento (L)' : 'Bloquear elemento (L)'"
        :title="isElementLocked ? 'Desbloquear elemento (L)' : 'Bloquear elemento (L)'"
        :aria-pressed="isElementLocked ? 'true' : 'false'"
        :class="{ 'text-amber-600 dark:text-amber-400': isElementLocked }"
      >
        <!-- Icono candado -->
        <svg v-if="isElementLocked" viewBox="0 0 512 512" class="pointer-events-none h-[18px] w-[18px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
          <path d="M420 192h-68v-80a96 96 0 1 0-192 0v80H92a12 12 0 0 0-12 12v280a12 12 0 0 0 12 12h328a12 12 0 0 0 12-12V204a12 12 0 0 0-12-12m-106 0H198v-80.75a58 58 0 1 1 116 0Z" />
        </svg>
        <svg v-else viewBox="0 0 512 512" class="pointer-events-none h-[18px] w-[18px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
          <path d="M420 192H198v-80.75a58.08 58.08 0 0 1 99.07-41.07A59.4 59.4 0 0 1 314 112h38a96 96 0 1 0-192 0v80H92a12 12 0 0 0-12 12v280a12 12 0 0 0 12 12h328a12 12 0 0 0 12-12V204a12 12 0 0 0-12-12" />
        </svg>
      </UiIconButton>
    </UiTooltip>

    <!-- Delete button -->
    <UiTooltip v-if="isElementSelected" label="Borrar elemento (Supr)" :delay="200">
      <UiIconButton
        class="hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
        aria-label="Borrar elemento (Supr)"
        title="Borrar elemento (Supr)"
        @click.stop="$emit('delete')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="pointer-events-none h-[22px] w-[22px] text-slate-300"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M7.616 20q-.691 0-1.153-.462T6 18.384V6H5V5h4v-.77h6V5h4v1h-1v12.385q0 .69-.462 1.153T16.384 20zm2.192-3h1V8h-1zm3.384 0h1V8h-1z"
          />
        </svg>
      </UiIconButton>
    </UiTooltip>

    <!-- Fill container -->
    <UiTooltip
      v-if="isContainer && isElementSelected"
      label="Ajustar al contenedor (F)"
      :delay="200"
    >
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-black/[.05] dark:hover:bg-white/[.06] text-slate-600 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
        @click.stop="$emit('fill-container')"
        state="off"
        aria-label="Ajustar al contenedor (F)"
        title="Ajustar al contenedor (F)"
      >
        <!-- Icono fill -->
        <svg viewBox="0 0 48 48" class="pointer-events-none h-[18px] w-[18px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="m42.243 15.61l-1.183-.017c-1.586-3.963-3.464-7.44-4.637-9.472c-.964-1.67-2.742-2.621-4.61-2.621h-1.477c-.41-1.247-1.624-1.921-2.767-1.955c-.79-.023-1.963-.045-3.569-.045s-2.778.022-3.569.045c-1.143.034-2.357.708-2.767 1.955h-1.478c-.857 0-1.613.432-2.01 1.12a75 75 0 0 0-3.976 7.937c3.226-.03 7.773-.057 13.8-.057s10.574.027 13.8.057a75 75 0 0 0-3.975-7.936C33.427 6.93 32.67 6.5 31.814 6.5h-1.478c-.41 1.247-1.624 1.921-2.767 1.955M5.13 26.855l.057.44c.483 3.672 1.253 8.559 2.402 13.376a6.88 6.88 0 0 0 5.97 5.269c2.555.274 6.223.56 10.44.56s7.884-.286 10.44-.56a6.88 6.88 0 0 0 5.97-5.27c1.148-4.816 1.919-9.703 2.402-13.375l.057-.44q-.324.03-.586.034c-2.719.042-8.593.11-18.283.11s-15.564-.068-18.282-.11a8 8 0 0 1-.587-.033m10.657 3.66a1.5 1.5 0 0 1 1.697 1.273l1 7a1.5 1.5 0 1 1-2.97.424l-1-7a1.5 1.5 0 0 1 1.273-1.697m14.727 1.273a1.5 1.5 0 1 1 2.97.424l-1 7a1.5 1.5 0 1 1-2.97-.424zM24 30.5a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-3 0v-7a1.5 1.5 0 0 1 1.5-1.5"
            clip-rule="evenodd"/>
        </svg>
      </UiIconButton>
    </UiTooltip>
  </div>
</template>

<script setup>
import UiIconButton from './ui/UiIconButton.vue'
import UiTooltip from './ui/UiTooltip.vue'
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
