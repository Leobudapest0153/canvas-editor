<!--
  CanvasView
  Responsabilidades:
  - Renderizar el canvas principal usando vue-konva
  - Manejar eventos de interacción (drag, drop, select, etc.)
  - Renderizar elementos del catálogo en las plantas
  - Gestionar transformaciones y zoom del canvas
  - Coordinar las vistas XY/XZ según el modo seleccionado
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
      @dragstart="handleStageDragStart"
      @dragmove="handleStageDragMove"
      @dragend="handleStageDragEnd"
    >
      <v-layer ref="layerRef">
        <!-- Fondo de la planta - área delimitada -->
        <v-rect
          :config="{
            x: 0,
            y: 0,
            width: floorBoundary.width,
            height: floorBoundary.height,
            fill: 'rgba(14,165,233,0.08)',
            stroke: '#3b82f6',
            strokeWidth: 2,
            opacity: 1,
            listening: false,
          }"
        />
        <v-line
          v-if="!canvasStore.estaEnElemento && !canvasStore.estaEnContenedor"
          :config="{
            points: floorBoundary.points,
            closed: true,
            stroke: '#0ea5e9',
            fill: 'rgba(14,165,233,0.08)',
            strokeWidth: 2,
            listening: false,
          }"
        />
        <!-- Debug: mostrar información según el contexto -->
        <v-text
          :config="{
            x: 10,
            y: 10,
            text:
              canvasStore.estaEnElemento || canvasStore.estaEnContenedor
                ? `${canvasStore.elementoContenedorActual?.nombre || 'Elemento'} - ${layerConfig.width}x${layerConfig.height}px (Adaptativo)`
                : `${canvasStore.plantaActivaData?.nombre || 'Planta'} - ${layerConfig.width}x${layerConfig.height}px (${canvasStore.plantaActivaData?.dimensiones.ancho}x${canvasStore.plantaActivaData?.dimensiones.largo}cm)`,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#3b82f6',
            listening: false,
          }"
        />
        <v-text
          v-if="canvasStore.estaEnPlanta"
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
        <v-text
          v-if="canvasStore.estaEnElemento"
          :config="{
            x: 10,
            y: 30,
            text: `Contenedores: ${elementosVisiblesEnCanvas.length}`,
            fontSize: 11,
            fontFamily: 'Arial',
            fill: '#dc2626',
            listening: false,
          }"
        />
        <v-text
          v-if="canvasStore.estaEnContenedor"
          :config="{
            x: 10,
            y: 30,
            text: `Items: ${elementosVisiblesEnCanvas.length} (elementos + contenedores)`,
            fontSize: 11,
            fontFamily: 'Arial',
            fill: '#dc2626',
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
              opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
              draggable: canDragElement(elemento.id),
              shadowColor: 'black',
              shadowBlur: 4,
              shadowOpacity: 0.3,
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento, 'rect'),
            }"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="() => canDragElement(elemento.id) && startElementDrag(elemento.id)"
            @dragmove="(e) => canDragElement(elemento.id) && updateElementPosition(e, elemento.id)"
            @dragend="() => canDragElement(elemento.id) && endElementDrag(elemento.id)"
            @transformend="(e) => handleTransformEnd(e, elemento.id, 'rectangular')"
            @contextmenu="(e) => onShapeContextMenu(e, elemento)"
            @pointerdown.passive="(e) => onShapePointerDown(e, elemento)"
            @pointerup.passive="onShapePointerUp"
            @pointercancel.passive="onShapePointerUp"
          />
          <!-- Icono de candado para elemento bloqueado -->
          <v-group
            v-if="isElementLocked(elemento.id)"
            :config="{
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              listening: false,
              rotation: elemento.rotation || 0,
              opacity: 0.35,
            }"
          >
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: elemento.width,
                height: elemento.height,
                fill: '#000',
                opacity: 0.12,
                cornerRadius: 8,
                listening: false,
              }"
            />
            <!-- Icono de candado para elemento bloqueado -->
              <v-text
                :config="{
                  x: elemento.width / 2 - 16,
                  y: elemento.height / 2 - 16,
                  text: '🔒',
                  fontSize: 32,
                  fontFamily: 'Arial',
                  fill: '#f59e0b',
                  listening: false,
                }"
              />
          </v-group>

          <!-- Elementos circulares: en vista XY son círculos, en vista XZ son rectángulos -->
          <v-circle
            v-else-if="elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'"
            :config="{
              id: elemento.id,
              x: elemento.x + elemento.width / 2,
              y: elemento.y + elemento.height / 2,
              radius: Math.min(elemento.width, elemento.height) / 2,
              fill: elemento.color,
              stroke: getStrokeColor(elemento.id),
              strokeWidth: canvasStore.elementoSeleccionado === elemento.id ? 3 : 1,
              opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
              draggable: canDragElement(elemento.id),
              shadowColor: 'black',
              shadowBlur: 4,
              shadowOpacity: 0.3,
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento, 'circle'),
            }"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="() => canDragElement(elemento.id) && startElementDrag(elemento.id)"
            @dragmove="(e) => canDragElement(elemento.id) && updateElementPosition(e, elemento.id, 'circular')"
            @dragend="() => canDragElement(elemento.id) && endElementDrag(elemento.id)"
            @transformend="(e) => handleTransformEnd(e, elemento.id, 'circular')"
            @contextmenu="(e) => onShapeContextMenu(e, elemento)"
            @pointerdown.passive="(e) => onShapePointerDown(e, elemento)"
            @pointerup.passive="onShapePointerUp"
            @pointercancel.passive="onShapePointerUp"
          />

          <!-- Elementos circulares en vista XZ se muestran como rectángulos (cilindro visto de frente) -->
          <v-rect
            v-else-if="elemento.forma === 'circular' && canvasStore.vistaActiva === 'XZ'"
            :config="{
              id: elemento.id,
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              fill: elemento.color,
              stroke: getStrokeColor(elemento.id),
              strokeWidth: canvasStore.elementoSeleccionado === elemento.id ? 3 : 1,
              opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
              draggable: canDragElement(elemento.id),
              shadowColor: 'black',
              shadowBlur: 4,
              shadowOpacity: 0.3,
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento, 'rect'),
            }"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="() => canDragElement(elemento.id) && startElementDrag(elemento.id)"
            @dragmove="(e) => canDragElement(elemento.id) && updateElementPosition(e, elemento.id)"
            @dragend="() => canDragElement(elemento.id) && endElementDrag(elemento.id)"
            @transformend="(e) => handleTransformEnd(e, elemento.id, 'rectangular')"
            @contextmenu="(e) => onShapeContextMenu(e, elemento)"
            @pointerdown.passive="(e) => onShapePointerDown(e, elemento)"
            @pointerup.passive="onShapePointerUp"
            @pointercancel.passive="onShapePointerUp"
          />
          <!-- Icono de candado para elemento circular bloqueado en vista XY -->
          <v-group
            v-if="isElementLocked(elemento.id) && elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'"
            :config="{
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              listening: false,
              rotation: elemento.rotation || 0,
              opacity: 0.35,
            }"
          >
            <v-circle
              :config="{
                x: elemento.width / 2,
                y: elemento.height / 2,
                radius: Math.min(elemento.width, elemento.height) / 2,
                fill: '#000',
                opacity: 0.12,
                listening: false,
              }"
            />
            <!-- Icono de candado para elemento circular bloqueado -->
            <v-text
              :config="{
                x: elemento.width / 2 - 16,
                y: elemento.height / 2 - 16,
                text: '🔒',
                fontSize: 32,
                fontFamily: 'Arial',
                fill: '#f59e0b',
                listening: false,
              }"
            />
          </v-group>

          <!-- Icono de candado para elemento circular bloqueado en vista XZ (rectangular) -->
          <v-group
            v-if="isElementLocked(elemento.id) && elemento.forma === 'circular' && canvasStore.vistaActiva === 'XZ'"
            :config="{
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              listening: false,
              rotation: elemento.rotation || 0,
              opacity: 0.35,
            }"
          >
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: elemento.width,
                height: elemento.height,
                fill: '#000',
                opacity: 0.12,
                cornerRadius: 8,
                listening: false,
              }"
            />
            <v-text
              :config="{
                x: elemento.width / 2 - 16,
                y: elemento.height / 2 - 16,
                text: '🔒',
                fontSize: 32,
                fontFamily: 'Arial',
                fill: '#f59e0b',
                listening: false,
              }"
            />
          </v-group>

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

        <!-- Los contenedores se renderizan junto con los elementos en la sección principal -->

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
        <!-- Transformer para modo edición -->
        <v-transformer
          v-if="isEditingSelected && canvasStore.elementoSeleccionado && !selectedElementLocked"
          ref="transformerRef"
          :flipEnabled="false"
          :config="{
            rotateEnabled: true,
            ignoreStroke: true,
            anchorStroke: '#6366f1',
            anchorFill: '#ffffff',
            anchorCornerRadius: 2,
            anchorSize: 8,
            borderStroke: '#6366f1'
          }"
        />
      </v-layer>
    </v-stage>

    <rulers-overlay
      :width="stageSize.width"
      :height="stageSize.height"
      :scale="canvasStore.zoom"
      :stage-x="canvasStore.panX"
      :stage-y="canvasStore.panY"
      :pixels-per-unit="10 * 100"
      unit="m"
    />

    <!-- Menú contextual -->
    <SpeedDialContext
      v-if="ctxVisible"
      :visible="ctxVisible"
      :x="ctxX"
      :y="ctxY"
      :isLocked="ctxIsLocked"
      @lockToggle="() => toggleLock(ctxElementId)"
      @delete="() => onDelete(ctxElementId)"
      @close="ctx.close()"
    />

    <!-- Información de zoom, vista y dimensiones -->
    <div class="canvas-info">
      <span>Zoom: {{ Math.round(canvasStore.zoom * 100) }}%</span>
      <span>Vista: {{ canvasStore.vistaActiva }}</span>
      <span v-if="canvasStore.estaEnPlanta && canvasStore.plantaActivaData">
        Planta: {{ canvasStore.plantaActivaData.dimensiones.ancho }}×{{
          canvasStore.plantaActivaData.dimensiones.largo
        }}cm (Vista desde arriba)
      </span>
      <span
        v-if="
          (canvasStore.estaEnElemento || canvasStore.estaEnContenedor) &&
          canvasStore.elementoContenedorActual
        "
      >
        {{ canvasStore.estaEnElemento ? 'Elemento' : 'Contenedor' }}:
        {{ canvasStore.elementoContenedorActual.nombre }}
        <template v-if="canvasStore.vistaActiva === 'XZ' && canvasStore.elementoContenedorActual.dimensiones">
          ({{ canvasStore.elementoContenedorActual.dimensiones.ancho }}×{{ canvasStore.elementoContenedorActual.dimensiones.alto }}cm - Vista de frente)
        </template>
        <template v-else>
          ({{ canvasStore.canvasAdaptativo.width }}×{{ canvasStore.canvasAdaptativo.height }}px)
        </template>
      </span>
      <span v-if="canvasStore.elementoSeleccionado">
        Seleccionado: {{ canvasStore.elementoSeleccionado }}
      </span>
    </div>

    <!-- Botones flotantes de Undo/Redo y Bloqueo -->
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

      <!-- Botón ajustar a planta activa -->
      <button
        @click="fitToPlanta"
        @mouseenter="speedDialOpen = false"
        :disabled="!canvasStore.plantaActivaData"
        class="floating-btn btn-fit"
        title="Ajustar vista a la planta activa"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35" />
          <circle cx="11" cy="11" r="6" stroke-width="2" />
        </svg>
      </button>

  <!-- Nuevo SpeedDial -->
  <div class="relative">
        <div class="relative">
          <button @click="toggleSpeedDial" class="floating-btn btn-gear focus:outline-none" :class="{ 'ring-2 ring-blue-500': speedDialOpen }" title="Acciones del elemento">
            <!-- Icono de acciones (tres puntos verticales) -->
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
            <!-- Acciones -->
          <transition-group name="fade-scale">
            <!-- Acción Modo Arrastre (siempre visible cuando el speedDial está abierto) -->
            <button
              v-if="speedDialOpen"
              key="hand"
              @click="toggleDragMode"
              class="speed-action"
              :style="{ top: canvasStore.elementoSeleccionado ? '116px' : '60px' }"
              :class="isDragModeActive ? 'bg-emerald-600': 'bg-white'"
              :title="isDragModeActive ? 'Desactivar modo edición' : 'Activar modo edición'"
            >
              <svg class="w-5 h-5" :class="isDragModeActive ? 'text-white' : 'text-emerald-600'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 11V6a1 1 0 012 0v5m2-3V6a1 1 0 112 0v5m2-2V9a1 1 0 112 0v4.5c0 3.59-2.91 6.5-6.5 6.5h-.55A6.95 6.95 0 019 19" /></svg>
            </button>
            <!-- Acción Bloquear / Desbloquear solo si hay elemento seleccionado -->
            <button
              v-if="speedDialOpen && canvasStore.elementoSeleccionado"
              key="lock"
              @mousedown.stop.prevent
              @click.stop="() => toggleLockAndPreserveDrag(canvasStore.elementoSeleccionado)"
              class="speed-action group"
              :class="selectedElementLocked ? 'bg-amber-500': 'bg-blue-500'"
              style="top:60px;"
              :title="selectedElementLocked ? 'Desbloquear' : 'Bloquear'"
            >
              <span class="sr-only">Bloquear</span>
              <svg v-if="selectedElementLocked" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 11V7a5 5 0 0110 0v4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><rect x="5" y="11" width="14" height="8" rx="2" stroke-width="2" class="fill-amber-400/40 stroke-white" /><circle cx="12" cy="15" r="2" fill="currentColor" /></svg>
              <svg v-else class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 11V7a5 5 0 0110 0v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><rect x="5" y="11" width="14" height="8" rx="2" stroke-width="2" class="fill-blue-400/20 stroke-white" /><circle cx="12" cy="15" r="2" fill="currentColor" /></svg>
            </button>
          </transition-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { setupRafDrag } from '@/composables/useRafDrag'
import { enablePerfMode } from '@/composables/usePerfMode'
import { clampToAreaFast, computeSnapFast, throttleEveryNFrames } from '@/utils/dragMath'
import { useCanvasWithHistory } from '@/composables/useCanvasWithHistory'
import { useCanvasBuffer } from '@/composables/useCanvasBuffer'
import { useConflicts } from '@/composables/useConflicts'
import RulersOverlay from './RulersOverlay.vue'
import {
  detectConflictsFor,
  throttle,
  computeMTD,
  projectMTDAgainstBoundary,
} from '@/utils/collision'
import {
  rectInsidePolygon,
  circleInsidePolygon,
  clampRectToRect,
  snapToGrid,
  safeSnapRect,
  nudgePlace,
} from '@/utils/geometry'
import { SNAP_EPS, GRID_SIZE, CM_TO_PX } from '@/utils/constants'
import SpeedDialContext from '@/components/SpeedDialContext.vue'
import { useContextMenu } from '@/composables/useContextMenu'
import { useDeleteElement } from '@/composables/useDeleteElement'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

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

// Composable con historial integrado
const { store: canvasStore, undo, redo, canUndo, canRedo } = useCanvasWithHistory()
const buffer = useCanvasBuffer()
const ctx = useContextMenu()
const { visible: ctxVisible, x: ctxX, y: ctxY, isLocked: ctxIsLocked, elementId: ctxElementId } = ctx
const { deleteSelected } = useDeleteElement()
const confirmDialog = useConfirmDialog()

// === HELPERS DE CONVERSIÓN ===
/**
 * Obtiene las dimensiones de un elemento en píxeles, convirtiendo desde cm si es necesario
 * @param {Object} elemento - El elemento del cual obtener dimensiones
 * @returns {Object} - { width: number, height: number } en píxeles
 */
const getElementPixelDimensions = (elemento) => {
  // Si ya tiene width/height en píxeles, usarlos
  if (elemento.width && elemento.height) {
    return { width: elemento.width, height: elemento.height }
  }

  // Si solo tiene dimensiones en cm, convertir según la vista
  if (elemento.dimensiones) {
    let widthCm, heightCm

    if (canvasStore.vistaActiva === 'XY') {
      // Vista superior (XY): width = ancho, height = largo
      widthCm = elemento.dimensiones.ancho || 100
      heightCm = elemento.dimensiones.largo || 60
    } else if (canvasStore.vistaActiva === 'XZ') {
      // Vista frontal (XZ): width = ancho, height = alto
      widthCm = elemento.dimensiones.ancho || 100
      heightCm = elemento.dimensiones.alto || 20
    } else {
      // Fallback a vista XY
      widthCm = elemento.dimensiones.ancho || 100
      heightCm = elemento.dimensiones.largo || 60
    }

    return {
      width: widthCm * CM_TO_PX,
      height: heightCm * CM_TO_PX,
    }
  }

  // Fallback a valores por defecto
  return { width: 100, height: 60 }
}
const conflictsApi = useConflicts()

// === BLOQUEO DE ELEMENTOS ===
const isElementLocked = (elementId) => {
  const el = canvasStore.elementosVisibles.find((e) => e.id === elementId)
  return el?.bloqueado === true
}

const toggleLockElement = (elementId) => {
  const el = canvasStore.elementosVisibles.find((e) => e.id === elementId)
  if (!el) return
  canvasStore.actualizarElemento(elementId, { bloqueado: !el.bloqueado })
}

// Conflictos en vivo durante el arrastre
// const liveConflicts = conflictsApi.conflicts
const setLiveConflictsThrottled = throttle((movingEl) => {
  try {
    const list = detectConflictsFor(movingEl, canvasStore.elementosVisibles)
    conflictsApi.setConflicts(list, movingEl.id)
  } catch { /* ignore */ }
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
const stageConfig = computed(() => {
  // Si hay elemento seleccionado y está bloqueado, nunca permitir arrastre del canvas
  const seleccionado = canvasStore.elementoSeleccionado
  const bloqueado = seleccionado && isElementLocked(seleccionado)
  return {
    width: stageSize.value.width,
    height: stageSize.value.height,
    scaleX: canvasStore.zoom,
    scaleY: canvasStore.zoom,
    x: canvasStore.panX,
    y: canvasStore.panY,
    draggable: !bloqueado && stageDragEnabled.value,
  }
})

const floorBoundary = computed(() => {
  // Empezamos con las dimensiones base del layer
  let width = layerConfig.value.width
  let height = layerConfig.value.height
  let points = []

  if (canvasStore.estaEnElemento || canvasStore.estaEnContenedor) {
    return { width, height, points }
  }

  const poligono = canvasStore.plantaActivaData?.poligono

  // Si hay un polígono, lo usamos para expandir los límites y obtener los puntos
  if (poligono && Array.isArray(poligono) && poligono.length > 0) {
    poligono.forEach((coord) => {
      width = Math.max(coord.x, width)
      height = Math.max(coord.y, height)
    })
    points = poligono.flatMap((p) => [p.x, p.y])
  }

  return { width, height, points }
})

// Configuración del layer - SIEMPRE USA CANVAS ADAPTATIVO
const layerConfig = computed(() => {
  // Usar siempre canvasAdaptativo como fuente única de verdad
  return {
    width: canvasStore.canvasAdaptativo.width,
    height: canvasStore.canvasAdaptativo.height,
  }
})

// Elementos visibles en el canvas (excluye elementos ocultos)
const elementosVisiblesEnCanvas = computed(() => {
  return canvasStore.elementosVisibles.filter((elemento) => elemento.visible !== false)
})

// Grid de referencia - BASADO EN LAS DIMENSIONES DEL LAYER
const gridLines = computed(() => {
  const gridSizePx = canvasStore.gridSize || 50
  const vertical = []
  const horizontal = []

  // Usar las dimensiones del layer (planta) para el grid
  const layerWidth = floorBoundary.value.width
  const layerHeight = floorBoundary.value.height

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

  // Si estamos en un elemento o contenedor, usar todo el canvas adaptativo como boundary
  if (canvasStore.estaEnElemento || canvasStore.estaEnContenedor) {
    return { type: 'rect', W, H }
  }

  // Si estamos en una planta, verificar si tiene polígono
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
  try { canvasStore.view.hasUserZoomPan = true } catch { /* ignore */ }
}

// === FUNCIONES DE CANVAS/STAGE ===
const handleStageMouseDown = (e) => {
  // Si el click es en el stage (no en un elemento), habilitar arrastre del canvas
  // Solo si NO hay elemento seleccionado bloqueado
  const seleccionado = canvasStore.elementoSeleccionado
  if (e.target === e.target.getStage()) {
    if (seleccionado && isElementLocked(seleccionado)) {
      stageDragEnabled.value = false
      return
    }
    stageDragEnabled.value = true
  }
}

const handleStageClick = (e) => {
  // Deseleccionar elemento si click en área vacía
  if (e.target === e.target.getStage()) {
  canvasStore.seleccionarElemento(null)
  // Cerrar controles y edición cuando se hace click en el stage vacío
  speedDialOpen.value = false
  editingElementId.value = null
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

  // Si el modo arrastre global está activado y el elemento NO está bloqueado, activar edición (transformer)
  if (dragModeGlobal.value && elementId && !isElementLocked(elementId)) {
    editingElementId.value = elementId
    nextTick(setupTransformer)
  } else {
    editingElementId.value = null
  }
}

const handleElementDoubleClick = (elemento) => {
  console.log('Double-click en elemento:', elemento.nombre)

  // Verificar si el elemento puede tener hijos (contenedor)
  const tiposContenedor = ['elementos', 'contenedores']

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
      // Orden: clamp → colisiones → clamp ��� validar (sin snap en drag)
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

// RAF + Perf mode state per element
const rafControllers = new Map()
const perfContexts = new Map()
const throttle2 = throttleEveryNFrames(2)

const startElementDrag = (elementId) => {
  if (isElementLocked(elementId)) {
    // Si está bloqueado, no iniciar drag ni mover el layer
    isElementDragging.value = false
    stageDragEnabled.value = false
    return
  }
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

  // Habilitar modo performance en layer y arrancar rAF loop
  try {
    const stage = stageRef.value.getNode()
    const layer = layerRef.value.getNode()
    const shape = stage.findOne(`#${elementId}`)
    if (layer && shape) {
      const ctx = enablePerfMode(layer, { shape })
      perfContexts.set(elementId, ctx)

      const getMovingShapeBBox = () => {
        if (!shape) return null
        if (shape.className === 'Circle') {
          const r =
            shape.radius && shape.radius()
              ? shape.radius()
              : Math.min(shape.width?.() || 0, shape.height?.() || 0) / 2
          return { x: shape.x() - r, y: shape.y() - r, width: r * 2, height: r * 2 }
        }
        return {
          x: shape.x(),
          y: shape.y(),
          width: shape.width?.() || 0,
          height: shape.height?.() || 0,
        }
      }

      const onValidateLight = throttle2((bbox) => {
        const area = { type: 'rect', W: layerConfig.value.width, H: layerConfig.value.height }
        const outside =
          bbox.x < 0 || bbox.y < 0 || bbox.x + bbox.width > area.W || bbox.y + bbox.height > area.H
        const moving = {
          id: elementId,
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        }
        const conflicts = detectConflictsFor(moving, canvasStore.elementosVisibles).filter(
          (c) => c.bloqueante,
        )
        const warn = outside || conflicts.length > 0
        try {
          shape.stroke(
            warn ? '#ef4444' : canvasStore.elementoSeleccionado === elementId ? '#000' : '#666',
          )
        } catch {
          console.warn('Error al actualizar el color del borde del shape:', elementId)
        }
      })

      const onCommitEnd = () => {}

      const ctrl = setupRafDrag({ stage, layer, getMovingShapeBBox, onValidateLight, onCommitEnd })
      rafControllers.set(elementId, { ctrl, shape, layer })
      ctrl.start()
    }
  } catch {
    console.warn('Error al iniciar el arrastre del elemento:', elementId)
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

  // Feedback visual: bordes cuando está pegado o hay conflicto
  // const warn = atEdgeMap.value.get(elementId)

  // Detectar conflictos en tiempo real (no bloquea)
  const moving = { ...elemento, x, y }
  setLiveConflictsThrottled(moving)
  // const hasAnyConflict = liveConflicts.value.length > 0

  // Dejar feedback visual y draw al rAF loop; NO escribir en store
  const rec = rafControllers.get(elementId)
  if (rec && rec.ctrl) rec.ctrl.move({ x, y })
}

const endElementDrag = (elementId) => {
  // console.log('Finalizando arrastre del elemento:', elementId)
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

  // Detener rAF y restaurar modo performance
  const rec = rafControllers.get(elementId)
  if (rec && rec.ctrl) {
    try {
      rec.ctrl.end({ x: final.x, y: final.y, width: elemento.width, height: elemento.height })
    } catch {
      console.warn('Error al finalizar el arrastre del elemento:', elementId)
    }
  }
  rafControllers.delete(elementId)
  const perf = perfContexts.get(elementId)
  try {
    if (perf && perf.restore) perf.restore()
  } catch {
    console.warn('Error al restaurar el contexto de rendimiento del elemento:', elementId)
  }
  perfContexts.delete(elementId)

  // Snap/clamp final rápido y commit único + snapshot
  const area = { type: 'rect', W: layerConfig.value.width, H: layerConfig.value.height }
  const snapped = computeSnapFast(final.x, final.y, canvasStore.gridSize || 50)
  const clamped = clampToAreaFast(snapped.x, snapped.y, elemento.width, elemento.height, area)

  // Actualizar posición final y guardar historial una sola vez
  canvasStore.actualizarPosicionConHistorial(
    elementId,
    clamped.x,
    clamped.y,
    `Elemento movido: ${elemento.nombre || elemento.tipo || elementId}`,
  )

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
    y: dropEvent.clientY - rect.top,
  }

  // Convertir a coordenadas de mundo (layer) considerando transformación del stage
  const worldX = (pointerPos.x - stage.x()) / stage.scaleX()
  const worldY = (pointerPos.y - stage.y()) / stage.scaleY()

  return { x: worldX, y: worldY }
}

const createElementFromDrop = (data, dropEvent) => {
  const elemento = data.elemento

  // ===== VALIDACIÓN DE JERARQUÍA =====
  const contextoActual = canvasStore.contextoActual.tipo
  const tipoElemento = elemento.tipo

  // Verificar si el tipo puede ser creado en el contexto actual
  if (contextoActual === 'plantas' && tipoElemento !== 'elementos') {
    showToast('En plantas solo se pueden agregar elementos', 'error')
    return
  }

  if (contextoActual === 'elementos' && tipoElemento !== 'contenedores') {
    showToast('En elementos solo se pueden agregar contenedores', 'error')
    return
  }

  if (
    contextoActual === 'contenedores' &&
    tipoElemento !== 'elementos' &&
    tipoElemento !== 'contenedores'
  ) {
    showToast('En contenedores solo se pueden agregar elementos u otros contenedores', 'error')
    return
  }

  // ===== CONTINUAR CON LA LÓGICA EXISTENTE =====

  // Obtener dimensiones en píxeles (convertir desde cm si es necesario)
  const { width, height } = getElementPixelDimensions(elemento)

  // Obtener dimensiones originales en cm para guardar (preservar todas las dimensiones)
  const anchoCm = elemento.dimensiones?.ancho || 100
  const largoCm = elemento.dimensiones?.largo || 60
  const altoCm = elemento.dimensiones?.alto || 20

  // Aplicar dimensiones mínimas para mejorar la interacción
  const MIN_WIDTH = 40
  const MIN_HEIGHT = 30
  const finalWidth = Math.max(width, MIN_WIDTH)
  const finalHeight = Math.max(height, MIN_HEIGHT)

  // 1. Convertir pointer a coords de mundo (considerando zoom/pan)
  const worldCoords = getWorldCoordinatesFromPointer(dropEvent)

  // 2. Calcular posición candidata centrada en el puntero
  let candX = worldCoords.x - finalWidth / 2
  let candY = worldCoords.y - finalHeight / 2

  // 3. Aplicar snap a grilla ANTES de validar
  const snapped = snapToGrid(candX, candY, GRID_SIZE)
  candX = snapped.x
  candY = snapped.y

  // 4. Calcular bbox candidato y verificar área
  const boundary = computeBoundary()

  // 5. Verificar que esté dentro del área (clampToArea)
  let isInsideArea = true
  if (boundary.type === 'rect') {
    isInsideArea =
      candX >= 0 &&
      candY >= 0 &&
      candX + finalWidth <= boundary.W &&
      candY + finalHeight <= boundary.H

    // Si está fuera, intentar clamp
    if (!isInsideArea) {
      const clamped = clampRectToRect(candX, candY, finalWidth, finalHeight, boundary.W, boundary.H)
      candX = clamped.x
      candY = clamped.y
    }
  } else if (boundary.type === 'polygon') {
    isInsideArea = rectInsidePolygon(candX, candY, finalWidth, finalHeight, boundary.points)
  }

  // 6. Crear elemento temporal para detectar conflictos
  const tempElement = {
    id: '__temp_drop__',
    x: candX,
    y: candY,
    width: finalWidth,
    height: finalHeight,
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    tipo: elemento.tipo || elemento.categoria || 'elemento',
    forma: elemento.forma || 'rectangular',
  }

  // 7. Ejecutar detectConflictsFor contra elementos existentes
  const allElements = canvasStore.elementosVisibles
  const conflicts = detectConflictsFor(tempElement, allElements)
  const blockingConflicts = conflicts.filter((c) => c.bloqueante)

  // 8. Si hay conflicto BLOQUEANTE o queda fuera de área, intentar nudgePlace
  let finalPosition = { x: candX, y: candY }
  let placementSuccessful = blockingConflicts.length === 0 && isInsideArea

  if (!placementSuccessful) {
    console.log(
      '🔍 Posición inicial tiene conflictos o está fuera de área, intentando nudgePlace...',
    )

    const nudgeResult = nudgePlace(
      candX,
      candY,
      finalWidth,
      finalHeight,
      boundary,
      allElements,
      tempElement,
      GRID_SIZE,
      16, // máximo 16 intentos
      detectConflictsFor, // Pasar la función como parámetro
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
    id: `${elemento.tipo || elemento.categoria || 'elemento'}_${Date.now()}`,
    tipo: elemento.tipo || (elemento.categoria === 'contenedores' ? 'contenedores' : 'elementos'), // Asegurar que siempre tenga tipo
    categoria: elemento.categoria, // Mantener también la categoría
    nombre: elemento.nombre || 'Nuevo elemento',

    // Estructura correcta para posición
    posicion: {
      x: finalPosition.x,
      y: finalPosition.y,
      z: 0,
      rotation: 0,
    },

    // Estructura correcta para dimensiones (preservar todas las dimensiones independientemente de la vista)
    dimensiones: {
      ancho: anchoCm,
      largo: largoCm,
      alto: altoCm,
    },

    // Propiedades legacy para compatibilidad con Konva (en px para renderizado)
    x: finalPosition.x,
    y: finalPosition.y,
    width: finalWidth,
    height: finalHeight,

    color: color,
    colorBase: color,
    forma: elemento.forma || 'rectangular',
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    alturaRespectoAlSuelo: elemento.alturaRespectoAlSuelo || 0,
    pesoMaximo: elemento.pesoMaximo || 0,
    descripcion: elemento.descripcion || '',

    // Copiar contenedores del elemento original si los tiene
    contenedores: elemento.contenedores ? [...elemento.contenedores] : [],

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

  // Obtener dimensiones en píxeles (convertir desde cm si es necesario)
  const { width, height } = getElementPixelDimensions(elemento)

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
    isInsideArea =
      candX >= 0 && candY >= 0 && candX + width <= boundary.W && candY + height <= boundary.H

    if (!isInsideArea) {
      const clamped = clampRectToRect(candX, candY, width, height, boundary.W, boundary.H)
      candX = clamped.x
      candY = clamped.y
    }
  } else if (boundary.type === 'polygon') {
    isInsideArea = rectInsidePolygon(candX, candY, width, height, boundary.points)
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
    forma: elemento.forma || 'rectangular',
  }

  const allElements = canvasStore.elementosVisibles
  const conflicts = detectConflictsFor(tempElement, allElements)
  const blockingConflicts = conflicts.filter((c) => c.bloqueante)

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
      detectConflictsFor, // Pasar la función como parámetro
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
    console.log(
      '✅ Elemento pegado desde buffer al canvas en posición válida:',
      newElementId,
      finalPosition,
    )
    // Seleccionar el elemento recién pegado
    canvasStore.seleccionarElemento(newElementId)
  }
}

// === NUEVO: Estado SpeedDial & modos ===
const speedDialOpen = ref(false)
// Modo arrastre global: si true, permite arrastrar cualquier elemento (salvo si está bloqueado)
// Por defecto activado (true) para que el modo edición esté disponible al iniciar
const dragModeGlobal = ref(true)
// Id del elemento actualmente en modo edición (transformer). Se activa al seleccionar un elemento cuando dragModeGlobal está ON
const editingElementId = ref(null)
const transformerRef = ref(null)

const toggleSpeedDial = () => { speedDialOpen.value = !speedDialOpen.value }

const isDragModeActive = computed(() => dragModeGlobal.value)
const isEditingSelected = computed(() => editingElementId.value === canvasStore.elementoSeleccionado)
const selectedElementLocked = computed(() => {
  const id = canvasStore.elementoSeleccionado
  return id ? isElementLocked(id) : false
})

// Limpiar modos si se bloquea el elemento
watch(selectedElementLocked, (locked) => {
  if (locked) {
    // Si el elemento seleccionado se bloquea, cerrar el transformer para ese elemento
    // pero no desactivar el modo arrastre global (debe permanecer visible/activo)
    if (editingElementId.value === canvasStore.elementoSeleccionado) {
      editingElementId.value = null
    }
  }
})

// Al hacer lock/unlock desde el UI, mantener el estado de modo global y solo cerrar
// la edición si el elemento queda bloqueado.
const toggleLockAndPreserveDrag = async (elementId) => {
  if (!elementId) return
  toggleLockElement(elementId)
  await nextTick()
  if (isElementLocked(elementId)) {
    if (editingElementId.value === elementId) editingElementId.value = null
  }
}
const toggleDragMode = () => {
  // Alterna el modo arrastre global. Cuando se activa y hay un elemento seleccionado y no bloqueado,
  // se activa también la edición (transformer) para permitir cambiar dimensiones.
  dragModeGlobal.value = !dragModeGlobal.value
  if (!dragModeGlobal.value) {
    editingElementId.value = null
  } else {
    const sel = canvasStore.elementoSeleccionado
    if (sel && !isElementLocked(sel)) {
      editingElementId.value = sel
      nextTick(setupTransformer)
    }
  }
}

const canDragElement = (id) => {
  // Solo permitir drag si el modo global está activo y el elemento no está bloqueado
  if (isElementLocked(id)) return false
  return dragModeGlobal.value
}

const setupTransformer = () => {
  if (!isEditingSelected.value || selectedElementLocked.value) return
  const trComp = transformerRef.value?.getNode?.()
  const stage = stageRef.value?.getNode?.()
  if (!trComp || !stage) return
  const node = stage.findOne(`#${canvasStore.elementoSeleccionado}`)
  if (node) {
    trComp.nodes([node])
    // Si es círculo, mantener aspecto 1:1
    const elemento = canvasStore.elementosVisibles.find(e => e.id === canvasStore.elementoSeleccionado)
    if (elemento?.forma === 'circular') {
      trComp.boundBoxFunc((oldBox, newBox) => {
        const size = Math.max(newBox.width, newBox.height)
        return { ...newBox, width: size, height: size }
      })
    } else {
      trComp.boundBoxFunc(null)
    }
    trComp.getLayer()?.batchDraw?.()
  }
}

// Manejar fin de transformaciones (resize/rotate)
const handleTransformEnd = (e, elementId, forma) => {
  const node = e.target
  let x = node.x()
  let y = node.y()
  let width
  let height
  let rotation = node.rotation?.() || 0
  if (forma === 'circular') {
    // Para círculos usamos radius y mantenemos proporción
    const r = node.radius() * node.scaleX() // asumiendo escala uniforme
    width = r * 2
    height = r * 2
    node.scaleX(1); node.scaleY(1)
    // En render el círculo se posiciona usando centro, pero en store usamos top-left
    x = node.x() - r
    y = node.y() - r
  } else {
    width = node.width() * node.scaleX()
    height = node.height() * node.scaleY()
    node.scaleX(1); node.scaleY(1)
  }
  // Clamp mínimo para evitar tamaños cero
  width = Math.max(8, width)
  height = Math.max(8, height)

  // Actualizar dimensiones físicas si existen
  const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
  let dimensiones = elemento?.dimensiones
  let newDimensiones = dimensiones ? { ...dimensiones } : undefined

  if (newDimensiones) {
    // Actualizar las dimensiones correctas según la vista
    const widthCm = Math.round(width / CM_TO_PX)
    const heightCm = Math.round(height / CM_TO_PX)

    if (canvasStore.vistaActiva === 'XY') {
      // Vista superior (XY): width = ancho, height = largo
      newDimensiones.ancho = widthCm
      newDimensiones.largo = heightCm
      // Mantener alto sin cambios
    } else if (canvasStore.vistaActiva === 'XZ') {
      // Vista frontal (XZ): width = ancho, height = alto
      newDimensiones.ancho = widthCm
      newDimensiones.alto = heightCm
      // Mantener largo sin cambios
    }
  }

  canvasStore.actualizarElemento(elementId, { x, y, width, height, rotation, dimensiones: newDimensiones })
  lastValidPositions.value.set(elementId, { x, y })
  nextTick(() => setupTransformer())
}

// Ajustar startElementDrag para nuevo modo (ya no se necesita wrapper)
// (Se elimina originalStartElementDrag no usado)


// === UTILIDADES DE TAMAÑO Y CENTRADO (restauradas) ===
const updateStageSize = () => {
  if (!containerRef.value) return
  const container = containerRef.value
  stageSize.value = { width: container.offsetWidth, height: container.offsetHeight }
  centrarPlantaEnCanvas()
}
function centrarPlantaEnCanvas() {
  try {
    const stage = stageRef.value?.getNode?.()
    if (!stage) return
    const stageWidth = stageSize.value.width
    const stageHeight = stageSize.value.height
    const layerWidth = layerConfig.value.width
    const layerHeight = layerConfig.value.height
    const centerX = (stageWidth - layerWidth * canvasStore.zoom) / 2
    const centerY = (stageHeight - layerHeight * canvasStore.zoom) / 2
    canvasStore.configurarPan(centerX, centerY)
  } catch { /* ignore */ }
}
const handleGlobalClick = (e) => {
  const isFormElement = e.target.matches('input, button, select, textarea, [contenteditable]')
  const isInPropertiesPanel = e.target.closest('[data-properties-panel]')
  if (!containerRef.value?.contains(e.target) && !isFormElement && !isInPropertiesPanel) {
  canvasStore.seleccionarElemento(null)
  speedDialOpen.value = false
  editingElementId.value = null
  }
}

// Deseleccionar al presionar Escape
const handleKeyDown = (e) => {
  if (!e) return
  if (e.key === 'Escape' || e.key === 'Esc') {
    canvasStore.seleccionarElemento(null)
    // Asegurar que el transformer/edición se cierre
  editingElementId.value = null
  speedDialOpen.value = false
  }
}
let resizeObserver = null
onMounted(async () => {
  await nextTick()
  updateStageSize()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateStageSize)
    resizeObserver.observe(containerRef.value)
  }
  await nextTick()
  centrarPlantaEnCanvas()
  window.addEventListener('click', handleGlobalClick)
  window.addEventListener('keydown', handleKeyDown)
})
onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('keydown', handleKeyDown)
})

// Eliminar referencia originalStartElementDrag no usada

function recomputeBoundsAndIndex() {
  try {
    conflictsApi.clear()
    lastValidPositions.value.clear()
    atEdgeMap.value.clear()
    isElementDragging.value = false
    stageDragEnabled.value = true
    nextTick(() => centrarPlantaEnCanvas())
  } catch { /* ignore */ }
}
function forceRedraw() {
  try {
    const layer = layerRef.value?.getNode?.()
    const stage = stageRef.value?.getNode?.()
    if (!layer || !stage) return
    try { layer.clearCache?.() } catch { /* ignore */ }
    try { stage.clearCache?.() } catch { /* ignore */ }
    layer.batchDraw?.()
    stage.batchDraw?.()
  } catch { /* ignore */ }
}
function resetVolatileState() {
  try {
    lastValidPositions.value.clear()
    atEdgeMap.value.clear()
    conflictsApi.clear()
    isElementDragging.value = false
    stageDragEnabled.value = true
  } catch (e) { console.error('Error reseteando estado volátil:', e) }
}
if (typeof window !== 'undefined') {
  window.__canvasApi = { recomputeBoundsAndIndex, forceRedraw, resetVolatileState }
}
watch(
  () => [layerConfig.value.width, layerConfig.value.height],
  async () => {
    await nextTick()
    recomputeBoundsAndIndex()
    await nextTick()
    forceRedraw()
  },
)

// Ajustar la vista para encuadrar la planta activa (usa polígono si existe o dimensiones en cm)
const fitToPlanta = () => {
  try {
    const stage = stageRef.value?.getNode?.()
    if (!stage) return

    const margin = 40 // píxeles de margen visual
    const planta = canvasStore.plantaActivaData
    let bbox = null

    // Si estamos dentro de un elemento o contenedor (navegando dentro), ajustar al canvas adaptativo
    // En este modo las coordenadas locales del elemento empiezan en 0,0 — usar layerConfig para el tamaño
    if ((canvasStore.estaEnElemento || canvasStore.estaEnContenedor) && canvasStore.elementoContenedorActual) {
      try {
        // Usar el tamaño del layer (canvas adaptativo) como la caja a encuadrar
        const localW = layerConfig.value.width || Math.max(1, canvasStore.elementoContenedorActual.width || 1)
        const localH = layerConfig.value.height || Math.max(1, canvasStore.elementoContenedorActual.height || 1)
        const elBbox = { x: 0, y: 0, width: Math.max(1, localW), height: Math.max(1, localH) }

        // Calcular fit directo para el elemento y salir
        const elMargin = 24
        const vwEl = Math.max(16, stageSize.value.width - elMargin * 2)
        const vhEl = Math.max(16, stageSize.value.height - elMargin * 2)
        let scaleXel = elBbox.width > 0 ? vwEl / elBbox.width : 1
        let scaleYel = elBbox.height > 0 ? vhEl / elBbox.height : 1
        let targetScaleEl = Math.min(scaleXel, scaleYel)
        targetScaleEl = Math.max(0.05, Math.min(10, targetScaleEl))
        // En coordenadas locales la caja comienza en 0,0
        const stageXel = (stageSize.value.width - elBbox.width * targetScaleEl) / 2
        const stageYel = (stageSize.value.height - elBbox.height * targetScaleEl) / 2
        canvasStore.configurarZoom(targetScaleEl)
        canvasStore.configurarPan(stageXel, stageYel)
        return
      } catch (e) {
        // si algo falla, continuar con lógica de planta
        console.error('fitToPlanta (element) error', e)
      }
    }

    // Si hay un elemento seleccionado fuera de la navegación, también permitir fit a él
    if (!canvasStore.estaEnElemento && canvasStore.elementoSeleccionado) {
      const sel = canvasStore.elementosVisibles.find((e) => e.id === canvasStore.elementoSeleccionado)
      if (sel) {
        const selBbox = { x: sel.x || 0, y: sel.y || 0, width: Math.max(1, sel.width || 1), height: Math.max(1, sel.height || 1) }
        const selMargin = 24
        const vwEl = Math.max(16, stageSize.value.width - selMargin * 2)
        const vhEl = Math.max(16, stageSize.value.height - selMargin * 2)
        let scaleXel = selBbox.width > 0 ? vwEl / selBbox.width : 1
        let scaleYel = selBbox.height > 0 ? vhEl / selBbox.height : 1
        let targetScaleEl = Math.min(scaleXel, scaleYel)
        targetScaleEl = Math.max(0.05, Math.min(10, targetScaleEl))
        const stageXel = (stageSize.value.width - selBbox.width * targetScaleEl) / 2 - selBbox.x * targetScaleEl
        const stageYel = (stageSize.value.height - selBbox.height * targetScaleEl) / 2 - selBbox.y * targetScaleEl
        canvasStore.configurarZoom(targetScaleEl)
        canvasStore.configurarPan(stageXel, stageYel)
        return
      }
    }

    if (planta) {
      // Priorizar polígono si está disponible
      if (planta.poligono && Array.isArray(planta.poligono) && planta.poligono.length > 0) {
        const xs = planta.poligono.map((p) => p.x)
        const ys = planta.poligono.map((p) => p.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        // Aquí no asumimos unidades; conservamos bboxRaw para probar ambas interpretaciones
        const bboxRaw = { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
        // Interpretación 1: coordenadas ya en px
        const bboxPx = { ...bboxRaw }
        // Interpretación 2: coordenadas en cm → convertir a px
        const bboxCmToPx = { x: bboxRaw.x * CM_TO_PX, y: bboxRaw.y * CM_TO_PX, width: Math.max(1, bboxRaw.width * CM_TO_PX), height: Math.max(1, bboxRaw.height * CM_TO_PX) }
        bbox = { _candidates: [bboxPx, bboxCmToPx] }
      } else if (planta.dimensiones && (planta.dimensiones.ancho || planta.dimensiones.largo)) {
        // Usar dimensiones físicas de la planta (cm → px)
        const w = (planta.dimensiones.ancho || 100) * CM_TO_PX
        const h = (planta.dimensiones.largo || 100) * CM_TO_PX
        bbox = { x: 0, y: 0, width: Math.max(1, w), height: Math.max(1, h) }
      } else if (layerConfig.value && layerConfig.value.width && layerConfig.value.height) {
        // Fallback razonable
        bbox = { x: 0, y: 0, width: Math.max(1, layerConfig.value.width), height: Math.max(1, layerConfig.value.height) }
      }
    }

    if (!bbox) {
      centrarPlantaEnCanvas()
      return
    }

    // Calcular tama��o del viewport disponible
    const vw = Math.max(16, stageSize.value.width - margin * 2)
    const vh = Math.max(16, stageSize.value.height - margin * 2)

    // Si bbox tiene candidatos (polígono con unidades inciertas), probar ambas interpretaciones
    let chosen = null
    if (bbox && bbox._candidates) {
      const candidates = bbox._candidates
      const scales = candidates.map((b) => {
        const sX = b.width > 0 ? vw / b.width : 1
        const sY = b.height > 0 ? vh / b.height : 1
        return Math.min(sX, sY)
      })
      // Elegir la interpretación que produce mayor escala (más acercamiento)
      const bestIndex = scales[0] >= scales[1] ? 0 : 1
      chosen = candidates[bestIndex]
    } else {
      chosen = bbox
    }

    if (!chosen) {
      centrarPlantaEnCanvas()
      return
    }

    // Prevenir división por cero y limitar escala
    const scaleX = chosen.width > 0 ? vw / chosen.width : 1
    const scaleY = chosen.height > 0 ? vh / chosen.height : 1
    let targetScale = Math.min(scaleX, scaleY)
    // Aplicar pequeño multiplicador para acercar ligeramente (mejora percepcion)
    targetScale = targetScale * 1.08
    targetScale = Math.max(0.05, Math.min(10, targetScale))

    // Si el resultado es prácticamente igual al zoom actual, no forzar cambio brusco
    const currentZoom = canvasStore.zoom || 1
    if (Math.abs(Math.log(targetScale) - Math.log(currentZoom)) < 0.02) {
      // diferencia menor al ~2% en escala en log-space -> mantener zoom
      targetScale = currentZoom
    }

    // Calcular pan para centrar bbox en viewport (en coords de stage)
    const stageX = (stageSize.value.width - chosen.width * targetScale) / 2 - chosen.x * targetScale
    const stageY = (stageSize.value.height - chosen.height * targetScale) / 2 - chosen.y * targetScale

    canvasStore.configurarZoom(targetScale)
    canvasStore.configurarPan(stageX, stageY)
  } catch (e) {
    console.error('fitToPlanta error', e)
  }
}

// === CONTEXT MENU HANDLERS ===
// Stubs de stage drag para evitar warnings
const handleStageDragStart = () => {}
const handleStageDragMove = () => {}
const handleStageDragEnd = () => {}

// Normaliza coordenadas de evento (Konva: e.evt; nativo: e)
const getClientXY = (e) => {
  const ev = e && e.evt ? e.evt : e
  const x = Number(ev && (ev.clientX ?? ev.x))
  const y = Number(ev && (ev.clientY ?? ev.y))
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  }
}

const onShapeContextMenu = (evt, elemento) => {
  try { (evt?.evt || evt)?.preventDefault?.() } catch { /* ignore */ }
  // No abrir si hay drag activo
  if (isElementDragging.value || (typeof window !== 'undefined' && window.__dvCanvasDragActive)) {
    return
  }
  // Asegurar selección del shape antes de abrir
  if (canvasStore.elementoSeleccionado !== elemento.id) {
    canvasStore.seleccionarElemento(elemento.id)
  }
  const { x, y } = getClientXY(evt)
  ctx.openAt({ x, y, elementId: elemento.id })
}

let longPressTimer = null
let lastPointerDown = { x: 0, y: 0, elId: null }
const onShapePointerDown = (evt, elemento) => {
  // Guardar posición del puntero (si existe)
  const { x, y } = getClientXY(evt)
  lastPointerDown = { x, y, elId: elemento?.id ?? null }
  if (isElementDragging.value || (typeof window !== 'undefined' && window.__dvCanvasDragActive)) {
    return
  }
  // Seleccionar si aún no lo está
  if (elemento?.id && canvasStore.elementoSeleccionado !== elemento.id) {
    canvasStore.seleccionarElemento(elemento.id)
  }
  // Long press (600ms) en mobile/puntero
  clearTimeout(longPressTimer)
  longPressTimer = setTimeout(() => {
    if (!isElementDragging.value && lastPointerDown.elId) {
      ctx.openAt({ x: lastPointerDown.x, y: lastPointerDown.y, elementId: lastPointerDown.elId })
    }
  }, 600)
}
const onShapePointerUp = () => {
  clearTimeout(longPressTimer)
}

// Acción bloquear/desbloquear desde el menú contextual
const toggleLock = async (id) => {
  if (!id) return
  toggleLockElement(id)
  ctx.close()
}

// Acción eliminar desde el menú contextual
const onDelete = async (id) => {
  if (!id) return
  const el = canvasStore.elementosVisibles.find((e) => e.id === id) || canvasStore.elementoPorId?.(id)
  if (el && (el.bloqueado === true || el.locked === true)) {
    try {
      if (typeof window !== 'undefined' && window.__toasts?.show) {
        window.__toasts.show('Elemento bloqueado — desbloquéalo para eliminar', { type: 'warning', timeout: 3000 })
      } else {
        await confirmDialog.confirm({ title: 'Elemento bloqueado', message: 'Elemento bloqueado — desbloquéalo para eliminar', confirmLabel: 'Entendido', cancelLabel: 'Cerrar' })
      }
    } catch { /* ignore */ }
    ctx.close()
    return
  }
  // Si no está seleccionado, seleccionarlo primero
  if (canvasStore.elementoSeleccionado !== id) {
    canvasStore.seleccionarElemento(id)
  }
  await deleteSelected({ withConfirm: true })
  ctx.close()
}
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
  top: 36px;
  left: 36px;
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
  top: 36px;
  right: 36px; /* valor por defecto, será sobrescrito por :style */
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

/* Ajuste visual del botón de 'fit' para que coincida con el botón Deshacer */
.btn-fit:not(:disabled) {
  color: #3b82f6;
}
.btn-fit:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

/* Gear button style to match Undo */
.btn-gear {
  color: #3b82f6;
}
.btn-gear:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

.floating-btn .icon {
  width: 20px;
  height: 20px;
}

.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.15s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: translateY(8px) scale(0.9); }

.speed-action { position:absolute; right:0; width:48px; height:48px; margin-top:8px; border:1px solid #d1d5db; border-radius:9999px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px  12px rgba(0,0,0,.15); transition:all .15s ease; }
.speed-action:hover { transform: translateY(-4px); box-shadow:0 6px 16px rgba(0,0,0,.2); }

.btn-fit { position: relative; z-index: 30; }
</style>
