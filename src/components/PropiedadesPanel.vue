<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200" data-properties-panel>
    <div class="p-4 border-b border-gray-200 flex items-center justify-between">
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
              <input v-model="edited.nombre" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del elemento" :disabled="isSaving" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <input :value="getTipoNombre(elementoSeleccionado.tipo)" type="text" disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                <input :value="getCategoriaDisplay(elementoSeleccionado.categoria)" type="text" disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed capitalize" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <div class="flex items-center gap-3">
                <input v-model="edited.color" type="color"
                  class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer" :disabled="isSaving" />
                <input v-model="edited.color" type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3B82F6" :disabled="isSaving" />
              </div>
            </div>
          </div>
        </details>

        <!-- Dimensiones -->
        <details v-if="mostrarDimensiones" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Dimensiones (cm)</summary>
          <div class="mt-3 space-y-3">
            <!-- Para formas no circulares, mostrar ancho/largo -->
            <div v-if="!ocultarAnchoLargo" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-gray-500">Ancho</label>
                <div class="flex items-center">
                  <input type="number" min="0" v-model.number="edited.dimensiones.ancho"
                    @change="validarDimension('ancho')"
                    class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    :disabled="isSaving" />
                  <span class="ml-1 text-sm text-gray-500">cm</span>
                </div>
              </div>
              <div>
                <label class="text-sm text-gray-500">Largo</label>
                <div class="flex items-center">
                  <input type="number" min="0" v-model.number="edited.dimensiones.largo"
                    @change="validarDimension('largo')"
                    class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    :disabled="isSaving" />
                  <span class="ml-1 text-sm text-gray-500">cm</span>
                </div>
              </div>
            </div>
            <div>
              <label class="text-sm text-gray-500">Alto</label>
              <div class="flex items-center">
                <input type="number" min="0" v-model.number="edited.dimensiones.alto" @change="validarDimension('alto')"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  :disabled="isSaving" />
                <span class="ml-1 text-sm text-gray-500">cm</span>
              </div>
            </div>
            <!-- Diámetro para circulares -->
            <div v-if="esCircular">
              <label class="text-sm text-gray-500">Diámetro</label>
              <div class="flex items-center">
                <input type="number" min="1" step="1" :max="maxDiametroPlanta" v-model.number="edited.diametroCm"
                  @change="validarDiametro"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  :disabled="isSaving" />
                <span class="ml-1 text-sm text-gray-500">cm</span>
              </div>
              <p v-if="advertenciaDiametroLimite" class="text-xs text-amber-600">{{ advertenciaDiametroLimite }}</p>
              <p v-if="advertenciaDiametroContencion" class="text-xs text-amber-600">{{ advertenciaDiametroContencion }}
              </p>
            </div>
            <p v-if="advertenciaAltura" class="text-xs text-amber-600">{{ advertenciaAltura }}</p>
          </div>
        </details>

        <!-- Posicionamiento en pared -->
        <details v-if="esPared" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Posicionamiento en pared</summary>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-sm text-gray-500">Altura sobre el suelo</label>
              <div class="flex items-center">
                <input type="number" :min="0" :max="maxAlturaSobreSuelo" v-model.number="edited.alturaSobreSueloCm"
                  @change="validarAlturaSobreSuelo"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  :disabled="isSaving || !esPared" />
                <span class="ml-1 text-sm text-gray-500">cm</span>
              </div>
              <p v-if="advertenciaZBase" class="text-xs text-amber-600">{{ advertenciaZBase }}</p>
            </div>
          </div>
        </details>

        <!-- Capacidad -->
        <details v-if="mostrarCapacidad" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Capacidad</summary>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-sm text-gray-500">Capacidad de carga</label>
              <div class="flex items-center">
                <input type="number" min="0" v-model.number="edited.pesoMaximo" @change="validarPeso"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  :disabled="isSaving" />
                <span class="ml-1 text-sm text-gray-500">kg</span>
              </div>
            </div>
            <div v-if="volumen !== null">
              <label class="text-sm text-gray-500">Volumen</label>
              <div class="flex items-center">
                <input :value="volumen" disabled
                  class="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500" />
                <span class="ml-1 text-sm text-gray-500">m³</span>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>

    <div v-if="elementoSeleccionado" class="p-4 border-t border-gray-200 bg-white">
      <div v-if="isDirty" class="space-x-2 mb-3 flex justify-end">
        <button
          class="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          @click="revertir" :disabled="isSaving">
          Revertir
        </button>
        <button class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          @click="guardar" :disabled="guardarDeshabilitado">
          Guardar
        </button>
      </div>
      <button @click="deseleccionarElemento"
        class="w-full cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
        Deseleccionar
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useCanvasStore } from '@/composables/useCanvasStore.js'
import { TIPOS_ENTIDAD, TODAS_LAS_CATEGORIAS, CM_TO_PX } from '@/utils/constants'
import { deepClone, deepEqual, makePatch } from '@/utils/object'
import { useToast } from '@/composables/useToast.js'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const canvasStore = useCanvasStore()
const { showWarning, showSuccess } = useToast()
const confirmDialog = useConfirmDialog()

const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)

const snapshotOriginal = ref(null)
const edited = ref(null)
const isSaving = ref(false)

const cargarDesdeStore = (el) => deepClone({
  nombre: el.nombre || '',
  color: el.color || '#3B82F6',
  dimensiones: {
    ancho: el.dimensiones?.ancho || 0,
    largo: el.dimensiones?.largo || 0,
    alto: el.dimensiones?.alto || 0,
  },
  pesoMaximo: el.pesoMaximo || 0,
  alturaSobreSueloCm: el.alturaSobreSueloCm != null
    ? Number(el.alturaSobreSueloCm)
    : (el.alturaRespectoAlSuelo != null ? Number(el.alturaRespectoAlSuelo) : 0),
  diametroCm: (el.forma === 'circular')
    ? Number(el.dimensiones?.ancho ?? el.dimensiones?.largo ?? 0)
    : 0,
})

watch(() => elementoSeleccionado.value?.id, (id) => {
  if (id) {
    snapshotOriginal.value = cargarDesdeStore(elementoSeleccionado.value)
    edited.value = deepClone(snapshotOriginal.value)
  } else {
    snapshotOriginal.value = null
    edited.value = null
  }
}, { immediate: true })

const isDirty = computed(() => {
  if (!edited.value || !snapshotOriginal.value) return false
  return !deepEqual(edited.value, snapshotOriginal.value)
})

const guardarDeshabilitado = computed(() =>
  isSaving.value ||
  !!advertenciaAltura.value ||
  !!advertenciaZBase.value ||
  !!advertenciaDiametroLimite.value ||
  !!advertenciaDiametroContencion.value,
)

const revertir = () => {
  edited.value = deepClone(snapshotOriginal.value)
}

const guardar = async () => {
  if (!elementoSeleccionado.value) return
  if (guardarDeshabilitado.value) return
  isSaving.value = true
  const patch = makePatch(snapshotOriginal.value, edited.value)

  // Si es un elemento de pared, reflejar valores verticales y posicionar Y en px
  if (esPared.value) {
    const zBase = Number(edited.value?.alturaSobreSueloCm) || 0
    patch.alturaRespectoAlSuelo = zBase
    patch.alturaSobreSueloCm = zBase

    const alturaTechoCm = Number(canvasStore.plantaPorId(canvasStore.plantaActiva)?.dimensiones?.alto || 0)
    const altoCm = Number(edited.value?.dimensiones?.alto || elementoSeleccionado.value?.dimensiones?.alto || 0)
    const yTopPx = (alturaTechoCm - (zBase + altoCm)) * (CM_TO_PX || 10)
    if (Number.isFinite(yTopPx)) {
      if (canvasStore.vistaActiva === 'XZ') {
        patch.y = yTopPx
      }
      // Guardar en estructura de posición para futuras vistas XZ
      patch.posicion = { ...(elementoSeleccionado.value?.posicion || {}), y: yTopPx }
    }
  }

  // Si es circular, normalizar dimensiones con el diámetro y sincronizar px
  if (esCircular.value) {
    const d = Number(edited.value?.diametroCm) || 0
    if (!patch.dimensiones) patch.dimensiones = {}
    patch.dimensiones.ancho = d
    patch.dimensiones.largo = d
    // No contaminar el store con la propiedad auxiliar
    delete patch.diametroCm
  }
  const diamChanged = esCircular.value && (snapshotOriginal.value?.diametroCm !== edited.value?.diametroCm)
  const ok = await canvasStore.updateElementById(elementoSeleccionado.value.id, patch)
  if (ok) {
    snapshotOriginal.value = deepClone(edited.value)
    showSuccess(diamChanged ? 'Diámetro actualizado' : 'Cambios guardados')
  }
  isSaving.value = false
}

const validarDimension = (prop) => {
  const val = Number(edited.value.dimensiones[prop])
  const max = alturaPlanta.value

  if (isNaN(val) || val < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    edited.value.dimensiones[prop] = snapshotOriginal.value.dimensiones[prop]
  } else if (val > max) {
    showWarning(`La altura no debe superar ${max} cm`)
    edited.value.dimensiones[prop] = snapshotOriginal.value.dimensiones[prop]
  }
}

const plantaActiva = computed(() => canvasStore.plantaPorId(canvasStore.plantaActiva) || 0);
const pesoMaximoSoportado = computed(() => plantaActiva.value?.pesoMaximoSoportado || 0);

const validarPeso = () => {
  const val = Number(edited.value.pesoMaximo)
  if (isNaN(val) || val < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    edited.value.pesoMaximo = snapshotOriginal.value.pesoMaximo
  } else if (val > pesoMaximoSoportado.value) {
    showWarning(`El valor no debe superar ${pesoMaximoSoportado.value} kg, que es el peso máximo soportado por la planta activa.`)
    edited.value.pesoMaximo = snapshotOriginal.value.pesoMaximo
  }
}

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

const esPared = computed(() => (elementoSeleccionado.value?.ubicacion || '').toLowerCase() === 'pared')

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
const esCircular = computed(() => (elementoSeleccionado.value?.forma || '').toLowerCase() === 'circular' || (elementoSeleccionado.value?.forma || '').toLowerCase() === 'circle')
const ocultarAnchoLargo = computed(() => esCircular.value)

const volumen = computed(() => {
  if (!esContenedorBarril.value) return null
  const d = edited.value?.dimensiones || {}
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
  const max = alturaPlanta.value;
  const actual = edited.value?.dimensiones?.alto || 0
  return actual > max ? `La altura no debe superar ${max} cm` : null
})

// ===== Validaciones para círculo (diametro y contención) =====
const plantaDims = computed(() => {
  const p = canvasStore.plantaPorId(canvasStore.plantaActiva)
  return {
    ancho: Number(p?.dimensiones?.ancho || 0),
    largo: Number(p?.dimensiones?.largo || 0),
  }
})

const maxDiametroPlanta = computed(() => Math.min(plantaDims.value.ancho, plantaDims.value.largo))

const advertenciaDiametroLimite = computed(() => {
  if (!esCircular.value) return null
  const d = Number(edited.value?.diametroCm)
  if (!Number.isFinite(d) || d <= 0) return 'El diámetro debe ser mayor a 0.'
  if (d > maxDiametroPlanta.value) return 'El diámetro excede las dimensiones de la planta.'
  return null
})

const advertenciaDiametroContencion = computed(() => {
  if (!esCircular.value) return null
  const d = Number(edited.value?.diametroCm)
  if (!Number.isFinite(d) || d <= 0) return null
  // Top-left como ancla según el modelo
  const xPx = Number(elementoSeleccionado.value?.x || 0)
  const yPx = Number(elementoSeleccionado.value?.y || 0)
  const xCm = xPx / (CM_TO_PX || 10)
  const yCm = yPx / (CM_TO_PX || 10)
  if (xCm < 0 || yCm < 0) return 'El círculo se sale del área de trabajo con el diámetro actual.'
  if (xCm + d > plantaDims.value.ancho || yCm + d > plantaDims.value.largo) return 'El círculo se sale del área de trabajo con el diámetro actual.'
  return null
})

const validarDiametro = () => {
  if (!esCircular.value) return
  const d = Number(edited.value?.diametroCm)
  if (!Number.isFinite(d) || d < 1) {
    showWarning('El diámetro debe ser mayor o igual a 1 cm')
    edited.value.diametroCm = snapshotOriginal.value.diametroCm
  }
}

const maxAlturaSobreSuelo = computed(() => {
  const techo = Number(alturaPlanta.value) || 0
  const alto = Number(edited.value?.dimensiones?.alto || 0)
  return Math.max(0, techo - alto)
})

const advertenciaZBase = computed(() => {
  if (!esPared.value) return null
  const z = Number(edited.value?.alturaSobreSueloCm)
  if (!Number.isFinite(z) || z < 0) return 'La altura sobre suelo debe ser mayor o igual a 0 cm'
  const max = maxAlturaSobreSuelo.value
  return z > max ? `La altura sobre el suelo no debe superar ${max} cm` : null
})

const validarAlturaSobreSuelo = () => {
  if (!esPared.value) return
  const z = Number(edited.value?.alturaSobreSueloCm)
  if (!Number.isFinite(z) || z < 0) {
    showWarning('La altura sobre el suelo debe ser mayor o igual a 0 cm')
    edited.value.alturaSobreSueloCm = snapshotOriginal.value.alturaSobreSueloCm
    return
  }
  const max = maxAlturaSobreSuelo.value
  if (z > max) {
    showWarning(`La altura sobre el suelo no debe superar ${max} cm`)
    edited.value.alturaSobreSueloCm = snapshotOriginal.value.alturaSobreSueloCm
  }
}

const deseleccionarElemento = () => {
  canvasStore.seleccionarElemento(null)
}

const onKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (isDirty.value && !guardarDeshabilitado.value) {
      guardar()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
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
    cancelLabel: 'Cancelar'
  })
  if (save) {
    await guardar()
    next()
  } else {
    const exit = await confirmDialog.confirm({
      title: 'Salir sin guardar',
      message: '¿Salir sin guardar?',
      confirmLabel: 'Salir',
      cancelLabel: 'Cancelar'
    })
    if (exit) next()
    else next(false)
  }
})
</script>

<style scoped>
/* No custom styles */
</style>
