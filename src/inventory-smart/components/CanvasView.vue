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
    :class="{ 'drag-over': isDragOverCanvas, 'cursor-grab': !dragModeGlobal }"
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

      <v-layer ref="backgroundLayerRef" :config="{ listening: false }">
        <v-line
          v-if="plantPolygon.length"
          :config="{
            points: plantPolygonFlat,
            closed: true,
            stroke: '#0ea5e9',
            fill: 'rgba(255,265,255,1)',
            strokeWidth: 2,
            listening: false,
          }"
        />
        <!-- Dibujar grid solo si gridSize > 0 -->
        <template v-if="(canvasStore.gridSize || 0) > 0">
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
        </template>
      </v-layer>
      <v-layer ref="layerRef">
        <template v-if="canvasStore.elementoAura">
        <v-rect
          v-if="canvasStore.elementoAura.forma === 'rectangular' || !canvasStore.elementoAura.forma"
          :config="{
            id: canvasStore.elementoAura.id,
            x: canvasStore.elementoAura.x,
            y: canvasStore.elementoAura.y,
            width: canvasStore.elementoAura.width,
            height: canvasStore.elementoAura.height,
            fill: canvasStore.elementoAura.color,
            opacity: 0.5, // Una opacidad base para el aura
            cornerRadius: 10, // Bordes redondeados para un look más suave
            listening: false, // El aura no debe ser clickeable
          }"
        />
         <v-circle
            v-else-if="canvasStore.elementoAura.forma === 'circular' && canvasStore.vistaActiva === 'XY'"
            :config="{
              id: canvasStore.elementoAura.id,
              x: canvasStore.elementoAura.x + canvasStore.elementoAura.width / 2,
              y: canvasStore.elementoAura.y + canvasStore.elementoAura.height / 2,
              radius: Math.min(canvasStore.elementoAura.width, canvasStore.elementoAura.height) / 2,
              fill: canvasStore.elementoAura.color,
              opacity: 0.5,
              cornerRadius: 10,
              listening: false,
            }"
          />

      </template>

        <!-- Renderizado de elementos del store -->
        <template v-for="elemento in elementosVisiblesEnCanvas" :key="elemento.id">
          <!-- Elementos rectangulares (anaqueles, mesas, armarios, contenedores) -->
          <v-group
            v-if="elemento.forma === 'rectangular' || !elemento.forma"
            :config="{
              id: elemento.id,
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              draggable: canDragElement(elemento.id),
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento),
            }"
            :ref="(n) => registerDraggableRef(elemento.id, n)"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="(e) => canDragElement(elemento.id) && onShapeDragStart(e, elemento)"
            @dragmove="(e) => canDragElement(elemento.id) && onShapeDragMove(e, elemento)"
            @dragend="(e) => canDragElement(elemento.id) && onShapeDragEnd(e, elemento)"
            @transformstart="(e) => handleTransformStart(e, elemento.id)"
            @transform="(e) => handleTransformMove(e, elemento.id)"
            @transformend="(e) => handleTransformEnd(e, elemento.id)"
            @contextmenu="(e) => onShapeContextMenu(e, elemento)"
            @pointerdown.passive="(e) => onShapePointerDown(e, elemento)"
            @pointerup.passive="onShapePointerUp"
            @pointercancel.passive="onShapePointerUp"
          >
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: elemento.width,
                height: elemento.height,
                stroke: undefined,
                strokeWidth: 0,
                fill: 'transparent',
                listening: false,
                name: 'bbox',
              }"
            />
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: elemento.width,
                height: elemento.height,
                fill: elemento.color,
                opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
                shadowColor: getElementShadow(elemento).color,
                shadowBlur: getElementShadow(elemento).blur / canvasStore.zoom,
                shadowOpacity: getElementShadow(elemento).opacity,
              }"
            />
          </v-group>
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
                v-if="canvasStore.zoom > 0.8"
                :config="{
                  width: elemento.width,
                  height: elemento.height,
                  verticalAlign: 'middle',
                  align: 'center',
                  text: '🔒',
                  fontSize: 32 / canvasStore.zoom,
                  fontFamily: 'Arial',
                  fill: '#f59e0b',
                  listening: false,
                }"
              />
          </v-group>

          <!-- Elementos circulares: en vista aérea (XY) son círculos, en vista de frente (XZ) son rectángulos -->
          <v-group
            v-else-if="elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'"
            :config="{
              id: elemento.id,
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              draggable: canDragElement(elemento.id),
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento),
            }"
            :ref="(n) => registerDraggableRef(elemento.id, n)"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="(e) => canDragElement(elemento.id) && onShapeDragStart(e, elemento)"
            @dragmove="(e) => canDragElement(elemento.id) && onShapeDragMove(e, elemento)"
            @dragend="(e) => canDragElement(elemento.id) && onShapeDragEnd(e, elemento)"
            @transformstart="(e) => handleTransformStart(e, elemento.id)"
            @transform="(e) => handleTransformMove(e, elemento.id)"
            @transformend="(e) => handleTransformEnd(e, elemento.id)"
            @contextmenu="(e) => onShapeContextMenu(e, elemento)"
            @pointerdown.passive="(e) => onShapePointerDown(e, elemento)"
            @pointerup.passive="onShapePointerUp"
            @pointercancel.passive="onShapePointerUp"
          >
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: elemento.width,
                height: elemento.height,
                strokeEnabled: false,
                fillEnabled: false,
                listening: false,
                name: 'bbox',
              }"
            />
            <v-circle
              :config="{
                x: elemento.width / 2,
                y: elemento.height / 2,
                radius: Math.min(elemento.width, elemento.height) / 2,
                fill: elemento.color,
                opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
                shadowColor: getElementShadow(elemento).color,
                shadowBlur: getElementShadow(elemento).blur / canvasStore.zoom,
                shadowOpacity: getElementShadow(elemento).opacity,
                stroke: undefined,
                strokeWidth: 0,
              }"
            />
          </v-group>

          <!-- Elementos circulares en vista de frente (XZ) se muestran como rectángulos (cilindro visto de frente) -->
          <v-group
            v-else-if="elemento.forma === 'circular' && canvasStore.vistaActiva === 'XZ'"
            :config="{
              id: elemento.id,
              x: elemento.x,
              y: elemento.y,
              width: elemento.width,
              height: elemento.height,
              draggable: canDragElement(elemento.id),
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento),
            }"
            :ref="(n) => registerDraggableRef(elemento.id, n)"
            @click="() => selectElement(elemento.id)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="(e) => canDragElement(elemento.id) && onShapeDragStart(e, elemento)"
            @dragmove="(e) => canDragElement(elemento.id) && onShapeDragMove(e, elemento)"
            @dragend="(e) => canDragElement(elemento.id) && onShapeDragEnd(e, elemento)"
            @transformstart="(e) => handleTransformStart(e, elemento.id)"
            @transform="(e) => handleTransformMove(e, elemento.id)"
            @transformend="(e) => handleTransformEnd(e, elemento.id)"
            @contextmenu="(e) => onShapeContextMenu(e, elemento)"
            @pointerdown.passive="(e) => onShapePointerDown(e, elemento)"
            @pointerup.passive="onShapePointerUp"
            @pointercancel.passive="onShapePointerUp"
          >
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: elemento.width,
                height: elemento.height,
                stroke: undefined,
                strokeWidth: 0,
                fill: 'transparent',
                listening: false,
                name: 'bbox',
              }"
            />
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: elemento.width,
                height: elemento.height,
                fill: elemento.color,
                opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
                shadowColor: 'black',
                shadowBlur: 4,
                shadowOpacity: 0.3,
              }"
            />
          </v-group>
          <!-- Icono de candado para elemento circular bloqueado en vista aérea (XY) -->
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
              v-if="canvasStore.zoom > 0.8"
              :config="{
                width: elemento.width,
                height: elemento.height,
                align: 'center',
                verticalAlign: 'center',
                text: '🔒',
                fontSize: 32 / canvasStore.zoom,
                fontFamily: 'Arial',
                fill: '#f59e0b',
                listening: false,
              }"
            />
          </v-group>

          <!-- Icono de candado para elemento circular bloqueado en vista de frente (XZ) (rectangular) -->
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
              v-if="canvasStore.zoom > 0.8"
              :config="{
                width: elemento.width,
                height: elemento.height,
                verticalAlign: 'middle',
                align: 'center',
                text: '🔒',
                fontSize: 32 / canvasStore.zoom,
                fontFamily: 'Arial',
                fill: '#f59e0b',
                listening: false,
              }"
            />
          </v-group>

          <!-- Texto con el nombre del elemento -->
          <v-text
            v-if="canvasStore.zoom > 0.8 "
            :config="{
              x: elemento.x + 5,
              y: elemento.y + 5,
              text: elemento.nombre || elemento.tipo || 'Elemento',
              fontSize: 14 / canvasStore.zoom,
              fontFamily: 'Arial',
              fill: '#fff',
              shadowColor: 'black',
              shadowBlur: 2,
              shadowOpacity: 0.8,
              listening: false,
            }"
          />
        </template>
      </v-layer>
      <v-layer ref="uiLayerRef" :config="{ listening: false }">

        <!-- Debug: mostrar información según el contexto -->
        <v-text
          :config="{
            x: 10,
            y: -(39 / canvasStore.zoom),
            text:
              canvasStore.estaEnElemento || canvasStore.estaEnContenedor
                ? `${canvasStore.elementoContenedorActual?.nombre || 'Elemento'} - ${fmtCm(pxToCm(layerConfig.width, viewport.cmPerPx))} x ${fmtCm(pxToCm(layerConfig.height, viewport.cmPerPx))}`
                : `${canvasStore.plantaActivaData?.nombre || 'Planta'} - ${fmtCm(pxToCm(layerConfig.width, viewport.cmPerPx))} x ${fmtCm(pxToCm(layerConfig.height, viewport.cmPerPx))}`,
            fontSize: 12 / canvasStore.zoom,
            fontFamily: 'Arial',
            fill: '#3b82f6',
            listening: false,
          }"
        />
        <v-text
          v-if="canvasStore.estaEnPlanta"
          :config="{
            x: 10,
            y: -(11 / canvasStore.zoom) - (8 / canvasStore.zoom),
            text: `Elementos: ${elementosVisiblesEnCanvas.length}`,
            fontSize: 11 / canvasStore.zoom,
            fontFamily: 'Arial',
            fill: '#6b7280',
            listening: false,
          }"
        />
        <v-text
          v-if="canvasStore.estaEnElemento"
          :config="{
            x: 10,
            y: -(11 / canvasStore.zoom) - (8 / canvasStore.zoom),
            text: `Contenedores: ${elementosVisiblesEnCanvas.length}`,
            fontSize: 11 / canvasStore.zoom,
            fontFamily: 'Arial',
            fill: '#dc2626',
            listening: false,
          }"
        />
        <v-text
          v-if="canvasStore.estaEnContenedor"
          :config="{
            x: 10,
            y: -(11 / canvasStore.zoom) - (8 / canvasStore.zoom),
            text: `Items: ${elementosVisiblesEnCanvas.length} (elementos + contenedores)`,
            fontSize: 11 / canvasStore.zoom,
            fontFamily: 'Arial',
            fill: '#dc2626',
            listening: false,
          }"
        />
      </v-layer>
      <v-layer ref="overlaysLayerRef">
        <!-- Líneas guía de object snapping -->
        <SnapGuides
          :guides="snapGuides"
          :guide-color="'#00ff88'"
          :guide-opacity="1.0"
          :guide-stroke-width="3"
          :guide-shadow-blur="4"
          :guide-shadow-opacity="0.8"
          :show-intersections="true"
          :zoom="canvasStore.zoom"
        />

        <v-transformer
          v-if="isEditingSelected && canvasStore.elementoSeleccionado && !selectedElementLocked"
          ref="transformerRef"
          :config="{
            rotateEnabled: false,
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
      :unit="'m'"
    />

    <FloatingToolbar
      :is-element-selected="canvasStore.elementoSeleccionado ? true : false"
      :is-element-locked="selectedElementLocked"
      :is-snapping-enabled="isSnappingEnabled"
      :is-snapping="isSnapping"
      :active-mode="isDragModeActive ? 'edit' : 'drag'"
      :is-container="canvasStore.elementoSeleccionadoCompleto?.padre ? true : false"
      @set-mode="toggleDragMode()"
      @toggle-lock="toggleLockAndPreserveDrag(canvasStore.elementoSeleccionado)"
      @fill-container="() => simularLlenadoElemento(canvasStore.elementoSeleccionado)"
      @toggle-snapping="toggleSnapping"
      @delete="() => onDelete(canvasStore.elementoSeleccionadoCompleto.id)"
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
      @saveTemplate="() => openTemplateModal(ctxElementId)"
      @close="ctx.close()"
    />

    <TemplateSaveModal
      :open="templateModalOpen"
      :element-id="canvasStore.elementoSeleccionado"
      @close="closeTemplateModal"
      @saved="onTemplateSaved"
    />

  <CanvasInfo />

  <FloatingControls
    :safe-right="safeRight"
    :can-undo="canUndo"
    :can-redo="canRedo"
    :can-zoom-in="canZoomIn"
    :can-zoom-out="canZoomOut"
    :can-fit="!!canvasStore.plantaActivaData"
    @undo="undo()"
    @redo="redo()"
    @zoom-in="zoomIn()"
    @zoom-out="zoomOut()"
    @fit="fitToPlanta"
  />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCanvasWithHistory } from '@/inventory-smart/composables/useCanvasWithHistory'
import { useCanvasBuffer } from '@/inventory-smart/composables/useCanvasBuffer'
import { useConflicts } from '@/inventory-smart/composables/useConflicts'
import RulersOverlay from '@/inventory-smart/components/RulersOverlay.vue'
import {
  detectConflictsFor,
  throttle
} from '@/inventory-smart/utils/collision'
import {
  clampRectToRect,
  snapToGrid,
  nudgePlace,
} from '@/inventory-smart/utils/geometry'
import { clampRectToPolygon, clampCircleToPolygon, circleInPolygon, pointInPolygon, clampPointToPolygon } from '@/inventory-smart/utils/polygonBounds'
import { dimsCmFor, clampInsideArea } from '@/inventory-smart/utils/bounds'
import { handleCanvasHotkeys } from '@/inventory-smart/utils/canvasHotkeys'
import { polygonInset } from '@/inventory-smart/utils/polygonInset'
import { GRID_SIZE, CM_TO_PX, DIMENSIONS, CATALOGO, OFFSETS } from '@/inventory-smart/utils/constants'
import { computeDimsByAxisScale, toCanvasSizePx } from '@/inventory-smart/utils/dimensionPolicy'
import { cmToPx, pxToCm, fmtCm } from '@/inventory-smart/utils/units'
import { useViewportStore } from '@/inventory-smart/stores/viewport'
import { getActiveBounds } from '@/inventory-smart/utils/activeBounds'
import SpeedDialContext from '@/inventory-smart/components/SpeedDialContext.vue'
import { useContextMenu } from '@/inventory-smart/composables/useContextMenu'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation'
import { useDimensionValidation } from '@/inventory-smart/composables/useDimensionValidation'
import { makeInnerSession } from '@/inventory-smart/composables/useInnerNoOverlap'
import { useObjectSnapping } from '@/inventory-smart/composables/useObjectSnapping'
import { usePlacementGuards } from '@/inventory-smart/composables/usePlacementGuards'
import FloatingToolbar from '@/inventory-smart/components/FloatingToolbar.vue'
import { useProductSimulation } from '@/inventory-smart/composables/useSimulateProducts'
import SnapGuides from '@/inventory-smart/components/SnapGuides.vue'
import { useToast } from '@/inventory-smart/composables/useToast'
import { useTransformer } from '@/inventory-smart/composables/useTransformer'
import { useElementDrag } from '@/inventory-smart/composables/useElementDrag'
import TemplateSaveModal from '@/inventory-smart/components/TemplateSaveModal.vue'
import CanvasInfo from '@/inventory-smart/components/CanvasInfo.vue'
import FloatingControls from '@/inventory-smart/components/FloatingControls.vue'

// Nuevo: espacio seguro a la derecha para no quedar debajo del panel
const props = defineProps({
  safeRight: { type: Number, default: 20 },
})

// Referencia segura a Konva (cuando está disponible globalmente via vue-konva)
const Konva = typeof globalThis !== 'undefined' ? globalThis.Konva || (typeof window !== 'undefined' ? window.Konva : null) : null

// Referencias
const containerRef = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)
const backgroundLayerRef = ref(null)
const overlaysLayerRef = ref(null)

// Composable con historial integrado
const { store: canvasStore, undo, redo, canUndo, canRedo } = useCanvasWithHistory()
const {
  onDragStartGuard,
  onDragMoveGuard,
  onDragEndGuard,
  onTransformEndGuard,
} = usePlacementGuards()
const buffer = useCanvasBuffer()
const ctx = useContextMenu()
const { visible: ctxVisible, x: ctxX, y: ctxY, isLocked: ctxIsLocked, elementId: ctxElementId } = ctx
const { deleteSelected } = useDeleteElement()
const confirmDialog = useConfirmDialog()
const weightValidation = useWeightValidation()

const templateModalOpen = ref(false)
const openTemplateModal = (elementId) => { templateModalOpen.value = true; ctx.close() }
const closeTemplateModal = () => { templateModalOpen.value = false }
function onTemplateSaved() { /* hook post-guardar si se requiere */ }
const dimensionValidation = useDimensionValidation()

// Object snapping
const {
  activeGuides: snapGuides,
  isSnapping,
  performSnap,
  clearGuides
} = useObjectSnapping()

// Estado para controlar si el snapping está habilitado (por defecto desactivado — evita alineado automático)
const isSnappingEnabled = ref(true)

// === HELPERS DE CONVERSIÓN ===
/**
 * Obtiene las dimensiones de un elemento en píxeles, convirtiendo desde cm si es necesario
 * @param {Object} elemento - El elemento del cual obtener dimensiones
 * @returns {Object} - { width: number, height: number } en píxeles
 */
const viewport = useViewportStore()
const getElementPixelDimensions = (elemento) => {
  // Si ya tiene width/height en píxeles, usarlos solo si no tiene dimensiones en cm
  // Esto es para compatibilidad con elementos legacy que solo tienen width/height
  if (!elemento.dimensiones && elemento.width && elemento.height) {
    return { width: elemento.width, height: elemento.height }
  }

  // Priorizar dimensiones en cm y convertir según la vista
  if (elemento.dimensiones) {
    let widthCm, heightCm

    if (canvasStore.vistaActiva === 'XY') {
      // Vista aérea (XY): width = ancho, height = largo
      widthCm = elemento.dimensiones.ancho || (elemento.width ? pxToCm(elemento.width, viewport.cmPerPx) : 10)
      heightCm = elemento.dimensiones.largo || (elemento.height ? pxToCm(elemento.height, viewport.cmPerPx) : 6)
    } else if (canvasStore.vistaActiva === 'XZ') {
      // Vista de frente (XZ): width = ancho, height = alto
      widthCm = elemento.dimensiones.ancho || (elemento.width ? pxToCm(elemento.width, viewport.cmPerPx) : 10)
      heightCm = elemento.dimensiones.alto || (elemento.height ? pxToCm(elemento.height, viewport.cmPerPx) : 6)
    } else {
      // Fallback a vista aérea (XY)
      widthCm = elemento.dimensiones.ancho || (elemento.width ? pxToCm(elemento.width, viewport.cmPerPx) : 10)
      heightCm = elemento.dimensiones.largo || (elemento.height ? pxToCm(elemento.height, viewport.cmPerPx) : 6)
    }

    return {
      width: Math.round(cmToPx(widthCm, viewport.cmPerPx)),
      height: Math.round(cmToPx(heightCm, viewport.cmPerPx)),
    }
  }

  // Fallback a valores por defecto (solo para elementos sin dimensiones definidas)
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
  canvasStore.actualizarElemento(elementId, { bloqueado: !el.bloqueado }, true, `Elemento ${!el.bloqueado ? 'bloqueado' : 'desbloqueado'}: ${el.nombre || el.tipo || elementId}`)
}

// Conflictos en vivo durante el arrastre
// const liveConflicts = conflictsApi.conflicts
const setLiveConflictsThrottled = throttle((movingEl) => {
  try {
    const list = detectConflictsFor(movingEl, canvasStore.elementosVisibles)
    conflictsApi.setConflicts(list, movingEl.id)
  } catch { /* ignore */ }
}, 32)


// Estado local del canvas (otros estados vienen del composable useElementDrag)
const stageSize = ref({ width: 800, height: 600 })
const isDragOverCanvas = ref(false)
const highlightAnimation = ref(null);

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

const activeBounds = computed(() => getActiveBounds(canvasStore))

const plantPolygon = computed(() => activeBounds.value.polygonPx)

const insetPoly = computed(() => polygonInset(plantPolygon.value, 1))

const plantPolygonFlat = computed(() => plantPolygon.value.flatMap((p) => [p.x, p.y]))

const floorBoundary = computed(() => activeBounds.value.boundsPx)

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
  const gridSizePx = Number(canvasStore.gridSize || 0)
  const vertical = []
  const horizontal = []

  // Si gridSize <= 0, no generar líneas
  if (!gridSizePx || gridSizePx <= 0) {
    return { vertical, horizontal }
  }

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

watch(
  plantPolygon,
  (poly) => {
    const layer = layerRef.value?.getNode?.()
    if (layer && poly?.length) {
      layer.clipFunc((ctx) => {
        ctx.beginPath()
        poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        ctx.closePath()
      })
      layer.batchDraw?.()
    }
  },
  { immediate: true },
)

// Contorno activo siempre expresado como polígono
const computeBoundary = () => {
  return { type: 'polygon', points: plantPolygon.value, inset: insetPoly.value }
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

// Zoom programático (para botones)
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 1.1

const canZoomIn = computed(() => (canvasStore.zoom || 1) < MAX_ZOOM)
const canZoomOut = computed(() => (canvasStore.zoom || 1) > MIN_ZOOM)

const zoomBy = (factor) => {
  try {
    const stage = stageRef.value.getNode()
    const oldScale = stage.scaleX()
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * factor))
    // Mantener el centro de la vista
    const center = { x: stage.width() / 2, y: stage.height() / 2 }
    const mousePointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    }
    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    }
    canvasStore.configurarZoom(newScale)
    canvasStore.configurarPan(newPos.x, newPos.y)
    try { canvasStore.view.hasUserZoomPan = true } catch { /* ignore */ }
  } catch (err) {
    console.warn('zoomBy error', err)
  }
}

const zoomIn = () => zoomBy(ZOOM_STEP)
const zoomOut = () => zoomBy(1 / ZOOM_STEP)

// Keybindings: Ctrl + '+' / Ctrl + '-' => zoom, handled globally
const onKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === '+') { e.preventDefault(); zoomIn() }
    if (e.key === '=') { e.preventDefault(); zoomIn() }
    if (e.key === '-') { e.preventDefault(); zoomOut() }
  }
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

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
  if (e.target === e.target.getStage() && !canvasStore.cambiosNoAplicados) {
  canvasStore.seleccionarElemento(null)
  // Cerrar controles y edición cuando se hace click en el stage vacío
  editingElementId.value = null
  // Limpiar guías de snapping
  clearGuides()
    return;
  }

  // Resaltar sección de guardados
  if (canvasStore.cambiosNoAplicados && e.target === e.target.getStage() && canvasStore.elementoSeleccionado) {
    const msg = "Tienes cambios pendientes de guardar";
    showToast(msg, 'warn');
  }
}

// === FUNCIONES DE ELEMENTOS ===
const selectElement = (elementId) => {
  console.log('Seleccionando elemento:', elementId)
  const isNotCurrentElement = canvasStore.elementoSeleccionado !== elementId;
  if (canvasStore.cambiosNoAplicados && canvasStore.elementoSeleccionado && isNotCurrentElement) {
    const msg = "No puedes seleccionar un nuevo elemento con cambios pendientes de guardar";
    showToast(msg, 'warn');
    return;
  }
  canvasStore.seleccionarElemento(elementId)
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

  if (canvasStore.cambiosNoAplicados && canvasStore.elementoSeleccionado) {
    const msg = "No puedes entrar a un elemento si tienes cambios pendientes de guardar";
    showToast(msg, 'warn');
    return;
  }
  if (tiposContenedor.includes(elemento.tipo)) {
    console.log('Navegando al interior del elemento:', elemento.nombre)
    canvasStore.navegarAElemento(elemento.id)
  } else {
    console.log('Elemento no es un contenedor:', elemento.tipo)
  }
}

// Tracking de posiciones iniciales para revertir si corresponde
// (Ahora se obtienen del composable useElementDrag)
// Marca de borde para feedback visual
const atEdgeMap = ref(new Map())

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

// Drag bound para cada elemento y forma (clamp mínimo al contorno)
const dragBoundForElement = (pos, elemento) => {
  try {
    const lp = toLayerCoords(pos)
    const boundary = computeBoundary()
    const { w_cm, h_cm } = dimsCmFor(elemento, canvasStore.vistaActiva)
    const w = w_cm * CM_TO_PX
    const h = h_cm * CM_TO_PX
    
    // Obtener posición previa para movimiento suave
    const lastPos = dragLastValidPositions.value.get(elemento.id)
    
    const c = clampInsideArea(lp.x, lp.y, w, h, boundary, elemento, true, lastPos)
    return toStageCoords(c)
  } catch {
    return pos
  }
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
    } else if (data.tipo === 'plantilla-catalogo') {
      createElementFromTemplate(data, e)
    }
  } catch (error) {
    console.error('Error procesando drop:', error)
  }
}

const { showToast } = useToast()

const { simularLlenadoElemento } = useProductSimulation({
  canvasStore,
  showToast,
  forceRedraw
});

// Composable de drag de elementos
const {
  isElementDragging,
  stageDragEnabled,
  lastValidPositions: dragLastValidPositions,
  onShapeDragStart,
  onShapeDragMove,
  onShapeDragEnd,
  registerDraggableRef,
} = useElementDrag({
  canvasStore,
  stageRef,
  layerRef,
  layerConfig,
  conflictsApi,
  showToast,
  isElementLocked,
  isSnappingEnabled,
  performSnap,
  clearGuides,
  onDragStartGuard,
  onDragMoveGuard,
  onDragEndGuard,
  setLiveConflictsThrottled,
  computeBoundary,
})

// Composable de transformación
const {
  transformerRef,
  editingElementId,
  isInteractingWithTransformer,
  isEditingSelected,
  selectedElementLocked,
  setupTransformer,
  handleTransformStart,
  handleTransformMove,
  handleTransformEnd,
  toggleEditingMode
} = useTransformer({
  canvasStore,
  stageRef,
  layerRef,
  layerConfig,
  lastValidPositions: dragLastValidPositions,
  onTransformEndGuard,
  dimensionValidation,
  showToast,
  isElementLocked,
  // Snapping helpers
  performSnap,
  clearGuides,
  isSnappingEnabled,
  // Boundary provider para clamping
  computeBoundary
})

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

// Pipeline unificado de validaciones previas al drop
const runPreDropValidations = (elemento, dropEvent) => {
  if (!elemento) return { ok: false, reason: 'invalid' }

  const contextoActual = canvasStore.contextoActual.tipo
  const tipoElemento = elemento.tipo

  if (contextoActual === 'plantas' && tipoElemento !== 'elementos') {
    showToast('No puedes agregar este tipo aquí. En la vista de plantas solo se permiten elementos.', 'error')
    return { ok: false, reason: 'hierarchy' }
  }

  if (contextoActual === 'elementos' && tipoElemento !== 'contenedores') {
    showToast('No puedes agregar ese tipo aquí. Dentro de elementos solo se permiten contenedores.', 'error')
    return { ok: false, reason: 'hierarchy' }
  }

  if (
    contextoActual === 'contenedores' &&
    tipoElemento !== 'elementos' &&
    tipoElemento !== 'contenedores'
  ) {
    showToast('En contenedores solo se pueden agregar elementos u otros contenedores', 'error')
    return { ok: false, reason: 'hierarchy' }
  }

  const resultadoValidacionPeso = weightValidation.validarPesoElemento(
    elemento,
    canvasStore.contextoActual.id,
    canvasStore.contextoActual.tipo
  )

  if (!resultadoValidacionPeso.valido) {
    let tipoPadre = ""
    if (canvasStore.estaEnPlanta) {
      tipoPadre = "la planta"
    } else if (canvasStore.estaEnContenedor) {
      tipoPadre = "el contenedor"
    } else if (canvasStore.estaEnElemento) {
      tipoPadre = "el elemento"
    }
    // El elemento excedería el peso máximo permitido
    showToast(
      `No se puede agregar: excedería el peso máximo soportado de ${tipoPadre} (${resultadoValidacionPeso.exceso} kg más)`,
      'error'
    )
    return { ok: false, reason: 'weight' }
  }

  let { width, height } = getElementPixelDimensions(elemento)
  let anchoCm = elemento.dimensiones?.ancho || 100
  let largoCm = elemento.dimensiones?.largo || 60
  let altoCm = elemento.dimensiones?.alto || 20

  const isSystemDefault = !!(elemento?.props?.system === true && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(elemento.id))
  if (isSystemDefault && elemento?.dimensionLock !== true) {
    const planta = canvasStore.plantaActivaData
    if (planta && planta.dimensiones) {
      const parentDims = {
        w: planta.dimensiones.ancho,
        h: planta.dimensiones.largo,
        d: planta.dimensiones.alto,
      }
      const dims = computeDimsByAxisScale(elemento.id, parentDims, { snap: true, gridPx: GRID_SIZE })
      if (dims) {
        anchoCm = dims.ancho
        largoCm = dims.largo
        altoCm = dims.alto
        const sizePx = toCanvasSizePx(dims, 'XY')
        width = sizePx.width
        height = sizePx.height
      }
      const off = OFFSETS?.offsetByType?.[elemento.id]?.zOffsetShare
      if (typeof off === 'number' && isFinite(off)) {
        const zBase = Math.round((planta.dimensiones.alto || 0) * off)
        elemento.alturaRespectoAlSuelo = zBase
      }
    }
  }

  const MIN_WIDTH = 40
  const MIN_HEIGHT = 30
  let finalWidth = Math.max(width, MIN_WIDTH)
  let finalHeight = Math.max(height, MIN_HEIGHT)

  const world = getWorldCoordinatesFromPointer(dropEvent)
  let candX = world.x - finalWidth / 2
  let candY = world.y - finalHeight / 2

  const effectiveGrid = canvasStore.vistaActiva === 'XZ' ? 0 : (canvasStore.gridSize ?? GRID_SIZE)
  const snapped = snapToGrid(candX, candY, effectiveGrid)
  candX = snapped.x
  candY = snapped.y

  if (canvasStore.estaEnElemento || canvasStore.estaEnContenedor) {
    if (elemento.tipo === 'contenedores') {
      const parent = canvasStore.elementoContenedorActual
      const siblings = parent?.hijos?.map((id) => canvasStore.elementoPorId(id)).filter(Boolean) || []
      const temp = {
        id: '__temp',
        dimensiones: { ancho: anchoCm, largo: largoCm, alto: altoCm },
        posicion: { x: candX, y: candY },
      }
      const sess = makeInnerSession({ parentEl: parent, movingEl: temp, siblings, vista: canvasStore.vistaActiva })
      let local = sess.toLocal({ x: candX, y: candY }, parent)
      local = sess.finalizeLocal(local)
      if (!sess.isValidLocal(local)) {
        showToast('No hay espacio suficiente aquí para colocar el elemento.', 'error')
        return { ok: false, reason: 'bounds' }
      }
      const worldPos = sess.toWorld(local, parent)
      candX = worldPos.x
      candY = worldPos.y
    }
  }

  const boundary = computeBoundary()
  let isInside = true
  if (boundary.type === 'rect') {
    isInside = candX >= 0 && candY >= 0 && candX + finalWidth <= boundary.W && candY + finalHeight <= boundary.H
    if (!isInside) {
      const clamped = clampRectToRect(candX, candY, finalWidth, finalHeight, boundary.W, boundary.H)
      candX = clamped.x
      candY = clamped.y
    }
  } else if (boundary.type === 'polygon') {
    // Para elementos circulares, verificar si el círculo está dentro del polígono
    if (elemento.forma === 'circular') {
      const radius = Math.min(finalWidth, finalHeight) / 2
      const centerX = candX + radius
      const centerY = candY + radius
      isInside = circleInPolygon({ x: centerX, y: centerY, radius }, boundary.inset)
      if (!isInside) {
        const clampedCenter = clampCircleToPolygon({ x: centerX, y: centerY, radius }, boundary.inset)
        candX = clampedCenter.x - radius
        candY = clampedCenter.y - radius
        isInside = circleInPolygon({ x: clampedCenter.x, y: clampedCenter.y, radius }, boundary.inset)
      }
    } else {
      isInside = pointInPolygon({ x: candX + finalWidth / 2, y: candY + finalHeight / 2 }, boundary.inset)
      if (!isInside) {
        const clamped = clampRectToPolygon({ x: candX, y: candY, width: finalWidth, height: finalHeight }, boundary.inset)
        candX = clamped.x
        candY = clamped.y
        isInside = pointInPolygon({ x: candX + finalWidth / 2, y: candY + finalHeight / 2 }, boundary.inset)
      }
    }
  }

  const tempEl = {
    id: '__temp_drop__',
    x: candX,
    y: candY,
    width: finalWidth,
    height: finalHeight,
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    tipo: elemento.tipo || elemento.categoria || 'elemento',
    forma: elemento.forma || 'rectangular',
  }

  const all = canvasStore.elementosVisibles
  const conflicts = detectConflictsFor(tempEl, all)
  const blocking = conflicts.filter((c) => c.bloqueante)

  let finalPos = { x: candX, y: candY }
  let ok = blocking.length === 0 && isInside

  if (!ok) {
    const nudge = nudgePlace(
      candX,
      candY,
      finalWidth,
      finalHeight,
      boundary,
      all,
      tempEl,
      effectiveGrid,
      16,
      detectConflictsFor,
    )
    if (nudge.found) {
      finalPos = { x: nudge.x, y: nudge.y }
      ok = true
    }
  }

  if (!ok) {
    showToast('No fue posible colocar el elemento dentro de los límites de la planta.', 'error')
    return { ok: false, reason: 'bounds' }
  }

  if (boundary.type === 'polygon') {
    if (elemento.forma === 'circular') {
      const radius = Math.min(finalWidth, finalHeight) / 2
      const centerX = finalPos.x + radius
      const centerY = finalPos.y + radius
      const clampedCenter = clampCircleToPolygon({ x: centerX, y: centerY, radius }, boundary.inset)
      finalPos = { x: clampedCenter.x - radius, y: clampedCenter.y - radius }
    } else {
      const c = clampRectToPolygon(
        { x: finalPos.x, y: finalPos.y, width: finalWidth, height: finalHeight },
        boundary.inset,
      )
      finalPos = { x: c.x, y: c.y }
    }
  }

  return {
    ok: true,
    position: finalPos,
    width: finalWidth,
    height: finalHeight,
    dimsCm: { ancho: anchoCm, largo: largoCm, alto: altoCm },
  }
}

const createElementFromDrop = (data, dropEvent) => {
  const elemento = data.elemento
  const res = runPreDropValidations(elemento, dropEvent)
  if (!res.ok) return

  let { ancho: anchoCm, largo: largoCm, alto: altoCm } = res.dimsCm
  let finalWidth = res.width
  let finalHeight = res.height
  let finalPosition = res.position

  const color = elemento.color || elemento.colorBase || '#3B82F6'

  let largoCmFinal = largoCm
  let finalHeightFinal = finalHeight
  if (canvasStore.contextoActual.tipo === 'elementos' && elemento.tipo === 'contenedores') {
    const elementoPadre = canvasStore.elementoContenedorActual
    if (elementoPadre && elementoPadre.dimensiones) {
      largoCmFinal = elementoPadre.dimensiones.largo
      if (canvasStore.vistaActiva === 'XY') {
        finalHeightFinal = largoCmFinal * CM_TO_PX
      }
      console.log('Contenedor ajustado al largo del elemento padre:', { largoPadre: largoCmFinal, altoPxFinal: finalHeightFinal, vista: canvasStore.vistaActiva })
    }
  }

  const nuevoElemento = {
    id: `${elemento.tipo || elemento.categoria || 'elemento'}_${Date.now()}`,
    tipo: elemento.tipo || (elemento.categoria === 'contenedores' ? 'contenedores' : 'elementos'),
    categoria: elemento.categoria,
    nombre: elemento.nombre || 'Nuevo elemento',
    dimensiones: { ancho: anchoCm, largo: largoCmFinal, alto: altoCm },
    x: finalPosition.x,
    y: finalPosition.y,
    width: finalWidth,
    height: finalHeightFinal,
    color: color,
    colorBase: color,
    forma: elemento.forma || 'rectangular',
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    alturaRespectoAlSuelo: elemento.alturaRespectoAlSuelo || 0,
    pesoMaximo: elemento.pesoMaximo || 0,
    volumenMaximo: (anchoCm * largoCmFinal * altoCm) / 100,
    dimensionLock: false,
    systemTypeKey: elemento.id,
    uso: { volumen: 0, peso: 0 },
    descripcion: elemento.descripcion || '',
    contenedores: elemento.contenedores ? [...elemento.contenedores] : [],
    hijos: []
  }
  console.log('✅ Creando elemento desde drop en posición válida:', nuevoElemento)
  canvasStore.agregarElemento(nuevoElemento)
  canvasStore.seleccionarElemento(nuevoElemento.id)
}

const getElementShadow = (elemento) => {
  if (canvasStore.elementoDestacadoId === elemento.id) {
    return {
      color: elemento.color,
      // Un valor base muy grande para el resplandor
      blur: 120,
      opacity: 1, // Opacidad máxima para un color sólido
      offsetX: 0,
      offsetY: 0,
    }
  }
  // Sombra por defecto
  return {
    color: 'black',
    blur: 4,
    opacity: 0.3,
    offsetX: 0,
    offsetY: 0,
  }
}

watch(
  () => canvasStore.elementoDestacadoId,
  (newId) => {
    // Detener animación anterior
    if (highlightAnimation.value) {
      highlightAnimation.value.stop()
      highlightAnimation.value = null
    }

    if (newId) {
      const elemento = canvasStore.elementoPorId(newId)
      const stage = stageRef.value?.getNode()

      // Esperamos a que el aura se renderice en el DOM de Konva
      nextTick(() => {
        const nodeAura = stage?.findOne(`#aura_${newId}`)

        if (elemento && stage && nodeAura) {
          // 1. VOLVEMOS AL ZOOM INVASIVO ORIGINAL
          const margin = 150 // Margen alrededor del elemento
          const scale = Math.min(
            (stage.width() - margin) / elemento.width,
            (stage.height() - margin) / elemento.height,
            0.2,
          )

          const newPos = {
            x: -elemento.x * scale + stage.width() / 2 - (elemento.width * scale) / 2,
            y: -elemento.y * scale + stage.height() / 2 - (elemento.height * scale) / 2,
          }

          canvasStore.configurarZoom(scale)
          canvasStore.configurarPan(newPos.x, newPos.y)

          // 2. ANIMAMOS EL AURA (su opacidad y escala)
          highlightAnimation.value = new Konva.Animation((frame) => {
            const period = 1000
            const oscillation = (Math.sin((frame.time * 2 * Math.PI) / period) + 1) / 2 // Va de 0 a 1

            // La opacidad del aura "respira" entre 0.3 y 0.7
            nodeAura.opacity(0.3 + oscillation * 0.4)

          }, nodeAura.getLayer())

          highlightAnimation.value.start()
        }
      })
    }
  },
)

const createElementFromBuffer = (data, dropEvent) => {
  // Obtener el elemento del buffer para validar sus dimensiones
  const bufferItem = buffer.getBufferItem(data.bufferItemId)
  if (!bufferItem) {
    showToast('Elemento no encontrado en el buffer', 'error')
    return
  }

  const elemento = bufferItem.elemento

  // ===== VALIDACIÓN DE PESO MÁXIMO =====
  const resultadoValidacionPeso = weightValidation.validarPesoElemento(
    elemento,
    canvasStore.contextoActual.id,
    canvasStore.contextoActual.tipo
  )

  if (!resultadoValidacionPeso.valido) {
    // El elemento excedería el peso máximo permitido
    showToast(
      `No se puede pegar: habría un exceso de peso soportado de ${resultadoValidacionPeso.exceso} kg`,
      'error'
    )|
    console.log('Validación de peso fallida en buffer:', resultadoValidacionPeso)
    return
  }

  // Obtener dimensiones en píxeles (convertir desde cm si es necesario)
  let { width, height } = getElementPixelDimensions(elemento)

  // Ajustar las dimensiones del contenedor si estamos en un elemento
  if (canvasStore.contextoActual.tipo === 'elementos' && elemento.tipo === 'contenedores') {
    // Obtener el elemento padre (el elemento actual donde estamos)
    const elementoPadre = canvasStore.elementoContenedorActual;
    if (elementoPadre && elementoPadre.dimensiones) {
      // Si estamos en vista de frente (XZ), ajustar el alto según el alto del padre
      if (canvasStore.vistaActiva === 'XZ') {
        const altoPadreCm = elementoPadre.dimensiones.alto;

        // Actualizar también las dimensiones en el elemento del buffer
        if (elemento.dimensiones) {
          elemento.dimensiones.alto = altoPadreCm;
        }

        console.log('Buffer: Contenedor ajustado al alto del elemento padre:', {
          altoPadreCm,
          altoPixelesFinal: height
        });
      }
    }
  }

  // 1. Convertir pointer a coords de mundo (considerando zoom/pan)
  const worldCoords = getWorldCoordinatesFromPointer(dropEvent)

  // 2. Calcular posición candidata
  let candX = worldCoords.x - width / 2
  let candY = worldCoords.y - height / 2

  // 3. Aplicar snap a grilla ANTES de validar (usar valor runtime de canvasStore.gridSize: 0 desactiva)
  const snapped = snapToGrid(candX, candY, canvasStore.gridSize ?? GRID_SIZE)
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
    if (elemento.forma === 'circular') {
      const radius = Math.min(width, height) / 2
      const centerX = candX + radius
      const centerY = candY + radius
      isInsideArea = circleInPolygon({ x: centerX, y: centerY, radius }, boundary.inset)
      if (!isInsideArea) {
        const clampedCenter = clampCircleToPolygon({ x: centerX, y: centerY, radius }, boundary.inset)
        candX = clampedCenter.x - radius
        candY = clampedCenter.y - radius
        isInsideArea = circleInPolygon({ x: clampedCenter.x, y: clampedCenter.y, radius }, boundary.inset)
      }
    } else {
      isInsideArea = pointInPolygon({ x: candX + width / 2, y: candY + height / 2 }, boundary.inset)
      if (!isInsideArea) {
        const clamped = clampRectToPolygon({ x: candX, y: candY, width, height }, boundary.inset)
        candX = clamped.x
        candY = clamped.y
        isInsideArea = pointInPolygon({ x: candX + width / 2, y: candY + height / 2 }, boundary.inset)
      }
    }
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
      canvasStore.gridSize ?? GRID_SIZE,
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
    showToast('Fuera de los límites de la planta', 'error')
    return // NO pegar, NO comprometer historial
  }

  if (boundary.type === 'polygon') {
    if (elemento.forma === 'circular') {
      const radius = Math.min(width, height) / 2
      const centerX = finalPosition.x + radius
      const centerY = finalPosition.y + radius
      const clampedCenter = clampCircleToPolygon({ x: centerX, y: centerY, radius }, boundary.inset)
      finalPosition = { x: clampedCenter.x - radius, y: clampedCenter.y - radius }
    } else {
      const c = clampRectToPolygon(
        { x: finalPosition.x, y: finalPosition.y, width, height },
        boundary.inset,
      )
      finalPosition = { x: c.x, y: c.y }
    }
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

const createElementFromTemplate = (data, dropEvent) => {
  console.log('[templates-dd] intento de drop de plantilla')
  const payload = data.payload || {}
  const root = payload.elements?.find?.((e) => e.id === payload.rootId)
  if (!root) {
    console.warn('[templates-dd] payload sin root válido')
    showToast('No se pudo insertar la plantilla', 'error')
    return
  }
  const res = runPreDropValidations(root, dropEvent)
  if (!res.ok) {
    console.log('[templates-dd] drop cancelado por validación', res.reason)
    return
  }
  const newId = buffer.pasteFromSerialized(payload, res.position)
  if (!newId) {
    showToast('No se pudo insertar la plantilla', 'error')
  } else {
    console.log('[templates-dd] plantilla insertada', newId)
  }
}

// Modo arrastre global: si true, permite arrastrar cualquier elemento (salvo si está bloqueado)
// Por defecto activado (true) para que el modo edición esté disponible al iniciar
const dragModeGlobal = ref(true)
const isDragModeActive = computed(() => dragModeGlobal.value)

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

const toggleSnapping = () => {
  isSnappingEnabled.value = !isSnappingEnabled.value
  // Si se desactiva el snapping, limpiar guías activas
  if (!isSnappingEnabled.value) {
    clearGuides()
  }
}

const canDragElement = (id) => {
  // Solo permitir drag si el modo global está activo y el elemento no está bloqueado
  // Y si no hay cambios sin aplicar de otro elemento
  const isNotCurrentElement = canvasStore.elementoSeleccionado != id;
  if (isElementLocked(id) || (canvasStore.cambiosNoAplicados && isNotCurrentElement)) return false
  return dragModeGlobal.value
}

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
  editingElementId.value = null
  }
}

// Deseleccionar al presionar Escape
const handleKeyDown = (e) => {
  if (!e) return
  const key = e.key.toLowerCase()
  if (key === 'escape' || key === 'esc') {
    if (canvasStore.cambiosNoAplicados && canvasStore.elementoSeleccionado) {
      showToast('Tienes cambios pendientes de guardar', 'warn')
      return;
    }
    canvasStore.seleccionarElemento(null)
    // Asegurar que el transformer/edición se cierre
    editingElementId.value = null
    // Limpiar guías de snapping
    clearGuides()
  } else {
    handleCanvasHotkeys(e, {
      dragMode: dragModeGlobal,
      toggleDragMode,
      toggleSnapping,
      toggleLock: () => toggleLockAndPreserveDrag(canvasStore.elementoSeleccionado),
    })
  }
}

let sizeResizeObserver = null

onMounted(async () => {
  await nextTick()
  updateStageSize()
  if (containerRef.value) {
  sizeResizeObserver = new ResizeObserver(updateStageSize)
  sizeResizeObserver.observe(containerRef.value)
  }
  await nextTick()
  centrarPlantaEnCanvas()
  await nextTick()
  fitToPlanta()
  window.addEventListener('click', handleGlobalClick)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  if (sizeResizeObserver) sizeResizeObserver.disconnect()
  window.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('keydown', handleKeyDown)
})

function recomputeBoundsAndIndex() {
  try {
    conflictsApi.clear()
    dragLastValidPositions.value.clear()
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
    dragLastValidPositions.value.clear()
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

watch(() => canvasStore.elementoSeleccionadoCompleto, (elementoActual) => {
  // Comprobamos si hay un cambio Y SI NO estamos interactuando con el transformer.
  if (elementoActual && isEditingSelected.value && !isInteractingWithTransformer.value) {
    nextTick(() => {
      setupTransformer();
    });
  }
}, { deep: true });

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

    // Calcular tamaño del viewport disponible
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

// Auto-ajustar siempre que cambia el contexto (planta / elemento / contenedor)
watch(
  () => [canvasStore.contextoActual.tipo, canvasStore.contextoActual.id],
  async () => {
    // Esperar a que el store recalcule canvasAdaptativo y layerConfig
    await nextTick()
    await nextTick()
    fitToPlanta()
  },
  { immediate: false },
)

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
  // No abrir si hay cambios pendientes
  const isNotCurrentElement = canvasStore.elementoSeleccionado !== elemento.id;
  if (canvasStore.cambiosNoAplicados && isNotCurrentElement) return;
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
  display: inline-flex;
  gap: 12px;
  /* por defecto NO hacer wrap; se aplica dinámicamente solo cuando haga falta */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.canvas-info span {
  color: #475569;
  font-weight: 500;
}

.canvas-info.should-wrap { flex-wrap: wrap; gap: 10px }
.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.15s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: translateY(8px) scale(0.9); }

</style>
