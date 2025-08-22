<template>
  <div v-if="canvasStore.crearPlanta" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="relative bg-white rounded-lg shadow-xl w-[85vw] h-[90vh] p-4 overflow-hidden flex flex-col">
      <button @click="closeModal" class="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <h3 class="text-lg font-semibold mb-3 flex-shrink-0">Área de Trabajo</h3>

      <div class="grid gap-4 md:grid-cols-5 flex-grow min-h-0">
        <div class="md:col-span-3 flex flex-col">
          <DrawEditor ref="canvasEditorRef"
                        :polygon="local.polygon"
                        :elements="local.elements"
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
            <h4 class="font-medium mb-1">Nombre</h4>
            <input class="w-full border rounded-lg px-3 py-2" :class="{'border-rose-500 ring-1 ring-rose-500': errors.name}" v-model="local.name" placeholder="Ej. Bodega A" />
          </div>
          <div class="border rounded-lg p-3">
            <h4 class="font-medium mb-1">Plantilla</h4>
            <select class="w-full border rounded-lg px-3 py-2" v-model="local.shape" @change="onShapeChange">
              <option value="none" disabled>Sin definir</option>
              <option value="rectangle">Rectángulo</option>
              <option value="circle">Círculo</option>
            </select>
          </div>
          <div class="border rounded-lg p-3">
            <h4 class="font-medium mb-0">Dimensiones</h4>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1">
                <div>
                  <label class="text-xs text-slate-600">Ancho (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" :class="{'border-rose-500 ring-1 ring-rose-500': errors.dimensions}" v-model.number="localRectWMeters" />
                </div>
                <div>
                  <label class="text-xs text-slate-600">Largo (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" :class="{'border-rose-500 ring-1 ring-rose-500': errors.dimensions}" v-model.number="localRectLMeters" />
                </div>
                <div class="mt-2">
                  <label class="text-xs text-slate-600">Alto (m)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" :class="{'border-rose-500 ring-1 ring-rose-500': errors.dimensions}" v-model.number="heightMeters" />
                </div>
            </div>
          </div>
          <div class="border rounded-lg p-3 space-y-3">
            <h4 class="font-medium mb-0">Extras</h4>
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

const localRectWMeters = ref(5);
const localRectLMeters = ref(5);

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
const isLoadingData = ref(false);
let dimensionChangeDebounce = null;

function defaultRect(w_cm, l_cm) {
  const w = w_cm * PIXELS_PER_CM
  const l = l_cm * PIXELS_PER_CM
  return [ { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: l }, { x: 0, y: l } ]
}

const closeModal = () => {
  resetLocalState();
  canvasStore.cerrarEditor();
}

function resetLocalState() {
  local.id = null;
  local.name = '';
  local.shape = 'rectangle';
  rectW.value = 500;
  rectL.value = 500;
  local.polygon = defaultRect(500, 500);
  local.elements = [];
  local.height = 500;
  local.maxWeight = 1000;
  isManuallyEdited.value = false;

  localRectWMeters.value = rectW.value / 100;
  localRectLMeters.value = rectL.value / 100;

  errors.name = false;
  errors.dimensions = false;
  notice.value = '';
}

watch(() => canvasStore.plantaEnEdicion, (planta) => {
  isLoadingData.value = true;

  if (planta) {
    local.id = planta.id;
    local.name = planta.nombre;
    local.polygon = planta.poligono;
    local.shape = planta.forma ?? "none";

    const todosLosElementos = canvasStore.elementos || [];
    local.elements = todosLosElementos.filter(el => el.plantaId === planta.id && !el.padre);

    rectW.value = planta.dimensiones.ancho;
    rectL.value = planta.dimensiones.largo;
    localRectWMeters.value = planta.dimensiones.ancho / 100;
    localRectLMeters.value = planta.dimensiones.largo / 100;

    local.height = planta.dimensiones.alto;
    local.maxWeight = planta.pesoMaximoSoportado;
    isManuallyEdited.value = true;
  } else {
    resetLocalState();
  }

  nextTick(() => {
    canvasEditorRef.value?.fitStageToPolygon();
    isLoadingData.value = false;
  });

}, { immediate: true, deep: true });


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

const heightMeters = computed({
  get: () => local.height / 100,
  set: (val) => { local.height = Math.max(0, val) * 100 }
})

function applyRect(w_cm, l_cm){
  const wPx = w_cm * PIXELS_PER_CM
  const lPx = l_cm * PIXELS_PER_CM
  return [ { x: 0, y: 0 }, { x: wPx, y: 0 }, { x: wPx, y: lPx }, { x: 0, y: lPx } ];
}

function applyCircle(w_cm, l_cm) {
  const wPx = w_cm * PIXELS_PER_CM
  const lPx = l_cm * PIXELS_PER_CM
  const rx = wPx / 2
  const ry = lPx / 2
  const cx = rx
  const cy = ry
  return ovalSamplePoints(cx, cy, rx, ry, 32).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
}

watch([localRectWMeters, localRectLMeters], () => {
  if (isLoadingData.value) return;

  clearTimeout(dimensionChangeDebounce);

  dimensionChangeDebounce = setTimeout(() => {
    const oldW_cm = rectW.value;
    const oldL_cm = rectL.value;

    const newW_cm = localRectWMeters.value * 100;
    const newL_cm = localRectLMeters.value * 100;

    const oldWorldWidth = oldW_cm * PIXELS_PER_CM;
    const oldWorldHeight = oldL_cm * PIXELS_PER_CM;
    if (oldWorldWidth === 0 || oldWorldHeight === 0) return;

    const newWorldWidth = newW_cm * PIXELS_PER_CM;
    const newWorldHeight = newL_cm * PIXELS_PER_CM;

    const scaleX = newWorldWidth / oldWorldWidth;
    const scaleY = newWorldHeight / oldWorldHeight;

    const scaledPolygon = local.polygon.map(p => ({
      x: Math.round(p.x * scaleX),
      y: Math.round(p.y * scaleY)
    }));

    const validation = canvasEditorRef.value?.isPolygonValid(scaledPolygon, local.elements);
    if (validation && !validation.valid) {
      notice.value = validation.message;
      return;
    }

    rectW.value = newW_cm;
    rectL.value = newL_cm;
    local.polygon = scaledPolygon;
    notice.value = '';

    nextTick(() => { canvasEditorRef.value?.fitStageToPolygon() });
  }, 400);
})

function onShapeChange(event) {
  const oldShape = local.shape;
  const newShape = event.target.value;
  let newPolygon;

  if (newShape === 'rectangle') newPolygon = applyRect(rectW.value, rectL.value);
  else if (newShape === 'circle') newPolygon = applyCircle(rectW.value, rectL.value);
  else {
    isManuallyEdited.value = true;
    return;
  }

  const validation = canvasEditorRef.value?.isPolygonValid(newPolygon, local.elements);
  if (validation && !validation.valid) {
    notice.value = validation.message;
    local.shape = oldShape;
    event.target.value = oldShape;
    return;
  }

  notice.value = '';
  local.shape = newShape;
  local.polygon = newPolygon;
  isManuallyEdited.value = false;
  adding.value = false;
  deleting.value = false;
  nextTick(() => { canvasEditorRef.value?.fitStageToPolygon() });
}

// --- onSave CORREGIDO ---
function onSave(){
  // 1. Limpiamos errores y avisos anteriores para empezar de cero.
  notice.value = ''
  errors.name = false
  errors.dimensions = false

  // 2. RESTAURADO: Se ejecuta una validación final del polígono. Esta es la parte crucial.
  const finalValidation = canvasEditorRef.value?.isPolygonValid(local.polygon, local.elements);
  if (finalValidation && !finalValidation.valid) {
    notice.value = finalValidation.message;
    return; // Si el polígono es inválido, nos detenemos aquí.
  }

  // 3. Se ejecutan las demás validaciones secuencialmente.
  if (!local.name.trim()) {
    errors.name = true
    notice.value = 'El campo "Nombre" es obligatorio.'
    return
  }

  if (local.shape === 'rectangle' || local.shape === 'circle') {
    if (localRectWMeters.value <= 0 || localRectLMeters.value <= 0 || heightMeters.value <= 0) {
      errors.dimensions = true
      notice.value = 'Las dimensiones deben ser mayores a cero.'
      return
    }
  }

  if ((local.polygon?.length || 0) < 3){
    notice.value = 'El polígono debe tener al menos 3 vértices.'
    return
  }

  // 4. Si todo es válido, se procede a guardar.
  const plantaData = {
    id: local.id,
    nombre: local.name.trim(),
    pesoMaximoSoportado: local.maxWeight,
    dimensiones: {
      alto: local.height,
      ancho: rectW.value,
      largo: rectL.value,
    },
    forma: local.shape,
    poligono: local.polygon,
  }

  if (plantaData.id) {
    canvasStore.editarPlanta(plantaData.id, plantaData);
  } else {
    delete plantaData.id;
    canvasStore.agregarPlanta(plantaData);
  }

  resetLocalState();
  canvasStore.cerrarEditor();
}
</script>
