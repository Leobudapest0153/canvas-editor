<template>
  <div>
    <label class="block text-xs font-medium text-gray-700 mb-1 tracking-wide">Etiquetas:</label>
    <!-- Contenedor principal que simula un input -->
    <div
      @click="focusInput"
      class="w-full flex items-center flex-wrap gap-1 px-3 py-2 border border-gray-300 rounded-md bg-white cursor-text focus-within:border-blue-500 focus-within:ring focus-within:ring-blue-100"
    >
      <!-- Chips de etiquetas seleccionadas -->
      <div
        v-for="etiqueta in selectedTags"
        :key="etiqueta.id"
        class="flex items-center gap-1.5 text-xs font-medium rounded-full pl-2.5 pr-1 py-0.5"
        :style="{ backgroundColor: etiqueta.colorFondo, color: etiqueta.colorTexto }"
      >
        <span>{{ etiqueta.texto }}</span>
        <button
          @click.stop="deseleccionarEtiqueta(etiqueta.id)"
          class="w-4 h-4 flex items-center justify-center rounded-full opacity-70 hover:opacity-100"
          :style="{ backgroundColor: 'rgba(0,0,0,0.1)' }"
          title="Eliminar etiqueta"
        >
          &times;
        </button>
      </div>

      <!-- Input de búsqueda -->
      <div class="relative flex-grow">
        <input
          ref="inputRef"
          type="text"
          v-model="terminoBusqueda"
          placeholder="Buscar o crear..."
          class="w-full min-w-[100px] bg-transparent text-sm text-gray-900 outline-none border-none p-0 m-0"
          @input="handleInput"
          @keydown.down.prevent="moverActivo(1)"
          @keydown.up.prevent="moverActivo(-1)"
          @keydown.enter.prevent="handleEnter"
          @keydown.esc="cerrarSugerencias"
          @focus="sugerenciasVisibles = true"
          @blur="handleBlur"
        />

        <!-- Lista de sugerencias -->
        <transition name="unroll">
          <ul
            v-if="sugerenciasVisibles && (sugerenciasFiltradas.length > 0 || puedeCrear)"
            class="absolute top-full left-0 mt-2 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-20"
          >
            <li
              v-if="puedeCrear"
              @mousedown.prevent="crearNuevaEtiqueta"
              class="px-3 py-2 text-sm text-blue-600 cursor-pointer hover:bg-blue-50"
              :class="{ 'bg-blue-50': activeIndex === 0 }"
            >
              Crear nueva etiqueta: "{{ terminoBusqueda }}"
            </li>

            <li
              v-for="(sugerencia, index) in sugerenciasFiltradas"
              :key="sugerencia.id"
              @mousedown.prevent="seleccionarEtiqueta(sugerencia)"
              class="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100"
              :class="{ 'bg-gray-100': activeIndex === index + (puedeCrear ? 1 : 0) }"
            >
              {{ sugerencia.texto }}
            </li>
          </ul>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'

const emit = defineEmits(['crear-etiqueta'])

// Store y refs
const canvasStore = useCanvasStore()
const inputRef = ref(null)
const terminoBusqueda = ref('')
const sugerenciasVisibles = ref(false)
const activeIndex = ref(-1)

// Computed properties
const selectedTags = computed(() => {
  // --- CORRECCIÓN CLAVE AQUÍ ---
  // Mapeamos los IDs a las etiquetas completas y luego filtramos cualquier
  // resultado que sea `undefined` para evitar que el componente se rompa.
  return canvasStore.etiquetasSeleccionadas
    .map(id => canvasStore.getEtiquetaPorId(id))
    .filter(Boolean); // 'Boolean' como función elimina todos los valores "falsy" (null, undefined, etc.)
});


const sugerenciasFiltradas = computed(() => {
  const seleccionados = new Set(canvasStore.etiquetasSeleccionadas)
  const termino = terminoBusqueda.value.toLowerCase()

  return canvasStore.etiquetas.filter((etiqueta) => {
    const noSeleccionada = !seleccionados.has(etiqueta.id)
    if (!termino) return noSeleccionada
    return noSeleccionada && etiqueta.texto.toLowerCase().includes(termino)
  })
})

const puedeCrear = computed(() => {
  if (!terminoBusqueda.value) return false
  const busquedaExacta = canvasStore.etiquetas.some(
    (e) => e.texto.toLowerCase() === terminoBusqueda.value.toLowerCase()
  )
  return !busquedaExacta
})

// Métodos
const focusInput = () => {
  inputRef.value?.focus()
}

const handleInput = () => {
  sugerenciasVisibles.value = true
  activeIndex.value = -1
}

const handleBlur = () => {
  setTimeout(() => {
    sugerenciasVisibles.value = false
  }, 200)
}

const cerrarSugerencias = () => {
  sugerenciasVisibles.value = false
  activeIndex.value = -1
}

const seleccionarEtiqueta = (etiqueta) => {
  if (!etiqueta) return
  canvasStore.seleccionarEtiqueta(etiqueta.id)
  terminoBusqueda.value = ''
  activeIndex.value = -1
  nextTick(() => {
    focusInput()
  })
}

const deseleccionarEtiqueta = (etiquetaId) => {
  canvasStore.deseleccionarEtiqueta(etiquetaId)
  nextTick(() => {
    focusInput()
  })
}

const crearNuevaEtiqueta = () => {
  emit('crear-etiqueta', terminoBusqueda.value)
  terminoBusqueda.value = ''
  cerrarSugerencias()
}

const moverActivo = (direccion) => {
  const totalOpciones = sugerenciasFiltradas.value.length + (puedeCrear.value ? 1 : 0)
  if (totalOpciones === 0) return
  activeIndex.value = (activeIndex.value + direccion + totalOpciones) % totalOpciones
}

const handleEnter = () => {
  if (activeIndex.value === -1) {
    if (puedeCrear.value) crearNuevaEtiqueta()
    return
  }

  if (puedeCrear.value) {
    if (activeIndex.value === 0) {
      crearNuevaEtiqueta()
    } else {
      seleccionarEtiqueta(sugerenciasFiltradas.value[activeIndex.value - 1])
    }
  } else {
    seleccionarEtiqueta(sugerenciasFiltradas.value[activeIndex.value])
  }
}
</script>

<style scoped>
.unroll-enter-active,
.unroll-leave-active {
  transition: all 0.2s ease-out;
  transform-origin: top;
}
.unroll-enter-from,
.unroll-leave-to {
  opacity: 0;
  transform: scaleY(0.9);
}
</style>
