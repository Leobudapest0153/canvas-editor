<template>
  <div v-if="canvasStore.crearPlanta" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="relative bg-white rounded-lg shadow-xl w-[85vw] h-[85vh] p-4 overflow-hidden flex flex-col">
      <button @click="canvasStore.cerrarEditor" class="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <h3 class="text-lg font-semibold mb-3 flex-shrink-0">Área de Trabajo</h3>

      <div class="grid gap-4 md:grid-cols-5 flex-grow min-h-0">
        <div class="md:col-span-3 flex flex-col">
          <!-- ANOTACIÓN: Aquí usamos el nuevo componente CanvasEditor -->
          <DrawEditor ref="canvasEditorRef"
                        :polygon="local.polygon"
                        :worldWidth="worldWidth"
                        :worldHeight="worldHeight"
                        :adding="adding"
                        :deleting="deleting"
                        @update:polygon="onPolygonUpdate"
                        @notice="newNotice => notice = newNotice"
                        class="flex-grow" />

          <!-- Controles del Lienzo -->
          <div class="flex items-center gap-2 mt-2 flex-shrink-0">
            <button class="px-3 py-2 rounded-lg border bg-white text-slate-800" :class="{ 'ring-2 ring-sky-500': adding }" @click="toggleAddMode">{{ adding ? 'Salir de modo añadir' : 'Añadir vértice' }}</button>
            <button class="px-3 py-2 rounded-lg border bg-white text-slate-800" :class="{ 'ring-2 ring-rose-500': deleting }" @click="toggleDeleteMode">{{ deleting ? 'Salir de modo eliminar' : 'Eliminar vértice' }}</button>
            <button class="px-3 py-2 rounded-lg border bg-white text-slate-800" @click="() => canvasEditorRef.fitStageToPolygon()">Ajustar Vista</button>
          </div>
          <div class="mt-1 text-xs flex-shrink-0" :class="notice ? 'text-rose-600' : 'text-transparent'">{{ notice || '.' }}</div>
        </div>

        <!-- Panel de Propiedades -->
        <div class="md:col-span-2 space-y-3">
          <div class="border rounded-lg p-3">
            <label class="text-xs text-slate-600">Nombre</label>
            <input class="w-full border rounded-lg px-3 py-2" v-model="local.name" placeholder="Ej. Bodega A" />
          </div>
          <div class="border rounded-lg p-3">
            <h4 class="font-medium mb-2">Forma</h4>
            <select class="w-full border rounded-lg px-3 py-2" v-model="local.shape" @change="onShapeChange">
              <option value="rectangle">Rectángulo</option>
              <option value="circle">Círculo</option>
              <option value="custom">Personalizada</option>
            </select>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <template v-if="local.shape === 'rectangle'">
                <div>
                  <label class="text-xs text-slate-600">Ancho (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="rectWMeters" />
                </div>
                <div>
                  <label class="text-xs text-slate-600">Largo (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="rectLMeters" />
                </div>
              </template>
              <template v-if="local.shape === 'circle'">
                <div class="col-span-2">
                  <label class="text-xs text-slate-600">Radio (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="circleRMeters" />
                </div>
              </template>
            </div>
            <div v-if="local.shape === 'rectangle'" class="mt-2">
              <label class="text-xs text-slate-600">Alto (m)</label>
              <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="heightMeters" />
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
        <button class="px-3 py-2 rounded-lg border bg-blue-600 text-white border-blue-600" @click="onSave">Guardar Cambios</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import DrawEditor from './DrawEditor.vue';

const canvasStore = useCanvasStore();
const canvasEditorRef = ref(null);

const circleSamplePoints = (cx, cy, r, n) => Array.from({length:n},(_,i)=>{const a=i/n*2*Math.PI;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}})

const PIXELS_PER_CM = 10

const plantaAnchoMetros = ref(20)
const plantaLargoMetros = ref(15)

const rectW = ref(100)
const rectL = ref(50)
const circleR = ref(40)

const worldWidth = computed(() => {
  if (local.shape === 'rectangle') return rectW.value * PIXELS_PER_CM
  return plantaAnchoMetros.value * 100 * PIXELS_PER_CM
})

const worldHeight = computed(() => {
  if (local.shape === 'rectangle') return rectL.value * PIXELS_PER_CM
  return plantaLargoMetros.value * 100 * PIXELS_PER_CM
})

const local = reactive({
  id: null,
  name: 'Área de prueba',
  shape: 'rectangle',
  polygon: [],
  unit: 'cm',
  pixelsPerUnit: PIXELS_PER_CM,
  height: 0,
  maxWeight: 0,
})

const notice = ref('')

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
  if (adding.value) {
    deleting.value = false
    notice.value = ''
  }
}
function toggleDeleteMode(){
  deleting.value = !deleting.value
  if (deleting.value) adding.value = false
  if (!deleting.value) {
    notice.value = ''
    document.body.style.cursor = 'default';
  }
}

const onPolygonUpdate = (newPolygon) => {
  local.polygon = newPolygon;
};

const rectWMeters = computed({
  get: () => rectW.value / 100,
  set: (val) => { rectW.value = Math.max(0.1, val) * 100 }
})
const rectLMeters = computed({
  get: () => rectL.value / 100,
  set: (val) => { rectL.value = Math.max(0.1, val) * 100 }
})
const circleRMeters = computed({
  get: () => circleR.value / 100,
  set: (val) => { circleR.value = Math.max(0.1, val) * 100 }
})
const heightMeters = computed({
  get: () => local.height / 100,
  set: (val) => { local.height = Math.max(0, val) * 100 }
})

function applyRect(){
  const wPx = rectW.value * PIXELS_PER_CM
  const lPx = rectL.value * PIXELS_PER_CM
  local.polygon = [ { x: 0, y: 0 }, { x: wPx, y: 0 }, { x: wPx, y: lPx }, { x: 0, y: lPx } ]
}

function applyCircle() {
  const rPx = circleR.value * PIXELS_PER_CM
  const cx = rPx, cy = rPx
  local.polygon = circleSamplePoints(cx, cy, rPx, 32).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }))
}

watch([rectW, rectL], () => { if (local.shape === 'rectangle') applyRect() })
watch(circleR, () => { if (local.shape === 'circle') applyCircle() })

function onShapeChange() {
  if (local.shape === 'rectangle') applyRect()
  else if (local.shape === 'circle') applyCircle()
  adding.value = false
  deleting.value = false
}

function onSave(){
  notice.value = ''
  if ((local.polygon?.length || 0) < 3){
    notice.value = 'El polígono debe tener al menos 3 vértices.'
    return
  }

  const nuevaPlanta = {
    nombre: local.name.trim() || 'Área',
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
