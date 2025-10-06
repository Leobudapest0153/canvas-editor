<template>
  <div ref="containerRef" class="border rounded-lg overflow-hidden relative flex-grow">
    <v-stage ref="stageRef"
             :config="{
               width: canvasW,
               height: canvasH,
               draggable: !deleting,
               scale: {x: stageScale, y: stageScale}
             }"
             @wheel="onWheel"
             @dragmove="onStageDragMove"
             @dragend="onStageDragMove"
             @mousedown="onCanvasClick">
      <v-layer :config="{ listening: false }">
        <v-rect :config="{
          x: backgroundRect.x,
          y: backgroundRect.y,
          width: backgroundRect.width,
          height: backgroundRect.height,
          fill: '#f8fafc',
          stroke: '#cbd5e1',
          strokeWidth: 2 / stageScale
        }" />
        <GridLayer :width="canvasW" :height="canvasH" :scale="stageScale" :stageX="stagePosition.x" :stageY="stagePosition.y" :pixelsPerUnit="PIXELS_PER_CM * 100" unit="m" :bbox="canvasBBox" />
      </v-layer>

      <v-layer :config="{ listening: false }">
        <template v-for="el in elements" :key="el.id">

          <v-circle v-if="el.forma === 'circular'" :config="{
            x: el.x + el.width / 2,
            y: el.y + el.height / 2,
            radius: el.width / 2,
            fill: '#94a3b8',
            opacity: 0.5,
            stroke: '#64748b',
            strokeWidth: 1 / stageScale
          }" />
          <v-rect v-else :config="{
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            fill: '#94a3b8',
            opacity: 0.5,
            stroke: '#64748b',
            strokeWidth: 1 / stageScale
          }" />
          <v-text :config="{
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            align: 'center',
            verticalAlign: 'middle',
            text: el.nombre || el.id,
            fontSize: 10 / stageScale,
            fill: '#334155',
          }" />
        </template>
      </v-layer>

      <v-layer>
        <v-line v-if="!isInfinite" :config="{ points: flatPoints, closed:true, stroke:'#0ea5e9', fill:'rgba(14,165,233,0.08)', strokeWidth:2 / stageScale }" />
        <template v-if="!isInfinite">
          <template v-for="(seg, i) in segments" :key="'seg-'+i">
            <v-text :config="{ x: seg.mx, y: seg.my, text: seg.label, fontSize: 9 / stageScale, fill:'#334155' }" />
          </template>
        </template>
        <template v-if="dragging">
          <v-line :config="{ points:[guidePos.x, worldViewRect.y1, guidePos.x, worldViewRect.y2], stroke:'#94a3b8', dash:[4,4], strokeWidth:2 / stageScale }" />
          <v-line :config="{ points:[worldViewRect.x1, guidePos.y, worldViewRect.x2, guidePos.y], stroke:'#94a3b8', dash:[4,4], strokeWidth:2 / stageScale }" />
          <v-rect :config="{
            x: guidePos.x + 8 / stageScale,
            y: guidePos.y + 8 / stageScale,
            width: 110 / stageScale,
            height: 22 / stageScale,
            fill:'rgba(255,255,255,0.8)',
            stroke:'#cbd5e1',
            strokeWidth: 1 / stageScale,
            cornerRadius: 4 / stageScale
          }" />
          <v-text :config="{ x: guidePos.x + 12 / stageScale, y: guidePos.y + 12 / stageScale, text: guideLabel, fontSize: 12 / stageScale, fill:'#0f172a' }" />
        </template>
        <template v-if="!isInfinite">
          <template v-for="(p, idx) in polygon" :key="idx">
            <v-circle :config="{ x:p.x, y:p.y, radius: (selectedIdx === idx ? 8 : 6) / stageScale, fill:selectedIdx===idx?'#0284c7':'#0ea5e9', draggable:!deleting, stroke:selectedIdx===idx?'#0284c7':'#0ea5e9', strokeWidth: (selectedIdx === idx ? 2 : 1) / stageScale, name: 'vertex' }"
                      @click="evt => onVertexClick(idx, evt)"
                      @mousedown="evt => onVertexMouseDown(evt)"
                      @dragmove="e => onPointDrag(idx, e)"
                      @dragend="e => onPointDragEnd(idx, e)"
                      @mouseover="onVertexMouseOver"
                      @mouseout="onVertexMouseOut"/>
          </template>
        </template>
        <template v-if="adding">
          <v-text :config="{ x: 8, y: 8, text: 'Clic en un borde para añadir un vértice', fontSize: 14, fill:'#0f172a' }" />
        </template>
         <template v-if="deleting">
          <v-text :config="{ x: 8, y: 8, text: 'Clic en un vértice para eliminarlo', fontSize: 14, fill:'#0f172a' }" />
        </template>
      </v-layer>
    </v-stage>
    <RulersOverlay :width="canvasW" :height="canvasH" :scale="stageScale" :stageX="stagePosition.x" :stageY="stagePosition.y" :pixelsPerUnit="PIXELS_PER_CM * 100" unit="m"/>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, toRefs, onUnmounted, watch, nextTick } from 'vue'
import GridLayer from './GridLayer.vue'
import RulersOverlay from './RulersOverlay.vue'

const props = defineProps({
  polygon: { type: Array, required: true },
  elements: { type: Array, default: () => [] },
  worldWidth: { type: Number, required: true },
  worldHeight: { type: Number, required: true },
  adding: { type: Boolean, default: false },
  deleting: { type: Boolean, default: false },
  // Plantas infinitas → preview se encuadra al BBox de elementos con padding.
  frameBBox: { type: Object, default: null },
  // Flag para indicar si es una planta infinita (no mostrar polígono)
  isInfinite: { type: Boolean, default: false },
});

const emit = defineEmits(['update:polygon', 'notice']);

const { polygon, elements, worldWidth, worldHeight, adding, deleting, frameBBox, isInfinite } = toRefs(props);

const PIXELS_PER_CM = 10
const canvasW = ref(1400)
const canvasH = ref(460)
let resizeObserver = null;

const selectedIdx = ref(-1)
const dragging = ref(false)
const guidePos = reactive({ x: 0, y: 0 })
const polygonBeforeDrag = ref(null);

const worldViewRect = computed(() => {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return { x1: 0, y1: 0, x2: 0, y2: 0 }
  const { x, y } = stage.position()
  const scale = stageScale.value
  return {
    x1: -x / scale,
    y1: -y / scale,
    x2: (canvasW.value - x) / scale,
    y2: (canvasH.value - y) / scale,
  }
})

const providedFrameBBox = computed(() => {
  const box = frameBBox.value
  if (!box) return null
  const minX = Number(box.minX)
  const minY = Number(box.minY)
  const maxX = Number(box.maxX)
  const maxY = Number(box.maxY)
  if (![minX, minY, maxX, maxY].every((n) => Number.isFinite(n))) return null
  if (maxX <= minX || maxY <= minY) return null
  return { minX, minY, maxX, maxY }
})

const polygonBBox = computed(() => {
  const pts = polygon.value
  if (!pts || pts.length < 1) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null
  if (maxX <= minX || maxY <= minY) return null
  return { minX, minY, maxX, maxY }
})

const worldBBox = computed(() => ({
  minX: 0,
  minY: 0,
  maxX: Math.max(1, Number.isFinite(worldWidth.value) ? worldWidth.value : 0),
  maxY: Math.max(1, Number.isFinite(worldHeight.value) ? worldHeight.value : 0),
}))

const canvasBBox = computed(() => providedFrameBBox.value || polygonBBox.value || worldBBox.value)

watch(
  () => frameBBox.value,
  () => {
    nextTick(() => fitStageToPolygon())
  },
  { deep: true },
)

const backgroundRect = computed(() => {
  if (providedFrameBBox.value) {
    const { minX, minY, maxX, maxY } = providedFrameBBox.value
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }
  if (polygonBBox.value) {
    const { minX, minY, maxX, maxY } = polygonBBox.value
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }
  return {
    x: 0,
    y: 0,
    width: Math.max(1, worldWidth.value),
    height: Math.max(1, worldHeight.value),
  }
})

const stageRef = ref(null)
const containerRef = ref(null);
const stageScale = ref(1)
const stagePosition = ref({ x: 0, y: 0 })

function fitStageToPolygon() {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const box = canvasBBox.value
  const boxW = Math.max(1, box.maxX - box.minX)
  const boxH = Math.max(1, box.maxY - box.minY)

  const padding = 40
  const scaleX = (canvasW.value - padding * 2) / boxW
  const scaleY = (canvasH.value - padding * 2) / boxH
  const newScale = Math.min(scaleX, scaleY)

  stageScale.value = newScale
  const newPos = {
    x: -box.minX * newScale + padding,
    y: -box.minY * newScale + padding,
  }
  stage.position(newPos)
  stagePosition.value = newPos
  stage.batchDraw()
}

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        canvasW.value = entry.contentRect.width
        canvasH.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(containerRef.value)
  }
  fitStageToPolygon()
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
});

function onWheel(e){
  e?.evt?.preventDefault?.()
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const oldScale = stageScale.value
  const pointer = stage.getPointerPosition()
  const scaleBy = 1.05
  const direction = e.evt.deltaY > 0 ? -1 : 1
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }
  stageScale.value = Math.min(5, Math.max(0.001, newScale))
  const newPos = {
    x: pointer.x - mousePointTo.x * stageScale.value,
    y: pointer.y - mousePointTo.y * stageScale.value,
  }
  stage.position(newPos)
  stage.batchDraw()
  stagePosition.value = { x: stage.x(), y: stage.y() }
}

function onStageDragMove(){
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  stagePosition.value = { x: stage.x(), y: stage.y() }
}

const flatPoints = computed(() => polygon.value.flatMap(p => [p.x, p.y]))

const guideLabel = computed(() => {
  const xM = (guidePos.x / (PIXELS_PER_CM * 100)).toFixed(2)
  const yM = (guidePos.y / (PIXELS_PER_CM * 100)).toFixed(2)
  return `${xM} m, ${yM} m`
})

function dist(a,b){ const dx=b.x-a.x, dy=b.y-a.y; return Math.sqrt(dx*dx+dy*dy) }
const segments = computed(() => {
  const pts = polygon.value
  if (!pts || pts.length < 2) return []
  const segs = []
  for (let i=0; i<pts.length; i++){
    const a = pts[i]
    const b = pts[(i+1) % pts.length]
    const dCm = dist(a,b) / PIXELS_PER_CM
    const label = dCm < 100 ? `${dCm.toFixed(1)} cm` : `${(dCm/100).toFixed(2)} m`
    segs.push({ mx: (a.x+b.x)/2 + 4, my: (a.y+b.y)/2 + 4, label })
  }
  return segs
})

// --- FUNCIONES DE VALIDACIÓN (SIMPLIFICADAS Y CORREGIDAS) ---

function isPointInPolygon(point, vs) {
  const x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInsideElements(point, elements) {
  for (const el of elements) {
    if (
      point.x >= el.x &&
      point.x <= el.x + el.width &&
      point.y >= el.y &&
      point.y <= el.y + el.height
    ) {
      return true;
    }
  }
  return false;
}

// --- FUNCIÓN DE VALIDACIÓN DE BORDES REEMPLAZADA ---
// Revisa si algún borde del polígono cruza por DENTRO de un elemento.
function isEdgeCrossingElement(polygon, elements) {
  if (!elements || elements.length === 0) {
    return { valid: true, message: '' };
  }

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const testPoints = [
      { x: p1.x * 0.75 + p2.x * 0.25, y: p1.y * 0.75 + p2.y * 0.25 },
      { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      { x: p1.x * 0.25 + p2.x * 0.75, y: p1.y * 0.25 + p2.y * 0.75 },
    ];

    for (const point of testPoints) {
      // CAMBIO CLAVE: Usa la nueva función "Strictly" aquí
      if (isPointStrictlyInsideElements(point, elements)) {
        return {
          valid: false,
          message: 'El borde del área no puede cruzar un elemento'
        };
      }
    }
  }
  return { valid: true, message: '' };
}


function isPolygonValid(newPolygon, fixedElements) {
  if (!fixedElements || fixedElements.length === 0) {
    return { valid: true, message: '' };
  }

  const excludedElements = new Set();

  for (const el of fixedElements) {
    // 1. Calcular el punto central del elemento.
    const centerPoint = {
      x: el.x + el.width / 2,
      y: el.y + el.height / 2,
    };

    // 2. Comprobar si el punto central está dentro del polígono.
    // Este método es mucho más fiable para formas cóncavas que comprobar las 4 esquinas.
    if (!isPointInPolygon(centerPoint, newPolygon)) {
      excludedElements.add(el.nombre || el.id);
    }
  }

  if (excludedElements.size > 0) {
    const elementNames = Array.from(excludedElements).join(', ');
  const message = `La modificación dejaría fuera a ${excludedElements.size === 1 ? 'el elemento' : 'los elementos'}: ${elementNames}`;
    return { valid: false, message };
  }

  return { valid: true, message: '' };
}

defineExpose({ fitStageToPolygon, isPolygonValid });

// --- FUNCIONES DE SNAPPING ---

function getSnappedPoint(point, elements, threshold) {
  let snappedX = point.x; let snappedY = point.y;
  let xSnapped = false; let ySnapped = false;
  for (const el of elements) {
    const left = el.x, right = el.x + el.width, top = el.y, bottom = el.y + el.height;
    if (!xSnapped && Math.abs(point.x - left) < threshold) { snappedX = left; xSnapped = true; }
    if (!xSnapped && Math.abs(point.x - right) < threshold) { snappedX = right; xSnapped = true; }
    if (!ySnapped && Math.abs(point.y - top) < threshold) { snappedY = top; ySnapped = true; }
    if (!ySnapped && Math.abs(point.y - bottom) < threshold) { snappedY = bottom; ySnapped = true; }
    if (xSnapped && ySnapped) break;
  }
  return { x: snappedX, y: snappedY };
}

function getSnappedToBoundaryPoint(point, w, h, threshold) {
  let snappedX = point.x; let snappedY = point.y;
  if (Math.abs(point.x - 0) < threshold) { snappedX = 0; }
  else if (Math.abs(point.x - w) < threshold) { snappedX = w; }
  if (Math.abs(point.y - 0) < threshold) { snappedY = 0; }
  else if (Math.abs(point.y - h) < threshold) { snappedY = h; }
  return { x: snappedX, y: snappedY };
}

// --- FUNCIONES DE EVENTOS AJUSTADAS ---

function onPointDrag(idx, e) {
  document.body.style.cursor = 'grabbing';
  dragging.value = true
  selectedIdx.value = idx
  const p = { x: e.target.x(), y: e.target.y() }
  const snapThreshold = 10 / stageScale.value;
  const snappedPoint = getSnappedPoint(p, elements.value, snapThreshold);
  const clampedX = Math.max(0, Math.min(snappedPoint.x, worldWidth.value));
  const clampedY = Math.max(0, Math.min(snappedPoint.y, worldHeight.value));
  const newPoint = { x: Math.round(clampedX), y: Math.round(clampedY) };

  if (isPointInsideElements(newPoint, elements.value)) {
  emit('notice', 'No se puede colocar un vértice sobre un elemento')
    const lastValidPoint = polygon.value[idx];
    e.target.x(lastValidPoint.x); e.target.y(lastValidPoint.y);
    return;
  }
  const newPolygon = [...polygon.value];
  newPolygon[idx] = newPoint;
  emit('update:polygon', newPolygon);
  e.target.x(clampedX); e.target.y(clampedY);
  guidePos.x = Math.round(e.target.x()); guidePos.y = Math.round(e.target.y());
}

function onPointDragEnd() {
  dragging.value = false
  emit('notice', '');
  document.body.style.cursor = 'grab';

  const edgeValidation = isEdgeCrossingElement(polygon.value, elements.value);
  if (!edgeValidation.valid) {
    emit('notice', edgeValidation.message);
    if (polygonBeforeDrag.value) emit('update:polygon', polygonBeforeDrag.value);
    polygonBeforeDrag.value = null;
    return;
  }

  const inclusionValidation = isPolygonValid(polygon.value, elements.value);
  if (!inclusionValidation.valid) {
    emit('notice', inclusionValidation.message);
    if (polygonBeforeDrag.value) emit('update:polygon', polygonBeforeDrag.value);
  }
  polygonBeforeDrag.value = null;
}

function stageToLocal(pos){
  const stage = stageRef.value?.getNode?.()
  if (!stage) return { x: pos?.x||0, y: pos?.y||0 }
  const scale = stageScale.value || 1
  return { x: (pos.x - stage.x()) / scale, y: (pos.y - stage.y()) / scale }
}

function findClosestSegmentIndex(point) {
  let minDistance = Infinity; let insertIndex = -1;
  const pts = polygon.value
  if (!pts || pts.length < 2) return 1
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    if (dx === 0 && dy === 0) continue
    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy)
    let closestX, closestY;
    if (t < 0) { closestX = p1.x; closestY = p1.y }
    else if (t > 1) { closestX = p2.x; closestY = p2.y }
    else { closestX = p1.x + t * dx; closestY = p1.y + t * dy }
    const distance = Math.sqrt(Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2))
    if (distance < minDistance) { minDistance = distance; insertIndex = i + 1; }
  }
  return insertIndex
}

function onCanvasClick(e){
  if (e.target.hasName('vertex')) return
  const stage = stageRef.value?.getNode?.()
  const pointer = stage?.getPointerPosition?.()
  if (!pointer) return
  const p = stageToLocal(pointer)

  if (adding.value){
    const boundarySnapThreshold = 15 / stageScale.value;
    const boundarySnappedPoint = getSnappedToBoundaryPoint(p, worldWidth.value, worldHeight.value, boundarySnapThreshold);
    const clampedPoint = {
      x: Math.max(0, Math.min(boundarySnappedPoint.x, worldWidth.value)),
      y: Math.max(0, Math.min(boundarySnappedPoint.y, worldHeight.value))
    };

    if (isPointInsideElements(clampedPoint, elements.value)) {
  emit('notice', 'No se puede añadir un vértice sobre un elemento')
      return;
    }

    const insertIndex = findClosestSegmentIndex(clampedPoint)
    const newPolygon = [...polygon.value];
    newPolygon.splice(insertIndex, 0, { x: Math.round(clampedPoint.x), y: Math.round(clampedPoint.y) });

    const edgeValidation = isEdgeCrossingElement(newPolygon, elements.value);
    if (!edgeValidation.valid) {
      emit('notice', edgeValidation.message);
      return;
    }

    emit('update:polygon', newPolygon);
    selectedIdx.value = insertIndex
  } else {
    selectedIdx.value = -1
  }
}

function onVertexMouseDown(evt) {
  emit('notice', '');
  if (deleting.value) {
    evt.evt.stopPropagation();
  } else {
    polygonBeforeDrag.value = JSON.parse(JSON.stringify(polygon.value));
  }
}

function onVertexClick(idx, evt) {
  evt.evt.cancelBubble = true
  emit('notice', '')

  if (deleting.value) {
    if ((polygon.value?.length || 0) <= 3) {
  emit('notice', 'No se puede eliminar: el polígono debe tener al menos 3 vértices')
      return
    }
    const newPolygon = [...polygon.value];
    newPolygon.splice(idx, 1);

    const edgeValidation = isEdgeCrossingElement(newPolygon, elements.value);
    if (!edgeValidation.valid) {
      emit('notice', edgeValidation.message);
      return;
    }

    emit('update:polygon', newPolygon);
    selectedIdx.value = -1
  } else {
    selectedIdx.value = idx
  }
}

function isPointStrictlyInsideElements(point, elements) {
  for (const el of elements) {
    if (
      point.x > el.x &&
      point.x < el.x + el.width &&
      point.y > el.y &&
      point.y < el.y + el.height
    ) {
      return true; // El punto está estrictamente dentro
    }
  }
  return false;
}

function onVertexMouseOver() {
  if (deleting.value) { document.body.style.cursor = 'crosshair'; }
  else { document.body.style.cursor = 'grab'; }
}

function onVertexMouseOut() {
  document.body.style.cursor = 'default';
}
</script>
