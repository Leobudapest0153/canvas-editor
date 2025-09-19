<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[49] inline-flex items-center gap-3 whitespace-nowrap max-w-max rounded-[20px] border border-white/6 bg-slate-900/45 backdrop-blur-xl backdrop-saturate-150 px-3.5 py-2 shadow-[0_6px_18px_rgba(0,0,0,.08),inset_0_0_0_1px_rgba(255,255,255,.06)]"
    :class="{ 'translate-y-20': avoidOverlap }"
    role="toolbar"
    aria-label="Toolbar de lienzo"
  >
    <!-- Grupo conmutador Mano / Edición -->
    <div
      class="relative isolate flex items-center h-[40px] rounded-[14px] border border-white/8 bg-white/5 overflow-visible"
      role="group"
      aria-label="Cambiar modo"
      :style="{ '--seg-w':'36px','--seg-gap':'8px','--seg-pad':'0px','--seg-index': activeMode==='edit' ? 1 : 0 }"
    >
      <div
        class="seg-slider absolute top-1/2 left-0 z-0 h-[36px] w-[36px] ml-px rounded-full bg-[var(--primary,theme(colors.blue.600))] shadow-[0_8px_24px_rgba(37,99,235,.35)] ring-2 ring-white/15 -translate-y-1/2 transform transition-all duration-220 ease-[cubic-bezier(.25,1.1,.4,1)] will-change-transform"
        :style="{ left: 'calc(var(--seg-index) * 50%)' }"
        aria-hidden="true"
      ></div>
      <UiTooltip label="Mover lienzo (D)" :delay="200">
        <UiIconButton
          class="relative z-10 grid h-[34px] w-[34px] place-items-center rounded-[12px] p-0 m-0 bg-transparent hover:bg-transparent leading-none transform transition data-[state=on]:scale-100 data-[state=off]:scale-95"
          @click.stop="$emit('set-mode', 'drag')"
          :state="activeMode === 'drag' ? 'on' : 'off'"
          aria-label="Mover lienzo (D)"
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
    <div class="h-6 w-px bg-white/10 mx-1.5" aria-hidden="true" />

    <!-- Snapping -->
    <UiTooltip label="Ajuste automático (S)" :delay="200">
      <div class="relative group">
        <UiIconButton
          class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-white/[.06] text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
          @click.stop="$emit('toggle-snapping')"
          :state="isSnappingEnabled ? 'on' : 'off'"
          aria-label="Alternar ajuste automático (S)"
          :aria-pressed="isSnappingEnabled ? 'true' : 'false'"
        >
          <!-- Icono Snap (imán) -->
          <svg viewBox="0 0 24 24" class="pointer-events-none h-[24px] w-[24px] fill-current data-[state=on]:text-white data-[state=off]:text-slate-300" aria-hidden="true">
            <path
              fill="currentColor"
              d="M9.479 3.5a1.5 1.5 0 0 0-2.12 0L3.5 7.35a1.52 1.52 0 0 0-.44 1.06a1.5 1.5 0 0 0 .44 1.06L14.519 20.5a1.51 1.51 0 0 0 2.13 0l3.85-3.86a1.49 1.49 0 0 0 0-2.12Zm-1.12 3.58a.5.5 0 0 0 0 .71a.524.524 0 0 0 .71 0c.55-.56 1.09-1.1 1.65-1.64l1.25 1.25l-.9.9a.483.483 0 0 0 0 .7a.5.5 0 0 0 .71 0c.29-.3.6-.6.9-.89l1.25 1.25l-1.64 1.65a.495.495 0 0 0 .7.7c.56-.55 1.1-1.09 1.65-1.64l1.25 1.25l-.9.9a.52.52 0 0 0-.14.36a.5.5 0 0 0 .14.35a.513.513 0 0 0 .71 0l.9-.9l1.26 1.26l-1.65 1.64a.5.5 0 0 0 .71.71c.55-.56 1.09-1.1 1.65-1.64l1.23 1.23a.5.5 0 0 1 0 .7l-3.86 3.86a.5.5 0 0 1-.71 0L4.209 8.77a.5.5 0 0 1-.15-.36a.5.5 0 0 1 .15-.35l3.86-3.86a.51.51 0 0 1 .7 0l1.24 1.24Z"
              />

            <path
              fill="currentColor"
              d="m18.939 12.96l-.04-.04c.01 0 .01 0 .02.01s.02.02.02.03"
            />
          </svg>
        </UiIconButton>
        <span v-if="isSnappingEnabled" class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--primary,theme(colors.blue.600))] ring-2 ring-slate-900/60"></span>
      </div>
    </UiTooltip>

    <!-- Lock / Unlock -->
    <UiTooltip
      v-if="isElementSelected && !isElementRestricted"
      :label="isElementLocked ? 'Desbloquear elemento (L)' : 'Bloquear elemento (L)'"
      :delay="200"
    >
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-white/[.06] text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
        @click.stop="$emit('toggle-lock')"
        :state="isElementLocked ? 'on' : 'off'"
        :aria-label="isElementLocked ? 'Desbloquear elemento (L)' : 'Bloquear elemento (L)'"
        :aria-pressed="isElementLocked ? 'true' : 'false'"
        :class="{ 'text-amber-400': isElementLocked }"
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
    <UiTooltip v-if="isElementSelected && !isElementRestricted" label="Borrar elemento (Supr)" :delay="200">
      <UiIconButton
        class="hover:bg-white/[0.06]"
        aria-label="Borrar elemento (Supr)"
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
      v-if="isElementSelected && !isContainer && !isElementRestricted"
      label="(DEV) Asignar datos de uso"
      :delay="200"
    >
      <UiIconButton
        class="relative z-10 grid h-[36px] w-[36px] place-items-center rounded-[12px] bg-transparent hover:bg-white/[.06] text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary,theme(colors.blue.600))]/40 data-[state=on]:bg-white/10 data-[state=on]:ring-1 data-[state=on]:ring-white/15 data-[state=off]:opacity-70"
        @click.stop="$emit('fill-container')"
        aria-label="Asignar datos de uso"
        state="off"
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
  isElementRestricted: { type: Boolean, default: false },
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
