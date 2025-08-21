<template>
  <div v-if="canvasStore.crearPlanta" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="relative bg-white rounded-lg shadow-xl w-[85vw] h-[85vh] p-4 overflow-hidden flex flex-col">
      <button @click="canvasStore.cerrarEditor" class="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <h3 class="text-lg font-semibold mb-3 flex-shrink-0">Área de Trabajo</h3>

      <div class="grid gap-4 md:grid-cols-5 flex-grow min-h-0">
        <div class="md:col-span-3 flex flex-col">
          <DrawEditor ref="canvasEditorRef"
                        :polygon="local.polygon"
                        :worldWidth="worldWidth"
                        :worldHeight="worldHeight"
                        :adding="adding"
                        :deleting="deleting"
                        @update:polygon="onPolygonUpdate"
                        @notice="newNotice => notice = newNotice"
                        class="flex-grow" />

          <div class="flex items-center gap-2 mt-2 flex-shrink-0">
            <button class="px-3 py-2 rounded-lg border bg-white text-slate-800" :class="{ 'ring-2 ring-sky-500': adding }" @click="toggleAddMode">{{ adding ? 'Salir de modo añadir' : 'Añadir vértice' }}</button>
            <button class="px-3 py-2 rounded-lg border bg-white text-slate-800" :class="{ 'ring-2 ring-rose-500': deleting }" @click="toggleDeleteMode">{{ deleting ? 'Salir de modo eliminar' : 'Eliminar vértice' }}</button>
            <button class="px-3 py-2 rounded-lg border bg-white text-slate-800" @click="() => canvasEditorRef.fitStageToPolygon()">Ajustar Vista</button>
          </div>
          <div class="mt-1 text-sm h-5 flex-shrink-0" :class="notice ? 'text-rose-600' : 'text-transparent'">{{ notice || '.' }}</div>
        </div>

        <div class="md:col-span-2 space-y-3">
          <div class="border rounded-lg p-3">
            <label class="text-xs text-slate-600">Nombre</label>
            <input class="w-full border rounded-lg px-3 py-2" :class="{'border-rose-500 ring-1 ring-rose-500': errors.name}" v-model="local.name" placeholder="Ej. Bodega A" />
          </div>
          <div class="border rounded-lg p-3">
            <h4 class="font-medium mb-2">Forma</h4>
            <select class="w-full border rounded-lg px-3 py-2" v-model="local.shape" @change="onShapeChange">
              <option value="rectangle">Rectángulo</option>
              <option value="circle">Círculo</option>
              <option value="custom">Personalizada</option>
            </select>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <template v-if="local.shape === 'rectangle' || local.shape === 'circle'">
                <div>
                  <label class="text-xs text-slate-600">Ancho (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" :class="{'border-rose-500 ring-1 ring-rose-500': errors.dimensions}" v-model.number="rectWMeters" />
                </div>
                <div>
                  <label class="text-xs text-slate-600">Largo (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" :class="{'border-rose-500 ring-1 ring-rose-500': errors.dimensions}" v-model.number="rectLMeters" />
                </div>
              </template>
            </div>
            <div v-if="local.shape === 'rectangle' || local.shape === 'circle'" class="mt-2">
              <label class="text-xs text-slate-600">Alto (m)</label>
              <input type="number" class="w-full border rounded-lg px-2 py-1" :class="{'border-rose-500 ring-1 ring-rose-500': errors.dimensions}" v-model.number="heightMeters" />
            </div>
            <div v-if="local.shape==='custom'" class="mt-2 space-y-2">
              <p class="text-xs text-slate-600">Edita los vértices directamente en el lienzo.</p>
            </div>
          </div>
          <div class="border rounded-lg p-3 space-y-3">
            <h4 class="font-medium">Extras</h4>
            <div>
              <label class="text-xs text-slate-600">Peso máximo (kg)</label>
              <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.maxWeight" placeholder="Ej. 1000" />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2 flex-shrink-0">
        <button class="px-3 py-2 rounded-lg border bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors" @click="onSave">Guardar Cambios</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import DrawEditor from './DrawEditor.vue';

const canvasStore = useCanvasStore();
const canvasEditorRef = ref(null);

const ovalSamplePoints = (cx, cy, rx, ry, n) => Array.from({length:n},(_,i)=>{const a=i/n*2*Math.PI;return{x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a)}})

const PIXELS_PER_CM = 10

const rectW = ref(500)
const rectL = ref(500)

const worldWidth = computed(() => rectW.value * PIXELS_PER_CM)
const worldHeight = computed(() => rectL.value * PIXELS_PER_CM)

const local = reactive({
  id: null,
  name: '',
  shape: 'rectangle',
  polygon: [],
  unit: 'cm',
  pixelsPerUnit: PIXELS_PER_CM,
  height: 500,
  maxWeight: 1000,
})

const notice = ref('')
const errors = reactive({ name: false, dimensions: false })
const isManuallyEdited = ref(false)

function defaultRect() {
  const w = rectW.value * PIXELS_PER_CM
  const l = rectL.value * PIXELS_PER_CM
  return [ { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: l }, { x: 0, y: l } ]
}

local.polygon = defaultRect()

const adding = ref(false)
const deleting = ref(false)

function toggleAddMode(){
  adding.value = !adding.value
  if (adding.value) { deleting.value = false; notice.value = '' }
}
function toggleDeleteMode(){
  deleting.value = !deleting.value
  if (deleting.value) adding.value = false
  if (!deleting.value) { notice.value = ''; document.body.style.cursor = 'default'; }
}

const onPolygonUpdate = (newPolygon) => {
  local.polygon = newPolygon;
  isManuallyEdited.value = true;
};

const rectWMeters = computed({
  get: () => rectW.value / 100,
  set: (val) => { rectW.value = Math.max(0.1, val) * 100 }
})
const rectLMeters = computed({
  get: () => rectL.value / 100,
  set: (val) => { rectL.value = Math.max(0.1, val) * 100 }
})
const heightMeters = computed({
  get: () => local.height / 100,
  set: (val) => { local.height = Math.max(0, val) * 100 }
})

function applyRect(){
  const wPx = worldWidth.value
  const lPx = worldHeight.value
  local.polygon = [ { x: 0, y: 0 }, { x: wPx, y: 0 }, { x: wPx, y: lPx }, { x: 0, y: lPx } ]
  nextTick(() => { canvasEditorRef.value?.fitStageToPolygon() })
}

function applyCircle() {
  const wPx = worldWidth.value
  const lPx = worldHeight.value
  const rx = wPx / 2
  const ry = lPx / 2
  const cx = rx
  const cy = ry
  local.polygon = ovalSamplePoints(cx, cy, rx, ry, 32).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  nextTick(() => { canvasEditorRef.value?.fitStageToPolygon() })
}

watch([rectW, rectL], ([newW_cm, newL_cm], [oldW_cm, oldL_cm]) => {
  if (oldW_cm === undefined || oldL_cm === undefined) {
    if (local.shape === 'rectangle') applyRect()
    else if (local.shape === 'circle') applyCircle()
    return
  }

  if (isManuallyEdited.value) {
    const oldWorldWidth = oldW_cm * PIXELS_PER_CM;
    const oldWorldHeight = oldL_cm * PIXELS_PER_CM;
    const newWorldWidth = worldWidth.value;
    const newWorldHeight = worldHeight.value;
    if (oldWorldWidth === 0 || oldWorldHeight === 0) return;
    const scaleX = newWorldWidth / oldWorldWidth;
    const scaleY = newWorldHeight / oldWorldHeight;
    const scaledPolygon = local.polygon.map(p => ({
      x: Math.round(p.x * scaleX),
      y: Math.round(p.y * scaleY)
    }));
    local.polygon = scaledPolygon;
    nextTick(() => { canvasEditorRef.value?.fitStageToPolygon() });
  } else {
    if (local.shape === 'rectangle') applyRect()
    else if (local.shape === 'circle') applyCircle()
  }
})

function onShapeChange() {
  if (local.shape === 'rectangle') applyRect()
  else if (local.shape === 'circle') applyCircle()
  if (local.shape === 'rectangle' || local.shape === 'circle') {
    isManuallyEdited.value = false
  }
  adding.value = false
  deleting.value = false
}

function onSave(){
  notice.value = ''
  errors.name = false
  errors.dimensions = false

  if (!local.name.trim()) {
    errors.name = true
    notice.value = 'El campo "Nombre" es obligatorio.'
    return
  }

  if (local.shape === 'rectangle' || local.shape === 'circle') {
    if (rectWMeters.value <= 0 || rectLMeters.value <= 0 || heightMeters.value <= 0) {
      errors.dimensions = true
      notice.value = 'Las dimensiones deben ser mayores a cero.'
      return
    }
  }

  if ((local.polygon?.length || 0) < 3){
    notice.value = 'El polígono debe tener al menos 3 vértices.'
    return
  }

  const wPx = worldWidth.value;
  const lPx = worldHeight.value;
  let touchesTop = false, touchesBottom = false, touchesLeft = false, touchesRight = false;
  for (const p of local.polygon) {
    if (p.x === 0) touchesLeft = true;
    if (p.x === wPx) touchesRight = true;
    if (p.y === 0) touchesTop = true;
    if (p.y === lPx) touchesBottom = true;
  }
  if (!touchesTop || !touchesBottom || !touchesLeft || !touchesRight) {
    notice.value = 'La forma dibujada debe tocar los 4 bordes del área de trabajo.';
    return;
  }

  const nuevaPlanta = {
    nombre: local.name.trim(),
    pesoMaximoSoportado: local.maxWeight,
    dimensiones: {
      alto: local.height,
      ancho: rectW.value,
      largo: rectL.value
    },
    poligono: local.polygon,
  }

  canvasStore.agregarPlanta(nuevaPlanta)
  canvasStore.cerrarEditor();
}
</script>
