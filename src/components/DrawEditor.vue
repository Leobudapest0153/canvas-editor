<template>
  <div class="border rounded-lg overflow-hidden relative flex-grow">
    <!-- ANOTACIÓN: El stage ahora es más simple, sin lógica de modal. -->
    <v-stage ref="stageRef"
             :config="{
               width: canvasW,
               height: canvasH,
               draggable: true,
               scale: {x: stageScale, y: stageScale}
             }"
             @wheel="onWheel"
             @dragmove="onStageDragMove"
             @dragend="onStageDragMove"
             @mousedown="onCanvasClick">
      <v-layer :config="{ listening: false }">
        <!-- ELIMINADO: El rectángulo gris de fondo ha sido removido. -->

        <!-- Rectángulo que define el área de trabajo -->
        <v-rect :config="{
          x: 0,
          y: 0,
          width: worldWidth,
          height: worldHeight,
          fill: '#f8fafc',
          stroke: '#cbd5e1', 
          strokeWidth: 2 / stageScale 
        }" />

        <GridLayer :width="canvasW" :height="canvasH" :scale="stageScale" :stageX="stagePosition.x" :stageY="stagePosition.y" :pixelsPerUnit="PIXELS_PER_CM * 100" unit="m" :bbox="gridBBox" />
      </v-layer>

      <v-layer>
        <v-line :config="{ points: flatPoints, closed:true, stroke:'#0ea5e9', fill:'rgba(14,165,233,0.08)', strokeWidth:2 }" />
        <template v-for="(seg, i) in segments" :key="'seg-'+i">
          <v-text :config="{ x: seg.mx, y: seg.my, text: seg.label, fontSize: 9 / stageScale, fill:'#334155' }" />
        </template>
        <template v-if="dragging">
          <v-line :config="{ points:[guidePos.x,0, guidePos.x, canvasH], stroke:'#94a3b8', dash:[4,4], strokeWidth:1 }" />
          <v-line :config="{ points:[0,guidePos.y, canvasW, guidePos.y], stroke:'#94a3b8', dash:[4,4], strokeWidth:1 }" />
          <v-rect :config="{ x: guidePos.x + 8, y: guidePos.y + 8, width: 110, height: 22, fill:'rgba(255,255,255,0.8)', stroke:'#cbd5e1', cornerRadius:4 }" />
          <v-text :config="{ x: guidePos.x + 12, y: guidePos.y + 12, text: guideLabel, fontSize: 12, fill:'#0f172a' }" />
        </template>
        <template v-for="(p, idx) in polygon" :key="idx">
          <v-circle :config="{ 
            x:p.x, 
            y:p.y, 
            radius: (selectedIdx === idx ? 8 : 6) / stageScale, 
            fill:selectedIdx===idx?'#0284c7':'#0ea5e9', 
            draggable:!deleting, 
            stroke:selectedIdx===idx?'#0284c7':'#0ea5e9', 
            strokeWidth: (selectedIdx === idx ? 2 : 1) / stageScale, 
            name: 'vertex' 
          }"
          @click="evt => onVertexClick(idx, evt)"
          @mousedown="evt => onVertexMouseDown(evt)"
          @dragmove="e => onPointDrag(idx, e)"
          @dragend="e => onPointDragEnd(idx, e)"
          @mouseover="onVertexMouseOver"
          @mouseout="onVertexMouseOut"/>
        </template>
        <template v-if="adding">
          <v-text :config="{ x: 8, y: 8, text: 'Clic en un borde para añadir un vértice.', fontSize: 14, fill:'#0f172a' }" />
        </template>
         <template v-if="deleting">
          <v-text :config="{ x: 8, y: 8, text: 'Clic en un vértice para eliminarlo.', fontSize: 14, fill:'#0f172a' }" />
        </template>
      </v-layer>
    </v-stage>
    <RulersOverlay :width="canvasW" :height="canvasH" :scale="stageScale" :stageX="stagePosition.x" :stageY="stagePosition.y" :pixelsPerUnit="PIXELS_PER_CM * 100" unit="m"/>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, defineProps, defineEmits, toRefs } from 'vue'
import GridLayer from './GridLayer.vue'
import RulersOverlay from './RulersOverlay.vue'

// ANOTACIÓN: Definimos las props que este componente recibe del padre.
const props = defineProps({
  polygon: { type: Array, required: true },
  worldWidth: { type: Number, required: true },
  worldHeight: { type: Number, required: true },
  adding: { type: Boolean, default: false },
  deleting: { type: Boolean, default: false },
});

// ANOTACIÓN: Definimos los eventos que este componente puede emitir al padre.
const emit = defineEmits(['update:polygon', 'notice']);

const { polygon, worldWidth, worldHeight, adding, deleting } = toRefs(props);

const PIXELS_PER_CM = 10
const canvasW = ref(1200)
const canvasH = ref(450)

const selectedIdx = ref(-1)
const dragging = ref(false)
const guidePos = reactive({ x: 0, y: 0 })

const gridBBox = computed(() => {
  const pts = polygon.value
  if (!pts || pts.length < 1) return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY }
})

const stageRef = ref(null)
const stageScale = ref(1)
const stagePosition = ref({ x: 0, y: 0 })

function fitStageToPolygon() {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const box = gridBBox.value
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

// ANOTACIÓN: Exponemos la función para que el padre pueda llamarla.
defineExpose({ fitStageToPolygon });

onMounted(() => { fitStageToPolygon() })
// ELIMINADO: Este watch causaba que la vista se recentrara al arrastrar un vértice.
// watch(polygon, () => fitStageToPolygon(), { deep: true });


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

function onPointDrag(idx, e) {
  dragging.value = true
  selectedIdx.value = idx
  const p = { x: e.target.x(), y: e.target.y() }

  const clampedX = Math.max(0, Math.min(p.x, worldWidth.value))
  const clampedY = Math.max(0, Math.min(p.y, worldHeight.value))

  const newPolygon = [...polygon.value];
  newPolygon[idx] = { x: Math.round(clampedX), y: Math.round(clampedY) };
  emit('update:polygon', newPolygon);

  e.target.x(clampedX)
  e.target.y(clampedY)

  guidePos.x = Math.round(clampedX)
  guidePos.y = Math.round(clampedY)
}

function onPointDragEnd(idx, e) {
  onPointDrag(idx, e)
  dragging.value = false
}

function stageToLocal(pos){
  const stage = stageRef.value?.getNode?.()
  if (!stage) return { x: pos?.x||0, y: pos?.y||0 }
  const scale = stageScale.value || 1
  return { x: (pos.x - stage.x()) / scale, y: (pos.y - stage.y()) / scale }
}

function findClosestSegmentIndex(point) {
  let minDistance = Infinity
  let insertIndex = -1
  const pts = polygon.value
  if (!pts || pts.length < 2) return 1

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i]
    const p2 = pts[(i + 1) % pts.length]
    const dx = p2.x - p1.x; const dy = p2.y - p1.y
    if (dx === 0 && dy === 0) continue
    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy)
    let closestX, closestY
    if (t < 0) { closestX = p1.x; closestY = p1.y }
    else if (t > 1) { closestX = p2.x; closestY = p2.y }
    else { closestX = p1.x + t * dx; closestY = p1.y + t * dy }
    const distance = Math.sqrt(Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2))
    if (distance < minDistance) {
      minDistance = distance
      insertIndex = i + 1
    }
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
    const insertIndex = findClosestSegmentIndex(p)
    const newPolygon = [...polygon.value];
    newPolygon.splice(insertIndex, 0, { x: Math.round(p.x), y: Math.round(p.y) });
    emit('update:polygon', newPolygon);
    selectedIdx.value = insertIndex
  } else {
    selectedIdx.value = -1
  }
}

function onVertexMouseDown(evt) {
  if (deleting.value) evt.evt.stopPropagation();
}

function onVertexClick(idx, evt) {
  evt.evt.cancelBubble = true
  emit('notice', '')

  if (deleting.value) {
    if ((polygon.value?.length || 0) <= 3) {
      emit('notice', 'No se puede eliminar: el polígono debe tener al menos 3 vértices.')
      return
    }
    const newPolygon = [...polygon.value];
    newPolygon.splice(idx, 1);
    emit('update:polygon', newPolygon);
    selectedIdx.value = -1
  } else {
    selectedIdx.value = idx
  }
}

function onVertexMouseOver() {
  if (deleting.value) document.body.style.cursor = 'crosshair';
}
function onVertexMouseOut() {
  document.body.style.cursor = 'default';
}
</script>
