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
              <DrawEditor
                ref="canvasEditorRef"
                :polygon="local.polygon"
                :elements="local.elements"
                :worldWidth="worldWidth"
                :worldHeight="worldHeight"
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
                @click="() => canvasEditorRef.fitStageToPolygon()"
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
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Nombre</h4>
            <input
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              :class="{ 'border-rose-500 ring-2 ring-rose-500/60': errors.name }"
              v-model="local.name"
              placeholder="Ej. Bodega A"
            />
          </div>

          <!-- Plantilla -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Plantilla</h4>
            <select
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              v-model="local.shape"
              @change="onShapeChange"
            >
              <option value="none" disabled>Sin definir</option>
              <option value="rectangle">Rectángulo</option>
              <option value="circle">Círculo</option>
            </select>
          </div>

          <!-- Dimensiones -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
            <h4 class="text-sm font-semibold text-gray-800 mb-1">Dimensiones</h4>
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

          <!-- Extras -->
          <div class="border border-gray-200 rounded-xl px-4 pt-3 pb-4 bg-white shadow-sm">
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
          </div>
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
          class="px-4 py-2 cursor-pointer rounded-lg bg-primary text-white font-medium shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-900"
          @click="onSave"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation'
import { useToast } from '@/inventory-smart/composables/useToast'
import { CM_TO_PX } from '@/inventory-smart/utils/constants'
import { insideAreaModel } from '@/inventory-smart/utils/isPlacementValid'
import DrawEditor from './DrawEditor.vue'

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
  shape: 'rectangle',
  polygon: [],
  elements: [],
  unit: 'cm',
  pixelsPerUnit: PIXELS_PER_CM,
  height: 500,
  maxWeight: 1000,
})

const notice = ref('')
const errors = reactive({ name: false, dimensions: false })
const isManuallyEdited = ref(false)
const isLoadingData = ref(false)
let dimensionChangeDebounce = null

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
  isManuallyEdited.value = false

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

const heightMeters = computed({
  get: () => local.height / 100,
  set: (val) => {
    // Asegurarse de que el valor sea un número antes de asignarlo
    const numericVal = parseFloat(val)
    if (!isNaN(numericVal)) {
      local.height = Math.max(0, numericVal) * 100
    }
  },
})

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

// --- WATCH CORREGIDO ---
watch([localRectWMeters, localRectLMeters, localRectYMeters], ([newW, newL, newY]) => {
  if (isLoadingData.value) return

  clearTimeout(dimensionChangeDebounce)

  // Si el valor del input es vacío, v-model.number lo convierte en '' (string) o null.
  // Esta guarda previene la ejecución si los valores no son números válidos y positivos.
  if (typeof newW !== 'number' || typeof newL !== 'number' || newW <= 0 || newL <= 0) {
    return
  }

  dimensionChangeDebounce = setTimeout(() => {
    const oldW_cm = rectW.value
    const oldL_cm = rectL.value
    const oldY_cm = rectY.value

    // Usamos los valores de las refs, que son la fuente de verdad
    const newW_cm = localRectWMeters.value * 100
    const newL_cm = localRectLMeters.value * 100
    const newY_cm = localRectYMeters.value * 100

    const oldWorldWidth = oldW_cm * PIXELS_PER_CM
    const oldWorldLength = oldL_cm * PIXELS_PER_CM
    const oldWorldHeight = oldY_cm * PIXELS_PER_CM

    if (oldWorldWidth === 0 || oldWorldHeight === 0 || oldWorldLength === 0) return

    const newWorldWidth = newW_cm * PIXELS_PER_CM
    const newWorldLength = newL_cm * PIXELS_PER_CM

    const scaleX = newWorldWidth / oldWorldWidth
    const scaleY = newWorldLength / oldWorldLength

    const scaledPolygon = local.polygon.map((p) => ({
      x: Math.round(p.x * scaleX),
      y: Math.round(p.y * scaleY),
    }))

    const validation = canvasEditorRef.value?.isPolygonValid(scaledPolygon, local.elements)
    if (validation && !validation.valid) {
      notice.value = validation.message
      return
    }

    // Validación adicional unificada: todos los elementos deben quedar contenidos en el área nueva (polígono)
    const areaBoundsScaled = {
      minX: 0,
      minY: 0,
      maxX: newWorldWidth,
      maxY: newWorldLength,
      polygon: scaledPolygon,
    }
    const fuera = (local.elements || []).filter((el) => {
      const pos = { x: Number(el?.x) || 0, y: Number(el?.y) || 0 }
      return !insideAreaModel(pos, el, areaBoundsScaled, 0.5)
    })
    if (fuera.length > 0) {
      const nombres = fuera.map((e) => e?.nombre || `ID ${e?.id}`).join(', ')
      notice.value = `Con estas dimensiones, ${fuera.length === 1 ? 'el elemento' : 'los elementos'} ${nombres} quedarían fuera del área.`
      return
    }

    // Verifica si los elementos caben por la altura (omitir pasillos)

    let alturaMinimaRequerida_cm = 0
    const elementosQueNoCaben = []

    for (const el of local.elements) {
      if ((el?.tipo || '').toLowerCase() === 'pasillos') continue
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

      notice.value = `Altura insuficiente. Se requiere ${alturaMinimaEnMetros} m. Elementos afectados: ${nombresElementos}.`
      return
    }

    rectW.value = newW_cm
    rectL.value = newL_cm
    rectY.value = newY_cm
    local.polygon = scaledPolygon
    notice.value = ''

    nextTick(() => {
      canvasEditorRef.value?.fitStageToPolygon()
    })
  }, 400)
})

function onShapeChange(event) {
  const oldShape = local.shape
  const newShape = event.target.value
  let newPolygon

  if (newShape === 'rectangle') newPolygon = applyRect(rectW.value, rectL.value)
  else if (newShape === 'circle') newPolygon = applyCircle(rectW.value, rectL.value)
  else {
    isManuallyEdited.value = true
    return
  }

  const validation = canvasEditorRef.value?.isPolygonValid(newPolygon, local.elements)
  if (validation && !validation.valid) {
    notice.value = validation.message
    local.shape = oldShape
    event.target.value = oldShape
    return
  }

  notice.value = ''
  local.shape = newShape
  local.polygon = newPolygon
  isManuallyEdited.value = false
  adding.value = false
  deleting.value = false
  nextTick(() => {
    canvasEditorRef.value?.fitStageToPolygon()
  })
}

function onSave() {
  if (notice.value) {
    showToast('Por favor corrige los errores antes de guardar.', 'error')
    return
  } // Evitar guardar si hay un aviso activo
  errors.name = false
  errors.dimensions = false

  const finalValidation = canvasEditorRef.value?.isPolygonValid(local.polygon, local.elements)
  if (finalValidation && !finalValidation.valid) {
    notice.value = finalValidation.message
    return
  }

  if (!local.name.trim()) {
    errors.name = true
    notice.value = 'El campo "Nombre" es obligatorio.'
    return
  }

  if (local.shape === 'rectangle' || local.shape === 'circle') {
    // Validar contra las refs directamente
    if (localRectWMeters.value <= 0 || localRectLMeters.value <= 0 || heightMeters.value <= 0) {
      errors.dimensions = true
      notice.value = 'Las dimensiones deben ser mayores a cero.'
      return
    }
  }

  // Validación extra: altura suficiente para elementos no pasillos
  const newY_cm = (Number(localRectYMeters.value) || 0) * 100
  let alturaMinimaRequerida_cm = 0
  const elementosQueNoCaben = []
  for (const el of local.elements) {
    if ((el?.tipo || '').toLowerCase() === 'pasillos') continue
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
    console.log('Editando planta')
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
</script>
