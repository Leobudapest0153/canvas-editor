<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200" data-properties-panel>
    <div class="p-4 border-b border-gray-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Propiedades</h2>
      <div v-if="isDirty" class="space-x-2">
        <button
          @click="guardar"
          :disabled="saving || hasErrors"
          class="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          @click="revertir"
          :disabled="saving"
          class="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700"
        >
          Revertir
        </button>
      </div>
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
                v-model="edited.nombre"
                :disabled="saving"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del elemento"
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
                  v-model="edited.color"
                  :disabled="saving"
                  type="color"
                  class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  v-model="edited.color"
                  :disabled="saving"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3B82F6"
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
                    v-model.number="edited.dimensiones.ancho"
                    :disabled="saving"
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
                    v-model.number="edited.dimensiones.largo"
                    :disabled="saving || ocultarAnchoLargo"
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
                  v-model.number="edited.dimensiones.alto"
                  :disabled="saving"
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
                  v-model.number="edited.pesoMaximo"
                  :disabled="saving"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore.js'
import { TIPOS_ENTIDAD, TODAS_LAS_CATEGORIAS } from '@/utils/constants'
import { deepClone, deepEqual, makePatch } from '@/utils/objectUtils.js'
import { useToast } from '@/composables/useToast.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { onBeforeRouteLeave } from 'vue-router'

const canvasStore = useCanvasStore()
const { showWarning, showSuccess } = useToast()
const confirmDialog = useConfirmDialog()

const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)

const edited = ref(null)
const snapshotOriginal = ref(null)
const saving = ref(false)

watch(() => elementoSeleccionado.value?.id, (id) => {
  if (id) {
    const el = elementoSeleccionado.value
    edited.value = deepClone({
      nombre: el.nombre || '',
      tipo: el.tipo || '',
      categoria: el.categoria || '',
      color: el.color || '#3B82F6',
      dimensiones: {
        ancho: el.dimensiones?.ancho || 0,
        largo: el.dimensiones?.largo || 0,
        alto: el.dimensiones?.alto || 0
      },
      pesoMaximo: el.pesoMaximo || 0,
      volumenMaximo: el.volumenMaximo || 0
    })
    snapshotOriginal.value = deepClone(edited.value)
  } else {
    edited.value = null
    snapshotOriginal.value = null
  }
}, { immediate: true })

const isDirty = computed(() => {
  if (!edited.value || !snapshotOriginal.value) return false
  return !deepEqual(edited.value, snapshotOriginal.value)
})

const getTipoNombre = (tipo) => {
  return TIPOS_ENTIDAD.find(t => t.id === tipo)?.nombre || tipo
}

const getCategoriaDisplay = (categoria) => {
  return TODAS_LAS_CATEGORIAS.find(c => c.id === categoria)?.nombre || categoria
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
  if (!esContenedorBarril.value || !edited.value) return null
  const d = edited.value.dimensiones || {}
  if (elementoSeleccionado.value?.forma === 'circular') {
    const diam = d.ancho || 0
    const alto = d.alto || 0
    return ((Math.PI * Math.pow(diam / 2, 2) * alto) / 1_000_000).toFixed(2)
  }
  return (((d.ancho || 0) * (d.largo || 0) * (d.alto || 0)) / 1_000_000).toFixed(2)
})

const alturaPlanta = computed(() => canvasStore.plantaPorId(canvasStore.plantaActiva)?.dimensiones?.alto || 0)
const advertenciaAltura = computed(() => {
  if (!esAnaquelOEstante.value || !edited.value) return null
  const min = alturaPlanta.value * 0.5
  const actual = edited.value.dimensiones?.alto || 0
  return actual < min ? `La altura debe ser al menos ${min} cm` : null
})
const hasErrors = computed(() => !!advertenciaAltura.value)

const guardar = async () => {
  if (!elementoSeleccionado.value || !edited.value) return
  if (hasErrors.value) {
    showWarning('Corrige los errores antes de guardar')
    return
  }
  saving.value = true
  const patch = makePatch(snapshotOriginal.value, edited.value)
  await canvasStore.updateElementById(elementoSeleccionado.value.id, patch)
  snapshotOriginal.value = deepClone(edited.value)
  saving.value = false
  showSuccess('Cambios guardados')
}

const revertir = () => {
  if (snapshotOriginal.value) {
    edited.value = deepClone(snapshotOriginal.value)
  }
}

const deseleccionarElemento = () => {
  canvasStore.seleccionarElemento(null)
}

const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (isDirty.value && !saving.value && !hasErrors.value) {
      guardar()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

onBeforeRouteLeave(async (to, from, next) => {
  if (!isDirty.value) {
    next()
    return
  }
  const save = await confirmDialog.confirm({
    title: 'Cambios sin guardar',
    message: 'Hay cambios sin guardar. ¿Guardar antes de salir?',
    confirmLabel: 'Guardar y salir',
    cancelLabel: 'Salir sin guardar'
  })
  if (save) {
    await guardar()
    next()
    return
  }
  const exit = await confirmDialog.confirm({
    title: 'Salir sin guardar',
    message: '¿Salir sin guardar los cambios?',
    confirmLabel: 'Salir',
    cancelLabel: 'Cancelar'
  })
  if (exit) next()
  else next(false)
})
</script>

<style scoped>
/* No custom styles */
</style>
