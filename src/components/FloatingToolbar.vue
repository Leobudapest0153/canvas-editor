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
        class="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200;
"
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
        class="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200"
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

    <!-- Separador y Bloqueo -->
    <template v-if="isElementSelected">
      <div class="h-6 w-px bg-gray-300/70"></div>
      <button @click.stop="$emit('toggle-lock')" 
        class="flex h-8 w-8 items-center group justify-center rounded-xl transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40" 
        :class="`${isElementLocked ? 'bg-amber-500 hover:bg-amber-600' : 'hover:bg-gray-400/80'}`"
        :title="isElementLocked ? 'Desbloquear' : 'Bloquear'">
        <svg 
          v-if="isElementLocked" 
          class="h-6 w-6 text-white" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" 
          />
        </svg>
        <svg 
          v-else 
          class="h-6 w-6 text-gray-400 group-hover:text-gray-100" 
          fill="currentColor" 
          viewBox="0 0 24 24">
          <path 
            d="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z" 
          />
        </svg>
      </button>
      <button 
        v-if="isContainer"
        @click.stop="$emit('fill-container')"
        class="flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-700/80 cursor-pointer"
        title="Llenar contenedor"
      >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24"
        fill="currentColor"
        class="h-6 w-6 text-gray-300"
      >
        <path d="M3,2H6V5H3V2M6,7H9V10H6V7M8,2H11V5H8V2M17,11L12,6H15V2H19V6H22L17,11M7.5,22C6.72,22 6.04,21.55 5.71,20.9V20.9L3.1,13.44L3,13A1,1 0 0,1 4,12H20A1,1 0 0,1 21,13L20.96,13.29L18.29,20.9C17.96,21.55 17.28,22 16.5,22H7.5M7.61,20H16.39L18.57,14H5.42L7.61,20Z" />

      </svg>

      </button>
    </template>
  </div>
</template>

<script setup>
defineProps({
  activeMode: { type: String, default: 'drag' },
  isElementSelected: { type: Boolean, default: false },
  isElementLocked: { type: Boolean, default: false },
  isContainer: { type: Boolean, default: false }
})

defineEmits(['set-mode', 'toggle-lock', 'fill-container'])
</script>

