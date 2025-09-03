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
          @click.stop="onRemoveTag(etiqueta.id)"
          class="px-2 py-1 flex items-center justify-center rounded-full opacity-70 hover:opacity-100"
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
              @mousedown.prevent="onCreateTag"
              class="px-3 py-2 text-sm text-blue-600 cursor-pointer hover:bg-blue-50"
              :class="{ 'bg-blue-50': activeIndex === 0 }"
            >
              Crear nueva etiqueta: "{{ terminoBusqueda }}"
            </li>

            <li
              v-for="(sugerencia, index) in sugerenciasFiltradas"
              :key="sugerencia.id"
              @mousedown.prevent="onAddTag(sugerencia)"
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
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

// --- CAMBIOS AQUÍ ---
const props = defineProps({
  // Array de IDs de las etiquetas seleccionadas
  selectedIds: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['add', 'remove', 'create'])
// --- FIN DE CAMBIOS ---

// Store y refs
const canvasStore = useCanvasStore()
const inputRef = ref(null)
const terminoBusqueda = ref('')
const sugerenciasVisibles = ref(false)
const activeIndex = ref(-1)

// Computed properties
const selectedTags = computed(() => {
  // Ahora usa la prop en lugar del store
  return props.selectedIds.map((id) => canvasStore.getEtiquetaPorId(id)).filter(Boolean)
})

const sugerenciasFiltradas = computed(() => {
  // Ahora usa la prop para saber cuáles ya están seleccionadas
  const seleccionados = new Set(props.selectedIds)
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
    (e) => e.texto.toLowerCase() === terminoBusqueda.value.toLowerCase(),
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

// --- MÉTODOS MODIFICADOS PARA EMITIR EVENTOS ---
const onAddTag = (etiqueta) => {
  if (!etiqueta) return
  emit('add', etiqueta.id) // Emitir evento 'add' con el ID
  terminoBusqueda.value = ''
  activeIndex.value = -1
  nextTick(() => {
    focusInput()
  })
}

const onRemoveTag = (etiquetaId) => {
  emit('remove', etiquetaId) // Emitir evento 'remove' con el ID
  nextTick(() => {
    focusInput()
  })
}

const onCreateTag = () => {
  emit('create', terminoBusqueda.value) // Emitir evento 'create' con el texto
  terminoBusqueda.value = ''
  cerrarSugerencias()
}
// --- FIN DE MÉTODOS MODIFICADOS ---

const moverActivo = (direccion) => {
  const totalOpciones = sugerenciasFiltradas.value.length + (puedeCrear.value ? 1 : 0)
  if (totalOpciones === 0) return
  activeIndex.value = (activeIndex.value + direccion + totalOpciones) % totalOpciones
}

const handleEnter = () => {
  if (activeIndex.value === -1) {
    if (puedeCrear.value) onCreateTag()
    return
  }

  if (puedeCrear.value) {
    if (activeIndex.value === 0) {
      onCreateTag()
    } else {
      onAddTag(sugerenciasFiltradas.value[activeIndex.value - 1])
    }
  } else {
    onAddTag(sugerenciasFiltradas.value[activeIndex.value])
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
