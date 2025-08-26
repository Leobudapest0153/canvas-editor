<!-- components/FloatingToolbar.vue -->
<template>
  <div
    class="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-gray-900/70 p-2 shadow-lg backdrop-blur-sm"
  >

    <!-- Switch de Modo Edición / Arrastre -->
    <div class="relative flex items-center rounded-full bg-gray-700/50 p-1">
      <div
        class="absolute left-1 top-1 h-10 w-10 rounded-full bg-blue-600 shadow-md transition-transform duration-300 ease-in-out"
        :style="{ transform: activeMode === 'edit' ? 'translateX(100%)' : 'translateX(0)' }"
      ></div>
      <button
        @click.stop="$emit('set-mode', 'drag')"
        class="relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200;
"
        title="Modo Arrastre (Mover el lienzo)"
      >
        <!-- Icono de Mano (Arrastre) -->
        <svg
          class="h-6 w-6"
          :class="activeMode === 'drag' ? 'fill-white' : 'fill-gray-300'"
          viewBox="0 0 24 24"
        >
        <path 
            d="M21 7C21 5.62 19.88 4.5 18.5 4.5C18.33 4.5 18.16 4.5 18 4.55V4C18 2.62 16.88 1.5 15.5 1.5C15.27 1.5 15.04 1.53 14.83 1.59C14.46 .66 13.56 0 12.5 0C11.27 0 10.25 .89 10.04 2.06C9.87 2 9.69 2 9.5 2C8.12 2 7 3.12 7 4.5V10.39C6.66 10.08 6.24 9.85 5.78 9.73L5 9.5C4.18 9.29 3.31 9.61 2.82 10.35C2.44 10.92 2.42 11.66 2.67 12.3L5.23 18.73C6.5 21.91 9.57 24 13 24C17.42 24 21 20.42 21 16V7M19 16C19 19.31 16.31 22 13 22C10.39 22 8.05 20.41 7.09 18L4.5 11.45L5 11.59C5.5 11.71 5.85 12.05 6 12.5L7 15H9V4.5C9 4.22 9.22 4 9.5 4S10 4.22 10 4.5V12H12V2.5C12 2.22 12.22 2 12.5 2S13 2.22 13 2.5V12H15V4C15 3.72 15.22 3.5 15.5 3.5S16 3.72 16 4V12H18V7C18 6.72 18.22 6.5 18.5 6.5S19 6.72 19 7V16Z" />
            />
        </svg>
      </button>
      <button
        @click.stop="$emit('set-mode', 'edit')"
        class="relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200"
        title="Modo Edición (Seleccionar y mover elementos)"
      >
        <!-- Icono de Puntero (Edición) -->
        <svg
          class="h-6 w-6"
          :class="activeMode === 'edit' ? 'fill-white' : 'fill-gray-300'"
          viewBox="0 0 24 24"
        >
          <path
            d="M13.64,21.97C13.14,22.21 12.54,22 12.31,21.5L10.13,16.76L7.62,18.78C7.45,18.92 7.24,19 7,19A1,1 0 0,1 6,18V3A1,1 0 0,1 7,2C7.24,2 7.47,2.09 7.64,2.23L7.65,2.22L19.14,11.86C19.57,12.22 19.62,12.85 19.27,13.27C19.12,13.45 18.91,13.57 18.7,13.61L15.54,14.23L17.74,18.96C18,19.46 17.76,20.05 17.26,20.28L13.64,21.97Z"
          />
        </svg>
      </button>
    </div>

    <!-- Separador y Bloqueo -->
    <template v-if="isElementSelected">
      <div class="h-6 w-px bg-gray-100/70"></div>
      <button @click.stop="$emit('toggle-lock')" 
        class="flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40" 
        :class="`${isElementLocked ? 'bg-amber-600 hover:bg-amber-500' : 'hover:bg-gray-700/80'}`"
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
          class="h-6 w-6 text-gray-300" 
          fill="currentColor" 
          viewBox="0 0 24 24">
          <path 
            d="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z" 
          />
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
})

defineEmits(['set-mode', 'toggle-lock'])
</script>

