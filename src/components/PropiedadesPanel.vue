<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200" data-properties-panel>
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800">Propiedades</h2>
    </div>

    <div v-if="elementoSeleccionado" class="flex-1 overflow-y-auto p-4">
      <div class="space-y-4">
        <!-- Información general -->
        <details open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Información general</summary>
          <div class="mt-3 space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                v-model="propiedadesEditables.nombre"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del elemento"
                @input="actualizarNombre"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <input
                  :value="getTipoNombre(elementoSeleccionado.tipo)"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                <input
                  :value="getCategoriaDisplay(elementoSeleccionado.categoria)"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed capitalize"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <div class="flex items-center gap-3">
                <input
                  v-model="propiedadesEditables.color"
                  type="color"
                  class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  @input="actualizarColor"
                />
                <input
                  v-model="propiedadesEditables.color"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3B82F6"
                  @input="actualizarColor"
                />
              </div>
            </div>
          </div>
        </details>

        <!-- Dimensiones -->
        <details v-if="mostrarDimensiones" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Dimensiones (cm)</summary>
          <div class="mt-3 space-y-3">
            <div v-if="!ocultarAnchoLargo" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-gray-500">Ancho</label>
                <div class="flex items-center">
                  <input
                    type="number"
                    min="0"
                    v-model.number="propiedadesEditables.dimensiones.ancho"
                    @change="actualizarDimension('ancho', propiedadesEditables.dimensiones.ancho)"
                    class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span class="ml-1 text-sm text-gray-500">cm</span>
                </div>
              </div>
              <div>
                <label class="text-sm text-gray-500">Largo</label>
                <div class="flex items-center">
                  <input
                    type="number"
                    min="0"
                    v-model.number="propiedadesEditables.dimensiones.largo"
                    @change="actualizarDimension('largo', propiedadesEditables.dimensiones.largo)"
                    class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span class="ml-1 text-sm text-gray-500">cm</span>
                </div>
              </div>
            </div>
            <div>
              <label class="text-sm text-gray-500">Alto</label>
              <div class="flex items-center">
                <input
                  type="number"
                  min="0"
                  v-model.number="propiedadesEditables.dimensiones.alto"
                  @change="actualizarDimension('alto', propiedadesEditables.dimensiones.alto)"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <span class="ml-1 text-sm text-gray-500">cm</span>
              </div>
            </div>
            <p v-if="advertenciaAltura" class="text-xs text-amber-600">{{ advertenciaAltura }}</p>
          </div>
        </details>

        <!-- Capacidad -->
        <details v-if="mostrarCapacidad" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Capacidad</summary>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-sm text-gray-500">Capacidad de carga</label>
              <div class="flex items-center">
                <input
                  type="number"
                  min="0"
                  v-model.number="propiedadesEditables.pesoMaximo"
                  @change="actualizarPeso"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <span class="ml-1 text-sm text-gray-500">kg</span>
              </div>
            </div>
            <div v-if="volumen !== null">
              <label class="text-sm text-gray-500">Volumen</label>
              <div class="flex items-center">
                <input
                  :value="volumen"
                  disabled
                  class="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500"
                />
                <span class="ml-1 text-sm text-gray-500">m³</span>
              </div>
            </div>
          </div>
        </details>
      </div>
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
import { useToast } from '@/composables/useToast.js'

const canvasStore = useCanvasStore()
const { showWarning } = useToast()

const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)

const propiedadesEditables = ref({
  nombre: '',
  color: '#3B82F6',
  dimensiones: { ancho: 0, largo: 0, alto: 0 },
  pesoMaximo: 0
})

watch(elementoSeleccionado, (el) => {
  if (el) {
    propiedadesEditables.value = {
      nombre: el.nombre || '',
      color: el.color || '#3B82F6',
      dimensiones: {
        ancho: el.dimensiones?.ancho || 0,
        largo: el.dimensiones?.largo || 0,
        alto: el.dimensiones?.alto || 0
      },
      pesoMaximo: el.pesoMaximo || 0
    }
  }
}, { immediate: true })

const getTipoNombre = (tipo) => {
  return TIPOS_ENTIDAD.find(t => t.id === tipo)?.nombre || tipo
}

const getCategoriaDisplay = (categoria) => {
  return TODAS_LAS_CATEGORIAS.find(c => c.id === categoria)?.nombre || categoria
}

const actualizarNombre = () => {
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, { nombre: propiedadesEditables.value.nombre })
}

const actualizarColor = () => {
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, { color: propiedadesEditables.value.color })
}

const actualizarDimension = (prop, valor) => {
  const numero = Number(valor)
  if (isNaN(numero) || numero < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    return
  }
  const dims = { ...(elementoSeleccionado.value.dimensiones || {}) }
  dims[prop] = numero
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, { dimensiones: dims })
}

const actualizarPeso = () => {
  const numero = Number(propiedadesEditables.value.pesoMaximo)
  if (isNaN(numero) || numero < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    return
  }
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, { pesoMaximo: numero })
}

const esAnaquelOEstante = computed(() => {
  const cat = elementoSeleccionado.value?.categoria
  return cat === 'anaqueles' || cat === 'estantes'
})

const esContenedorBarril = computed(() => {
  const el = elementoSeleccionado.value
  return el?.tipo === 'contenedores' || el?.categoria === 'contenedores'
})

const esCajaOPallet = computed(() => {
  const cat = elementoSeleccionado.value?.categoria
  return cat === 'cajas' || cat === 'pallets'
})

const mostrarCapacidad = computed(() => esAnaquelOEstante.value || esContenedorBarril.value || esCajaOPallet.value)
const mostrarDimensiones = computed(() => true)
const ocultarAnchoLargo = computed(() => esContenedorBarril.value && elementoSeleccionado.value?.forma === 'circular')

const volumen = computed(() => {
  if (!esContenedorBarril.value) return null
  const d = elementoSeleccionado.value?.dimensiones || {}
  if (elementoSeleccionado.value?.forma === 'circular') {
    const diam = d.ancho || 0
    const alto = d.alto || 0
    return ((Math.PI * Math.pow(diam / 2, 2) * alto) / 1_000_000).toFixed(2)
  }
  return (((d.ancho || 0) * (d.largo || 0) * (d.alto || 0)) / 1_000_000).toFixed(2)
})

const alturaPlanta = computed(() => canvasStore.plantaPorId(canvasStore.plantaActiva)?.dimensiones?.alto || 0)
const advertenciaAltura = computed(() => {
  if (!esAnaquelOEstante.value) return null
  const min = alturaPlanta.value * 0.5
  const actual = elementoSeleccionado.value?.dimensiones?.alto || 0
  return actual < min ? `La altura debe ser al menos ${min} cm` : null
})

const deseleccionarElemento = () => {
  canvasStore.seleccionarElemento(null)
}
</script>

<style scoped>
/* No custom styles */
</style>
