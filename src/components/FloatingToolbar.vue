<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl bg-white p-2 shadow-lg backdrop-blur-sm"
  >

    <!-- Switch de Modo Edición / Arrastre -->
    <div class="relative flex items-center rounded-xl bg-gray-200/50 p-1">
      <div
        class="absolute left-1 top-1 h-8 w-8 rounded-lg bg-blue-600 shadow-md transition-transform duration-300 ease-in-out"
        :style="{ transform: activeMode === 'edit' ? 'translateX(100%)' : 'translateX(0)' }"
      ></div>
      <button
        @click.stop="$emit('set-mode', 'drag')"
        class="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer"
        title="Modo Arrastre (Mover el lienzo)"
      >
        <!-- Icono de Mano (Arrastre) -->
        <svg
          class="w-6"
          :class="activeMode === 'drag' ? 'fill-white' : 'fill-gray-700'"
          viewBox="0 0 24 24"
        >
        <path
          fill-rule="evenodd"
          d="M12.997 8.62H13V10a.5.5 0 0 0 1 0V5.923A1 1 0 0 1 15.997 6v2.62H16V10a.5.5 0 0 0 1 0V8a1 1 0 1 1 2 0v.62h.01v4.743q0 .074-.01.143l-.007.07a6.773 6.773 0 0 1-6.756 6.287q-.243 0-.47-.01c-1.535-.07-2.885-.786-4.107-1.92-1.23-1.141-2.28-2.66-3.188-4.219-.289-.495-.486-.88-.555-1.193a.6.6 0 0 1-.016-.263c.007-.029.022-.071.087-.135a.57.57 0 0 1 .517-.173c.224.03.518.165.807.434l.001.002 1 .945A1 1 0 0 0 8 12.604V6a1 1 0 0 1 2 0v4a.5.5 0 0 0 1 0V5a1 1 0 1 1 2 0v.89l-.003.11zM7 8.5V6a2 2 0 0 1 3.112-1.662 2 2 0 0 1 3.775-.002A2 2 0 0 1 16.997 6v.27A2 2 0 0 1 20 8v.5h.01v4.863q0 .144-.02.284a7.773 7.773 0 0 1-7.753 7.216q-.266 0-.516-.012c-3.682-.167-6.256-3.449-8.113-6.633-.565-.969-1.11-2.043-.316-2.812.793-.77 1.898-.505 2.705.25l.003.003 1 .945z" />
        </svg>
      </button>
      <button
        @click.stop="$emit('set-mode', 'edit')"
        class="relative cursor-pointer z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200"
        title="Modo Edición (Seleccionar y mover elementos)"
      >
        <!-- Icono de Puntero (Edición) -->
        <svg
          class="w-6 ml-px"
          viewBox="0 0 24 24"
        >
        <path 
          fill="none" 
          stroke="currentColor" 
          stroke-width="1.2" 
          :class="activeMode === 'edit' ? '!stroke-white' : 'stroke-gray-700'"
          d="M8.084 20.276c-1.06 1.38-3.264.66-3.306-1.079L4.443 5.392C4.407 3.932 6 3.012 7.247 3.773l11.788 7.192c1.485.906 1.006 3.176-.719 3.403l-5.581.738a1.84 1.84 0 0 0-1.221.705z"/>
        </svg>
      </button>
    </div>

    <!-- Separador y Snapping -->
    <div class="h-6 w-px bg-gray-300/70"></div>

    <button @click.stop="$emit('toggle-snapping')"
      class="flex cursor-pointer h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 relative group"
      :class="`${isSnappingEnabled ? 'bg-red-600 hover:bg-red-500' : 'hover:bg-gray-700/80'}`"
      :title="isSnappingEnabled ? 'Desactivar Object Snapping' : 'Activar Object Snapping'">
      <!-- Indicador de actividad -->
      <div 
        v-if="isSnappingEnabled"
        class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-xl border-2 border-gray-900 animate-pulse"
      ></div>
      <svg
        class="h-6 w-6 transition-transform duration-200"
        :class="[
          isSnappingEnabled ? 'text-white scale-110' : 'text-gray-400 group-hover:text-gray-100 scale-100'
        ]"
        fill="currentColor"
        viewBox="0 0 24 24">
        <path
          d="M12,2A2,2 0 0,1 14,4C14,5.11 13.1,6 12,6C10.89,6 10,5.1 10,4A2,2 0 0,1 12,2M21,9V7L17,3H15V5H16.59L19,7.41V9H21M15,19V21H17L21,17V15H19V16.59L16.59,19H15M9,21V19H7.41L5,16.59V15H3V17L7,21H9M3,9H5V7.41L7.41,5H9V3H7L3,7V9M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z"
        />
      </svg>
    </button>
    <button
      v-if="isElementSelected"
      @click.stop="$emit('toggle-lock')" 
      class="flex h-8 w-8 cursor-pointer items-center group justify-center rounded-xl transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40" 
      :class="`${isElementLocked ? 'bg-amber-500 hover:bg-amber-600' : 'hover:bg-gray-700/80'}`"
      :title="isElementLocked ? 'Desbloquear' : 'Bloquear'"
    >
      <svg
        v-if="isElementLocked"
        class="w-[26px] text-white"
        fill="currentColor"
        viewBox="0 0 48 48"
      >
      <path 
        fill="none" 
        stroke="currentColor" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        d="M11.51 20.609h24.98c.947 0 1.715.768 1.715 1.715v18.46c0 .948-.768 1.716-1.715 1.716H11.51a1.715 1.715 0 0 1-1.715-1.715V22.324c0-.947.768-1.715 1.715-1.715m3.088-5.744a9.394 9.394 0 0 1 18.788 0v5.744" 
        stroke-width="2.5"
      />

      <circle cx="23.992" cy="31.554" r="3.643" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>
      </svg>
      <svg 
        v-else 
        class="w-6 text-gray-400 group-hover:text-gray-100" 
        fill="currentColor" 
        viewBox="0 0 48 48"
      >
        <path 
          fill="none" 
          stroke="currentColor" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          d="M10.17 19.26h27.66a1.9 1.9 0 0 1 1.898 1.9V41.6a1.9 1.9 0 0 1-1.899 1.9H10.171a1.9 1.9 0 0 1-1.9-1.9V21.16a1.9 1.9 0 0 1 1.9-1.9m3.419 0V14.9a10.401 10.401 0 0 1 20.803 0v4.36" 
          stroke-width="2.5"
        />

        <circle cx="23.991" cy="31.38" r="4.034" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>
      </svg>
    </button>
    <button
      v-if="isElementSelected"
      @click.stop="$emit('delete')"
      class="flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200 group disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-700/80 cursor-pointer text-gray-400"
      title="Eliminar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="h-6 w-6 text-gray-400 group-hover:text-gray-100"
      >
      <path 
        fill="none" 
        stroke="currentColor" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="1.2" 
        d="m20 9l-1.995 11.346A2 2 0 0 1 16.035 22h-8.07a2 2 0 0 1-1.97-1.654L4 9m17-3h-5.625M3 6h5.625m0 0V4a2 2 0 0 1 2-2h2.75a2 2 0 0 1 2 2v2m-6.75 0h6.75"
      />
      </svg>
    </button>
    <button 
      v-if="isContainer && isElementSelected"
      @click.stop="$emit('fill-container')"
      class="flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200 group disabled:cursor-not-allowed disabled:opacity-40 hover:bg-green-700/80 cursor-pointer"
      title="Llenar contenedor"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24"
        fill="currentColor"
        class="h-6 w-6 text-gray-400 group-hover:text-gray-100"
      >
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"><path d="M10 14a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M5.001 8H19a2 2 0 0 1 1.977 2.304l-1.255 7.152A3 3 0 0 1 16.756 20H7.244a3 3 0 0 1-2.965-2.544l-1.255-7.152A2 2 0 0 1 5.001 8M17 10l-2-6m-8 6l2-6"/></g>
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

defineEmits(['set-mode', 'toggle-lock', 'toggle-snapping', 'fill-container', 'delete'])
</script>

