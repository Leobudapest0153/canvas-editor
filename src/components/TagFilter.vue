<!-- src/components/TagFilter.vue -->
<template>
  <div class="relative">
    <label class="block text-xs font-medium text-gray-700 mb-1 tracking-wide">Etiquetas:</label>
    <div
      class="w-full flex flex-wrap items-center gap-1 p-1 border border-gray-300 rounded-md bg-white"
    >
      <!-- Chips de etiquetas seleccionadas -->
      <div
        v-for="etiquetaId in tagStore.etiquetasSeleccionadas"
        :key="etiquetaId"
        class="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded"
        :style="{
          backgroundColor: tagStore.getEtiquetaPorId(etiquetaId)?.colorFondo,
          color: tagStore.getEtiquetaPorId(etiquetaId)?.colorTexto,
        }"
      >
        <span>{{ tagStore.getEtiquetaPorId(etiquetaId)?.texto }}</span>
        <button @click="tagStore.deseleccionarEtiqueta(etiquetaId)" class="hover:opacity-75">
          &#x2715;
        </button>
      </div>
      <!-- Input de búsqueda -->
      <input
        v-model="busqueda"
        type="text"
        placeholder="Buscar o crear etiqueta..."
        class="flex-grow p-1 text-sm outline-none"
        @focus="dropdownAbierto = true"
        @blur="cerrarDropdownConRetraso"
        @keydown.down.prevent="moverSeleccion(1)"
        @keydown.up.prevent="moverSeleccion(-1)"
        @keydown.enter.prevent="seleccionarConEnter"
      />
    </div>

    <!-- Dropdown de sugerencias -->
    <div
      v-if="dropdownAbierto && sugerencias.length > 0"
      class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20"
    >
      <ul>
        <li
          v-for="(sugerencia, index) in sugerencias"
          :key="sugerencia.id"
          class="px-3 py-2 text-sm cursor-pointer"
          :class="{ 'bg-blue-100 text-blue-800': index === activeIndex }"
          @mousedown.prevent="seleccionarSugerencia(sugerencia)"
          @mouseover="activeIndex = index"
        >
          <span v-if="sugerencia.id === 'CREATE_NEW'">
            + Crear etiqueta: "<strong>{{ sugerencia.texto }}</strong
            >"
          </span>
          <span v-else>{{ sugerencia.texto }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import {useCanvasStore} from '@/composables/useCanvasStore'
import { ref, computed, watch } from 'vue'

const emit = defineEmits(['crear-etiqueta'])

const tagStore = useCanvasStore();
const busqueda = ref('')
const dropdownAbierto = ref(false)
const activeIndex = ref(0) // NUEVO: Para rastrear la selección del teclado

// NUEVO: Reiniciar el índice activo cuando cambia la búsqueda
watch(busqueda, () => {
  activeIndex.value = 0
})

const sugerencias = computed(() => {
  // Usamos tagStore.etiquetas en lugar de tagStore.todasLasEtiquetas
  const opcionesFiltradas = tagStore.etiquetas.filter(
    (etiqueta) =>
      etiqueta.texto.toLowerCase().includes(busqueda.value.toLowerCase()) &&
      !tagStore.etiquetasSeleccionadas.includes(etiqueta.id)
  )

  const opciones = []

  if (busqueda.value.trim() !== '') {
    opciones.push({
      id: 'CREATE_NEW',
      texto: busqueda.value.trim(),
    })
  }

  return [...opciones, ...opcionesFiltradas]
})

const seleccionarSugerencia = (sugerencia) => {
  if (sugerencia.id === 'CREATE_NEW') {
    emit('crear-etiqueta', sugerencia.texto)
  } else {
    tagStore.seleccionarEtiqueta(sugerencia.id)
  }
  busqueda.value = ''
  dropdownAbierto.value = false
}

const cerrarDropdownConRetraso = () => {
  setTimeout(() => {
    dropdownAbierto.value = false
  }, 200)
}

// NUEVO: Lógica para mover la selección con flechas
const moverSeleccion = (direccion) => {
  if (sugerencias.value.length === 0) return
  activeIndex.value += direccion
  if (activeIndex.value < 0) {
    activeIndex.value = sugerencias.value.length - 1
  } else if (activeIndex.value >= sugerencias.value.length) {
    activeIndex.value = 0
  }
}

// NUEVO: Lógica para seleccionar con la tecla Enter
const seleccionarConEnter = () => {
  if (dropdownAbierto.value && sugerencias.value.length > 0 && activeIndex.value >= 0) {
    seleccionarSugerencia(sugerencias.value[activeIndex.value])
  }
}
</script>
