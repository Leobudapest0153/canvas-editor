<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200" data-properties-panel>
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800">Propiedades</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-4" v-if="elementoSeleccionado">
      <details open class="mb-4">
        <summary class="text-sm font-medium text-gray-700 cursor-pointer">Información general</summary>
        <div class="mt-2 space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              v-model="edits.nombre"
              @input="actualizar('nombre', edits.nombre)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <input
                :value="tipoNombre"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <input
                :value="categoriaNombre"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 capitalize"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
            <div class="flex items-center gap-3">
              <input
                type="color"
                v-model="edits.color"
                @input="actualizar('color', edits.color)"
                class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                v-model="edits.color"
                @input="actualizar('color', edits.color)"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </details>

      <details class="mb-4">
        <summary class="text-sm font-medium text-gray-700 cursor-pointer">Dimensiones (cm)</summary>
        <div class="mt-2 space-y-3">
          <div v-if="mostrarAncho">
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ mostrarDiametro ? 'Diámetro (cm)' : 'Ancho (cm)' }}</label>
            <input
              type="number"
              min="0"
              :value="dimensiones.ancho"
              @change="actualizarDimension('ancho', $event.target.value)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div v-if="mostrarLargo">
            <label class="block text-xs font-medium text-gray-600 mb-1">Largo (cm)</label>
            <input
              type="number"
              min="0"
              :value="dimensiones.largo"
              @change="actualizarDimension('largo', $event.target.value)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Alto (cm)</label>
            <input
              type="number"
              min="0"
              :value="dimensiones.alto"
              @change="actualizarDimension('alto', $event.target.value)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <p
          v-if="esAnaquelOEstante && !cumpleAlturaMinima"
          class="text-xs text-red-600 mt-2"
        >
          Advertencia: altura mínima desde el suelo {{ alturaMinima.toFixed(0) }}cm
        </p>
      </details>

      <details v-if="mostrarCapacidad" class="mb-4">
        <summary class="text-sm font-medium text-gray-700 cursor-pointer">Capacidad</summary>
        <div class="mt-2 space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Capacidad de carga (kg)</label>
            <input
              type="number"
              min="0"
              v-model.number="edits.pesoMaximo"
              @change="actualizar('pesoMaximo', edits.pesoMaximo)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div v-if="esContenedor">
            <label class="block text-xs font-medium text-gray-600 mb-1">Volumen (m³)</label>
            <input
              type="number"
              :value="volumen"
              disabled
              class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500"
            />
          </div>
        </div>
      </details>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-4 text-center text-gray-500">
      Selecciona un elemento para ver sus propiedades
    </div>

    <div v-if="elementoSeleccionado" class="p-4 border-t border-gray-200 bg-white">
      <button
        @click="deseleccionarElemento"
        class="w-full cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
      >
        Deseleccionar
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore.js'
import { TIPOS_ENTIDAD, TODAS_LAS_CATEGORIAS } from '@/utils/constants'

const canvasStore = useCanvasStore()

const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)

const edits = ref({ nombre: '', color: '#3B82F6', pesoMaximo: 0 })
const dimensiones = ref({ ancho: 0, largo: 0, alto: 0 })

watch(
  elementoSeleccionado,
  el => {
    if (el) {
      edits.value = {
        nombre: el.nombre || '',
        color: el.color || '#3B82F6',
        pesoMaximo: el.pesoMaximo ?? 0
      }
      dimensiones.value = {
        ancho: el.dimensiones?.ancho || 0,
        largo: el.dimensiones?.largo || 0,
        alto: el.dimensiones?.alto || 0
      }
    }
  },
  { immediate: true }
)

function actualizar(prop, val) {
  if (!elementoSeleccionado.value) return
  if (prop === 'pesoMaximo' && (val === '' || Number(val) < 0)) return
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, { [prop]: val })
}

function actualizarDimension(campo, val) {
  const num = Number(val)
  if (!elementoSeleccionado.value || isNaN(num) || num < 0) return
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, { dimensiones: { [campo]: num } })
  dimensiones.value[campo] = num
}

function deseleccionarElemento() {
  canvasStore.elementoSeleccionado = null
  canvasStore.mostrarPropiedades = false
}

const tipoNombre = computed(() => {
  const info = TIPOS_ENTIDAD.find(t => t.id === elementoSeleccionado.value?.tipo)
  return info?.nombre || ''
})

const categoriaNombre = computed(() => {
  const info = TODAS_LAS_CATEGORIAS.find(c => c.id === elementoSeleccionado.value?.categoria)
  return info?.nombre || ''
})

const esContenedor = computed(() => elementoSeleccionado.value?.categoria === 'contenedores')
const esAnaquelOEstante = computed(() => ['anaqueles', 'estantes'].includes(elementoSeleccionado.value?.categoria))
const mostrarCapacidad = computed(() => esContenedor.value || esAnaquelOEstante.value || ['cajas', 'pallets'].includes(elementoSeleccionado.value?.categoria))
const mostrarDiametro = computed(() => esContenedor.value && elementoSeleccionado.value?.forma === 'circular')
const mostrarAncho = computed(() => mostrarDiametro.value || !esContenedor.value)
const mostrarLargo = computed(() => !esContenedor.value || elementoSeleccionado.value?.forma !== 'circular')

const volumen = computed(() => {
  if (!esContenedor.value) return 0
  const a = dimensiones.value.ancho
  const l = dimensiones.value.largo
  const h = dimensiones.value.alto
  if (mostrarDiametro.value) {
    const r = a / 2
    return ((Math.PI * r * r * h) / 1000000).toFixed(2)
  }
  return ((a * l * h) / 1000000).toFixed(2)
})

const plantaAltura = computed(() => canvasStore.plantaActivaData?.dimensiones?.alto || 0)
const alturaMinima = computed(() => plantaAltura.value * 0.5)
const cumpleAlturaMinima = computed(() => {
  if (!esAnaquelOEstante.value) return true
  return (elementoSeleccionado.value?.alturaRespectoAlSuelo || 0) >= alturaMinima.value
})
</script>

<style scoped>
input[disabled] {
  cursor: not-allowed;
}
</style>

