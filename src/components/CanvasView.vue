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
            width: layerConfig.width,
            height: layerConfig.height,
            fill: '#ffffff',
            stroke: '#3b82f6',
            strokeWidth: 2,
            opacity: 0.1,
            listening: false,
          }"
        />

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
            v-if="
              elemento.forma === 'rectangular' || elemento.forma === 'cuadrado' || !elemento.forma
            "
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

          <!-- Elementos triangulares -->
          <template v-else-if="elemento.forma === 'triangular'">
            <v-rect
              :config="{
                id: elemento.id + '_interaction',
                x: elemento.x,
                y: elemento.y,
                width: elemento.width,
                height: elemento.height,
                fill: 'transparent',
                stroke: 'transparent',
                opacity: 0,
                draggable: true,
                dragBoundFunc: (pos) => dragBoundForElement(pos, elemento, 'rect'),
              }"
              @click="() => selectElement(elemento.id)"
              @dblclick="() => handleElementDoubleClick(elemento)"
              @dragstart="() => startElementDrag(elemento.id)"
              @dragmove="(e) => updateElementPosition(e, elemento.id, 'triangular')"
              @dragend="() => endElementDrag(elemento.id)"
            />
            <v-line
              :config="{
                id: elemento.id + '_visual',
                points: [
                  elemento.x + elemento.width / 2,
                  elemento.y,
                  elemento.x,
                  elemento.y + elemento.height,
                  elemento.x + elemento.width,
                  elemento.y + elemento.height,
                  elemento.x + elemento.width / 2,
                  elemento.y,
                ],
                fill: elemento.color,
                stroke: getStrokeColor(elemento.id),
                strokeWidth: canvasStore.elementoSeleccionado === elemento.id ? 3 : 1,
                opacity: 0.8,
                draggable: false,
                shadowColor: 'black',
                shadowBlur: 4,
                shadowOpacity: 0.3,
                closed: true,
                listening: false,
              }"
            />
          </template>

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
            points: [i, 0, i, layerConfig.height],
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
            points: [0, i, layerConfig.width, i],
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
    <div class="floating-controls">
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCanvasWithHistory } from '@/composables/useCanvasWithHistory'
import { useCanvasBuffer } from '@/composables/useCanvasBuffer'
import {
  rectInsidePolygon,
  circleInsidePolygon,
  boundedRectDrag,
} from '@/utils/geometry'
import { SNAP_EPS } from '@/utils/constants'

// Definir emits
const emit = defineEmits(['select', 'drill-down'])

// Referencias
const containerRef = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)

// Composable con historial integrado
const { store: canvasStore, actions, undo, redo, canUndo, canRedo } = useCanvasWithHistory()
const buffer = useCanvasBuffer()

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
  const gridSize = 50 // 50px = 25cm en la escala de visualización
  const vertical = []
  const horizontal = []

  // Usar las dimensiones del layer (planta) para el grid
  const layerWidth = layerConfig.value.width
  const layerHeight = layerConfig.value.height

  for (let i = 0; i <= layerWidth; i += gridSize) {
    vertical.push(i)
  }

  for (let i = 0; i <= layerHeight; i += gridSize) {
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
      const clamped = {
        x: Math.max(r, Math.min(layerPos.x, boundary.W - r)),
        y: Math.max(r, Math.min(layerPos.y, boundary.H - r)),
      }
      // Snap a bordes si cerca
      const toLeft = Math.abs(clamped.x - r)
      const toTop = Math.abs(clamped.y - r)
      const toRight = Math.abs(boundary.W - (clamped.x + r))
      const toBottom = Math.abs(boundary.H - (clamped.y + r))
      const atEdge = toLeft <= SNAP_EPS || toTop <= SNAP_EPS || toRight <= SNAP_EPS || toBottom <= SNAP_EPS
      atEdgeMap.value.set(elemento.id, atEdge)
      if (toLeft <= SNAP_EPS) clamped.x = r
      if (toTop <= SNAP_EPS) clamped.y = r
      if (toRight <= SNAP_EPS) clamped.x = boundary.W - r
      if (toBottom <= SNAP_EPS) clamped.y = boundary.H - r
      lastValidPositions.value.set(elemento.id, { x: clamped.x - r, y: clamped.y - r })
      return toStageCoords(clamped)
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

  // Rectangular / triangular usan bbox axis-aligned
  const w = elemento.width
  const h = elemento.height

  if (boundary.type === 'rect') {
    const bounded = boundedRectDrag(layerPos.x, layerPos.y, w, h, boundary, SNAP_EPS)
    atEdgeMap.value.set(elemento.id, !!bounded.atEdge)
    lastValidPositions.value.set(elemento.id, { x: bounded.x, y: bounded.y })
    return toStageCoords({ x: bounded.x, y: bounded.y })
  }

  if (boundary.type === 'polygon') {
    const inside = rectInsidePolygon(layerPos.x, layerPos.y, w, h, boundary.points)
    if (!inside) {
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

  // Feedback visual: bordes cuando está pegado
  const warn = atEdgeMap.value.get(elementId)
  try {
    const strokeColor = warn ? '#f59e0b' : canvasStore.elementoSeleccionado === elementId ? '#000' : '#666'
    target.stroke(strokeColor)
    target.getLayer()?.batchDraw()
  } catch (err) {
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

  const final = lastValidPositions.value.get(elementId) || { x: elemento.x, y: elemento.y }

  // Guardar en historial al finalizar el arrastre
  actions.actualizarPosicion(
    elementId,
    final.x,
    final.y,
    true,
  )

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

const createElementFromDrop = (data, dropEvent) => {
  const stage = stageRef.value.getNode()

  // Obtener posición del mouse en el canvas
  const rect = containerRef.value.getBoundingClientRect()
  const x = (dropEvent.clientX - rect.left - stage.x()) / stage.scaleX()
  const y = (dropEvent.clientY - rect.top - stage.y()) / stage.scaleY()

  const elemento = data.elemento

  // Obtener dimensiones base
  let width = elemento.width || elemento.dimensiones?.ancho || 100
  let height = elemento.height || elemento.dimensiones?.alto || 60

  // Aplicar dimensiones mínimas para mejorar la interacción
  // Especialmente importante para elementos como el estante esquinero
  const MIN_WIDTH = 40 // Mínimo 40px de ancho para interacción
  const MIN_HEIGHT = 30 // Mínimo 30px de alto para interacción

  width = Math.max(width, MIN_WIDTH)
  height = Math.max(height, MIN_HEIGHT)

  const color = elemento.color || elemento.colorBase || '#3B82F6'

  const nuevoElemento = {
    id: `${elemento.tipo || elemento.categoria}_${Date.now()}`,
    tipo: elemento.tipo || elemento.categoria || 'elemento',
    nombre: elemento.nombre || 'Nuevo elemento',

    // Estructura correcta para posición
    posicion: {
      x: x - width / 2,
      y: y - height / 2,
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
    x: x - width / 2,
    y: y - height / 2,
    width: width,
    height: height,

    color: color,
    colorBase: color,
    forma: elemento.forma || 'rectangular',
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    pesoMaximo: elemento.pesoMaximo || 0,
    descripcion: elemento.descripcion || '',

    // No asignar plantaId ni padre aquí - el store se encarga según el contexto
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

  console.log('Creando elemento desde drop:', nuevoElemento)
  canvasStore.agregarElemento(nuevoElemento)

  // Seleccionar el elemento recién creado
  canvasStore.seleccionarElemento(nuevoElemento.id)
}

const createElementFromBuffer = (data, dropEvent) => {
  const stage = stageRef.value.getNode()

  // Obtener posición del mouse en el canvas
  const rect = containerRef.value.getBoundingClientRect()
  const x = (dropEvent.clientX - rect.left - stage.x()) / stage.scaleX()
  const y = (dropEvent.clientY - rect.top - stage.y()) / stage.scaleY()

  // Pegar elemento desde buffer
  const newElementId = buffer.pasteFromBuffer(data.bufferItemId, { x, y })

  if (newElementId) {
    console.log('🔄 Elemento pegado desde buffer al canvas:', newElementId)
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
})
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
  right: 20px;
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
