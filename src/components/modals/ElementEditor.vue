<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click="onCancel"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <div class="flex justify-between items-center p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-800">Crear Nuevo Elemento</h2>
        <button @click="onCancel" class="text-gray-400 hover:text-gray-600">
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
      <form @submit.prevent="handleSubmit" class="p-6">
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
              <option value="">Seleccionar categoría</option>
              <option v-for="categoria in categorias" :key="categoria.id" :value="categoria.id">
                {{ categoria.nombre }}
              </option>
            </select>
          </div>
          <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700">Forma</label>
            <select
              v-model="localElemento.forma"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
              required
            >
              <option value="">Seleccionar forma</option>
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
              <option value="">Seleccionar ubicación</option>
              <option v-for="ubicacion in ubicaciones" :key="ubicacion.id" :value="ubicacion.id">
                {{ ubicacion.nombre }}
              </option>
            </select>
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
            <label class="block text-sm font-medium text-gray-700">Peso Máximo (kg)</label>
            <input
              v-model.number="localElemento.pesoMaximo"
              type="number"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 text-base"
              required
            />
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
          <h3 class="text-lg font-medium text-gray-800 mb-3">Vista Previa</h3>
          <div class="flex items-center p-3 bg-white rounded border">
            <div
              :class="[
                'w-12 h-8 rounded flex items-center justify-center relative shadow-sm border border-white/20',
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
        <!-- Botones del formulario -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="onCancel"
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Crear Elemento
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  visible: Boolean,
  categorias: Array,
  formas: Array,
  ubicaciones: Array,
  value: Object,
})
const emit = defineEmits(['cancel', 'save'])

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
  descripcion: '',
  icono: 'box',
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

const onCancel = () => emit('cancel')

const validarFormulario = () => {
  const elemento = localElemento.value
  if (!elemento.nombre.trim()) {
    alert('El nombre es requerido')
    return false
  }
  if (!elemento.categoria) {
    alert('La categoría es requerida')
    return false
  }
  if (!elemento.forma) {
    alert('La forma es requerida')
    return false
  }
  if (!elemento.ubicacion) {
    alert('La ubicación es requerida')
    return false
  }
  if (
    elemento.dimensiones.ancho <= 0 ||
    elemento.dimensiones.largo <= 0 ||
    elemento.dimensiones.alto <= 0
  ) {
    alert('Las dimensiones deben ser mayores a 0')
    return false
  }
  if (elemento.pesoMaximo <= 0) {
    alert('El peso máximo debe ser mayor a 0')
    return false
  }
  return true
}

const handleSubmit = () => {
  if (!validarFormulario()) return
  emit('save', { ...localElemento.value })
}
</script>

<style scoped>
.shape-rectangular {
  border-radius: 0.125rem;
}
.shape-circular {
  border-radius: 9999px;
}
.shape-triangular {
  border-radius: 0.125rem;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
.shape-cuadrado {
  border-radius: 0.125rem;
  aspect-ratio: 1/1;
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
