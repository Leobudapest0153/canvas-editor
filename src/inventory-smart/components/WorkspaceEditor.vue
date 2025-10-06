<template>
  <div v-if="canvasStore.crearPlanta" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Overlay -->
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" @click="closeModal" />
    <!-- Modal -->
    <div
      class="relative z-10 bg-white rounded-xl shadow-2xl w-[85vw] h-[95vh] overflow-hidden flex flex-col"
    >
      <!-- Close (X) -->
      <button
        @click="closeModal"
        class="cursor-pointer absolute top-3 right-3 text-gray-500 hover:text-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Cerrar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <!-- Header -->
      <h3
        class="text-lg font-semibold tracking-tight text-primary px-5 py-4 border-b border-b-slate-200 flex-shrink-0"
      >
        Nuevo piso
      </h3>

      <!-- Body -->
      <div class="grid gap-0 md:grid-cols-5 flex-grow min-h-0">
        <!-- Canvas (no modificar contenido) -->
        <div class="md:col-span-3 flex flex-col bg-slate-50/60">
          <div class="flex-grow min-h-0 p-3">
            <div class="h-full w-full overflow-auto rounded-lg bg-white">
              <div
                v-if="showInfiniteEmptyState"
                class="flex h-full min-h-[280px] w-full items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500"
              >
                Planta sin elementos
              </div>
              <DrawEditor
                v-else
                ref="canvasEditorRef"
                :polygon="local.polygon"
                :elements="previewElements"
                :worldWidth="worldWidth"
                :worldHeight="worldHeight"
                :frameBBox="previewFrameBBox"
                :adding="adding"
                :deleting="deleting"
                :isInfinite="local.isInfinite"
                @update:polygon="onPolygonUpdate"
                @notice="(newNotice) => (notice = newNotice)"
                class="h-full w-full"
              />
            </div>
          </div>

          <!-- Toolbar debajo del canvas -->
          <div class="px-3 pb-2">
            <div class="flex items-center gap-2 flex-shrink-0" v-if="!local.isInfinite">
              <button
                class="px-3 py-2 cursor-pointer rounded-lg border border-gray-300 bg-white text-slate-800 shadow-sm hover:bg-gray-50"
                :class="{ 'ring-2 ring-sky-500': adding }"
                @click="toggleAddMode"
              >
                {{ adding ? 'Salir de modo añadir' : 'Añadir vértice' }}
              </button>
              <button
                class="px-3 py-2 cursor-pointer rounded-lg border border-gray-300 bg-white text-slate-800 shadow-sm hover:bg-gray-50"
                :class="{ 'ring-2 ring-rose-500': deleting }"
                @click="toggleDeleteMode"
              >
                {{ deleting ? 'Salir de modo eliminar' : 'Eliminar vértice' }}
              </button>
              <button
                class="px-3 py-2 cursor-pointer rounded-lg border border-gray-300 bg-white text-slate-800 shadow-sm hover:bg-gray-50"
                @click="onFitPreview"
              >
                Ajustar Vista
              </button>
            </div>
            <div
              class="mt-1 text-sm h-5 flex-shrink-0"
              :class="notice ? 'text-rose-600' : 'text-transparent'"
            >
              {{ notice || '.' }}
            </div>
          </div>
        </div>

        <!-- Panel de inputs -->
        <div class="md:col-span-2 space-y-3 p-4 overflow-y-auto">
          <!-- Datos básicos: Nombre + Código (+ Plantilla si no es elástico) -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
            <h4 class="text-sm font-semibold text-gray-800 mb-2">Nombre*</h4>
            <input
              class="w-full rounded-lg bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
              :class="{ 'border-rose-500 ring-2 ring-rose-500/60': touched.name && !validNombre }"
              v-model="local.name"
              placeholder="Ej. Bodega A"
              @input="touched.name = true"
              @blur="touched.name = true"
            />
            <p v-if="touched.name && !validNombre" class="mt-1 text-xs text-rose-600">El nombre es requerido.</p>

            <h4 class="text-sm font-semibold text-gray-800 mt-4 mb-2">Código*</h4>
            <input
              class="w-full rounded-lg bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
              :class="{ 'border-rose-500 ring-2 ring-rose-500/60': touched.codigo && !validCodigo }"
              v-model="local.codigo"
              placeholder="Ej. PLT-001"
              @input="touched.codigo = true"
              @blur="touched.codigo = true"
            />
            <p v-if="touched.codigo && !validCodigo" class="mt-1 text-xs text-rose-600">El código es requerido.</p>

            <template v-if="!local.isInfinite">
              <h4 class="text-sm font-semibold text-gray-800 mt-4 mb-2">Plantilla*</h4>
              <select
                class="w-full cursor-pointer rounded-lg bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
                :class="{ 'border-rose-500 ring-2 ring-rose-500/60': touched.shape && !validShape }"
                v-model="local.shape"
                @change="touched.shape = true"
                @blur="touched.shape = true"
              >
                <option v-for="p in PLANTILLAS_PLANTA" :key="p.id" :value="p.id">{{ p.nombre }}</option>
              </select>
              <p v-if="touched.shape && !validShape" class="mt-1 text-xs text-rose-600">Selecciona una plantilla.</p>
            </template>
          </div>

          <!-- Modo: Planta elástica -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Modo</h4>
            <label class="flex items-center gap-3 select-none">
              <input type="checkbox" v-model="local.isInfinite" />
              <span class="font-semibold">Planta infinita</span>
              <UiTooltip
                label="Al activar este modo no hay límite de dimensiones en el piso."
                position="right"
                :delay="300"
              >
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[11px] font-semibold cursor-help shadow-sm"
                  aria-label="Información modo planta infinita"
                >
                  i
                </button>
              </UiTooltip>
            </label>
            <!-- <p v-if="local.isInfinite" class="mt-2 text-xs text-slate-600">
              En este modo se ignoran los límites de planta. Las dimensiones y la capacidad quedan deshabilitadas.
            </p>
            <p v-else-if="showLimitedHint" class="mt-2 text-xs text-amber-700">
              Define dimensiones válidas antes de guardar para salir del modo elástico.
            </p> -->
          </div>

          <!-- Dimensiones -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm" v-if="!local.isInfinite">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Dimensiones</h4>
            <div class="space-y-3">
              <div>
                <label class="mb-1 block text-xs text-slate-600">Alto (m)*</label>
                <input
                  type="number"
                  class="w-full rounded-lg bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
                  :class="{ 'border-rose-500 ring-2 ring-rose-500/60': (touched.dimensions && !validDims) }"
                  v-model.number="localRectYMeters"
                  @input="touched.dimensions = true"
                  @blur="touched.dimensions = true"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-slate-600">Largo (m)*</label>
                <input
                  type="number"
                  class="w-full rounded-lg bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
                  :class="{ 'border-rose-500 ring-2 ring-rose-500/60': (touched.dimensions && !validDims) }"
                  v-model.number="localRectLMeters"
                  @input="touched.dimensions = true"
                  @blur="touched.dimensions = true"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-slate-600">Ancho (m)*</label>
                <input
                  type="number"
                  class="w-full rounded-lg bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
                  :class="{ 'border-rose-500 ring-2 ring-rose-500/60': (touched.dimensions && !validDims) }"
                  v-model.number="localRectWMeters"
                  @input="touched.dimensions = true"
                  @blur="touched.dimensions = true"
                />
              </div>
            </div>
            <p v-if="touched.dimensions && !validDims" class="mt-2 text-xs text-rose-600">Todas las dimensiones deben ser mayores a 0.</p>
          </div>

          <!-- Capacidad máxima -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm" v-if="!local.isInfinite">
            <h4 class="text-sm font-semibold text-gray-800 mb-2">Capacidad de carga (kg)*</h4>
            <UiTooltip :label="capacityTooltip" position="right" :delay="200" v-if="capacityWasAutoAdjusted">
              <input
                type="number"
                class="w-full rounded-lg bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
                :class="{ 'border-rose-500 ring-2 ring-rose-500/60': touched.maxWeight && !validMaxWeight }"
                v-model.number="local.maxWeight"
                placeholder="Ej. 1000"
                @input="touched.maxWeight = true"
                @blur="touched.maxWeight = true"
              />
            </UiTooltip>
            <input
              v-else
              type="number"
              class="w-full rounded-lg bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 border"
              :class="{ 'border-rose-500 ring-2 ring-rose-500/60': touched.maxWeight && !validMaxWeight }"
              v-model.number="local.maxWeight"
              placeholder="Ej. 1000"
              @input="touched.maxWeight = true"
              @blur="touched.maxWeight = true"
            />
            <p v-if="touched.maxWeight && !validMaxWeight" class="mt-2 text-xs text-rose-600">La capacidad de carga es requerida.</p>
          </div>

          <!-- Extras -->
          <!-- <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Extras</h4>
            <div>
              <label class="mb-1 block text-xs text-slate-600">Peso máximo (kg)</label>
              <input
                type="number"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                v-model.number="local.maxWeight"
                placeholder="Ej. 1000"
              />
            </div>
          </div> -->
        </div>
      </div>

      <!-- Footer con Cerrar + Guardar -->
      <div
        class="px-5 py-4 border-t border-t-slate-200 bg-gray-50 flex justify-end gap-3 flex-shrink-0"
      >
        <button
          class="px-4 py-2 cursor-pointer rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          @click="closeModal"
        >
          Cerrar
        </button>
        <button
          class="px-4 py-2 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 bg-primary text-white hover:bg-primary-600 focus:ring-primary-700 cursor-pointer"
          @click="onSave"
        >Guardar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation'
import { useToast } from '@/inventory-smart/composables/useToast'
import { CM_TO_PX, LOAD_MARGIN, PLANTILLAS_PLANTA } from '@/inventory-smart/utils/constants'
import { insideAreaModel } from '@/inventory-smart/utils/isPlacementValid'
import DrawEditor from './DrawEditor.vue'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'

const canvasStore = useCanvasStore()
const { showToast } = useToast()
const weightValidation = useWeightValidation()
const canvasEditorRef = ref(null)

const ovalSamplePoints = (cx, cy, rx, ry, n) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }
  })

const PIXELS_PER_CM = CM_TO_PX

const rectW = ref(500)
const rectL = ref(500)
const rectY = ref(500)

const localRectWMeters = ref(5)
const localRectLMeters = ref(5)
const localRectYMeters = ref(5)

const worldWidth = computed(() => rectW.value * PIXELS_PER_CM)
const worldHeight = computed(() => rectL.value * PIXELS_PER_CM)

const local = reactive({
  id: null,
  name: '',
  codigo: '',
  shape: 'rectangle',
  polygon: [],
  elements: [],
  unit: 'cm',
  pixelsPerUnit: PIXELS_PER_CM,
  height: 500,
  maxWeight: 1000,
  // NUEVO: modo elástico
  isInfinite: false,
})

const notice = ref('')
// Sistema de validación inline
const errors = reactive({ name: false, codigo: false, shape: false, dimensions: false, maxWeight: false })
const touched = reactive({ name: false, codigo: false, shape: false, dimensions: false, maxWeight: false })

function resetValidationState() {
  errors.name = false
  errors.codigo = false
  errors.shape = false
  errors.dimensions = false
  errors.maxWeight = false
  touched.name = false
  touched.codigo = false
  touched.shape = false
  touched.dimensions = false
  touched.maxWeight = false
}

const validNombre = computed(() => String(local.name || '').trim().length > 0)
const validCodigo = computed(() => String(local.codigo || '').trim().length > 0)
const validShape = computed(() => local.isInfinite || (local.shape === 'rectangle' || local.shape === 'circle'))
const validDims = computed(() => {
  if (local.isInfinite) return true
  return (Number(localRectWMeters.value) || 0) > 0 && (Number(localRectLMeters.value) || 0) > 0 && (Number(localRectYMeters.value) || 0) > 0
})
// Capacidad: debe considerarse inválida si el usuario interactuó y el campo quedó vacío (null/'')
const validMaxWeight = computed(() => {
  if (local.isInfinite) return true
  const raw = local.maxWeight
  if (raw === '' || raw === null || raw === undefined) return false
  const n = Number(raw)
  if (!Number.isFinite(n)) return false
  return n >= 0
})
const isManuallyEdited = ref(false)
const isLoadingData = ref(false)
let dimensionChangeDebounce = null
let skipDimensionWatcher = false
let prevBodyOverflow = null

// Hint cuando se cambia de elástico -> limitado
const showLimitedHint = ref(false)

// Estado para indicar que la capacidad fue autocompletada al pasar de planta elástica -> finita
const capacityWasAutoAdjusted = ref(false)
const autoSuggestedMaxWeight = ref(null)
const capacityTooltip = computed(() => {
  if (!capacityWasAutoAdjusted.value || !autoSuggestedMaxWeight.value) return ''
  return `Ajustado a carga requerida de ${autoSuggestedMaxWeight.value} kg`
})

const INFINITE_PREVIEW_PADDING = 14
const FINITE_PREVIEW_PADDING = 14
const MIN_DIMENSION_CM = 100
const DEFAULT_HEIGHT_CM = 300

function getElementDimensionsPx(el) {
  const width = Number(el?.width)
  const height = Number(el?.height)
  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return { width, height }
  }
  const widthCm = Number(el?.dimensiones?.ancho)
  const heightCm = Number(el?.dimensiones?.largo)
  if (
    Number.isFinite(widthCm) &&
    Number.isFinite(heightCm) &&
    widthCm > 0 &&
    heightCm > 0
  ) {
    return { width: widthCm * PIXELS_PER_CM, height: heightCm * PIXELS_PER_CM }
  }
  return null
}

function getElementPositionPx(el) {
  const x = Number(el?.x)
  const y = Number(el?.y)
  if (Number.isFinite(x) && Number.isFinite(y)) {
    return { x, y }
  }
  const posX = Number(el?.posicion?.x)
  const posY = Number(el?.posicion?.y)
  if (Number.isFinite(posX) && Number.isFinite(posY)) {
    // Nota: las posiciones en `posicion` vienen en cm → convertir a px
    return { x: posX * PIXELS_PER_CM, y: posY * PIXELS_PER_CM }
  }
  return null
}

function computeElementBBox(el) {
  const dims = getElementDimensionsPx(el)
  const pos = getElementPositionPx(el)
  if (!dims || !pos) return null

  const rotationRaw = Number(el?.rotation ?? el?.posicion?.rotation ?? 0) || 0
  const rotation = Number.isFinite(rotationRaw) ? rotationRaw : 0
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const offsetX = Number(el?.offsetX ?? el?.offset?.x ?? 0) || 0
  const offsetY = Number(el?.offsetY ?? el?.offset?.y ?? 0) || 0

  const corners = [
    { x: 0, y: 0 },
    { x: dims.width, y: 0 },
    { x: dims.width, y: dims.height },
    { x: 0, y: dims.height },
  ]

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const corner of corners) {
    const localX = corner.x - offsetX
    const localY = corner.y - offsetY
    const rotatedX = localX * cos - localY * sin
    const rotatedY = localX * sin + localY * cos
    const worldX = pos.x + rotatedX
    const worldY = pos.y + rotatedY
    minX = Math.min(minX, worldX)
    minY = Math.min(minY, worldY)
    maxX = Math.max(maxX, worldX)
    maxY = Math.max(maxY, worldY)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

function computeElementsBBox(elements) {
  const list = Array.isArray(elements) ? elements : []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let hasAny = false

  for (const el of list) {
    if (!el || el.visible === false) continue
    const bbox = computeElementBBox(el)
    if (!bbox) continue
    hasAny = true
    minX = Math.min(minX, bbox.minX)
    minY = Math.min(minY, bbox.minY)
    maxX = Math.max(maxX, bbox.maxX)
    maxY = Math.max(maxY, bbox.maxY)
  }

  if (!hasAny) return null
  return { minX, minY, maxX, maxY }
}

function padBBox(bbox, padding) {
  if (!bbox) return null
  const p = Number(padding) || 0
  return {
    minX: bbox.minX - p,
    minY: bbox.minY - p,
    maxX: bbox.maxX + p,
    maxY: bbox.maxY + p,
  }
}

function getPolygonBBox(poly) {
  if (!Array.isArray(poly) || poly.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let has = false
  for (const point of poly) {
    const x = Number(point?.x)
    const y = Number(point?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    has = true
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  if (!has) return null
  return { minX, minY, maxX, maxY }
}

function buildRectPolygon(widthPx, lengthPx, originX, originY) {
  const w = Number(widthPx) || 0
  const l = Number(lengthPx) || 0
  const ox = Number(originX) || 0
  const oy = Number(originY) || 0
  return [
    { x: ox, y: oy },
    { x: ox + w, y: oy },
    { x: ox + w, y: oy + l },
    { x: ox, y: oy + l },
  ]
}

const previewElements = computed(() => {
  const list = Array.isArray(local.elements) ? local.elements : []
  return list
    .map((el) => {
      const dims = getElementDimensionsPx(el)
      const pos = getElementPositionPx(el)
      if (!dims || !pos) return null
      return {
        id: el?.id ?? el?._id ?? `${Math.random().toString(36).slice(2)}`,
        nombre: el?.nombre ?? el?.name ?? '',
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        width: Math.round(dims.width),
        height: Math.round(dims.height),
        forma: el?.forma || el?.shape || 'rectangular',
      }
    })
    .filter(Boolean)
})

const previewFrameBBox = computed(() => {
  // Plantas infinitas → preview se encuadra al BBox de elementos con padding.
  if (!local.isInfinite) return null
  const raw = computeElementsBBox(previewElements.value)
  if (!raw) return null
  return padBBox(raw, INFINITE_PREVIEW_PADDING)
})

const showInfiniteEmptyState = computed(() => local.isInfinite && !previewFrameBBox.value)

function defaultRect(w_cm, l_cm) {
  const w = w_cm * PIXELS_PER_CM
  const l = l_cm * PIXELS_PER_CM
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: l },
    { x: 0, y: l },
  ]
}

function computeHeightFromElementsCm(elements) {
  const list = Array.isArray(elements) ? elements : []
  let maxHeight = 0
  for (const el of list) {
    if (!el || el.visible === false) continue
    const elementoAlto = Number(el?.dimensiones?.alto) || 0
    const base = Number(el?.alturaRespectoAlSuelo) || 0
    const total = elementoAlto + base
    if (total > maxHeight) maxHeight = total
  }
  return maxHeight > 0 ? Math.ceil(maxHeight) : 0
}

function normalizeMeters(valueCm) {
  if (!Number.isFinite(valueCm)) return 0
  return Number((valueCm / 100).toFixed(2))
}

function suggestFiniteDimensionsFromContent() {
  const rawBBox = computeElementsBBox(local.elements)
  const paddedBBox = padBBox(rawBBox, FINITE_PREVIEW_PADDING)
  let originX = 0
  let originY = 0

  let widthCm = MIN_DIMENSION_CM
  let lengthCm = MIN_DIMENSION_CM

  if (paddedBBox) {
    const minX = Math.floor(paddedBBox.minX)
    const minY = Math.floor(paddedBBox.minY)
    const maxX = Math.ceil(paddedBBox.maxX)
    const maxY = Math.ceil(paddedBBox.maxY)
    if (
      Number.isFinite(minX) &&
      Number.isFinite(minY) &&
      Number.isFinite(maxX) &&
      Number.isFinite(maxY) &&
      maxX > minX &&
      maxY > minY
    ) {
      originX = minX
      originY = minY
      const widthPx = Math.max(1, maxX - minX)
      const lengthPx = Math.max(1, maxY - minY)
      widthCm = Math.max(MIN_DIMENSION_CM, Math.ceil(widthPx / PIXELS_PER_CM))
      lengthCm = Math.max(MIN_DIMENSION_CM, Math.ceil(lengthPx / PIXELS_PER_CM))
    }
  } else {
    const fallbackWidthCm = Number(rectW.value) || 0
    const fallbackLengthCm = Number(rectL.value) || 0
    if (Number.isFinite(fallbackWidthCm) && fallbackWidthCm > 0) {
      widthCm = Math.max(MIN_DIMENSION_CM, Math.ceil(fallbackWidthCm))
    }
    if (Number.isFinite(fallbackLengthCm) && fallbackLengthCm > 0) {
      lengthCm = Math.max(MIN_DIMENSION_CM, Math.ceil(fallbackLengthCm))
    }
    const polyBBox = getPolygonBBox(local.polygon)
    if (polyBBox) {
      originX = Math.floor(polyBBox.minX)
      originY = Math.floor(polyBBox.minY)
    }
  }

  if (!Number.isFinite(originX)) originX = 0
  if (!Number.isFinite(originY)) originY = 0

  const prevHeightMeters = Number(localRectYMeters.value)
  const prevHeightCm = Number.isFinite(prevHeightMeters) && prevHeightMeters > 0 ? prevHeightMeters * 100 : 0
  const heightFromElementsCm = computeHeightFromElementsCm(local.elements)
  const heightCm = prevHeightCm > 0
    ? Math.ceil(prevHeightCm)
    : (heightFromElementsCm > 0 ? heightFromElementsCm : DEFAULT_HEIGHT_CM)

  const widthMeters = normalizeMeters(widthCm)
  const lengthMeters = normalizeMeters(lengthCm)
  const heightMeters = normalizeMeters(heightCm)

  skipDimensionWatcher = true
  rectW.value = widthCm
  rectL.value = lengthCm
  rectY.value = heightCm
  localRectWMeters.value = widthMeters
  localRectLMeters.value = lengthMeters
  localRectYMeters.value = heightMeters

  const worldWidthPx = rectW.value * PIXELS_PER_CM
  const worldLengthPx = rectL.value * PIXELS_PER_CM

  let nextPolygon
  if (local.shape === 'circle') {
    const circlePoints = applyCircle(rectW.value, rectL.value)
    nextPolygon = circlePoints.map((pt) => ({ x: pt.x + originX, y: pt.y + originY }))
  } else if (local.shape === 'rectangle') {
    nextPolygon = buildRectPolygon(worldWidthPx, worldLengthPx, originX, originY)
  } else {
    const current = Array.isArray(local.polygon) ? local.polygon : []
    const sourceBBox = getPolygonBBox(current)
    if (current.length >= 3 && sourceBBox) {
      const sourceWidth = Math.max(1, sourceBBox.maxX - sourceBBox.minX)
      const sourceHeight = Math.max(1, sourceBBox.maxY - sourceBBox.minY)
      nextPolygon = current.map((pt) => ({
        x: Math.round(originX + ((pt.x - sourceBBox.minX) / sourceWidth) * worldWidthPx),
        y: Math.round(originY + ((pt.y - sourceBBox.minY) / sourceHeight) * worldLengthPx),
      }))
    } else {
      nextPolygon = buildRectPolygon(worldWidthPx, worldLengthPx, originX, originY)
    }
  }

  local.polygon = nextPolygon
  errors.dimensions = false
  notice.value = ''

  // Al pasar de infinita→finita: usamos el BBox del contenido para proponer dimensiones (W×L) con padding,
  // rellenamos el formulario y reencuadramos el preview con el nuevo rectángulo.
  nextTick(() => {
    skipDimensionWatcher = false
    canvasEditorRef.value?.fitStageToPolygon()
  })
}

const closeModal = () => {
  resetLocalState()
  canvasStore.cerrarEditor()
  resetMode()
  // Restaurar scroll del body
  document.body.style.overflow = prevBodyOverflow || ''
}

function resetLocalState() {
  local.id = null
  local.name = ''
  local.codigo = ''
  local.shape = 'rectangle'
  rectW.value = 500
  rectL.value = 500
  rectY.value = 500
  local.polygon = defaultRect(500, 500)
  local.elements = []
  local.height = 500
  local.maxWeight = 1000
  local.isInfinite = false
  isManuallyEdited.value = false
  showLimitedHint.value = false

  localRectWMeters.value = rectW.value / 100
  localRectLMeters.value = rectL.value / 100
  localRectYMeters.value = rectY.value / 100

  resetValidationState()
  notice.value = ''
}

watch(
  () => canvasStore.plantaEnEdicion,
  (planta) => {
    isLoadingData.value = true

    if (planta) {
      local.id = planta.id
      local.name = planta.nombre
      local.polygon = planta.poligono
      // Asegurar que siempre se asigne una plantilla válida por defecto
      local.shape = planta.forma || 'rectangle' // Si no tiene forma, usar 'rectangle' como default
      local.isInfinite = !!planta.isInfinite
      local.codigo = planta.codigo || ''

      const todosLosElementos = canvasStore.elementos || []
      local.elements = todosLosElementos.filter((el) => el.plantaId === planta.id && !el.padre)

      rectW.value = planta.dimensiones.ancho
      rectL.value = planta.dimensiones.largo
      localRectWMeters.value = planta.dimensiones.ancho / 100
      localRectLMeters.value = planta.dimensiones.largo / 100
      localRectYMeters.value = planta.dimensiones.alto / 100

      // local.height = planta.dimensiones.alto;
      local.maxWeight = planta.capacidadCargaSoportado;
      isManuallyEdited.value = true
      resetValidationState()
    } else {
      resetLocalState()
    }

    nextTick(() => {
      // Primer ajuste: si es infinita, el fit usará frameBBox computado a partir de elementos
      canvasEditorRef.value?.fitStageToPolygon()
      // Forzar un segundo tick por si frameBBox depende de mediciones
      nextTick(() => {
        canvasEditorRef.value?.fitStageToPolygon()
        isLoadingData.value = false
      })
    })
  },
  { immediate: true, deep: true },
)

const adding = ref(false)
const deleting = ref(false)

const resetMode = () => {
  adding.value = false
  deleting.value = false
}

const onFitPreview = () => {
  canvasEditorRef.value?.fitStageToPolygon()
}

function toggleAddMode() {
  adding.value = !adding.value
  if (adding.value) {
    deleting.value = false
    notice.value = ''
  }
}
function toggleDeleteMode() {
  deleting.value = !deleting.value
  if (deleting.value) adding.value = false
  if (!deleting.value) {
    notice.value = ''
    document.body.style.cursor = 'default'
  }
}

const onPolygonUpdate = (newPolygon) => {
  local.polygon = newPolygon
  isManuallyEdited.value = true
}

// Validación reactiva de campos básicos
watch(
  () => local.name,
  (val) => {
    errors.name = !String(val || '').trim()
  }
)
watch(
  () => local.maxWeight,
  (val) => {
    const n = Number(val)
    errors.maxWeight = !Number.isFinite(n) || n < 0
  }
)

function applyRect(w_cm, l_cm) {
  const wPx = w_cm * PIXELS_PER_CM
  const lPx = l_cm * PIXELS_PER_CM
  return [
    { x: 0, y: 0 },
    { x: wPx, y: 0 },
    { x: wPx, y: lPx },
    { x: 0, y: lPx },
  ]
}

function applyCircle(w_cm, l_cm) {
  const wPx = w_cm * PIXELS_PER_CM
  const lPx = l_cm * PIXELS_PER_CM
  const rx = wPx / 2
  const ry = lPx / 2
  const cx = rx
  const cy = ry
  return ovalSamplePoints(cx, cy, rx, ry, 32).map((p) => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
  }))
}

// Watch de cambio de plantilla/shape con validación y posible revert
watch(
  () => local.shape,
  (newShape, oldShape) => {
    if (isLoadingData.value) return
    if (newShape === oldShape) return
    let newPolygon
    if (newShape === 'rectangle') newPolygon = applyRect(rectW.value, rectL.value)
    else if (newShape === 'circle') newPolygon = applyCircle(rectW.value, rectL.value)
    else {
      isManuallyEdited.value = true
      return
    }

    const res = validatePolygonAndContainment(
      newPolygon,
      rectW.value * PIXELS_PER_CM,
      rectL.value * PIXELS_PER_CM,
    )
    if (!res.ok) {
      // Mantener la selección del usuario aunque el polígono propuesto no sea válido.
      // Mostramos aviso y no aplicamos el nuevo polígono.
      notice.value = res.message
      isManuallyEdited.value = true
      return
    }

    notice.value = ''
    local.polygon = newPolygon
    isManuallyEdited.value = false
    resetMode()
    nextTick(() => {
      canvasEditorRef.value?.fitStageToPolygon()
    })
  },
)

// NUEVO: Watch del modo elástico
watch(
  () => local.isInfinite,
  async (isOn, wasOn) => {
    if (isLoadingData.value) return
    // Si pasa a elástico, aplicar inmediatamente en la planta activa (si existe)
    if (isOn && local.id) {
      try { canvasStore.editarPlanta(local.id, { isInfinite: true }) } catch (e) { /* ignore */ }
      showLimitedHint.value = false
      notice.value = ''
    }
    // Si pasa a limitado desde elástico, mostrar hint hasta que se guarde con dimensiones válidas
    if (!isOn && wasOn) {
      // Asegurar una plantilla válida por defecto para habilitar el selector
      if (local.shape === 'none') {
        local.shape = 'rectangle'
      }
      showLimitedHint.value = true
      suggestFiniteDimensionsFromContent()
      // Calcular la carga requerida por los elementos y autocompletar la capacidad si es necesario
      try {
        // Si tenemos una planta existente, preferimos usar el cálculo centralizado (toma en cuenta jerarquía)
        let requiredLoad = 0
        if (local.id) {
          requiredLoad = Number(weightValidation.calcularPesoTotal(local.id, 'plantas') || 0)
        } else {
          // Fallback: sumar desde local.elements (peso por elemento * cantidad/unidades si existen)
          requiredLoad = (Array.isArray(local.elements) ? local.elements : []).reduce((acc, el) => {
            const basePeso = Number(el?.pesoMaximo || 0)
            const qty = Number(el?.cantidad || el?.unidades || el?.qty || 1) || 1
            return acc + basePeso * qty
          }, 0)
        }

        const margin = typeof LOAD_MARGIN === 'number' ? LOAD_MARGIN : 0
        const suggested = Math.ceil(requiredLoad * (1 + margin))

        // Reglas: si requiredLoad == 0 -> conservar capacidad previa si > 0, si nula -> poner 0
        if (requiredLoad <= 0) {
          // No forzamos a cero si el usuario ya tenía un valor mayor (preservar)
          if (!Number.isFinite(Number(local.maxWeight)) || Number(local.maxWeight) < 0) {
            local.maxWeight = 0
            capacityWasAutoAdjusted.value = true
            autoSuggestedMaxWeight.value = 0
          }
        } else {
          // Si el valor actual es no-finito o menor al sugerido, ajustarlo
          const current = Number(local.maxWeight || 0)
          if (!Number.isFinite(current) || current < suggested) {
            local.maxWeight = suggested
            capacityWasAutoAdjusted.value = true
            autoSuggestedMaxWeight.value = suggested
          }
        }
      } catch (err) {
        // No interrumpir el flujo por errores en la suma; dejar que el usuario edite manualmente
        console.error('Error calculando carga requerida al cambiar a planta finita', err)
      }
    }
  },
)

// Si el usuario edita manualmente la capacidad y difiere del valor sugerido, quitar la marca de autocompletado
watch(
  () => local.maxWeight,
  (val) => {
    if (autoSuggestedMaxWeight.value == null) return
    if (Number(val) !== Number(autoSuggestedMaxWeight.value)) {
      capacityWasAutoAdjusted.value = false
      autoSuggestedMaxWeight.value = null
    }
  }
)

// Helpers de validación reutilizables
function validatePolygonAndContainment(newPolygon, newWorldWidth, newWorldLength) {
  const validation = canvasEditorRef.value?.isPolygonValid(newPolygon, local.elements)
  if (validation && !validation.valid) {
    return { ok: false, message: validation.message }
  }

  const areaBounds = {
    minX: 0,
    minY: 0,
    maxX: newWorldWidth,
    maxY: newWorldLength,
    polygon: newPolygon,
  }

  const fuera = (local.elements || []).filter((el) => {
    const pos = { x: Number(el?.x) || 0, y: Number(el?.y) || 0 }
    return !insideAreaModel(pos, el, areaBounds, 0.5)
  })
  if (fuera.length > 0) {
    const nombres = fuera.map((e) => e?.nombre || `ID ${e?.id}`).join(', ')
    return {
      ok: false,
      message: `Con estas dimensiones, ${fuera.length === 1 ? 'el elemento' : 'los elementos'} ${nombres} quedarían fuera del área.`,
    }
  }

  return { ok: true }
}

function validateElementsHeight(newY_cm) {
  let alturaMinimaRequerida_cm = 0
  const elementosQueNoCaben = []
  for (const el of local.elements) {
    const tipo = String(el?.tipo || '').toLowerCase()
    if (tipo.includes('pasillo')) continue
    const alturaEl = Number(el?.dimensiones?.alto) || 0
    const zBase = Number(el?.alturaRespectoAlSuelo) || 0
    const alturaTotalElemento_cm = alturaEl + zBase
    alturaMinimaRequerida_cm = Math.max(alturaMinimaRequerida_cm, alturaTotalElemento_cm)
    if (alturaTotalElemento_cm > newY_cm) {
      elementosQueNoCaben.push(el.nombre || `ID ${el.id}`)
    }
  }
  if (elementosQueNoCaben.length > 0) {
    const alturaMinimaEnMetros = (alturaMinimaRequerida_cm / 100).toFixed(2)
    const nombresElementos = elementosQueNoCaben.join(', ')
    return {
      ok: false,
      message: `Altura insuficiente. Se requiere ${alturaMinimaEnMetros} m. Elementos afectados: ${nombresElementos}.`,
    }
  }
  return { ok: true }
}

function tryApplyDimensionsCM(newW_cm, newL_cm, newY_cm, opts = { apply: true, fit: true, changedDimension: null }) {
  const oldW_cm = rectW.value
  const oldL_cm = rectL.value
  const oldY_cm = rectY.value
  if (!oldW_cm || !oldL_cm) return { ok: false, message: '' }

  // 🔍 ESTRATEGIA: Si solo cambió la altura, NO tocar el polígono
  if (opts.changedDimension === 'height' && newW_cm === oldW_cm && newL_cm === oldL_cm) {
    // Validar solo la altura contra los elementos
    const heightCheck = validateElementsHeight(newY_cm)
    if (!heightCheck.ok) return heightCheck

    if (opts.apply) {
      rectY.value = newY_cm
      notice.value = ''
    }
    return { ok: true }
  }

  const newWorldWidth = newW_cm * PIXELS_PER_CM
  const newWorldLength = newL_cm * PIXELS_PER_CM

  const polyBBox = getPolygonBBox(local.polygon)
  const baseX = polyBBox?.minX ?? 0
  const baseY = polyBBox?.minY ?? 0
  const polyWidthPx = Math.max(1, (polyBBox?.maxX ?? baseX) - baseX)
  const polyLengthPx = Math.max(1, (polyBBox?.maxY ?? baseY) - baseY)

  let nextPolygon

  // 🎯 Si el usuario modificó manualmente el polígono, SIEMPRE escalar (no regenerar)
  if (isManuallyEdited.value && local.polygon.length >= 3 && polyBBox) {
    // Escalar proporcionalmente los vértices existentes sin importar la plantilla
    nextPolygon = local.polygon.map((pt) => ({
      x: Math.round(baseX + (polyWidthPx ? ((pt.x - polyBBox.minX) / polyWidthPx) * newWorldWidth : 0)),
      y: Math.round(baseY + (polyLengthPx ? ((pt.y - polyBBox.minY) / polyLengthPx) * newWorldLength : 0)),
    }))
  } else if (local.shape === 'circle') {
    const circlePoints = applyCircle(newW_cm, newL_cm)
    nextPolygon = circlePoints.map((pt) => ({ x: pt.x + baseX, y: pt.y + baseY }))
  } else if (local.shape === 'rectangle') {
    nextPolygon = buildRectPolygon(newWorldWidth, newWorldLength, baseX, baseY)
  } else {
    // Fallback: polígono sin plantilla definida
    const current = Array.isArray(local.polygon) ? local.polygon : []
    if (current.length >= 3 && polyBBox) {
      nextPolygon = current.map((pt) => ({
        x: Math.round(baseX + (polyWidthPx ? ((pt.x - polyBBox.minX) / polyWidthPx) * newWorldWidth : 0)),
        y: Math.round(baseY + (polyLengthPx ? ((pt.y - polyBBox.minY) / polyLengthPx) * newWorldLength : 0)),
      }))
    } else {
      nextPolygon = buildRectPolygon(newWorldWidth, newWorldLength, baseX, baseY)
    }
  }

  const polyCheck = validatePolygonAndContainment(nextPolygon, newWorldWidth, newWorldLength)
  if (!polyCheck.ok) return polyCheck

  const heightCheck = validateElementsHeight(newY_cm)
  if (!heightCheck.ok) return heightCheck

  if (opts.apply) {
    rectW.value = newW_cm
    rectL.value = newL_cm
    rectY.value = newY_cm
    local.polygon = nextPolygon
    notice.value = ''

    if (opts.fit) {
      nextTick(() => {
        canvasEditorRef.value?.fitStageToPolygon()
      })
    }
  }
  return { ok: true }
}

// --- WATCH MEJORADO: Detectar qué dimensión cambió ---
watch([localRectWMeters, localRectLMeters, localRectYMeters], ([newW, newL, newY], [oldW, oldL, oldY]) => {
  if (isLoadingData.value || skipDimensionWatcher) return

  clearTimeout(dimensionChangeDebounce)

  // Si el modo es elástico, ignorar cambios de dimensiones
  if (local.isInfinite) return

  // Si el valor del input es vacío, v-model.number lo convierte en '' (string) o null.
  // Esta guarda previene la ejecución si los valores no son números válidos y positivos.
  if (typeof newW !== 'number' || typeof newL !== 'number' || typeof newY !== 'number' || newW <= 0 || newL <= 0 || newY <= 0) {
    errors.dimensions = true
    // No ponemos notice para no ser agresivos mientras el usuario escribe
    return
  }

  // 🎯 Detectar qué dimensión cambió
  let changedDimension = null
  if (oldY !== undefined && newY !== oldY && newW === oldW && newL === oldL) {
    changedDimension = 'height'
  } else if (oldW !== undefined && newW !== oldW) {
    changedDimension = 'width'
  } else if (oldL !== undefined && newL !== oldL) {
    changedDimension = 'length'
  }

  dimensionChangeDebounce = setTimeout(() => {
    const newW_cm = (Number(localRectWMeters.value) || 0) * 100
    const newL_cm = (Number(localRectLMeters.value) || 0) * 100
    const newY_cm = (Number(localRectYMeters.value) || 0) * 100
    const res = tryApplyDimensionsCM(newW_cm, newL_cm, newY_cm, { apply: true, fit: true, changedDimension })
    if (!res.ok) {
      errors.dimensions = true
      notice.value = res.message || ''
    } else {
      errors.dimensions = false
    }
  }, 400)
})

// onShapeChange eliminado en favor del watch sobre local.shape

function markAllTouched() {
  touched.name = true
  touched.codigo = true
  touched.shape = true
  touched.dimensions = true
  touched.maxWeight = true
}

function onSave() {
  markAllTouched()
  // Validaciones básicas previas
  if (!validNombre.value || !validCodigo.value) return
  if (!validShape.value) return
  if (!validDims.value) return
  if (!validMaxWeight.value) return
  // Si hay un debounce pendiente, aplicamos dimensiones inmediatamente antes de guardar (solo en modo limitado)
  if (!local.isInfinite && dimensionChangeDebounce) {
    clearTimeout(dimensionChangeDebounce)
    const newW_cm = (Number(localRectWMeters.value) || 0) * 100
    const newL_cm = (Number(localRectLMeters.value) || 0) * 100
    const newY_cm = (Number(localRectYMeters.value) || 0) * 100
    const res = tryApplyDimensionsCM(newW_cm, newL_cm, newY_cm, { apply: true, fit: false, changedDimension: null })
    if (!res.ok) {
      notice.value = res.message
      showToast('Por favor corrige los errores antes de guardar.', 'error')
      return
    }
  }

  errors.name = false
  errors.dimensions = false
  errors.maxWeight = false

  errors.name = !validNombre.value
  errors.codigo = !validCodigo.value
  errors.shape = !validShape.value
  errors.dimensions = !validDims.value
  errors.maxWeight = !validMaxWeight.value
  if (errors.name || errors.codigo || errors.shape || errors.dimensions || errors.maxWeight) {
    if (!notice.value) notice.value = 'Corrige los campos marcados.'
    return
  }

  // Rama Modo Elástico: omitir validaciones de contención y dimensiones
  if (local.isInfinite) {
    const plantaData = {
      id: local.id,
      nombre: local.name.trim(),
      codigo: local.codigo.trim(),
      isInfinite: true,
      // Preservamos referencias existentes (polígono/dimensiones) para compat
      dimensiones: {
        alto: (Number(localRectYMeters.value) || 0) * 100 || (canvasStore.plantaEnEdicion?.dimensiones?.alto || 0),
        ancho: rectW.value,
        largo: rectL.value,
      },
      forma: local.shape,
      poligono: local.polygon,
      pesoMaximoSoportado: Number(local.maxWeight) || 0,
    }

    if (plantaData.id) {
      canvasStore.editarPlanta(plantaData.id, plantaData)
      canvasStore.calcularCanvasAdaptativoPlanta(plantaData)
      showToast('Modo elástico aplicado a la planta.', 'success')
    } else {
      delete plantaData.id
      canvasStore.agregarPlanta(plantaData)
    }

    resetLocalState()
    resetMode()
    canvasStore.cerrarEditor()
    return
  }

  // Rama Modo Limitado (validaciones completas)
  if (notice.value) {
    showToast('Por favor corrige los errores antes de guardar.', 'error')
    return
  }

  if (local.shape === 'rectangle' || local.shape === 'circle') {
    // Validar contra las refs directamente
    if ((Number(localRectWMeters.value) || 0) <= 0 || (Number(localRectLMeters.value) || 0) <= 0 || (Number(localRectYMeters.value) || 0) <= 0) {
      errors.dimensions = true
      notice.value = 'Las dimensiones deben ser mayores a cero.'
      return
    }
  }

  // Validación extra: capacidad no negativa (solo si visible)
  if (!Number.isFinite(Number(local.maxWeight)) || Number(local.maxWeight) < 0) {
    errors.maxWeight = true
    notice.value = 'La capacidad máxima (kg) no puede ser negativa.'
    return
  }

  // Validación extra: altura suficiente para elementos no pasillos
  const newY_cm = (Number(localRectYMeters.value) || 0) * 100
  let alturaMinimaRequerida_cm = 0
  const elementosQueNoCaben = []
  for (const el of local.elements) {
    const tipo = String(el?.tipo || '').toLowerCase()
    if (tipo.includes('pasillo')) continue
    const alturaEl = Number(el?.dimensiones?.alto) || 0
    const zBase = Number(el?.alturaRespectoAlSuelo) || 0
    const alturaTotalElemento_cm = alturaEl + zBase
    alturaMinimaRequerida_cm = Math.max(alturaMinimaRequerida_cm, alturaTotalElemento_cm)
    if (alturaTotalElemento_cm > newY_cm) elementosQueNoCaben.push(el.nombre || `ID ${el.id}`)
  }
  if (elementosQueNoCaben.length > 0) {
    const alturaMinimaEnMetros = (alturaMinimaRequerida_cm / 100).toFixed(2)
    const nombresElementos = elementosQueNoCaben.join(', ')
    errors.dimensions = true
    notice.value = `Altura insuficiente. Se requiere ${alturaMinimaEnMetros} m. Elementos afectados: ${nombresElementos}.`
    return
  }

  if ((local.polygon?.length || 0) < 3) {
    notice.value = 'El polígono debe tener al menos 3 vértices.'
    return
  }

  // Validación unificada: contención de TODOS los elementos respecto al polígono/área actual
  const areaBounds = {
    minX: 0,
    minY: 0,
    maxX: worldWidth.value,
    maxY: worldHeight.value,
    polygon: local.polygon,
  }
  const fuera = (local.elements || []).filter((el) => {
    const pos = { x: Number(el?.x) || 0, y: Number(el?.y) || 0 }
    return !insideAreaModel(pos, el, areaBounds, 0.5)
  })
  if (fuera.length > 0) {
    const nombres = fuera.map((e) => e?.nombre || `ID ${e?.id}`).join(', ')
    errors.dimensions = true
    notice.value = `No se puede guardar: ${fuera.length === 1 ? 'el elemento' : 'los elementos'} ${nombres} quedan fuera del área.`
    return
  }

  // Validar que la capacidad de carga no sea menor a la capacidad de carga total de los hijos
  if (local.id) {
    // Solo para edición de plantas existentes
    const pesoTotalHijos = weightValidation.calcularPesoTotal(local.id, 'plantas')

    if (local.maxWeight > 0 && pesoTotalHijos > local.maxWeight) {
      showToast(
        `La capacidad de carga de la planta (${local.maxWeight} kg) es menor a la capacidad de carga total requerida por los elementos contenidos (${Math.round(pesoTotalHijos * 100) / 100} kg).`,
        'error',
      )
      return
    }
  }

  const plantaData = {
    id: local.id,
    nombre: local.name.trim(),
    codigo: local.codigo.trim(),
    capacidadCargaSoportado: local.maxWeight,
    isInfinite: false,
    dimensiones: {
      // Alto desde input en metros -> cm
      alto: (Number(localRectYMeters.value) || 0) * 100,
      ancho: rectW.value,
      largo: rectL.value,
    },
    forma: local.shape,
    poligono: local.polygon,
  }

  if (plantaData.id) {
    canvasStore.editarPlanta(plantaData.id, plantaData)
    canvasStore.calcularCanvasAdaptativoPlanta(plantaData)
    showToast('Planta actualizada correctamente.', 'success')
  } else {
    delete plantaData.id
    canvasStore.agregarPlanta(plantaData)
  }

  resetLocalState()
  resetMode()
  canvasStore.cerrarEditor()
}

// Estado derivado para habilitar el guardado
// Botón siempre habilitado: se mantiene canSave obsoleto (eliminado) para no usar disabled

onBeforeUnmount(() => {
  if (dimensionChangeDebounce) {
    clearTimeout(dimensionChangeDebounce)
    dimensionChangeDebounce = null
  }
  document.body.style.cursor = 'default'
  document.body.style.overflow = prevBodyOverflow || ''
})

// Bloquear scroll mientras el modal esté abierto
watch(() => canvasStore.crearPlanta, (v) => {
  if (v) {
    prevBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = prevBodyOverflow || ''
  }
})
</script>
