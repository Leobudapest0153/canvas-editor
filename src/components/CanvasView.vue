<!--
  CanvasView
  Responsabilidades:
  - Renderizar el canvas principal usando vue-konva
  - Manejar eventos de interacción (drag, drop, select, etc.)
  - Renderizar elementos del catálogo en las plantas
  - Gestionar transformaciones y zoom del canvas
  - Coordinar las vistas XY/ZX/ZY según el modo seleccionado
  - Manejar la jerarquía padre-hijo de elementos
  - Integrar detección de colisiones durante el movimiento
  - Sincronizar con el estado global del canvas
-->

<template>
  <div
    ref="containerRef"
    class="canvas-container"
    :class="{ 'drag-over': isDragOverCanvas }"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
  >
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @wheel="handleWheel"
      @mousedown="handleStageMouseDown"
      @click="handleStageClick"
    >
      <v-layer ref="layerRef">
        <!-- Fondo de la planta - área delimitada -->
        <v-rect
          :config="{
            x: 0,
            y: 0,
            width: floorBoundary.width,
            height: floorBoundary.height,
            fill: '#ffffff',
            stroke: '#3b82f6',
            strokeWidth: 2,
            opacity: 0.1,
            listening: false,
          }"
        />
        <v-line :config="{ points: floorBoundary.points, closed:true, stroke:'#0ea5e9', fill:'rgba(14,165,233,0.08)', strokeWidth:2 }" />
        <!-- Debug: mostrar información de la planta -->
        <v-text
          :config="{
            x: 10,
            y: 10,
            text: `${canvasStore.plantaActivaData?.nombre || 'Planta'} - ${layerConfig.width}x${layerConfig.height}px (${canvasStore.plantaActivaData?.dimensiones.ancho}x${canvasStore.plantaActivaData?.dimensiones.largo}cm)`,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#3b82f6',
            listening: false,
          }"
        />
        <v-text
          :config="{
            x: 10,
            y: 30,
            text: `Elementos: ${elementosVisiblesEnCanvas.length}`,
            fontSize: 11,
            fontFamily: 'Arial',
            fill: '#6b7280',
            listening: false,
          }"
        />

        <!-- Renderizado de elementos del store -->
        <template v-for="elemento in elementosVisiblesEnCanvas" :key="elemento.id">
          
          <!-- Elementos rectangulares (anaqueles, mesas, armarios, contenedores) -->
          <v-rect
            v-if="elemento.forma === 'rectangular' || !elemento.forma"
            :config="{
              id: elemento.id,
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              fill: elemento.color,
              stroke: getStrokeColor(elemento.id),
              strokeWidth: canvasStore.elementoSeleccionado === elemento.id ? 3 : 1,
              opacity: 0.8,
              draggable: true,
              shadowColor: 'black',
              shadowBlur: 4,
              shadowOpacity: 0.3,
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento, 'rect'),
            }"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="() => startElementDrag(elemento.id)"
            @dragmove="(e) => updateElementPosition(e, elemento.id)"
            @dragend="() => endElementDrag(elemento.id)"
          />

          <!-- Elementos circulares -->
          <v-circle
            v-else-if="elemento.forma === 'circular'"
            :config="{
              id: elemento.id,
              x: elemento.x + elemento.width / 2,
              y: elemento.y + elemento.height / 2,
              radius: Math.min(elemento.width, elemento.height) / 2,
              fill: elemento.color,
              stroke: getStrokeColor(elemento.id),
              strokeWidth: canvasStore.elementoSeleccionado === elemento.id ? 3 : 1,
              opacity: 0.8,
              draggable: true,
              shadowColor: 'black',
              shadowBlur: 4,
              shadowOpacity: 0.3,
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento, 'circle'),
            }"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="() => startElementDrag(elemento.id)"
            @dragmove="(e) => updateElementPosition(e, elemento.id, 'circular')"
            @dragend="() => endElementDrag(elemento.id)"
          />

          <!-- Texto con el nombre del elemento -->
          <v-text
            :config="{
              x: elemento.x + 5,
              y: elemento.y + 5,
              text: elemento.nombre || elemento.tipo || 'Elemento',
              fontSize: 12,
              fontFamily: 'Arial',
              fill: '#fff',
              shadowColor: 'black',
              shadowBlur: 2,
              shadowOpacity: 0.8,
              listening: false,
            }"
          />
        </template>

        <!-- Grid de referencia de la planta -->
        <v-line
          v-for="i in gridLines.vertical"
          :key="`v-${i}`"
          :config="{
            points: [i, 0, i, floorBoundary.height],
            stroke: '#e5e7eb',
            strokeWidth: 1,
            opacity: 0.5,
            listening: false,
          }"
        />
        <v-line
          v-for="i in gridLines.horizontal"
          :key="`h-${i}`"
          :config="{
            points: [0, i, floorBoundary.width, i],
            stroke: '#e5e7eb',
            strokeWidth: 1,
            opacity: 0.5,
            listening: false,
          }"
        />
      </v-layer>
    </v-stage>

    <!-- Información de zoom, vista y dimensiones -->
    <div class="canvas-info">
      <span>Zoom: {{ Math.round(canvasStore.zoom * 100) }}%</span>
      <span>Vista: {{ canvasStore.vistaActiva }}</span>
      <span v-if="canvasStore.plantaActivaData">
        Planta: {{ canvasStore.plantaActivaData.dimensiones.ancho }}×{{
          canvasStore.plantaActivaData.dimensiones.largo
        }}cm
      </span>
      <span v-if="canvasStore.elementoSeleccionado">
        Seleccionado: {{ canvasStore.elementoSeleccionado }}
      </span>
    </div>

    <!-- Botones flotantes de Undo/Redo -->
    <div class="floating-controls" :style="{ right: `${props.safeRight}px` }">
      <button
        @click="undo()"
        :disabled="!canUndo"
        class="floating-btn btn-undo"
        title="Deshacer (Ctrl+Z)"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      </button>

      <button
        @click="redo()"
        :disabled="!canRedo"
        class="floating-btn btn-redo"
        title="Rehacer (Ctrl+Y)"
      >
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCanvasWithHistory } from '@/composables/useCanvasWithHistory'
import { useCanvasBuffer } from '@/composables/useCanvasBuffer'
import { useConflicts } from '@/composables/useConflicts'
import {
  detectConflictsFor,
  throttle,
  computeMTD,
  projectMTDAgainstBoundary,
} from '@/utils/collision'
import {
  rectInsidePolygon,
  circleInsidePolygon,
  boundedRectDrag,
  clampRectToRect,
  snapToGrid,
  safeSnapRect,
  nudgePlace,
} from '@/utils/geometry'
import { SNAP_EPS, GRID_SIZE } from '@/utils/constants'

// Nuevo: espacio seguro a la derecha para no quedar debajo del panel
const props = defineProps({
  safeRight: { type: Number, default: 20 },
})

// Definir emits
const emit = defineEmits(['select', 'drill-down'])

// Referencias
const containerRef = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)

// Tamaño del área
const maxWidth = ref(100);
const maxHeight = ref(100);

// Composable con historial integrado
const { store: canvasStore, actions, undo, redo, canUndo, canRedo } = useCanvasWithHistory()
const buffer = useCanvasBuffer()
const conflictsApi = useConflicts()

// Conflictos en vivo durante el arrastre
const liveConflicts = conflictsApi.conflicts
const setLiveConflictsThrottled = throttle((movingEl) => {
  try {
    const list = detectConflictsFor(movingEl, canvasStore.elementosVisibles)
    conflictsApi.setConflicts(list, movingEl.id)
  } catch {
    // noop: evitar romper el drag por errores transitorios
  }
}, 32)

// Resolver posición contra obstáculos bloqueantes (suelo–suelo) usando MTD AABB
const resolveAgainstBlockingObstacles = (candidateX, candidateY, elemento) => {
  const all = canvasStore.elementosVisibles
  const w = elemento.width
  const h = elemento.height
  let x = candidateX
  let y = candidateY

  // Iterar para resolver múltiples colisiones respetando contorno
  const MAX_ITERS = 3
  const boundary = computeBoundary()
  const W = boundary.type === 'rect' ? boundary.W : Infinity
  const H = boundary.type === 'rect' ? boundary.H : Infinity

  // Paso (1): clamp al área primero
  if (boundary.type === 'rect') {
    const c = clampRectToRect(x, y, w, h, W, H)
    x = c.x
    y = c.y
  }

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const moving = { ...elemento, x, y }
    const conflicts = detectConflictsFor(moving, all)
    const blocking = conflicts.filter((c) => c.bloqueante)
    if (blocking.length === 0) break

    // (3) MTD agregado sobre AABB
    let accDx = 0
    let accDy = 0
    for (const c of blocking) {
      const otherId = c.aId === elemento.id ? c.bId : c.aId
      const other = all.find((el) => el.id === otherId)
      if (!other) continue
      const { dx, dy } = computeMTD(x, y, w, h, other.x, other.y, other.width, other.height)
      accDx += dx
      accDy += dy
    }

    // Proyección del MTD contra el contorno rectangular
    if (boundary.type === 'rect') {
      const proj = projectMTDAgainstBoundary(x, y, accDx, accDy, w, h, W, H)
      accDx = proj.dx
      accDy = proj.dy
    }

    // Aplicar MTD y volver a clavar al área
    x += accDx
    y += accDy

    if (boundary.type === 'rect') {
      const c2 = clampRectToRect(x, y, w, h, W, H)
      x = c2.x
      y = c2.y
    } else if (boundary.type === 'polygon') {
      // En polígono no hay clamp trivial; si sale, revertimos a última válida luego
    }

    // Si la corrección fue nula, detener
    if (Math.abs(accDx) < 1e-6 && Math.abs(accDy) < 1e-6) break
  }

  // Validaciones finales: si aún hay colisión bloqueante o quedó fuera, volver a última válida
  const movingEnd = { ...elemento, x, y }
  const endConf = detectConflictsFor(movingEnd, all).filter((c) => c.bloqueante)
  const outsideRect =
    boundary.type === 'rect'
      ? x < -1e-6 || y < -1e-6 || x + w > W + 1e-6 || y + h > H + 1e-6
      : false
  if (endConf.length > 0 || outsideRect) {
    const prev = lastValidPositions.value.get(elemento.id) || { x: elemento.x, y: elemento.y }
    return { x: prev.x, y: prev.y, fellBack: true }
  }

  // No hacer snap aquí para no cuantizar el arrastre
  return { x, y, fellBack: false }
}

// Estado local del canvas
const stageSize = ref({ width: 800, height: 600 })
const isDragOverCanvas = ref(false)
const isElementDragging = ref(false)
const stageDragEnabled = ref(true)

// Configuración del stage - OCUPA TODO EL CONTENEDOR
const stageConfig = computed(() => ({
  width: stageSize.value.width, // Tamaño del contenedor, no de canvasAdaptativo
  height: stageSize.value.height, // Tamaño del contenedor, no de canvasAdaptativo
  scaleX: canvasStore.zoom,
  scaleY: canvasStore.zoom,
  x: canvasStore.panX,
  y: canvasStore.panY,
  draggable: stageDragEnabled.value,
}))


const floorBoundary = computed(() => {
  // Empezamos con las dimensiones base del layer
  let width = layerConfig.value.width;
  let height = layerConfig.value.height;
  let points = [];

  const poligono = canvasStore.plantaActivaData?.poligono;

  // Si hay un polígono, lo usamos para expandir los límites y obtener los puntos
  if (poligono && Array.isArray(poligono) && poligono.length > 0) {
    poligono.forEach(coord => {
      width = Math.max(coord.x, width);
      height = Math.max(coord.y, height);
    });
    points = poligono.flatMap(p => [p.x, p.y]);
  }

  return { width, height, points };
});


// Configuración del layer - TAMAÑO DE LA PLANTA ACTIVA
const layerConfig = computed(() => {
  const planta = canvasStore.plantaActivaData
  if (!planta) {
    return { width: 800, height: 600 } // Fallback
  }

  // Convertir dimensiones de cm a pixels (1cm = 2px para buena visualización)
  const escalaVisualizacion = 2
  return {
    width: planta.dimensiones.ancho * escalaVisualizacion,
    height: planta.dimensiones.largo * escalaVisualizacion,
  }
})

// Elementos visibles en el canvas (excluye elementos ocultos)
const elementosVisiblesEnCanvas = computed(() => {
  return canvasStore.elementosVisibles.filter((elemento) => elemento.visible !== false)
})

// Grid de referencia - BASADO EN LAS DIMENSIONES DE LA PLANTA
const gridLines = computed(() => {
  const gridSizePx = canvasStore.gridSize || 50
  const vertical = []
  const horizontal = []

  // Usar las dimensiones del layer (planta) para el grid
  const layerWidth = maxWidth.value;
  const layerHeight = maxHeight.value;

  for (let i = 0; i <= layerWidth; i += gridSizePx) {
    vertical.push(i)
  }

  for (let i = 0; i <= layerHeight; i += gridSizePx) {
    horizontal.push(i)
  }

  return { vertical, horizontal }
})

// Obtiene el contorno de la planta activa como rect o polígono
const computeBoundary = () => {
  const W = layerConfig.value.width
  const H = layerConfig.value.height
  const planta = canvasStore.plantaActivaData
  if (planta?.poligono && Array.isArray(planta.poligono) && planta.poligono.length >= 3) {
    return { type: 'polygon', points: planta.poligono }
  }
  return { type: 'rect', W, H }
}

// === FUNCIONES DE ZOOM ===
const handleWheel = (e) => {
  e.evt.preventDefault()

  const stage = stageRef.value.getNode()
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()

  const scaleBy = 1.1
  const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
  const clampedScale = Math.max(0.1, Math.min(5, newScale))

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  const newPos = {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  }

  canvasStore.configurarZoom(clampedScale)
  canvasStore.configurarPan(newPos.x, newPos.y)
}

// === FUNCIONES DE CANVAS/STAGE ===
const handleStageMouseDown = (e) => {
  // Si el click es en el stage (no en un elemento), habilitar arrastre del canvas
  if (e.target === e.target.getStage()) {
    stageDragEnabled.value = true
  }
}

const handleStageClick = (e) => {
  // Deseleccionar elemento si click en área vacía
  if (e.target === e.target.getStage()) {
    canvasStore.seleccionarElemento(null)
  }
}

// === FUNCIONES DE ELEMENTOS ===
const selectElement = (elementId) => {
  console.log('Seleccionando elemento:', elementId)
  canvasStore.seleccionarElemento(elementId)

  const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
  if (elemento) {
    emit('select', elemento)
  }
}

const handleElementDoubleClick = (elemento) => {
  console.log('Double-click en elemento:', elemento.nombre)

  // Verificar si el elemento puede tener hijos (contenedor)
  const tiposContenedor = ['anaqueles', 'estantes', 'armarios', 'contenedores', 'mesas']

  if (tiposContenedor.includes(elemento.tipo)) {
    console.log('Navegando al interior del elemento:', elemento.nombre)
    canvasStore.navegarAElemento(elemento.id)
  } else {
    console.log('Elemento no es un contenedor:', elemento.tipo)
  }
}

// Tracking de posiciones iniciales para revertir si corresponde
const dragStartPositions = ref(new Map())
// Última posición válida por elemento (en coords de layer)
const lastValidPositions = ref(new Map())
// Marca de borde para feedback visual
const atEdgeMap = ref(new Map())

// Helper: color de borde con feedback
const getStrokeColor = (elementId) => {
  if (atEdgeMap.value.get(elementId)) return '#f59e0b' // advertencia en borde
  return canvasStore.elementoSeleccionado === elementId ? '#000' : '#666'
}

// Convierte posición stage->layer considerando zoom/pan
const toLayerCoords = (pos) => {
  const stage = stageRef.value.getNode()
  const scale = stage.scaleX() || 1
  const x = (pos.x - stage.x()) / scale
  const y = (pos.y - stage.y()) / scale
  return { x, y }
}

// Convierte posición layer->stage considerando zoom/pan
const toStageCoords = (pos) => {
  const stage = stageRef.value.getNode()
  const scale = stage.scaleX() || 1
  return { x: pos.x * scale + stage.x(), y: pos.y * scale + stage.y() }
}

// Drag bound para cada elemento y forma
const dragBoundForElement = (pos, elemento, forma = 'rect') => {
  const layerPos = toLayerCoords(pos)
  const boundary = computeBoundary()

  if (forma === 'circle') {
    // pos viene como centro
    const r = Math.min(elemento.width, elemento.height) / 2
    if (boundary.type === 'rect') {
      // Orden: clamp → colisiones → clamp → validar (sin snap en drag)
      const clampedCenter = {
        x: Math.max(r, Math.min(layerPos.x, boundary.W - r)),
        y: Math.max(r, Math.min(layerPos.y, boundary.H - r)),
      }
      const asRect = { ...elemento, width: r * 2, height: r * 2 }
      const resolved = resolveAgainstBlockingObstacles(
        clampedCenter.x - r,
        clampedCenter.y - r,
        asRect,
      )
      const finalCenter = { x: resolved.x + r, y: resolved.y + r }

      // Edge feedback
      const toLeft = Math.abs(finalCenter.x - r)
      const toTop = Math.abs(finalCenter.y - r)
      const toRight = Math.abs(boundary.W - (finalCenter.x + r))
      const toBottom = Math.abs(boundary.H - (finalCenter.y + r))
      const atEdge =
        toLeft <= SNAP_EPS || toTop <= SNAP_EPS || toRight <= SNAP_EPS || toBottom <= SNAP_EPS
      atEdgeMap.value.set(elemento.id, atEdge)

      lastValidPositions.value.set(elemento.id, { x: finalCenter.x - r, y: finalCenter.y - r })
      return toStageCoords(finalCenter)
    }
    if (boundary.type === 'polygon') {
      const inside = circleInsidePolygon(layerPos.x, layerPos.y, r, boundary.points)
      if (!inside) {
        // Mantener último válido
        const prev = lastValidPositions.value.get(elemento.id) || { x: elemento.x, y: elemento.y }
        const centerPrev = { x: prev.x + r, y: prev.y + r }
        return toStageCoords(centerPrev)
      }
      atEdgeMap.value.set(elemento.id, false)
      lastValidPositions.value.set(elemento.id, { x: layerPos.x - r, y: layerPos.y - r })
      return pos
    }
  }

  // Rectangular usan bbox axis-aligned
  const w = elemento.width
  const h = elemento.height

  if (boundary.type === 'rect') {
    // Orden: clamp → colisiones → clamp → snap → validar
    // (1) clamp inicial sin snap
    const clamped = clampRectToRect(layerPos.x, layerPos.y, w, h, boundary.W, boundary.H)

    // (2-4) resolver bloqueantes no-expansivo con prioridad de contorno
    let adjusted = { x: clamped.x, y: clamped.y }
    const res = resolveAgainstBlockingObstacles(clamped.x, clamped.y, elemento)
    adjusted = { x: res.x, y: res.y }

    // Edge feedback basado en posición final
    const toLeft = Math.abs(adjusted.x)
    const toTop = Math.abs(adjusted.y)
    const toRight = Math.abs(boundary.W - (adjusted.x + w))
    const toBottom = Math.abs(boundary.H - (adjusted.y + h))
    const atEdge =
      toLeft <= SNAP_EPS || toTop <= SNAP_EPS || toRight <= SNAP_EPS || toBottom <= SNAP_EPS

    atEdgeMap.value.set(elemento.id, atEdge)
    lastValidPositions.value.set(elemento.id, { x: adjusted.x, y: adjusted.y })
    return toStageCoords({ x: adjusted.x, y: adjusted.y })
  }

  if (boundary.type === 'polygon') {
    const inside = rectInsidePolygon(layerPos.x, layerPos.y, w, h, boundary.points)
    if (!inside) {
      const prev = lastValidPositions.value.get(elemento.id) || { x: elemento.x, y: elemento.y }
      return toStageCoords(prev)
    }
    // En polígono, no resolvemos contra obstáculos complejos: fallback si bloquea
    const moving = { ...elemento, x: layerPos.x, y: layerPos.y }
    const conflicts = detectConflictsFor(moving, canvasStore.elementosVisibles)
    if (conflicts.some((c) => c.bloqueante)) {
      const prev = lastValidPositions.value.get(elemento.id) || { x: elemento.x, y: elemento.y }
      return toStageCoords(prev)
    }
    atEdgeMap.value.set(elemento.id, false)
    lastValidPositions.value.set(elemento.id, { x: layerPos.x, y: layerPos.y })
    return pos
  }

  return pos
}

const startElementDrag = (elementId) => {
  console.log('Iniciando arrastre del elemento:', elementId)
  isElementDragging.value = true
  stageDragEnabled.value = false // Deshabilitar arrastre del canvas

  // Seleccionar elemento automáticamente al arrastrarlo
  canvasStore.seleccionarElemento(elementId)

  const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
  if (elemento) {
    dragStartPositions.value.set(elementId, { x: elemento.x, y: elemento.y })
    lastValidPositions.value.set(elementId, { x: elemento.x, y: elemento.y })
  }

  // Limpiar conflictos previos al iniciar un nuevo arrastre
  conflictsApi.clear()
}

const updateElementPosition = (e, elementId, forma = 'rectangular') => {
  const target = e.target
  let x = target.x()
  let y = target.y()

  if (forma === 'circular') {
    const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
    if (elemento) {
      x = x - elemento.width / 2
      y = y - elemento.height / 2
    }
  }

  const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
  if (!elemento) return

  // Feedback visual: bordes cuando está pegado o hay conflicto
  const warn = atEdgeMap.value.get(elementId)

  // Detectar conflictos en tiempo real (no bloquea)
  const moving = { ...elemento, x, y }
  setLiveConflictsThrottled(moving)
  const hasAnyConflict = liveConflicts.value.length > 0

  try {
    const strokeColor = hasAnyConflict
      ? '#ef4444'
      : warn
        ? '#f59e0b'
        : canvasStore.elementoSeleccionado === elementId
          ? '#000'
          : '#666'
    target.stroke(strokeColor)
    if (hasAnyConflict) {
      target.shadowColor('#ef4444')
      target.shadowBlur(8)
      target.shadowOpacity(0.6)
    } else {
      target.shadowColor('black')
      target.shadowBlur(4)
      target.shadowOpacity(0.3)
    }
    target.getLayer()?.batchDraw()
  } catch {
    // noop
  }

  canvasStore.actualizarPosicion(elementId, x, y)
}

const endElementDrag = (elementId) => {
  console.log('Finalizando arrastre del elemento:', elementId)
  isElementDragging.value = false
  stageDragEnabled.value = true // Rehabilitar arrastre del canvas

  // Guardar en historial al finalizar el arrastre
  const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
  if (!elemento) return

  let final = lastValidPositions.value.get(elementId) || { x: elemento.x, y: elemento.y }

  // Snap-to-grid al finalizar el drag, preservando contorno y contacto con vecinos
  const boundary = computeBoundary()
  if (boundary.type === 'rect') {
    const neighbors = canvasStore.elementosVisibles.filter((el) => el.id !== elementId)
    // Aplicar snap seguro para rectángulos; círculos mantienen posición final para no romper radios
    if (elemento.forma === 'rectangular' || !elemento.forma) {
      const snapped = safeSnapRect(
        final.x,
        final.y,
        elemento.width,
        elemento.height,
        { W: boundary.W, H: boundary.H },
        neighbors,
        canvasStore.gridSize || 50,
        1e-6,
        { snapX: true, snapY: true },
        canvasStore.snapGridEps || 6,
      )
      // Validar que el snap no introduzca bloqueos; si lo hace, mantener final
      const test = { ...elemento, x: snapped.x, y: snapped.y }
      const conflicts = detectConflictsFor(test, canvasStore.elementosVisibles).filter(
        (c) => c.bloqueante,
      )
      if (conflicts.length === 0) {
        final = { x: snapped.x, y: snapped.y }
      }
    } else if (elemento.forma === 'circular') {
      // Snap del centro por proximidad; no forzar si no está cerca ni si saca fuera
      const r = Math.min(elemento.width, elemento.height) / 2
      const center = { x: final.x + r, y: final.y + r }
      const snappedC = snapToGrid(center.x, center.y, canvasStore.gridSize || 50)
      const gridEps = canvasStore.snapGridEps || 6
      const targetC = {
        x: Math.abs(snappedC.x - center.x) <= gridEps ? snappedC.x : center.x,
        y: Math.abs(snappedC.y - center.y) <= gridEps ? snappedC.y : center.y,
      }
      const clampedC = {
        x: Math.max(r, Math.min(targetC.x, boundary.W - r)),
        y: Math.max(r, Math.min(targetC.y, boundary.H - r)),
      }
      // Aceptar si el clamp no cambió el resultado (no expulsa fuera)
      if (Math.abs(clampedC.x - targetC.x) < 1e-6 && Math.abs(clampedC.y - targetC.y) < 1e-6) {
        final = { x: clampedC.x - r, y: clampedC.y - r }
      }
    }
  }

  // Evaluar conflictos al finalizar (solo para pintar/estado, sin modal ni toasts)
  const movingNow = { ...elemento, x: final.x, y: final.y }
  const conflicts = detectConflictsFor(movingNow, canvasStore.elementosVisibles)
  conflictsApi.setConflicts(conflicts, elementId)

  // Actualizar posición final
  canvasStore.actualizarPosicion(elementId, final.x, final.y)

  // Persistir en historial (único punto)
  actions.actualizarPosicion(elementId, final.x, final.y, true)

  // No mostrar toasts ni abrir modales

  dragStartPositions.value.delete(elementId)
  atEdgeMap.value.delete(elementId)
}

// === FUNCIONES DE DROP DESDE CATÁLOGO ===
const handleDragOver = (e) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}

const handleDragEnter = (e) => {
  e.preventDefault()
  isDragOverCanvas.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  isDragOverCanvas.value = false
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragOverCanvas.value = false

  try {
    const dataText = e.dataTransfer.getData('application/json')
    if (!dataText) return

    const data = JSON.parse(dataText)

    if (data.tipo === 'elemento-catalogo') {
      createElementFromDrop(data, e)
    } else if (data.tipo === 'buffer-element') {
      createElementFromBuffer(data, e)
    }
  } catch (error) {
    console.error('Error procesando drop:', error)
  }
}

// Función auxiliar para mostrar toast de error
const showToast = (message, type = 'error') => {
  if (typeof window !== 'undefined' && window.__toasts) {
    window.__toasts.show(message, { type, timeout: 4000 })
  } else {
    console.warn('Toast:', message)
  }
}

// Función auxiliar para convertir coordenadas del puntero a coordenadas de mundo
const getWorldCoordinatesFromPointer = (dropEvent) => {
  const stage = stageRef.value.getNode()
  const rect = containerRef.value.getBoundingClientRect()

  // Obtener posición del puntero considerando zoom y pan
  const pointerPos = {
    x: dropEvent.clientX - rect.left,
    y: dropEvent.clientY - rect.top
  }

  // Convertir a coordenadas de mundo (layer) considerando transformación del stage
  const worldX = (pointerPos.x - stage.x()) / stage.scaleX()
  const worldY = (pointerPos.y - stage.y()) / stage.scaleY()

  return { x: worldX, y: worldY }
}

const createElementFromDrop = (data, dropEvent) => {
  const elemento = data.elemento

  // Obtener dimensiones base
  let width = elemento.width || elemento.dimensiones?.ancho || 100
  let height = elemento.height || elemento.dimensiones?.alto || 60

  // Aplicar dimensiones mínimas para mejorar la interacción
  const MIN_WIDTH = 40
  const MIN_HEIGHT = 30
  width = Math.max(width, MIN_WIDTH)
  height = Math.max(height, MIN_HEIGHT)

  // 1. Convertir pointer a coords de mundo (considerando zoom/pan)
  const worldCoords = getWorldCoordinatesFromPointer(dropEvent)

  // 2. Calcular posición candidata centrada en el puntero
  let candX = worldCoords.x - width / 2
  let candY = worldCoords.y - height / 2

  // 3. Aplicar snap a grilla ANTES de validar
  const snapped = snapToGrid(candX, candY, GRID_SIZE)
  candX = snapped.x
  candY = snapped.y

  // 4. Calcular bbox candidato y verificar área
  const boundary = computeBoundary()

  // 5. Verificar que esté dentro del área (clampToArea)
  let isInsideArea = true
  if (boundary.type === 'rect') {
    isInsideArea = candX >= 0 && candY >= 0 &&
                   candX + width <= boundary.W &&
                   candY + height <= boundary.H

    // Si está fuera, intentar clamp
    if (!isInsideArea) {
      const clamped = clampRectToRect(candX, candY, width, height, boundary.W, boundary.H)
      candX = clamped.x
      candY = clamped.y
    }
  } else if (boundary.type === 'polygon') {
    isInsideArea = rectInsidePolygon(candX, candY, width, height, boundary.polygon)
  }

  // 6. Crear elemento temporal para detectar conflictos
  const tempElement = {
    id: '__temp_drop__',
    x: candX,
    y: candY,
    width,
    height,
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    tipo: elemento.tipo || elemento.categoria || 'elemento',
    forma: elemento.forma || 'rectangular'
  }

  // 7. Ejecutar detectConflictsFor contra elementos existentes
  const allElements = canvasStore.elementosVisibles
  const conflicts = detectConflictsFor(tempElement, allElements)
  const blockingConflicts = conflicts.filter(c => c.bloqueante)

  // 8. Si hay conflicto BLOQUEANTE o queda fuera de área, intentar nudgePlace
  let finalPosition = { x: candX, y: candY }
  let placementSuccessful = blockingConflicts.length === 0 && isInsideArea

  if (!placementSuccessful) {
    console.log('🔍 Posición inicial tiene conflictos o está fuera de área, intentando nudgePlace...')

    const nudgeResult = nudgePlace(
      candX,
      candY,
      width,
      height,
      boundary,
      allElements,
      tempElement,
      GRID_SIZE,
      16, // máximo 16 intentos
      detectConflictsFor // Pasar la función como parámetro
    )

    if (nudgeResult.found) {
      finalPosition = { x: nudgeResult.x, y: nudgeResult.y }
      placementSuccessful = true
      console.log('✅ nudgePlace encontró posición válida:', finalPosition)
    } else {
      console.log('❌ nudgePlace no encontró posición válida')
    }
  }

  // 9. Si aún no hay posición válida, rechazar y mostrar toast
  if (!placementSuccessful) {
    showToast('No hay espacio aquí para colocar el elemento', 'error')
    return // NO crear la instancia, NO comprometer historial
  }

  // 10. Crear el elemento solo si la validación fue exitosa
  const color = elemento.color || elemento.colorBase || '#3B82F6'

  const nuevoElemento = {
    id: `${elemento.tipo || elemento.categoria}_${Date.now()}`,
    tipo: elemento.tipo || elemento.categoria || 'elemento',
    nombre: elemento.nombre || 'Nuevo elemento',

    // Estructura correcta para posición
    posicion: {
      x: finalPosition.x,
      y: finalPosition.y,
      z: 0,
      rotation: 0,
    },

    // Estructura correcta para dimensiones
    dimensiones: {
      ancho: width,
      largo: height,
      alto: elemento.dimensiones?.alto || elemento.alto || 20,
    },

    // Propiedades legacy para compatibilidad con Konva
    x: finalPosition.x,
    y: finalPosition.y,
    width: width,
    height: height,

    color: color,
    colorBase: color,
    forma: elemento.forma || 'rectangular',
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    pesoMaximo: elemento.pesoMaximo || 0,
    descripcion: elemento.descripcion || '',

    hijos: [],
    metadata: {
      pesoMaximo: elemento.pesoMaximo || 'N/A',
      ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
      descripcion: elemento.descripcion || '',
      material: elemento.material || 'Estándar',
      capacidad: elemento.capacidad || 'Variable',
      personalizado: elemento.personalizado || false,
    },
  }

  console.log('✅ Creando elemento desde drop en posición válida:', nuevoElemento)
  canvasStore.agregarElemento(nuevoElemento)

  // Seleccionar el elemento recién creado
  canvasStore.seleccionarElemento(nuevoElemento.id)
}

const createElementFromBuffer = (data, dropEvent) => {
  // Obtener el elemento del buffer para validar sus dimensiones
  const bufferItem = buffer.getBufferItem(data.bufferItemId)
  if (!bufferItem) {
    showToast('Elemento no encontrado en el buffer', 'error')
    return
  }

  const elemento = bufferItem.elemento
  const width = elemento.width || elemento.dimensiones?.ancho || 100
  const height = elemento.height || elemento.dimensiones?.alto || 60

  // 1. Convertir pointer a coords de mundo (considerando zoom/pan)
  const worldCoords = getWorldCoordinatesFromPointer(dropEvent)

  // 2. Calcular posición candidata
  let candX = worldCoords.x - width / 2
  let candY = worldCoords.y - height / 2

  // 3. Aplicar snap a grilla ANTES de validar
  const snapped = snapToGrid(candX, candY, GRID_SIZE)
  candX = snapped.x
  candY = snapped.y

  // 4. Verificar área y conflictos
  const boundary = computeBoundary()

  let isInsideArea = true
  if (boundary.type === 'rect') {
    isInsideArea = candX >= 0 && candY >= 0 &&
                   candX + width <= boundary.W &&
                   candY + height <= boundary.H

    if (!isInsideArea) {
      const clamped = clampRectToRect(candX, candY, width, height, boundary.W, boundary.H)
      candX = clamped.x
      candY = clamped.y
    }
  } else if (boundary.type === 'polygon') {
    isInsideArea = rectInsidePolygon(candX, candY, width, height, boundary.polygon)
  }

  // 5. Crear elemento temporal y detectar conflictos
  const tempElement = {
    id: '__temp_buffer__',
    x: candX,
    y: candY,
    width,
    height,
    ubicacion: elemento.ubicacion || 'suelo',
    tipo: elemento.tipo || 'elemento',
    forma: elemento.forma || 'rectangular'
  }

  const allElements = canvasStore.elementosVisibles
  const conflicts = detectConflictsFor(tempElement, allElements)
  const blockingConflicts = conflicts.filter(c => c.bloqueante)

  // 6. Si hay conflictos o está fuera de área, intentar nudgePlace
  let finalPosition = { x: candX, y: candY }
  let placementSuccessful = blockingConflicts.length === 0 && isInsideArea

  if (!placementSuccessful) {
    console.log('🔍 Elemento del buffer tiene conflictos, intentando nudgePlace...')

    const nudgeResult = nudgePlace(
      candX,
      candY,
      width,
      height,
      boundary,
      allElements,
      tempElement,
      GRID_SIZE,
      16,
      detectConflictsFor // Pasar la función como parámetro
    )

    if (nudgeResult.found) {
      finalPosition = { x: nudgeResult.x, y: nudgeResult.y }
      placementSuccessful = true
      console.log('✅ nudgePlace encontró posición válida para elemento del buffer:', finalPosition)
    } else {
      console.log('❌ nudgePlace no encontró posición válida para elemento del buffer')
    }
  }

  // 7. Si no hay posición válida, rechazar
  if (!placementSuccessful) {
    showToast('No hay espacio aquí para pegar el elemento', 'error')
    return // NO pegar, NO comprometer historial
  }

  // 8. Pegar elemento desde buffer en posición válida
  const newElementId = buffer.pasteFromBuffer(data.bufferItemId, finalPosition)

  if (newElementId) {
    console.log('✅ Elemento pegado desde buffer al canvas en posición válida:', newElementId, finalPosition)
    // Seleccionar el elemento recién pegado
    canvasStore.seleccionarElemento(newElementId)
  }
}

// === FUNCIONES DE RESIZE Y SETUP ===
const updateStageSize = () => {
  if (containerRef.value) {
    const container = containerRef.value
    const newSize = {
      width: container.offsetWidth,
      height: container.offsetHeight,
    }
    stageSize.value = newSize

    // Centrar la planta en el canvas cuando cambia el tamaño
    centrarPlantaEnCanvas()
  }
}

const centrarPlantaEnCanvas = () => {
  const stage = stageRef.value?.getNode()
  if (!stage) return

  const stageWidth = stageSize.value.width
  const stageHeight = stageSize.value.height
  const layerWidth = layerConfig.value.width
  const layerHeight = layerConfig.value.height

  // Calcular posición para centrar la planta
  const centerX = (stageWidth - layerWidth * canvasStore.zoom) / 2
  const centerY = (stageHeight - layerHeight * canvasStore.zoom) / 2

  canvasStore.configurarPan(centerX, centerY)
}

const handleGlobalClick = (e) => {
  // No deseleccionar si es click en formularios o panel de propiedades
  const isFormElement = e.target.matches('input, button, select, textarea, [contenteditable]')
  const isInPropertiesPanel = e.target.closest('[data-properties-panel]')

  if (!containerRef.value?.contains(e.target) && !isFormElement && !isInPropertiesPanel) {
    canvasStore.seleccionarElemento(null)
  }
}

// Event listener para resize
let resizeObserver = null

onMounted(async () => {
  await nextTick()
  updateStageSize()

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateStageSize)
    resizeObserver.observe(containerRef.value)
  }

  // Centrar la planta cuando se monta el componente
  await nextTick()
  centrarPlantaEnCanvas()

  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  window.removeEventListener('click', handleGlobalClick)
  if (typeof window !== 'undefined' && window.__canvasApi) {
    // limpiar referencias globales al desmontar
    if (window.__canvasApi.recomputeBoundsAndIndex === recomputeBoundsAndIndex) {
      delete window.__canvasApi
    }
  }
})

// Método: recomputar bounds, grid y limpiar índices/estados volátiles
const recomputeBoundsAndIndex = async () => {
  try {
    // Limpiar conflictos y estados transitorios
    conflictsApi.clear()
    lastValidPositions.value.clear()
    atEdgeMap.value.clear()
    isElementDragging.value = false
    stageDragEnabled.value = true

    // Recentrar planta en canvas para evitar offsets tras cambios
    await nextTick()
    centrarPlantaEnCanvas()
  } catch {
    // noop
  }
}

// Método: forzar redraw del layer/stage y limpiar caches
const forceRedraw = () => {
  try {
    const layer = layerRef.value?.getNode?.()
    const stage = stageRef.value?.getNode?.()
    if (!layer || !stage) return
    // clear caches si existiera cache en nodos
    try { layer.clearCache?.() } catch (e) { void e }
    try { stage.clearCache?.() } catch (e) { void e }
    layer.batchDraw?.()
    stage.batchDraw?.()
  } catch (e) {
    void e
  }
}

// Método: reset mínimo de estados volátiles
const resetVolatileState = () => {
  try {
    lastValidPositions.value.clear()
    atEdgeMap.value.clear()
    conflictsApi.clear()
    isElementDragging.value = false
    stageDragEnabled.value = true
  } catch {}
}

// Exponer API global para que otros componentes (p.ej. PlantasPanel) sin acceso por ref puedan sincronizar
if (typeof window !== 'undefined') {
  window.__canvasApi = {
    recomputeBoundsAndIndex,
    forceRedraw,
    resetVolatileState,
  }
}

// Watch: cuando cambia el tamaño del layer (planta), recomputar y redibujar
watch(
  () => [layerConfig.value.width, layerConfig.value.height],
  async () => {
    await nextTick()
    await recomputeBoundsAndIndex()
    await nextTick()
    forceRedraw()
  },
)
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.canvas-container.drag-over {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: inset 0 0 0 2px #3b82f6;
}

.canvas-info {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  gap: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.canvas-info span {
  color: #475569;
  font-weight: 500;
}

/* Botones flotantes para undo/redo */
.floating-controls {
  position: absolute;
  top: 20px;
  right: 20px; /* valor por defecto, será sobrescrito por :style */
  display: flex;
  gap: 8px;
  z-index: 10;
}

.floating-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.floating-btn:hover:not(:disabled) {
  background: white;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.floating-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.floating-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.7);
}

.btn-undo:not(:disabled) {
  color: #3b82f6;
}

.btn-undo:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

.btn-redo:not(:disabled) {
  color: #059669;
}

.btn-redo:hover:not(:disabled) {
  background: #ecfdf5;
  border-color: #059669;
}

.floating-btn .icon {
  width: 20px;
  height: 20px;
}
</style>
