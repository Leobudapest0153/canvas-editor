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

            <!-- Etiquetas -->
            <div>
              <TagFilter
                class="pb-3"
                :selected-ids="edited?.tags || []"
                @add="onTagAdd"
                @remove="onTagRemove"
                @create="onTagCreateOpen"
              />
              <CreateTagModal
                :show="createTagModalOpen"
                :initial-text="newTagText"
                @close="createTagModalOpen = false"
                @save="onTagCreateSave"
              />
            </div>
          </div>
        </details>

        <!-- Dimensiones -->
        <details v-if="mostrarDimensiones" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Dimensiones ({{ t('units.cm') }})</summary>
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
                  <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
                </div>
              </div>
              <div>
                <label class="text-sm text-gray-500">Largo</label>
                <div class="flex items-center">
                  <input type="number" min="0" v-model.number="edited.dimensiones.largo"
                    @change="validarDimension('largo')"
                    class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    :disabled="isSaving" />
                  <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
                </div>
              </div>
            </div>
            <div v-if="!esCircular">
              <label class="text-sm text-gray-500">Alto</label>
              <div class="flex items-center">
                <input type="number" min="0" v-model.number="edited.dimensiones.alto" @change="validarDimension('alto')"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  :disabled="isSaving" />
                <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
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
                <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
              </div>
              <p v-if="advertenciaDiametroLimite" class="text-xs text-amber-600">{{ advertenciaDiametroLimite }}</p>
              <p v-if="advertenciaDiametroContencion" class="text-xs text-amber-600">{{ advertenciaDiametroContencion }}
              </p>
            </div>
            <p v-if="advertenciaAltura" class="text-xs text-amber-600">{{ advertenciaAltura }}</p>
            <p v-if="dimensionError" class="text-xs text-red-600">{{ dimensionError }}</p>
            <ul v-if="dimensionSugerencias && dimensionSugerencias.length" class="list-disc ml-5 text-xs text-gray-600">
              <li v-for="(s,i) in dimensionSugerencias" :key="i">{{ s }}</li>
            </ul>
            <p v-if="posicionAjustadaBadge" class="text-xs text-emerald-700">Se ajustó posición para evitar desbordamiento/colisión.</p>
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
                <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
              </div>
              <p v-if="advertenciaZBase" class="text-xs text-amber-600">{{ advertenciaZBase }}</p>
            </div>
          </div>
        </details>

        <!-- Capacidad -->
        <details v-if="mostrarCapacidad" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Capacidad</summary>
          <div class="mt-3 space-y-3">
            <!-- Capacidad de carga (peso) -->
            <div>
              <label class="text-sm text-gray-500">Capacidad de carga</label>
              <div class="flex items-center">
                <input type="number" min="0" v-model.number="edited.pesoMaximo" @change="validarPeso"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  :disabled="isSaving" />
                <span class="ml-1 text-sm text-gray-500">kg</span>
              </div>
              <p v-if="advertenciaPeso" class="text-xs text-amber-600">{{ advertenciaPeso }}</p>
            </div>

            <!-- Capacidad de volumen teórico -->
            <div>
              <label class="text-sm text-gray-500">Volumen teórico</label>
              <div class="flex items-center">
                <input :value="volumenTeorico" disabled
                  class="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-500" />
                <span class="ml-1 text-sm text-gray-500">m³</span>
              </div>
              <p v-if="volumenTeorico" class="text-xs text-gray-500 mt-1">
                {{ descripcionVolumenTeorico }}
              </p>
            </div>

            <!-- Uso real (solo lectura) -->
            <div v-if="mostrarUsoReal" class="border-t pt-3">
              <label class="text-sm font-medium text-gray-700 mb-2 block">Uso Real</label>

              <!-- Peso real usado -->
              <div class="mb-2">
                <label class="text-xs text-gray-500">Peso usado</label>
                <div class="flex items-center">
                  <input :value="usoRealPeso" disabled
                    class="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600" />
                  <span class="ml-1 text-sm text-gray-500">kg</span>
                </div>
                <div v-if="usoRealPeso > 0" class="mt-1">
                  <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{{ porcentajePesoUsado }}% usado</span>
                    <span>{{ usoRealPeso }} / {{ edited.pesoMaximo || 0 }} kg</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full transition-all duration-300"
                         :style="{ width: porcentajePesoUsado + '%', backgroundColor: colorPesoUsado }"></div>
                  </div>
                </div>
              </div>

              <!-- Volumen real usado -->
              <div>
                <label class="text-xs text-gray-500">Volumen usado</label>
                <div class="flex items-center">
                  <input :value="usoRealVolumen" disabled
                    class="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600" />
                  <span class="ml-1 text-sm text-gray-500">m³</span>
                </div>
                <div v-if="usoRealVolumen > 0" class="mt-1">
                  <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{{ porcentajeVolumenUsado }}% usado</span>
                    <span>{{ usoRealVolumen }} / {{ volumenTeorico }} m³</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full transition-all duration-300"
                         :style="{ width: porcentajeVolumenUsado + '%', backgroundColor: colorVolumenUsado }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Información del contexto padre -->
            <div v-if="infoPesoPadre.limiteDePeso" class="text-xs text-gray-600">
              {{ capacidadContextoTexto }}
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
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore.js'
import { TIPOS_ENTIDAD, TODAS_LAS_CATEGORIAS, CM_TO_PX } from '@/inventory-smart/utils/constants'
import { deepClone, deepEqual, makePatch } from '@/inventory-smart/utils/object'
import { useToast } from '@/inventory-smart/composables/useToast.js'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation.js'
import { useDimensionValidation } from '@/inventory-smart/composables/useDimensionValidation.js'
import { EPSILON } from '@/inventory-smart/utils/geometry.js'
import { t } from '@/inventory-smart/utils/i18n.js'
import TagFilter from '@/inventory-smart/components/TagFilter.vue'
import CreateTagModal from '@/inventory-smart/components/CreateTagModal.vue'

const canvasStore = useCanvasStore()
const { showWarning, showSuccess } = useToast()
const confirmDialog = useConfirmDialog()
const { validarPesoElemento, calcularPesoDisponible, contextoActualTieneLimiteDePeso, infoPesoContextoActual } = useWeightValidation()
const { validarDimensiones, aplicarResultadoValidacion } = useDimensionValidation()

const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)

const snapshotOriginal = ref(null)
const edited = ref(null)
const isSaving = ref(false)
const dimensionError = ref(null)
const dimensionSugerencias = ref([])
const posicionAjustadaBadge = ref(false)

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
  // Buffer local de etiquetas (IDs)
  tags: Array.isArray(el.etiquetas) ? [...el.etiquetas] : [],
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

// Comparación order-insensitive solo para tags
const normalizeForCompare = (obj) => {
  const c = deepClone(obj || {})
  if (Array.isArray(c.tags)) c.tags = [...c.tags].sort((a, b) => a - b)
  return c
}
const isDirty = computed(() => {
  if (!edited.value || !snapshotOriginal.value) return false
  return !deepEqual(normalizeForCompare(edited.value), normalizeForCompare(snapshotOriginal.value))
})

const guardarDeshabilitado = computed(() =>
  isSaving.value ||
  !!advertenciaAltura.value ||
  !!advertenciaZBase.value ||
  !!advertenciaDiametroLimite.value ||
  !!advertenciaDiametroContencion.value ||
  !!advertenciaPeso.value,
)

const revertir = () => {
  edited.value = deepClone(snapshotOriginal.value)
  dimensionError.value = null
  dimensionSugerencias.value = []
  posicionAjustadaBadge.value = false
}

const guardar = async () => {
  if (!elementoSeleccionado.value) return
  if (guardarDeshabilitado.value) return
  isSaving.value = true
  // Reset UI de validación
  dimensionError.value = null
  dimensionSugerencias.value = []
  posicionAjustadaBadge.value = false

  // 1) Validación de dimensiones (cm)
  let anchoCm, largoCm, altoCm
  if (esCircular.value) {
    const diam = Number(edited.value?.diametroCm)
    if (!Number.isFinite(diam) || diam <= 0) {
      dimensionError.value = 'El diámetro debe ser mayor a 0.'
      isSaving.value = false
      return
    }
    anchoCm = diam
    largoCm = diam
  } else {
    anchoCm = Number(edited.value?.dimensiones?.ancho)
    largoCm = Number(edited.value?.dimensiones?.largo)
  }
  altoCm = Number(edited.value?.dimensiones?.alto)
  const isValidDimension = (value) => Number.isFinite(value) && value >= 0
  if (!isValidDimension(anchoCm) || !isValidDimension(largoCm) || !isValidDimension(altoCm)) {
    dimensionError.value = 'Las dimensiones deben ser números válidos y no negativos.'
    isSaving.value = false
    return
  }

  const resultadoDims = validarDimensiones(
    elementoSeleccionado.value.id,
    { ancho: anchoCm, largo: largoCm, alto: altoCm },
    { silencioso: false },
  )
  if (!resultadoDims?.valida) {
    dimensionError.value = resultadoDims?.razon || 'Dimensiones inválidas'
    dimensionSugerencias.value = resultadoDims?.sugerencias || []
    isSaving.value = false
    return
  }
  if (resultadoDims?.accion === 'aplicar') {
    const res = aplicarResultadoValidacion(elementoSeleccionado.value.id, resultadoDims)
    posicionAjustadaBadge.value = !!res?.posicionAjustada
  }
  const patch = makePatch(snapshotOriginal.value, edited.value)

  // Mapear buffer local de tags -> propiedad real del store 'etiquetas' si cambió (orden-insensible)
  const sortIds = (arr) => (Array.isArray(arr) ? [...arr].sort((a, b) => a - b) : [])
  const origTags = sortIds(snapshotOriginal.value?.tags)
  const newTags = sortIds(edited.value?.tags)
  if (!deepEqual(origTags, newTags)) {
    patch.etiquetas = [...newTags]
  }
  delete patch.tags

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

  // 3) Validación de peso después de dimensiones
  if (advertenciaPeso.value) {
    showWarning(advertenciaPeso.value)
    isSaving.value = false
    return
  }

  // 4) Persistencia final
  const ok = await canvasStore.updateElementById(elementoSeleccionado.value.id, patch)
  if (ok) {
    snapshotOriginal.value = deepClone(edited.value)
    showSuccess(diamChanged ? 'Diámetro actualizado' : 'Cambios guardados')
  }
  isSaving.value = false
}

const validarDimension = (prop) => {
  const val = Number(edited.value.dimensiones[prop])
  if (isNaN(val) || val < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    edited.value.dimensiones[prop] = snapshotOriginal.value.dimensiones[prop]
  }
}

// Contexto padre del elemento editado (planta o elemento/contenedor padre)
const padreContext = computed(() => {
  const el = elementoSeleccionado.value
  if (!el) return { padreId: null, padreType: null }
  if (el.padre) {
    const padre = canvasStore.elementoPorId(el.padre)
    const padreType = padre?.tipo || 'elementos'
    return { padreId: el.padre, padreType }
  }
  return { padreId: el.plantaId, padreType: 'plantas' }
})
const infoPesoPadre = computed(() => {
  const { padreId, padreType } = padreContext.value
  if (!padreId || !padreType) return { limiteDePeso: false, usado: 0, maximo: 0, disponible: Infinity, porcentajeUsado: 0 }
  return calcularPesoDisponible(padreId, padreType)
})

const capacidadContextoTexto = computed(() => {
  const info = infoPesoPadre.value
  return `Actualmente la bodega tiene ${info.usado} kg ocupados (${Math.round(info.porcentajeUsado)}% de su capacidad).
  Todavía puedes ocupar ${info.disponible} kg sin problemas.`;
})

const validarPeso = () => {
  const val = Number(edited.value.pesoMaximo)
  if (isNaN(val) || val < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    edited.value.pesoMaximo = snapshotOriginal.value.pesoMaximo
    return
  }
  // Mantener input; la validación de límite se refleja con advertenciaPeso y bloqueo de Guardar
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

/**
 * Calcula el volumen teórico basándose en los hijos del elemento
 */
const volumenTeorico = computed(() => {
  const elemento = elementoSeleccionado.value
  if (!elemento) return '0.00'

  // Para contenedores: siempre calcular basándose en sus propias dimensiones
  if (elemento.tipo === 'contenedores') {
    const d = elemento.dimensiones || {}
    if (elemento.forma === 'circular') {
      const diam = d.ancho || 0
      const alto = d.alto || 0
      return ((Math.PI * Math.pow(diam / 2, 2) * alto) / 1_000_000).toFixed(3)
    }
    return (((d.ancho || 0) * (d.largo || 0) * (d.alto || 0)) / 1_000_000).toFixed(3)
  }

  // Para elementos: calcular basándose en el volumen de los contenedores que tiene dentro
  if (elemento.tipo === 'elementos') {
    return calcularVolumenPorHijos(elemento.id, 'contenedores')
  }

  // Fallback: calcular volumen por dimensiones propias
  const d = elemento.dimensiones || {}
  if (elemento.forma === 'circular') {
    const diam = d.ancho || 0
    const alto = d.alto || 0
    return ((Math.PI * Math.pow(diam / 2, 2) * alto) / 1_000_000).toFixed(3)
  }
  return (((d.ancho || 0) * (d.largo || 0) * (d.alto || 0)) / 1_000_000).toFixed(3)
})

/**
 * Calcula el volumen total de los hijos de un elemento
 */
const calcularVolumenPorHijos = (elementoId, tipoHijos) => {
  const elemento = canvasStore.elementoPorId(elementoId)
  if (!elemento || !elemento.hijos || elemento.hijos.length === 0) {
    return '0.000'
  }

  let volumenTotal = 0

  for (const hijoId of elemento.hijos) {
    const hijo = canvasStore.elementoPorId(hijoId)
    if (!hijo) continue

    // Filtrar por tipo si es necesario
    if (tipoHijos === 'contenedores' && hijo.tipo !== 'contenedores') continue

    // Calcular volumen del hijo basándose en sus dimensiones
    const dims = hijo.dimensiones || {}
    let volumenHijo = 0

    if (hijo.forma === 'circular') {
      const diam = dims.ancho || 0
      const alto = dims.alto || 0
      volumenHijo = (Math.PI * Math.pow(diam / 2, 2) * alto) / 1_000_000 // cm³ a m³
    } else {
      volumenHijo = ((dims.ancho || 0) * (dims.largo || 0) * (dims.alto || 0)) / 1_000_000 // cm³ a m³
    }

    volumenTotal += volumenHijo

    // Si este hijo también tiene hijos, sumarlos recursivamente
    if (hijo.hijos && hijo.hijos.length > 0) {
      const volumenSubhijos = parseFloat(calcularVolumenPorHijos(hijoId, 'todos'))
      volumenTotal += volumenSubhijos
    }
  }

  return volumenTotal.toFixed(3)
}

const descripcionVolumenTeorico = computed(() => {
  const elemento = elementoSeleccionado.value
  if (!elemento) return ''

  const numHijos = elemento.hijos?.length || 0

  if (elemento.tipo === 'elementos') {
    const contenedores = elemento.hijos?.filter(hijoId => {
      const hijo = canvasStore.elementoPorId(hijoId)
      return hijo && hijo.tipo === 'contenedores'
    }).length || 0

    if (contenedores === 0) return 'Sin contenedores internos'
    return `Calculado desde ${contenedores} contenedor${contenedores > 1 ? 'es' : ''}`
  }

  if (elemento.tipo === 'contenedores') {
    return 'Calculado desde dimensiones propias'
  }

  return 'Calculado desde dimensiones'
})

/**
 * Uso real del elemento
 */
const mostrarUsoReal = computed(() => {
  const elemento = elementoSeleccionado.value
  return elemento && elemento.uso && (elemento.uso.peso > 0 || elemento.uso.volumen > 0)
})

const usoRealPeso = computed(() => {
  const uso = elementoSeleccionado.value?.uso
  return uso?.peso ? uso.peso.toFixed(2) : '0.00'
})

const usoRealVolumen = computed(() => {
  const uso = elementoSeleccionado.value?.uso
  return uso?.volumen ? uso.volumen.toFixed(3) : '0.000'
})

const porcentajePesoUsado = computed(() => {
  const peso = parseFloat(usoRealPeso.value)
  const maximo = edited.value?.pesoMaximo || 0
  if (maximo === 0) return 0
  return Math.min(100, Math.round((peso / maximo) * 100))
})

const porcentajeVolumenUsado = computed(() => {
  const volumen = parseFloat(usoRealVolumen.value)
  const maximo = parseFloat(volumenTeorico.value)
  if (maximo === 0) return 0
  return Math.min(100, Math.round((volumen / maximo) * 100))
})

const colorPesoUsado = computed(() => {
  const porcentaje = porcentajePesoUsado.value
  if (porcentaje < 50) return '#10b981' // Verde
  if (porcentaje < 85) return '#f59e0b' // Amarillo
  return '#ef4444' // Rojo
})

const colorVolumenUsado = computed(() => {
  const porcentaje = porcentajeVolumenUsado.value
  if (porcentaje < 50) return '#10b981' // Verde
  if (porcentaje < 85) return '#f59e0b' // Amarillo
  return '#ef4444' // Rojo
})

const alturaPlanta = computed(() => canvasStore.plantaPorId(canvasStore.plantaActiva)?.dimensiones?.alto || 0)
const advertenciaAltura = computed(() => {
  if (!esAnaquelOEstante.value) return null
  const max = alturaPlanta.value;
  const actual = edited.value?.dimensiones?.alto || 0
  return actual > max ? `La altura no debe superar ${max} cm` : null
})

// Advertencia de peso por límite del contexto padre (bloquea Guardar)
const advertenciaPeso = computed(() => {
  const info = infoPesoPadre.value
  if (!info.limiteDePeso) return null
  const oldVal = Number(elementoSeleccionado.value?.pesoMaximo || 0)
  const newVal = Number(edited.value?.pesoMaximo || 0)
  if (!Number.isFinite(newVal) || newVal < 0) return 'La capacidad debe ser un número válido.'
  const delta = newVal - oldVal
  if (delta <= 0) return null
  const disponible = Number.isFinite(info.disponible) ? info.disponible : Infinity
  if (delta > disponible + EPSILON) {
    const pesoTotalFinal = info.usado - oldVal + newVal
    return `Se excede el límite de peso del contenedor. Exceso: ${(delta - disponible).toFixed(2)} kg (Usado: ${pesoTotalFinal.toFixed(2)}/${info.maximo} kg).`
  }
  return null
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

// ====== Gestión de etiquetas (buffer local) ======
const createTagModalOpen = ref(false)
const newTagText = ref('')

const onTagAdd = (tagId) => {
  if (!edited.value) return
  if (!Array.isArray(edited.value.tags)) edited.value.tags = []
  if (!edited.value.tags.includes(tagId)) edited.value.tags.push(tagId)
}

const onTagRemove = (tagId) => {
  if (!edited.value || !Array.isArray(edited.value.tags)) return
  edited.value.tags = edited.value.tags.filter((id) => id !== tagId)
}

const onTagCreateOpen = (text) => {
  newTagText.value = text || ''
  createTagModalOpen.value = true
}

const onTagCreateSave = async (payload) => {
  // payload: { nombre?: string, texto?: string, color?: string, colorFondo?, colorTexto? }
  const texto = (payload?.nombre || payload?.texto || newTagText.value || '').trim()
  if (!texto) return
  const nueva = {
    texto,
    colorFondo: payload?.colorFondo || payload?.color || '#DBEAFE',
    colorTexto: payload?.colorTexto || '#1E40AF',
  }
  // Crear en catálogo global
  canvasStore.agregarEtiqueta(nueva)
  // Obtener el ID recién creado (max actual)
  const tagId = Math.max(0, ...canvasStore.etiquetas.map((e) => e.id))
  onTagAdd(tagId)
  createTagModalOpen.value = false
  newTagText.value = ''
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
