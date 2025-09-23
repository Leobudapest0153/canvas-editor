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
        class="text-lg font-semibold tracking-tight text-gray-900 px-5 py-4 border-b border-b-slate-200 flex-shrink-0"
      >
        Área de Trabajo
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
                :elements="local.elements"
                :worldWidth="worldWidth"
                :worldHeight="worldHeight"
                :frameBBox="previewFrameBBox"
                :adding="adding"
                :deleting="deleting"
                @update:polygon="onPolygonUpdate"
                @notice="(newNotice) => (notice = newNotice)"
                class="h-full w-full"
              />
            </div>
          </div>

          <!-- Toolbar debajo del canvas -->
          <div class="px-3 pb-2">
            <div class="flex items-center gap-2 flex-shrink-0">
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
          <!-- Nombre -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Nombre</h4>
            <input
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              :class="{ 'border-rose-500 ring-2 ring-rose-500/60': errors.name }"
              v-model="local.name"
              placeholder="Ej. Bodega A"
            />
          </div>

          <!-- Modo: Planta elástica -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Modo</h4>
            <label class="flex items-center gap-3 select-none">
              <input type="checkbox" v-model="local.isInfinite" />
              <span class="font-semibold">Planta elástica</span>
              <UiTooltip
                label="En modo elástico no hay límites de planta. Usa la grilla y el minimapa para orientarte."
                position="right"
                :delay="300"
              >
                <svg class="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zM9 9V5h2v6H9zm0 4h2v2H9z" />
                </svg>
              </UiTooltip>
            </label>
            <p v-if="local.isInfinite" class="mt-2 text-xs text-slate-600">
              En este modo se ignoran los límites de planta. Las dimensiones y la capacidad quedan deshabilitadas.
            </p>
            <p v-else-if="showLimitedHint" class="mt-2 text-xs text-amber-700">
              Define dimensiones válidas antes de guardar para salir del modo elástico.
            </p>
          </div>

          <!-- Dimensiones -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm" v-show="!local.isInfinite">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">Dimensiones</h4>
            <div class="grid grid-cols-2 gap-x-3 gap-y-3">
              <div>
                <label class="mb-1 block text-xs text-slate-600">Ancho (m)</label>
                <input
                  type="number"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  :class="{ 'border-rose-500 ring-2 ring-rose-500/60': errors.dimensions }"
                  v-model.number="localRectWMeters"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-slate-600">Largo (m)</label>
                <input
                  type="number"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  :class="{ 'border-rose-500 ring-2 ring-rose-500/60': errors.dimensions }"
                  v-model.number="localRectLMeters"
                />
              </div>
              <div class="col-span-2">
                <label class="mb-1 block text-xs text-slate-600">Alto (m)</label>
                <input
                  type="number"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  :class="{ 'border-rose-500 ring-2 ring-rose-500/60': errors.dimensions }"
                  v-model.number="localRectYMeters"
                />
              </div>
            </div>
          </div>

          <!-- Capacidad máxima -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm" v-show="!local.isInfinite">
            <h4 class="text-sm font-semibold text-gray-800 mb-2">Capacidad máxima (kg)</h4>
            <input
              type="number"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              :class="{ 'border-rose-500 ring-2 ring-rose-500/60': errors.maxWeight }"
              v-model.number="local.maxWeight"
              placeholder="Ej. 1000"
            />
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
          class="px-4 py-2 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2"
          :class="[
            canSave
              ? 'cursor-pointer bg-primary text-white hover:bg-primary-800 focus:ring-primary-900'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          ]"
          :disabled="!canSave"
          @click="onSave"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation'
import { useToast } from '@/inventory-smart/composables/useToast'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'
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
const MIN_DIMENSION_CM = 100
const DEFAULT_HEIGHT_CM = 300

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
const errors = reactive({ name: false, dimensions: false, maxWeight: false })
const isManuallyEdited = ref(false)
const isLoadingData = ref(false)
let dimensionChangeDebounce = null

// Hint cuando se cambia de elástico -> limitado
const showLimitedHint = ref(false)

const INFINITE_PREVIEW_PADDING = 14
let suppressDimensionWatch = false

const previewFrameBBox = computed(() => {
  // Plantas infinitas → preview se encuadra al BBox de elementos con padding.
  if (!local.isInfinite) return null
  const items = Array.isArray(local.elements) ? local.elements : []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let hasValid = false
  for (const el of items) {
    const x = Number(el?.x)
    const y = Number(el?.y)
    const width = Number(el?.width)
    const height = Number(el?.height)
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      continue
    }
    hasValid = true
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }
  if (!hasValid) return null
  const padding = INFINITE_PREVIEW_PADDING
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
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

function getElementSizePx(el) {
  let width = Number(el?.width)
  let height = Number(el?.height)

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    const dims = el?.dimensiones || {}
    const anchoCm = Number(dims?.ancho)
    const largoCm = Number(dims?.largo)
    if (Number.isFinite(anchoCm) && anchoCm > 0) {
      width = anchoCm * PIXELS_PER_CM
    }
    if (Number.isFinite(largoCm) && largoCm > 0) {
      height = largoCm * PIXELS_PER_CM
    }
  }

  return { width, height }
}

function getElementPositionPx(el) {
  let x = Number(el?.x)
  let y = Number(el?.y)

  if (!Number.isFinite(x) && el?.posicion) {
    x = Number(el.posicion?.x)
  }
  if (!Number.isFinite(y) && el?.posicion) {
    y = Number(el.posicion?.y)
  }

  return { x, y }
}

function rotatePoint(point, pivot, angleRad) {
  const dx = point.x - pivot.x
  const dy = point.y - pivot.y
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  }
}

function computeElementsBoundingBox(elements, paddingPx = 0) {
  if (!Array.isArray(elements) || elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let hasValid = false

  for (const el of elements) {
    if (!el || el.visible === false) continue
    const { x, y } = getElementPositionPx(el)
    const { width, height } = getElementSizePx(el)

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      continue
    }
    if (width <= 0 || height <= 0) continue

    hasValid = true

    const rotationDeg = Number(el?.rotation ?? el?.posicion?.rotation ?? 0) || 0
    const normalizedRotation = ((rotationDeg % 360) + 360) % 360
    const baseCorners = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ]

    let allPoints = baseCorners
    if (Math.abs(normalizedRotation) > 1e-3) {
      const angleRad = (normalizedRotation * Math.PI) / 180
      const pivotTopLeft = { x, y }
      const pivotCenter = { x: x + width / 2, y: y + height / 2 }
      const rotatedTopLeft = baseCorners.map((pt) => rotatePoint(pt, pivotTopLeft, angleRad))
      const rotatedCenter = baseCorners.map((pt) => rotatePoint(pt, pivotCenter, angleRad))
      allPoints = [...baseCorners, ...rotatedTopLeft, ...rotatedCenter]
    }

    for (const pt of allPoints) {
      const px = Number(pt?.x)
      const py = Number(pt?.y)
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue
      if (px < minX) minX = px
      if (py < minY) minY = py
      if (px > maxX) maxX = px
      if (py > maxY) maxY = py
    }
  }

  if (!hasValid || !Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  const padding = Math.max(0, Number(paddingPx) || 0)
  const paddedMinX = minX - padding
  const paddedMinY = minY - padding
  const paddedMaxX = maxX + padding
  const paddedMaxY = maxY + padding

  return {
    minX: paddedMinX,
    minY: paddedMinY,
    maxX: paddedMaxX,
    maxY: paddedMaxY,
    widthPx: paddedMaxX - paddedMinX,
    heightPx: paddedMaxY - paddedMinY,
  }
}

function proposeFiniteDimensionsFromElements(elements) {
  const bbox = computeElementsBoundingBox(elements, INFINITE_PREVIEW_PADDING)
  if (!bbox) return null

  const widthPx = Math.max(Math.ceil(bbox.widthPx), Math.ceil(bbox.maxX))
  const lengthPx = Math.max(Math.ceil(bbox.heightPx), Math.ceil(bbox.maxY))

  const widthCm = Math.max(1, Math.ceil(widthPx / PIXELS_PER_CM))
  const lengthCm = Math.max(1, Math.ceil(lengthPx / PIXELS_PER_CM))

  return { widthCm, lengthCm, bbox }
}

function computeSuggestedHeightCm(currentHeightCm, elements) {
  const candidate = Number(currentHeightCm)
  if (Number.isFinite(candidate) && candidate > 0) {
    return Math.ceil(candidate)
  }

  let tallest = 0
  for (const el of elements || []) {
    if (!el || el.visible === false) continue
    const elementHeight = Number(el?.dimensiones?.alto) || 0
    const zBase = Number(el?.alturaRespectoAlSuelo) || 0
    const total = elementHeight + zBase
    if (total > tallest) {
      tallest = total
    }
  }

  if (tallest > 0) {
    return Math.ceil(tallest)
  }
  return DEFAULT_HEIGHT_CM
}

function isAxisAlignedRectangle(polygon) {
  if (!Array.isArray(polygon) || polygon.length !== 4) return false
  const xs = polygon.map((p) => Number(p?.x))
  const ys = polygon.map((p) => Number(p?.y))
  if (!xs.every(Number.isFinite) || !ys.every(Number.isFinite)) return false
  const uniqueX = Array.from(new Set(xs.map((n) => Math.round(n))))
  const uniqueY = Array.from(new Set(ys.map((n) => Math.round(n))))
  if (uniqueX.length !== 2 || uniqueY.length !== 2) return false
  return true
}

const closeModal = () => {
  resetLocalState()
  canvasStore.cerrarEditor()
  resetMode()
}

function resetLocalState() {
  local.id = null
  local.name = ''
  local.shape = 'rectangle'
  rectW.value = 500
  rectL.value = 500
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

  errors.name = false
  errors.dimensions = false
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
      local.shape = planta.forma ?? 'none'
      local.isInfinite = !!planta.isInfinite

      const todosLosElementos = canvasStore.elementos || []
      local.elements = todosLosElementos.filter((el) => el.plantaId === planta.id && !el.padre)

      rectW.value = planta.dimensiones.ancho
      rectL.value = planta.dimensiones.largo
      localRectWMeters.value = planta.dimensiones.ancho / 100
      localRectLMeters.value = planta.dimensiones.largo / 100
      localRectYMeters.value = planta.dimensiones.alto / 100

      // local.height = planta.dimensiones.alto;
      // local.maxWeight = planta.pesoMaximoSoportado;
      isManuallyEdited.value = true
    } else {
      resetLocalState()
    }

    nextTick(() => {
      canvasEditorRef.value?.fitStageToPolygon()
      isLoadingData.value = false
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
  },
  { immediate: true },
)
watch(
  () => local.maxWeight,
  (val) => {
    const n = Number(val)
    errors.maxWeight = !Number.isFinite(n) || n < 0
  },
  { immediate: true },
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
      notice.value = res.message
      // Revertir el cambio de shape
      nextTick(() => {
        local.shape = oldShape
      })
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
      const proposed = proposeFiniteDimensionsFromElements(local.elements || [])
      const fallbackWidthCm = Number(rectW.value) > 0 ? rectW.value : MIN_DIMENSION_CM
      const fallbackLengthCm = Number(rectL.value) > 0 ? rectL.value : MIN_DIMENSION_CM
      const suggestedWidthCm = proposed?.widthCm ?? fallbackWidthCm
      const suggestedLengthCm = proposed?.lengthCm ?? fallbackLengthCm
      const widthCm = Math.max(MIN_DIMENSION_CM, suggestedWidthCm)
      const lengthCm = Math.max(MIN_DIMENSION_CM, suggestedLengthCm)
      const heightCm = Math.max(1, computeSuggestedHeightCm(rectY.value, local.elements || []))

      const prevWorldWidth = worldWidth.value
      const prevWorldHeight = worldHeight.value

      // Al pasar de infinita→finita: usamos el BBox del contenido para proponer dimensiones (W×L) con padding,
      // rellenamos el formulario y reencuadramos el preview con el nuevo rectángulo.
      suppressDimensionWatch = true
      try {
        rectW.value = widthCm
        rectL.value = lengthCm
        rectY.value = heightCm
        localRectWMeters.value = widthCm / 100
        localRectLMeters.value = lengthCm / 100
        localRectYMeters.value = heightCm / 100

        const newWorldWidth = widthCm * PIXELS_PER_CM
        const newWorldHeight = lengthCm * PIXELS_PER_CM

        if (!Array.isArray(local.polygon) || local.polygon.length < 3 || isAxisAlignedRectangle(local.polygon)) {
          local.polygon = defaultRect(widthCm, lengthCm)
        } else if (Number.isFinite(prevWorldWidth) && prevWorldWidth > 0 && Number.isFinite(prevWorldHeight) && prevWorldHeight > 0) {
          const scaleX = newWorldWidth / prevWorldWidth
          const scaleY = newWorldHeight / prevWorldHeight
          local.polygon = local.polygon.map((point) => ({
            x: Math.round((Number(point?.x) || 0) * scaleX),
            y: Math.round((Number(point?.y) || 0) * scaleY),
          }))
        }

        isManuallyEdited.value = true
        errors.dimensions = false
        notice.value = ''
        showLimitedHint.value = false

        await nextTick()
        canvasEditorRef.value?.fitStageToPolygon()
      } finally {
        suppressDimensionWatch = false
      }
    }
  },
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

function tryApplyDimensionsCM(newW_cm, newL_cm, newY_cm, opts = { apply: true, fit: true }) {
  const oldW_cm = rectW.value
  const oldL_cm = rectL.value
  if (!oldW_cm || !oldL_cm) return { ok: false, message: '' }

  const oldWorldWidth = oldW_cm * PIXELS_PER_CM
  const oldWorldLength = oldL_cm * PIXELS_PER_CM
  const newWorldWidth = newW_cm * PIXELS_PER_CM
  const newWorldLength = newL_cm * PIXELS_PER_CM

  const scaleX = newWorldWidth / oldWorldWidth
  const scaleY = newWorldLength / oldWorldLength
  const scaledPolygon = local.polygon.map((p) => ({
    x: Math.round(p.x * scaleX),
    y: Math.round(p.y * scaleY),
  }))

  const polyCheck = validatePolygonAndContainment(scaledPolygon, newWorldWidth, newWorldLength)
  if (!polyCheck.ok) return polyCheck

  const heightCheck = validateElementsHeight(newY_cm)
  if (!heightCheck.ok) return heightCheck

  if (opts.apply) {
    rectW.value = newW_cm
    rectL.value = newL_cm
    rectY.value = newY_cm
    local.polygon = scaledPolygon
    notice.value = ''

    if (opts.fit) {
      nextTick(() => {
        canvasEditorRef.value?.fitStageToPolygon()
      })
    }
  }
  return { ok: true }
}

// --- WATCH CORREGIDO ---
watch([localRectWMeters, localRectLMeters, localRectYMeters], ([newW, newL, newY]) => {
  if (isLoadingData.value) return
  if (suppressDimensionWatch) return

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

  dimensionChangeDebounce = setTimeout(() => {
    const newW_cm = (Number(localRectWMeters.value) || 0) * 100
    const newL_cm = (Number(localRectLMeters.value) || 0) * 100
    const newY_cm = (Number(localRectYMeters.value) || 0) * 100
    const res = tryApplyDimensionsCM(newW_cm, newL_cm, newY_cm, { apply: true, fit: true })
    if (!res.ok) {
      errors.dimensions = true
      notice.value = res.message || ''
    } else {
      errors.dimensions = false
    }
  }, 400)
})

// onShapeChange eliminado en favor del watch sobre local.shape

function onSave() {
  // Si hay un debounce pendiente, aplicamos dimensiones inmediatamente antes de guardar (solo en modo limitado)
  if (!local.isInfinite && dimensionChangeDebounce) {
    clearTimeout(dimensionChangeDebounce)
    const newW_cm = (Number(localRectWMeters.value) || 0) * 100
    const newL_cm = (Number(localRectLMeters.value) || 0) * 100
    const newY_cm = (Number(localRectYMeters.value) || 0) * 100
    const res = tryApplyDimensionsCM(newW_cm, newL_cm, newY_cm, { apply: true, fit: false })
    if (!res.ok) {
      notice.value = res.message
      showToast('Por favor corrige los errores antes de guardar.', 'error')
      return
    }
  }

  errors.name = false
  errors.dimensions = false
  errors.maxWeight = false

  if (!String(local.name || '').trim()) {
    errors.name = true
    notice.value = 'El campo "Nombre" es obligatorio.'
    return
  }

  // Rama Modo Elástico: omitir validaciones de contención y dimensiones
  if (local.isInfinite) {
    const plantaData = {
      id: local.id,
      nombre: local.name.trim(),
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
    pesoMaximoSoportado: local.maxWeight,
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
const canSave = computed(() => {
  const hasNotice = Boolean(notice.value)
  const hasErrors = errors.name || errors.dimensions || errors.maxWeight
  const hasValidName = Boolean(String(local.name || '').trim())
  // En modo elástico, no exigimos dimensiones/capacidad
  const dimsOk = local.isInfinite
    ? true
    : (Number(localRectWMeters.value) || 0) > 0 &&
      (Number(localRectLMeters.value) || 0) > 0 &&
      (Number(localRectYMeters.value) || 0) > 0
  const weightOk = local.isInfinite
    ? true
    : (Number.isFinite(Number(local.maxWeight)) && Number(local.maxWeight) >= 0)
  return !hasNotice && !hasErrors && hasValidName && dimsOk && weightOk
})

onBeforeUnmount(() => {
  if (dimensionChangeDebounce) {
    clearTimeout(dimensionChangeDebounce)
    dimensionChangeDebounce = null
  }
  document.body.style.cursor = 'default'
})
</script>
