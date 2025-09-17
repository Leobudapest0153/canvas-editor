<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div
      class="bg-white rounded-lg shadow-xl max-w-[96vw] w-[1000px] max-h-[95vh] overflow-y-auto"
      @click.stop
    >
      <div class="flex justify-between items-center p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-800">Crear Nuevo Elemento</h2>
        <button @click="onCancel" class="text-gray-400 hover:text-gray-600 cursor-pointer">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div class="flex flex-col md:flex-row gap-6 p-6">
        <!-- Columna izquierda: Canvas Vue-Konva -->
        <!-- <div class="w-full md:w-2/3 flex flex-col items-center justify-start relative">
          <h3 class="text-lg font-medium text-gray-800 mb-3">Vista de frente</h3>
        </div> -->
        <!-- Columna derecha: Formulario y preview -->
        <form @submit.prevent="handleSubmit" class="w-full">
          <div class="max-h-[70vh] overflow-y-auto pr-2">
            <!-- Información básica -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  v-model="localElemento.nombre"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                  placeholder="Ej: Mesa de trabajo personalizada"
                  required
                />
              </div>
              <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700">Categoría</label>
                <select
                  v-model="localElemento.categoria"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">
                    {{ categoria.nombre }}
                  </option>
                </select>
              </div>
              <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700">Forma de la base</label>
                <select
                  v-model="localElemento.forma"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option v-for="forma in formas" :key="forma.id" :value="forma.id">
                    {{ forma.nombre }}
                  </option>
                </select>
              </div>
              <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700">Ubicación</label>
                <select
                  v-model="localElemento.ubicacion"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option
                    v-for="ubicacion in ubicaciones"
                    :key="ubicacion.id"
                    :value="ubicacion.id"
                  >
                    {{ ubicacion.nombre }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Altura respecto al suelo (solo para elementos de pared) -->
            <div v-if="localElemento.ubicacion === 'pared'" class="mb-6">
              <h3 class="text-lg font-medium text-gray-800 mb-3">Posicionamiento en Pared</h3>
              <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700"
                  >Altura respecto al suelo (cm)</label
                >
                <input
                  v-model.number="localElemento.alturaRespectoAlSuelo"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                  placeholder="Ej: 80"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Distancia desde el suelo hasta la base del elemento
                </p>
              </div>
            </div>

            <!-- Dimensiones -->
            <div class="mb-6">
              <h3 class="text-lg font-medium text-gray-800 mb-3">Dimensiones (cm)</h3>
              <div class="grid grid-cols-3 gap-4">
                <div class="mb-2">
                  <label class="block text-sm font-medium text-gray-700">Ancho</label>
                  <input
                    v-model.number="localElemento.dimensiones.ancho"
                    type="number"
                    min="1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                    required
                  />
                </div>
                <div class="mb-2">
                  <label class="block text-sm font-medium text-gray-700">Largo</label>
                  <input
                    v-model.number="localElemento.dimensiones.largo"
                    type="number"
                    min="1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                    required
                    :disabled="esFormaCircular"
                  />
                </div>
                <div class="mb-2">
                  <label class="block text-sm font-medium text-gray-700">Alto</label>
                  <input
                    v-model.number="localElemento.dimensiones.alto"
                    type="number"
                    min="1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                    required
                  />
                </div>
              </div>
            </div>
            <!-- Especificaciones -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700">Capacidad de Carga (kg)</label>
                <input
                  v-model.number="localElemento.pesoMaximo"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
                  required
                />
                <p class="text-xs text-gray-500 mt-1">
                  Peso máximo teórico que este elemento puede soportar
                </p>
                <p v-if="elementoEditandoInfo.mostrarInfo" class="text-xs mt-1" :class="elementoEditandoInfo.claseColor">
                  {{ elementoEditandoInfo.mensaje }}
                </p>
              </div>
              <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700">Color Base</label>
                <div class="flex gap-2">
                  <input
                    v-model="localElemento.colorBase"
                    type="color"
                    class="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    v-model="localElemento.colorBase"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base flex-1"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
            <!-- Descripción -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700">Descripción</label>
              <textarea
                v-model="localElemento.descripcion"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base resize-none"
                rows="3"
                placeholder="Descripción del elemento..."
              ></textarea>
            </div>
            <!-- Preview del nuevo elemento -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 class="text-lg font-medium text-gray-800 mb-3">Vista Previa (desde arriba)</h3>
              <div class="flex items-center p-3 bg-white rounded border">
                <div
                  :class="[
                    localElemento.forma === 'circular' ? 'w-10 h-10' : 'w-12 h-8',
                    'rounded flex items-center justify-center relative shadow-sm border border-white/20',
                    `shape-${localElemento.forma}`,
                    localElemento.ubicacion === 'pared' ? 'wall-mounted' : '',
                  ]"
                  :style="{ backgroundColor: localElemento.colorBase || '#6b7280' }"
                >
                  <!-- <component :is="getIconComponent('box')" class="w-4 h-4 text-white" /> -->
                </div>
                <div class="ml-3">
                  <p class="font-medium">{{ localElemento.nombre || 'Nuevo Elemento' }}</p>
                  <p class="text-sm text-gray-500">
                    {{ localElemento.dimensiones.ancho || 0 }}×{{
                      localElemento.dimensiones.largo || 0
                    }}×{{ localElemento.dimensiones.alto || 0 }} cm
                  </p>
                </div>
              </div>
            </div>
          </div>
          <!-- Botones del formulario -->
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="onCancel"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
            >
              Crear Elemento
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import {
  validateWallZBaseRequired,
  validateHeightWithinWarehouse,
  errorsPlacement,
} from '@/inventory-smart/validation/placementOrchestrator'
import { useToast } from '@/inventory-smart/composables/useToast'
const { showToast } = useToast()

const props = defineProps({
  visible: Boolean,
  categorias: Array,
  formas: Array,
  ubicaciones: Array,
  value: Object,
})
const emit = defineEmits(['cancel', 'save'])

const weightValidation = useWeightValidation()
const canvasStore = useCanvasStore()

const esFormaCircular = computed(() => localElemento.value.forma === 'circular')

// Información sobre el peso para elementos que estamos editando
const elementoEditandoInfo = computed(() => {
  // Si no estamos editando un elemento existente o no tiene ID, no mostrar información
  if (!props.value || !props.value.id) {
    return { mostrarInfo: false, mensaje: '', claseColor: '' };
  }

  const elementoId = props.value.id;
  const tipoElemento = props.value.tipo || 'elementos';
  const resultado = weightValidation.calcularPesoDisponible(elementoId, tipoElemento);

  // Si no hay límite de peso, no mostrar información
  if (!resultado.limiteDePeso) {
    return { mostrarInfo: false, mensaje: '', claseColor: '' };
  }

  // Mostrar información sobre el peso actual
  const pesoActual = resultado.usado;
  let mensaje = `Peso actual de elementos contenidos: ${pesoActual} kg`;
  let claseColor = 'text-gray-600';

  // Si el peso máximo que está configurando es menor al actual, mostrar advertencia
  if (localElemento.value.pesoMaximo < pesoActual) {
  mensaje += ` (la capacidad debe ser al menos ${pesoActual} kg)`;
    claseColor = 'text-red-600';
  }

  return {
    mostrarInfo: true,
    mensaje,
    claseColor
  };
})

// const getIconComponent = (iconType) => {
//   // Retorna un componente SVG simple (placeholder)
//   return 'svg'
// }

const localElemento = ref({
  nombre: '',
  categoria: '',
  forma: '',
  colorBase: '#3b82f6',
  dimensiones: { ancho: 100, largo: 100, alto: 75 },
  pesoMaximo: 50,
  ubicacion: 'suelo',
  alturaRespectoAlSuelo: 0,
  descripcion: '',
  icono: 'box',
  contenedores: [],
})

watch(
  () => props.value,
  (val) => {
    if (val) {
      localElemento.value = JSON.parse(JSON.stringify(val))
    }
  },
  { immediate: true, deep: true },
)

// Vigilar cuando cambia la forma para actualizar dimensiones si es circular
watch(
  () => localElemento.value.forma,
  (nuevaForma) => {
    if (nuevaForma === 'circular') {
      // Si es circular, hacer que largo sea igual a ancho
      localElemento.value.dimensiones.largo = localElemento.value.dimensiones.ancho
    }
  },
)

// Vigilar cuando cambia el ancho para actualizar el largo si es circular
watch(
  () => localElemento.value.dimensiones.ancho,
  (nuevoAncho) => {
    if (esFormaCircular.value) {
      localElemento.value.dimensiones.largo = nuevoAncho
    }
  },
)

// Restablecer el formulario cuando el modal se abre
watch(
  () => props.visible,
  (esVisible) => {
    if (esVisible && !props.value) {
      // Si se abre el modal y no hay valor previo, restablecer el formulario
      restablecerFormulario()
    }
  },
)

// Función para restablecer el formulario a valores iniciales
const restablecerFormulario = () => {
  localElemento.value = {
    nombre: '',
    categoria: '',
    forma: '',
    colorBase: '#3b82f6',
    dimensiones: { ancho: 100, largo: 100, alto: 75 },
    pesoMaximo: 50,
    ubicacion: 'suelo',
    alturaRespectoAlSuelo: 0,
    descripcion: '',
    icono: 'box',
    contenedores: [],
  }
}

const onCancel = () => {
  emit('cancel')
  restablecerFormulario()
}

const validarFormulario = () => {
  const elemento = localElemento.value
  if (!elemento.nombre.trim()) {
    showToast('El nombre es requerido', 'error')
    return false
  }
  if (!elemento.categoria) {
    showToast('La categoría es requerida', 'error')
    return false
  }
  if (!elemento.forma) {
    showToast('La forma es requerida', 'error')
    return false
  }
  if (!elemento.ubicacion) {
    showToast('La ubicación es requerida', 'error')
    return false
  }
  if (
    elemento.dimensiones.ancho <= 0 ||
    elemento.dimensiones.largo <= 0 ||
    elemento.dimensiones.alto <= 0
  ) {
    showToast('Las dimensiones deben ser mayores a 0', 'error')
    return false
  }
  if (elemento.pesoMaximo <= 0) {
    showToast('La capacidad de carga debe ser mayor a 0', 'error')
    return false
  }
  const ctx = {
    alturaBodega: canvasStore.plantaPorId(canvasStore.plantaActiva)?.dimensiones?.alto,
  }
  for (const v of [validateWallZBaseRequired, validateHeightWithinWarehouse]) {
    const res = v(null, elemento, ctx)
    if (res.valid === false) {
      showToast(errorsPlacement[res.code], 'error')
      return false
    }
  }
  return true
}

const handleSubmit = () => {
  if (!validarFormulario()) return

  // Si estamos editando un elemento existente, validar el peso máximo
  if (props.value && props.value.id) {
    const elementoId = props.value.id;
    const nuevoPesoMaximo = localElemento.value.pesoMaximo;

    // Calculamos el peso total actual de los elementos hijos
    const tipoElemento = props.value.tipo || 'elementos';
    const resultado = weightValidation.calcularPesoDisponible(elementoId, tipoElemento);
    const pesoActualHijos = resultado.usado;

    // Si el nuevo peso máximo es menor que el peso actual de los hijos, mostrar error
    if (resultado.limiteDePeso && nuevoPesoMaximo < pesoActualHijos) {
      showToast(`La capacidad debe ser al menos ${pesoActualHijos} kg para soportar los elementos que contiene.`, 'error');
      return;
    }
  }

  emit('save', { ...localElemento.value })
  restablecerFormulario()
}
</script>

<style scoped>
.shape-rectangular {
  border-radius: 0.125rem;
}
.shape-circular {
  border-radius: 9999px;
}

.wall-mounted::after {
  content: '';
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 0.5rem;
  height: 0.5rem;
  background: #f97316;
  border-radius: 9999px;
}
</style>
