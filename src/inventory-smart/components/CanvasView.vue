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
    :class="{
      'drag-over': isDragOverCanvas,
      'cursor-grab': !dragModeGlobal,
      'infinite-floor': isInfinitePlant,
    }"
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
          v-if="plantPolygon.length && !canvasStore.plantaActivaData?.isInfinite"
          :config="{
            points: plantPolygonFlat,
            closed: true,
            stroke: '#0ea5e9',
            fill: 'rgba(255,265,255,1)',
            strokeWidth: 2 / canvasStore.zoom,
            listening: false,
          }"
        />
        <!-- Dibujar grid solo si gridSize > 0 -->
        <template v-if="(canvasStore.gridSize || 0) > 0">
          <v-line
            v-for="x in gridLines.vertical"
            :key="`v-${Math.round(x * 1000)}`"
            :config="{
              points: isInfinitePlant
                ? [x, 0, x, floorBoundary.height]
                : [x, floorBoundary.y, x, floorBoundary.y + floorBoundary.height],
              stroke: '#e5e7eb',
              strokeWidth: 1,
              opacity: 0.5,
              listening: false,
            }"
          />
          <v-line
            v-for="y in gridLines.horizontal"
            :key="`h-${Math.round(y * 1000)}`"
            :config="{
              points: isInfinitePlant
                ? [0, y, floorBoundary.width, y]
                : [floorBoundary.x, y, floorBoundary.x + floorBoundary.width, y],
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
            v-if="
              canvasStore.elementoAura.forma === 'rectangular' || !canvasStore.elementoAura.forma
            "
            :config="{
              id: canvasStore.elementoAura.id,
              x: canvasStore.elementoAura.x,
              y: canvasStore.elementoAura.y,
              width: canvasStore.elementoAura.width,
              height: canvasStore.elementoAura.height,
              fill: canvasStore.elementoAura.color,
              opacity: 0.5,
              cornerRadius: 10,
              listening: false,
            }"
          />
          <v-circle
            v-else-if="
              canvasStore.elementoAura.forma === 'circular' && canvasStore.vistaActiva === 'XY'
            "
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
              width: getDrawWidth(elemento),
              height: getDrawHeight(elemento),
              draggable: canDragElement(elemento),
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento),
            }"
            :ref="(n) => registerDraggableRef(elemento.id, n)"
            @click="() => selectElement(elemento)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="(e) => canDragElement(elemento) && onShapeDragStart(e, elemento)"
            @dragmove="(e) => canDragElement(elemento) && onShapeDragMove(e, elemento)"
            @dragend="(e) => canDragElement(elemento) && onShapeDragEnd(e, elemento)"
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
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
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
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
                fill:
                  (elemento.tipo || '').toLowerCase() === 'pasillos' ? '#ffffff' : elemento.color,
                stroke:
                  (elemento.tipo || '').toLowerCase() === 'pasillos'
                    ? showPasillosDash
                      ? '#959799'
                      : undefined
                    : (elemento.tipo || '').toLowerCase() === 'pisos'
                      ? 'rgba(0,0,0,0.3)'
                      : undefined,
                strokeWidth:
                  (elemento.tipo || '').toLowerCase() === 'pasillos'
                    ? showPasillosDash
                      ? 1 / canvasStore.zoom
                      : 0
                    : (elemento.tipo || '').toLowerCase() === 'pisos'
                      ? 1 / canvasStore.zoom
                      : 0,
                dash:
                  (elemento.tipo || '').toLowerCase() === 'pasillos'
                    ? showPasillosDash
                      ? [6 / canvasStore.zoom, 4 / canvasStore.zoom]
                      : undefined
                    : (elemento.tipo || '').toLowerCase() === 'pisos'
                      ? [6 / canvasStore.zoom, 4 / canvasStore.zoom]
                      : undefined,
                opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
                shadowColor:
                  (elemento.tipo || '').toLowerCase() === 'pasillos'
                    ? undefined
                    : getElementShadow(elemento).color,
                shadowBlur:
                  (elemento.tipo || '').toLowerCase() === 'pasillos'
                    ? 0
                    : getElementShadow(elemento).blur / canvasStore.zoom,
                shadowOpacity:
                  (elemento.tipo || '').toLowerCase() === 'pasillos'
                    ? 0
                    : getElementShadow(elemento).opacity,
              }"
            />
            <!-- Barra de orientación -->
            <v-rect
              v-if="getOrientationBarRect(elemento)"
              :config="getOrientationBarRect(elemento)"
            />
            <!-- Etiqueta centrada del elemento (rectangular) -->
            <v-text :config="computeLabelProps(elemento)" />
          </v-group>
          <!-- Icono de candado para elemento bloqueado -->
          <v-group
            v-if="isElementLocked(elemento.id)"
            :config="{
              x: elemento.x,
              y: elemento.y,
              width: getDrawWidth(elemento),
              height: getDrawHeight(elemento),
              listening: false,
              rotation: elemento.rotation || 0,
              opacity: 0.35,
            }"
          >
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
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
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
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
              width: getDrawWidth(elemento),
              height: getDrawHeight(elemento),
              draggable: canDragElement(elemento),
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento),
            }"
            :ref="(n) => registerDraggableRef(elemento.id, n)"
            @click="() => selectElement(elemento)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="(e) => canDragElement(elemento) && onShapeDragStart(e, elemento)"
            @dragmove="(e) => canDragElement(elemento) && onShapeDragMove(e, elemento)"
            @dragend="(e) => canDragElement(elemento) && onShapeDragEnd(e, elemento)"
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
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
                strokeEnabled: false,
                fillEnabled: false,
                listening: false,
                name: 'bbox',
              }"
            />
            <v-circle
              :config="{
                x: getDrawWidth(elemento) / 2,
                y: getDrawHeight(elemento) / 2,
                radius: Math.min(getDrawWidth(elemento), getDrawHeight(elemento)) / 2,
                fill: elemento.color,
                opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
                shadowColor: getElementShadow(elemento).color,
                shadowBlur: getElementShadow(elemento).blur / canvasStore.zoom,
                shadowOpacity: getElementShadow(elemento).opacity,
                stroke: undefined,
                strokeWidth: 0,
              }"
            />
            <!-- Etiqueta centrada del elemento (circular XY) -->
            <v-text :config="computeLabelProps(elemento)" />
          </v-group>

          <!-- Elementos circulares en vista de frente (XZ) se muestran como rectángulos (cilindro visto de frente) -->
          <v-group
            v-else-if="elemento.forma === 'circular' && canvasStore.vistaActiva === 'XZ'"
            :config="{
              id: elemento.id,
              x: elemento.x,
              y: elemento.y,
              width: getDrawWidth(elemento),
              height: getDrawHeight(elemento),
              draggable: canDragElement(elemento),
              dragBoundFunc: (pos) => dragBoundForElement(pos, elemento),
            }"
            :ref="(n) => registerDraggableRef(elemento.id, n)"
            @click="() => selectElement(elemento)"
            @dblclick="() => handleElementDoubleClick(elemento)"
            @dragstart="(e) => canDragElement(elemento) && onShapeDragStart(e, elemento)"
            @dragmove="(e) => canDragElement(elemento) && onShapeDragMove(e, elemento)"
            @dragend="(e) => canDragElement(elemento) && onShapeDragEnd(e, elemento)"
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
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
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
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
                fill: elemento.color,
                opacity: isElementLocked(elemento.id) ? 0.35 : 0.8,
                shadowColor: 'black',
                shadowBlur: 4,
                shadowOpacity: 0.3,
              }"
            />
            <!-- Etiqueta centrada del elemento (circular en XZ como rectángulo) -->
            <v-text :config="computeLabelProps(elemento)" />
          </v-group>
          <!-- Icono de candado para elemento circular bloqueado en vista aérea (XY) -->
          <v-group
            v-if="
              isElementLocked(elemento.id) &&
              elemento.forma === 'circular' &&
              canvasStore.vistaActiva === 'XY'
            "
            :config="{
              x: elemento.x,
              y: elemento.y,
              width: getDrawWidth(elemento),
              height: getDrawHeight(elemento),
              listening: false,
              rotation: elemento.rotation || 0,
              opacity: 0.35,
            }"
          >
            <v-circle
              :config="{
                x: getDrawWidth(elemento) / 2,
                y: getDrawHeight(elemento) / 2,
                radius: Math.min(getDrawWidth(elemento), getDrawHeight(elemento)) / 2,
                fill: '#000',
                opacity: 0.12,
                listening: false,
              }"
            />
            <!-- Icono de candado para elemento circular bloqueado -->
            <v-text
              v-if="canvasStore.zoom > 0.8"
              :config="{
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
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
            v-if="
              isElementLocked(elemento.id) &&
              elemento.forma === 'circular' &&
              canvasStore.vistaActiva === 'XZ'
            "
            :config="{
              x: elemento.x,
              y: elemento.y,
              width: getDrawWidth(elemento),
              height: getDrawHeight(elemento),
              listening: false,
              rotation: elemento.rotation || 0,
              opacity: 0.35,
            }"
          >
            <v-rect
              :config="{
                x: 0,
                y: 0,
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
                fill: '#000',
                opacity: 0.12,
                cornerRadius: 8,
                listening: false,
              }"
            />
            <v-text
              v-if="canvasStore.zoom > 0.8"
              :config="{
                width: getDrawWidth(elemento),
                height: getDrawHeight(elemento),
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

          <!-- Etiqueta centrada por grupo aplicada; se elimina texto flotante anterior -->
        </template>
      </v-layer>
      <v-layer ref="uiLayerRef" :config="{ listening: false }">
        <!-- Debug: mostrar información según el contexto -->
        <v-text
          v-if="!canvasStore.estaEnPlanta || canvasStore.plantaActivaData?.isInfinite !== true"
          :config="{
            x: floorLabelPositions.main.x,
            y: floorLabelPositions.main.y,
            text: mainFloorInfoText,
            fontSize: 12 / canvasStore.zoom,
            fontFamily: 'Arial',
            fill: '#3b82f6',
            listening: false,
            align: 'left',
            name: 'floor-info-label',
          }"
        />
        <v-text
          v-if="canvasStore.estaEnPlanta && canvasStore.plantaActivaData?.isInfinite !== true"
          :config="{
            x: floorLabelPositions.secondary.x,
            y: floorLabelPositions.secondary.y,
            text: plantElementsText,
            fontSize: 11 / canvasStore.zoom,
            fontFamily: 'Arial',
            fill: '#6b7280',
            listening: false,
            align: 'left',
            name: 'floor-info-label',
          }"
        />

        <v-text
          v-else-if="canvasStore.estaEnCuarto"
          :config="{
            x: 10,
            y: -(11 / canvasStore.zoom) - 8 / canvasStore.zoom,
            text: `Pisos: ${elementosVisiblesEnCanvas.length}`,
            fontSize: 11 / canvasStore.zoom,
            fontFamily: 'Arial',
            fill: '#6b7280',
            listening: false,
          }"
        />

        <v-text
          v-else-if="canvasStore.estaEnPiso"
          :config="{
            x: 10,
            y: -(11 / canvasStore.zoom) - 8 / canvasStore.zoom,
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
            y: -(11 / canvasStore.zoom) - 8 / canvasStore.zoom,
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
            y: -(11 / canvasStore.zoom) - 8 / canvasStore.zoom,
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
          v-if="
            isEditingSelected &&
            canvasStore.elementoSeleccionado &&
            !selectedElementLocked &&
            !isRestricted
          "
          ref="transformerRef"
          :config="{
            rotateEnabled: false,
            ignoreStroke: true,
            anchorStroke: '#6366f1',
            anchorFill: '#ffffff',
            anchorCornerRadius: 2,
            anchorSize: 8,
            borderStroke: '#6366f1',
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
      :is-element-restricted="isRestricted"
      :has-aisles="hasPasillos"
      :is-aisle-dash-on="showPasillosDash"
      @set-mode="toggleDragMode()"
      @toggle-lock="toggleLockAndPreserveDrag(canvasStore.elementoSeleccionado)"
      @fill-container="() => simularLlenadoElemento(canvasStore.elementoSeleccionado)"
      @toggle-snapping="toggleSnapping"
      @toggle-aisle-dash="() => (showPasillosDash = !showPasillosDash)"
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
import { detectConflictsFor, throttle } from '@/inventory-smart/utils/collision'
import { snapToGrid, nudgePlace } from '@/inventory-smart/utils/geometry'
import { insideAreaModel } from '@/inventory-smart/utils/isPlacementValid'
import { dimsCmFor, clampInsideArea } from '@/inventory-smart/utils/bounds'
import { handleCanvasHotkeys } from '@/inventory-smart/utils/canvasHotkeys'
import { polygonInset } from '@/inventory-smart/utils/polygonInset'
import { GRID_SIZE, CM_TO_PX, CATALOGO, OFFSETS } from '@/inventory-smart/utils/constants'
import { computeDimsByAxisScale, toCanvasSizePx } from '@/inventory-smart/utils/dimensionPolicy'
import { cmToPx, pxToCm, fmtCm, formatLengthsCm } from '@/inventory-smart/utils/units'
import { useViewportStore } from '@/inventory-smart/stores/viewport'
import { getActiveBounds } from '@/inventory-smart/utils/activeBounds'
import SpeedDialContext from '@/inventory-smart/components/SpeedDialContext.vue'
import { useContextMenu } from '@/inventory-smart/composables/useContextMenu'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement'
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
import { useZoom } from '@/inventory-smart/composables/useZoom'
import FloatingControls from '@/inventory-smart/components/FloatingControls.vue'
import { toPrecisionCm } from '../utils/fixedDimensions'
import { instantiateStructureOnCanvas } from '@/inventory-smart/composables/useStructureManager'

// Espacio seguro a la derecha para no quedar debajo del panel
const props = defineProps({
  safeRight: { type: Number, default: 20 },
})

// Referencia segura a Konva (cuando está disponible globalmente via vue-konva)
const Konva =
  typeof globalThis !== 'undefined'
    ? globalThis.Konva || (typeof window !== 'undefined' ? window.Konva : null)
    : null

// Referencias
const containerRef = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)
const backgroundLayerRef = ref(null)
const overlaysLayerRef = ref(null)

// Composable con historial integrado
const { store: canvasStore, undo, redo, canUndo, canRedo } = useCanvasWithHistory()
const { onDragStartGuard, onDragMoveGuard, onDragEndGuard, onTransformEndGuard } =
  usePlacementGuards()
const buffer = useCanvasBuffer()
const ctx = useContextMenu()
const {
  visible: ctxVisible,
  x: ctxX,
  y: ctxY,
  isLocked: ctxIsLocked,
  elementId: ctxElementId,
} = ctx
const { deleteSelected } = useDeleteElement()
const weightValidation = useWeightValidation()

const templateModalOpen = ref(false)
const openTemplateModal = (elementId) => {
  templateModalOpen.value = true
  ctx.close()
}
const closeTemplateModal = () => {
  templateModalOpen.value = false
}
const dimensionValidation = useDimensionValidation()

// Object snapping
const { activeGuides: snapGuides, isSnapping, performSnap, clearGuides } = useObjectSnapping()

// Estado para controlar si el snapping está habilitado
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
    // Para elementos legacy, aplicar orientación en vista XZ
    if (canvasStore.vistaActiva === 'XZ') {
      const orientacion = Number(elemento.orientacion || 0)
      const orientacionNormalizada = ((orientacion % 360) + 360) % 360
      const useAncho = orientacionNormalizada === 0 || orientacionNormalizada === 180

      return {
        width: useAncho ? elemento.width : elemento.height,
        height: elemento.height,
      }
    }
    return { width: elemento.width, height: elemento.height }
  }

  // Priorizar dimensiones en cm y convertir según la vista
  if (elemento.dimensiones) {
    let widthCm, heightCm

    if (canvasStore.vistaActiva === 'XY') {
      // Vista aérea (XY): width = ancho, height = largo
      widthCm =
        elemento.dimensiones.ancho ||
        (elemento.width ? pxToCm(elemento.width, viewport.cmPerPx) : 10)
      heightCm =
        elemento.dimensiones.largo ||
        (elemento.height ? pxToCm(elemento.height, viewport.cmPerPx) : 6)
    } else if (canvasStore.vistaActiva === 'XZ') {
      // Vista de frente (XZ): considerar orientación para el width
      const orientacion = Number(elemento.orientacion || 0)
      const orientacionNormalizada = ((orientacion % 360) + 360) % 360
      const useAncho = orientacionNormalizada === 0 || orientacionNormalizada === 180

      // En XZ: orientación determina si width usa ancho o largo
      widthCm = useAncho
        ? elemento.dimensiones.ancho ||
          (elemento.width ? pxToCm(elemento.width, viewport.cmPerPx) : 10)
        : elemento.dimensiones.largo ||
          (elemento.height ? pxToCm(elemento.height, viewport.cmPerPx) : 6)
      // Height siempre es alto en XZ
      heightCm =
        elemento.dimensiones.alto ||
        (elemento.height ? pxToCm(elemento.height, viewport.cmPerPx) : 6)
    } else {
      // Fallback a vista aérea (XY)
      widthCm =
        elemento.dimensiones.ancho ||
        (elemento.width ? pxToCm(elemento.width, viewport.cmPerPx) : 10)
      heightCm =
        elemento.dimensiones.largo ||
        (elemento.height ? pxToCm(elemento.height, viewport.cmPerPx) : 6)
    }

    return {
      width: toPrecisionCm(cmToPx(widthCm, viewport.cmPerPx)),
      height: toPrecisionCm(cmToPx(heightCm, viewport.cmPerPx)),
    }
  }

  // Fallback a valores por defecto (solo para elementos sin dimensiones definidas)
  return { width: 100, height: 60 }
}

// Funciones helper para obtener dimensiones con orientación
const getDrawWidth = (elemento) => getElementPixelDimensions(elemento).width
const getDrawHeight = (elemento) => getElementPixelDimensions(elemento).height

const conflictsApi = useConflicts()

const isElementLocked = (elementId) => {
  const el = canvasStore.elementosVisibles.find((e) => e.id === elementId)
  return el?.bloqueado === true
}

const toggleLockElement = (elementId) => {
  const el = canvasStore.elementosVisibles.find((e) => e.id === elementId)
  if (!el) return
  canvasStore.actualizarElemento(
    elementId,
    { bloqueado: !el.bloqueado },
    true,
    `Elemento ${!el.bloqueado ? 'bloqueado' : 'desbloqueado'}: ${el.nombre || el.tipo || elementId}`,
  )
}

// Conflictos en vivo durante el arrastre
// const liveConflicts = conflictsApi.conflicts
const setLiveConflictsThrottled = throttle((movingEl) => {
  try {
    const list = detectConflictsFor(movingEl, canvasStore.elementosVisibles)
    conflictsApi.setConflicts(list, movingEl.id)
  } catch {
    /* ignore */
  }
}, 32)

// Estado local del canvas (otros estados vienen del composable useElementDrag)
const stageSize = ref({ width: 800, height: 600 })
const isDragOverCanvas = ref(false)
const highlightAnimation = ref(null)

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
const isInfinitePlant = computed(() => canvasStore.plantaActivaData?.isInfinite === true)

const plantPolygon = computed(() => activeBounds.value.polygonPx)

const insetPoly = computed(() => polygonInset(plantPolygon.value, 1))

const plantPolygonFlat = computed(() => plantPolygon.value.flatMap((p) => [p.x, p.y]))

const plantRect = computed(() => {
  const adapt = canvasStore.canvasAdaptativo || {}
  const frame = adapt?.frame
  if (
    frame &&
    Number.isFinite(Number(frame.x)) &&
    Number.isFinite(Number(frame.y))
  ) {
    return {
      x: Number(frame.x) || 0,
      y: Number(frame.y) || 0,
      width: Number(frame.width) || 0,
      height: Number(frame.height) || 0,
    }
  }

  const poly = plantPolygon.value
  if (Array.isArray(poly) && poly.length >= 3) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const point of poly) {
      const x = Number(point?.x)
      const y = Number(point?.y)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    if (
      Number.isFinite(minX) &&
      Number.isFinite(minY) &&
      Number.isFinite(maxX) &&
      Number.isFinite(maxY) &&
      maxX >= minX &&
      maxY >= minY
    ) {
      return {
        x: Math.floor(minX),
        y: Math.floor(minY),
        width: Math.max(0, Math.ceil(maxX) - Math.floor(minX)),
        height: Math.max(0, Math.ceil(maxY) - Math.floor(minY)),
      }
    }
  }

  const bounds = activeBounds.value.boundsPx || { width: 0, height: 0 }
  const width = Number(bounds.width) || Number(adapt.width) || 0
  const height = Number(bounds.height) || Number(adapt.height) || 0
  return { x: 0, y: 0, width, height }
})

const floorBoundary = computed(() => {
  if (!isInfinitePlant.value) {
    const rect = plantRect.value
    const width = Number(rect.width) || 0
    const height = Number(rect.height) || 0
    const x = Number(rect.x) || 0
    const y = Number(rect.y) || 0
    return {
      width,
      height,
      x,
      y,
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
    }
  }
  const bounds = activeBounds.value.boundsPx || { width: 0, height: 0 }
  const zoom = canvasStore.zoom || 1
  const viewWidth = stageSize.value.width / (zoom || 1)
  const viewHeight = stageSize.value.height / (zoom || 1)
  const width = Math.max(bounds.width || 0, viewWidth || 0)
  const height = Math.max(bounds.height || 0, viewHeight || 0)
  return {
    width,
    height,
    x: 0,
    y: 0,
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
  }
})

// Configuración del layer - SIEMPRE USA CANVAS ADAPTATIVO
const layerConfig = computed(() => {
  const baseWidth = canvasStore.canvasAdaptativo?.width || 0
  const baseHeight = canvasStore.canvasAdaptativo?.height || 0
  if (!isInfinitePlant.value) {
    return { width: baseWidth, height: baseHeight }
  }
  const zoom = canvasStore.zoom || 1
  const viewWidth = stageSize.value.width / (zoom || 1)
  const viewHeight = stageSize.value.height / (zoom || 1)
  return {
    width: Math.max(baseWidth, viewWidth || 0),
    height: Math.max(baseHeight, viewHeight || 0),
  }
})

const mainFloorInfoText = computed(() => {
  const dimsText = formatLengthsCm([
    (layerConfig.value.width || 0) * viewport.cmPerPx,
    (layerConfig.value.height || 0) * viewport.cmPerPx,
  ])
  if (!canvasStore.estaEnPlanta) {
    const name = canvasStore.estructuraContenedorActual?.nombre || ''
    return `${name} - ${dimsText}`
  }
  return `${canvasStore.plantaActivaData?.nombre || ''} - ${dimsText}`
})

const plantElementsText = computed(() => `Elementos: ${elementosVisiblesEnCanvas.value.length}`)

const floorLabelPositions = computed(() => {
  const zoom = canvasStore.zoom || 1
  const fallback = {
    main: { x: 10, y: -(39 / zoom) },
    secondary: { x: 10, y: -(19 / zoom) },
  }

  if (!canvasStore.estaEnPlanta || isInfinitePlant.value) {
    return fallback
  }

  const rect = plantRect.value || { x: 0, y: 0, width: 0, height: 0 }
  const paddingScreen = 10
  const lineGapScreen = 18

  const padWorld = paddingScreen / zoom
  const lineGapWorld = lineGapScreen / zoom

  const rectX = Number(rect.x)
  const rectY = Number(rect.y)
  const baseX = (Number.isFinite(rectX) ? rectX : 0) + padWorld
  const baseY = (Number.isFinite(rectY) ? rectY : 0) - (lineGapWorld + padWorld) - 10

  return {
    main: { x: baseX, y: baseY },
    secondary: { x: baseX, y: baseY + lineGapWorld },
  }
})

// Composable para zoom
const {
  getDynamicMinZoom: getMinZoom,
  fitToMinZoom,
  fitToContent,
} = useZoom(stageSize, layerConfig)

// Elementos visibles en el canvas (excluye elementos ocultos)
const elementosVisiblesEnCanvas = computed(() => {
  const visibles = canvasStore.elementosVisibles.filter((elemento) => elemento.visible !== false)
  if (!isInfinitePlant.value) {
    return visibles
  }

  const zoom = canvasStore.zoom || 1
  const stageWidth = stageSize.value.width || 0
  const stageHeight = stageSize.value.height || 0

  if (!stageWidth || !stageHeight || !Number.isFinite(zoom) || zoom <= 0) {
    return visibles
  }

  const viewX = -canvasStore.panX / zoom
  const viewY = -canvasStore.panY / zoom
  const viewW = stageWidth / zoom
  const viewH = stageHeight / zoom
  const padding = 200 / zoom

  const minX = viewX - padding
  const maxX = viewX + viewW + padding
  const minY = viewY - padding
  const maxY = viewY + viewH + padding

  const stage = stageRef.value?.getNode?.()

  return visibles.filter((elemento) => {
    const width = getDrawWidth(elemento) || 0
    const height = getDrawHeight(elemento) || 0
    const x = elemento.x ?? 0
    const y = elemento.y ?? 0

    const intersects = x + width >= minX && x <= maxX && y + height >= minY && y <= maxY
    if (intersects) {
      return true
    }

    if (stage) {
      const node = stage.findOne?.(`#${elemento.id}`)
      if (node && typeof node.isDragging === 'function' && node.isDragging()) {
        return true
      }
    }

    return false
  })
})

// Detectar si existen pasillos visibles y toggle para su borde punteado
const hasPasillos = computed(() =>
  elementosVisiblesEnCanvas.value.some((e) => (e.tipo || '').toLowerCase() === 'pasillos'),
)
const showPasillosDash = ref(true)

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
  const boundary = floorBoundary.value
  const layerWidth = Number(boundary.width) || 0
  const layerHeight = Number(boundary.height) || 0

  if (!isInfinitePlant.value) {
    const startX = Number(boundary.x) || 0
    const endX = startX + layerWidth
    for (let x = startX; x <= endX + 0.5; x += gridSizePx) {
      vertical.push(x)
    }

    const startY = Number(boundary.y) || 0
    const endY = startY + layerHeight
    for (let y = startY; y <= endY + 0.5; y += gridSizePx) {
      horizontal.push(y)
    }
  } else {
    for (let x = 0; x <= layerWidth; x += gridSizePx) {
      vertical.push(x)
    }

    for (let y = 0; y <= layerHeight; y += gridSizePx) {
      horizontal.push(y)
    }
  }

  return { vertical, horizontal }
})

watch(
  [plantPolygon, isInfinitePlant],
  ([poly, infinite]) => {
    const layer = layerRef.value?.getNode?.()
    if (!layer) return

    if (infinite || !poly?.length) {
      try {
        layer.clipFunc(null)
        if (typeof layer.clipWidth === 'function') layer.clipWidth(null)
        if (typeof layer.clipHeight === 'function') layer.clipHeight(null)
        if (typeof layer.clipX === 'function') layer.clipX(0)
        if (typeof layer.clipY === 'function') layer.clipY(0)
      } catch {
        /* ignore */
      }
      layer.batchDraw?.()
      return
    }

    layer.clipFunc((ctx) => {
      ctx.beginPath()
      poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.closePath()
    })
    layer.batchDraw?.()
  },
  { immediate: true, deep: true },
)

// Contorno activo siempre expresado como polígono
const computeBoundary = () => {
  return {
    type: 'polygon',
    mode: activeBounds.value.mode || 'fixed',
    points: plantPolygon.value,
    inset: insetPoly.value,
  }
}

const getDynamicMinZoom = getMinZoom

const handleWheel = (e) => {
  e.evt.preventDefault()

  const stage = stageRef.value.getNode()
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()

  const scaleBy = 1.1
  const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

  const dynamicMinZoom = getDynamicMinZoom()
  const clampedScale = Math.max(dynamicMinZoom, Math.min(5, newScale))

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  const newPos = {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  }

  canvasStore.configurarZoom(clampedScale, dynamicMinZoom)
  canvasStore.configurarPan(newPos.x, newPos.y)
}

const MAX_ZOOM = 5
const ZOOM_STEP = 1.1
const canZoomIn = computed(() => (canvasStore.zoom || 1) < MAX_ZOOM)
const canZoomOut = computed(() => (canvasStore.zoom || 1) > getDynamicMinZoom())

const zoomBy = (factor) => {
  try {
    const stage = stageRef.value.getNode()
    const oldScale = stage.scaleX()
    const dynamicMinZoom = getDynamicMinZoom()
    const newScale = Math.max(dynamicMinZoom, Math.min(MAX_ZOOM, oldScale * factor))
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
    canvasStore.configurarZoom(newScale, dynamicMinZoom)
    canvasStore.configurarPan(newPos.x, newPos.y)
  } catch (err) {
    console.warn('Error during zoomBy:', err)
  }
}

const zoomIn = () => zoomBy(ZOOM_STEP)
const zoomOut = () => zoomBy(1 / ZOOM_STEP)

const onKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === '+') {
      e.preventDefault()
      zoomIn()
    }
    if (e.key === '=') {
      e.preventDefault()
      zoomIn()
    }
    if (e.key === '-') {
      e.preventDefault()
      zoomOut()
    }
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
    return
  }

  // Resaltar sección de guardados
  if (
    canvasStore.cambiosNoAplicados &&
    e.target === e.target.getStage() &&
    canvasStore.elementoSeleccionado
  ) {
    const msg = 'Tienes cambios pendientes de guardar'
    showToast(msg, 'warn')
  }
}

// === FUNCIONES DE ELEMENTOS ===
const selectElement = (element) => {
  if (element?.restrictions && element?.restrictions.includes('open-properties')) return
  console.log('Seleccionando elemento:', element.id)
  const isNotCurrentElement = canvasStore.elementoSeleccionado !== element.id
  if (canvasStore.cambiosNoAplicados && canvasStore.elementoSeleccionado && isNotCurrentElement) {
    const msg = 'No puedes seleccionar un nuevo elemento con cambios pendientes de guardar'
    showToast(msg, 'warn')
    return
  }
  canvasStore.seleccionarElemento(element.id)
  // Si el modo arrastre global está activado y el elemento NO está bloqueado, activar edición (transformer)
  if (dragModeGlobal.value && element.id && !isElementLocked(element.id)) {
    editingElementId.value = element.id
    nextTick(setupTransformer)
  } else {
    editingElementId.value = null
  }
}

const handleElementDoubleClick = (elemento) => {
  if (elemento?.restrictions && elemento.restrictions.includes('enter')) return
  console.log('Double-click en elemento:', elemento.nombre)

  if (canvasStore.cambiosNoAplicados && canvasStore.elementoSeleccionado) {
    const msg = 'No puedes entrar a un elemento si tienes cambios pendientes de guardar'
    showToast(msg, 'warn')
    return
  }
  // Navegables según la nueva jerarquía: cuartos, pisos, elementos
  const navegables = ['cuartos', 'pisos', 'elementos']
  if (navegables.includes(elemento.tipo)) {
    console.log('Navegando dentro de:', elemento.nombre)
    canvasStore.navegarAElemento(elemento.id)
  }
}

const toLayerCoords = (pos) => {
  const stage = stageRef.value.getNode()
  const scale = stage.scaleX() || 1
  const x = (pos.x - stage.x()) / scale
  const y = (pos.y - stage.y()) / scale
  return { x, y }
}

const toStageCoords = (pos) => {
  const stage = stageRef.value.getNode()
  const scale = stage.scaleX() || 1
  return { x: pos.x * scale + stage.x(), y: pos.y * scale + stage.y() }
}

// Drag bound para cada elemento y forma (clamp mínimo al contorno)
const dragBoundForElement = (pos, elemento) => {
  try {
    if (isInfinitePlant.value) {
      return pos
    }
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
  forceRedraw,
})

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
  isRestricted,
  setupTransformer,
  handleTransformStart,
  handleTransformMove,
  handleTransformEnd,
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
  computeBoundary,
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

  const contextoActual = canvasStore.contextoActual?.tipo || 'plantas'
  const tipoElemento = elemento.tipo

  // Reglas de jerarquía actualizadas
  const allowedByContext = {
    plantas: ['cuartos', 'elementos', 'pasillos'],
    cuartos: ['pisos'],
    pisos: ['elementos'],
    elementos: ['contenedores'],
    contenedores: [],
    pasillos: [],
  }
  const permitidos = allowedByContext[contextoActual] || []
  if (!permitidos.includes(tipoElemento)) {
    const msgMap = {
      plantas: 'Aquí solo puedes agregar cuartos, elementos o pasillos.',
      cuartos: 'Aquí solo puedes agregar pisos.',
      pisos: 'Aquí solo puedes agregar elementos.',
      elementos: 'Dentro de elementos solo se permiten contenedores.',
      contenedores: 'No puedes agregar elementos dentro de contenedores.',
      pasillos: 'No puedes agregar elementos dentro de pasillos.',
    }
    showToast(msgMap[contextoActual] || 'No puedes agregar este tipo aquí.', 'error')
    return { ok: false, reason: 'hierarchy' }
  }

  // Si es pasillo, ajustar alto al de la planta ANTES de validar
  let elementoParaPeso = elemento
  const plantaAlto = canvasStore.plantaActivaData?.dimensiones?.alto
  if ((elemento?.tipo || '').toLowerCase() === 'pasillos') {
    const dims = { ...(elemento.dimensiones || {}) }
    if (Number.isFinite(plantaAlto)) dims.alto = plantaAlto
    elementoParaPeso = { ...elemento, dimensiones: dims }
  }

  const resultadoValidacionPeso = weightValidation.validarPesoElemento(
    elementoParaPeso,
    canvasStore.contextoActual.id,
    canvasStore.contextoActual.tipo,
  )

  if (!resultadoValidacionPeso.valido) {
    let tipoPadre = ''
    if (canvasStore.estaEnPlanta) {
      tipoPadre = 'la planta'
    } else if (canvasStore.estaEnCuarto) {
      tipoPadre = 'el cuarto'
    } else if (canvasStore.estaEnPiso) {
      tipoPadre = 'el piso'
    } else if (canvasStore.estaEnContenedor) {
      tipoPadre = 'el contenedor'
    } else if (canvasStore.estaEnElemento) {
      tipoPadre = 'el elemento'
    }
    // El elemento excedería el peso máximo permitido
    showToast(
      `No se puede agregar: excedería el peso máximo soportado de ${tipoPadre} (${resultadoValidacionPeso.exceso} kg más)`,
      'error',
    )
    return { ok: false, reason: 'weight' }
  }

  let { width, height } = getElementPixelDimensions(elemento)
  let anchoCm = elemento.dimensiones?.ancho || 100
  let largoCm = elemento.dimensiones?.largo || 60
  let altoCm = elemento.dimensiones?.alto || 20

  if ((elemento?.tipo || '').toLowerCase() === 'pasillos' && Number.isFinite(plantaAlto)) {
    altoCm = plantaAlto
  }

  const isSystemDefault = !!(
    elemento?.props?.system === true && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(elemento.id)
  )
  if (isSystemDefault && elemento?.dimensionLock !== true) {
    const planta = canvasStore.plantaActivaData
    if (planta && planta.dimensiones) {
      const parentDims = {
        w: planta.dimensiones.ancho,
        h: planta.dimensiones.largo,
        d: planta.dimensiones.alto,
      }
      const dims = computeDimsByAxisScale(elemento.id, parentDims, {
        snap: true,
        gridPx: GRID_SIZE,
      })
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
        const zBase = toPrecisionCm((planta.dimensiones.alto || 0) * off)
        elemento.alturaRespectoAlSuelo = zBase
      }
    }
  }

  const MIN_WIDTH = 10
  const MIN_HEIGHT = 10
  let finalWidth = Math.max(width, MIN_WIDTH)
  let finalHeight = Math.max(height, MIN_HEIGHT)

  const world = getWorldCoordinatesFromPointer(dropEvent)
  let candX = world.x - finalWidth / 2
  let candY = world.y - finalHeight / 2

  const effectiveGrid = canvasStore.vistaActiva === 'XZ' ? 0 : (canvasStore.gridSize ?? GRID_SIZE)
  const snapped = snapToGrid(candX, candY, effectiveGrid)
  candX = snapped.x
  candY = snapped.y

  if (!canvasStore.estaEnPlanta) {
    const parent = canvasStore.estructuraContenedorActual
    const siblings = parent?.hijos?.map((id) => canvasStore.elementoPorId(id)).filter(Boolean) || []
    const temp = {
      id: '__temp',
      dimensiones: { ancho: anchoCm, largo: largoCm, alto: altoCm },
      posicion: { x: candX, y: candY },
    }
    const sess = makeInnerSession({
      parentEl: parent,
      movingEl: temp,
      siblings,
      vista: canvasStore.vistaActiva,
    })
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

  // Crear elemento temporal para validaciones
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

  const boundary = computeBoundary()

  if (boundary) {
    const clamped = clampInsideArea(candX, candY, finalWidth, finalHeight, boundary, tempEl)
    candX = clamped.x
    candY = clamped.y
    tempEl.x = candX
    tempEl.y = candY
  }

  // Usar la misma validación estricta que isPlacementValid
  const areaBounds = {
    minX: 0,
    minY: 0,
    maxX: boundary.W || layerConfig.value.width,
    maxY: boundary.H || layerConfig.value.height,
    polygon: boundary.points,
  }

  // Validación inicial estricta usando insideAreaModel
  let isInside = insideAreaModel({ x: candX, y: candY }, tempEl, areaBounds, 0.5)

  const all = canvasStore.elementosVisibles
  const conflicts = detectConflictsFor(tempEl, all)
  const blocking = conflicts.filter((c) => c.bloqueante)

  let finalPos = { x: candX, y: candY }
  const shouldTryNudge = blocking.length > 0 || (!isInside && boundary?.mode !== 'elastic')
  let ok = blocking.length === 0 && isInside

  // Solo usar nudgePlace si hay conflictos de colisión o si quedó fuera del área en modo fijo
  if (shouldTryNudge) {
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
      // Validar que la posición encontrada por nudge también esté dentro del área
      const nudgedEl = { ...tempEl, x: nudge.x, y: nudge.y }
      if (insideAreaModel({ x: nudge.x, y: nudge.y }, nudgedEl, areaBounds, 0.5)) {
        finalPos = { x: nudge.x, y: nudge.y }
        ok = true
      }
    }
  }

  if (!ok) {
    showToast('No fue posible colocar el elemento dentro de los límites de la planta.', 'error')
    return { ok: false, reason: 'bounds' }
  }

  // Validación final: asegurar que la posición final sea válida con la misma lógica que drag
  if (!insideAreaModel(finalPos, { ...tempEl, x: finalPos.x, y: finalPos.y }, areaBounds, 0.5)) {
    showToast('El elemento quedaría fuera del área permitida.', 'error')
    return { ok: false, reason: 'bounds' }
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

  const isAisle = (elemento?.tipo || '').toLowerCase() === 'pasillos'
  const nuevoElemento = {
    id: `${elemento.tipo || elemento.categoria || 'elemento'}_${Date.now()}`,
    tipo: elemento.tipo,
    categoria: elemento.categoria,
    // Para pasillos NO establecer nombre por defecto; dejar que el store lo genere
    ...(isAisle ? {} : { nombre: elemento.nombre || 'Nuevo elemento' }),
    dimensiones: { ancho: anchoCm, largo: largoCmFinal, alto: altoCm },
    x: finalPosition.x,
    y: finalPosition.y,
    width: finalWidth,
    height: finalHeightFinal,
    color: color,
    colorBase: color,
    forma: elemento.forma || 'rectangular',
    orientacion: Number(elemento.orientacion) || 0,
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    alturaRespectoAlSuelo: elemento.alturaRespectoAlSuelo || 0,
    pesoMaximo: elemento.pesoMaximo || 0,
    volumenMaximo: (anchoCm * largoCmFinal * altoCm) / 100,
    dimensionLock: false,
    systemTypeKey: elemento.id,
    uso: { volumen: 0, peso: 0 },
    descripcion: elemento.descripcion || '',
    contenedores: elemento.contenedores ? [...elemento.contenedores] : [],
    hijos: [],
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

// Barra de orientación: rectángulo amarillo interior indicando el lado de orientación (no aplica a circulares)
const getOrientationBarRect = (elemento) => {
  try {
    if (!elemento) return null
    // No mostrar para circulares ni para pasillos
    const forma = (elemento.forma || '').toLowerCase()
    const tipo = (elemento.tipo || '').toLowerCase()
    if (forma === 'circular' || tipo === 'pasillos') return null
    // Si la vista es XZ, no mostrar barra de orientación
    if (canvasStore.vistaActiva === 'XZ') return null
    const w = Number(elemento.width) || 0
    const h = Number(elemento.height) || 0
    if (w <= 0 || h <= 0) return null
    const allowed = [0, 90, 180, 270]
    let o = Number(elemento.orientacion)
    if (!Number.isFinite(o)) o = 0
    o = ((o % 360) + 360) % 360
    if (!allowed.includes(o)) o = 0
    // Barra pegada al borde (sin margen), grosor escalado por zoom
    const margin = 0
    const thick = Math.max(2, 4 / (canvasStore.zoom || 1))
    const color = '#fdfd43'
    if (o === 180) {
      const width = Math.max(1, w - 2 * margin)
      return { x: margin, y: 0, width, height: thick, fill: color, listening: false, opacity: 0.95 }
    }
    if (o === 0) {
      const width = Math.max(1, w - 2 * margin)
      return {
        x: margin,
        y: Math.max(0, h - thick),
        width,
        height: thick,
        fill: color,
        listening: false,
        opacity: 0.95,
      }
    }
    if (o === 90) {
      const height = Math.max(1, h - 2 * margin)
      return {
        x: Math.max(0, w - thick),
        y: margin,
        width: thick,
        height,
        fill: color,
        listening: false,
        opacity: 0.95,
      }
    }
    // 270
    const height = Math.max(1, h - 2 * margin)
    return { x: 0, y: margin, width: thick, height, fill: color, listening: false, opacity: 0.95 }
  } catch {
    return null
  }
}

const getElementLabelText = (elemento) => {
  if (!elemento) return 'Elemento'
  const tipoKey = (elemento?.tipo || '').toLowerCase()
  const code = elemento?.codigo || ''
  if (tipoKey === 'cuartos') {
    const name = elemento?.nombre || 'Cuarto'
    return code ? `${name}\n${code}` : name
  }
  return code || elemento?.nombre || elemento?.tipo || 'Elemento'
}

// Si el elemento es más alto que ancho (h > w), se muestra el texto en vertical (rotado -90°);
const computeLabelProps = (elemento) => {
  const w = getDrawWidth(elemento)
  const h = getDrawHeight(elemento)
  const minSide = Math.max(0, Math.min(w, h))
  const base = Math.min(280, Math.max(100, minSide * 0.22))
  const displayText = getElementLabelText(elemento)
  let cfg = {
    x: 0,
    y: 0,
    width: w,
    height: h,
    rotation: 0,
    text: displayText,
    align: 'center',
    verticalAlign: 'middle',
    fontStyle: 'bold',
    fontFamily: 'Arial',
    fontSize: base,
    listening: false,
    fill: '#111827',
    shadowColor: 'black',
    shadowBlur: 2,
    shadowOpacity: 0.6,
    lineHeight: 1.15,
  }

  if (h > w && w > 0 && h > 0) {
    cfg = {
      ...cfg,
      x: 0,
      y: h,
      width: h,
      height: w,
      rotation: -90,
    }
  }

  return cfg
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
          // VOLVEMOS AL ZOOM INVASIVO ORIGINAL
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

          // ANIMAMOS EL AURA (su opacidad y escala)
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
  // Obtener el elemento del buffer
  const bufferItem = buffer.getBufferItem(data.bufferItemId)
  if (!bufferItem) {
    showToast('Elemento no encontrado en el buffer', 'error')
    return
  }

  // Delegar todas las validaciones a la ruta unificada
  const res = runPreDropValidations(bufferItem.elemento, dropEvent)
  if (!res.ok) return

  const newElementId = buffer.pasteFromBuffer(data.bufferItemId, res.position)
  if (newElementId) {
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
  // Unificar instanciación de estructuras (plantillas/cuarto/espacio)
  const newId = instantiateStructureOnCanvas(canvasStore, payload, res.position)
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

const canDragElement = (elemento) => {
  // Solo permitir drag si el modo global está activo y el elemento no está bloqueado
  // Y si no hay cambios sin aplicar de otro elemento
  const isNotCurrentElement = canvasStore.elementoSeleccionado != elemento.id
  if (
    isElementLocked(elemento.id) ||
    (canvasStore.cambiosNoAplicados && isNotCurrentElement) ||
    (elemento?.restrictions && elemento.restrictions.includes('drag'))
  )
    return false
  return dragModeGlobal.value
}

const updateStageSize = () => {
  if (!containerRef.value) return
  const container = containerRef.value
  stageSize.value = { width: container.offsetWidth, height: container.offsetHeight }
  centrarPlantaEnCanvas()
}

function centrarPlantaEnCanvas(options = {}) {
  const { force = false } = options
  if (isInfinitePlant.value && !force) return
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
  } catch {
    /* ignore */
  }
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
      return
    }
    canvasStore.seleccionarElemento(null)
    editingElementId.value = null
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

function recomputeBoundsAndIndex({ skipCenter = false } = {}) {
  try {
    conflictsApi.clear()
    dragLastValidPositions.value.clear()
    isElementDragging.value = false
    stageDragEnabled.value = true
    if (!skipCenter) {
      nextTick(() => centrarPlantaEnCanvas())
    }
  } catch {
    console.error('Error recomputando bounds e índice de elementos')
  }
}

function forceRedraw() {
  try {
    const layer = layerRef.value?.getNode?.()
    const stage = stageRef.value?.getNode?.()
    if (!layer || !stage) return
    layer.clearCache?.()
    stage.clearCache?.()
    layer.batchDraw?.()
    stage.batchDraw?.()
  } catch {
    console.error('Error forzando redraw')
  }
}

function resetVolatileState() {
  try {
    dragLastValidPositions.value.clear()
    conflictsApi.clear()
    isElementDragging.value = false
    stageDragEnabled.value = true
  } catch (e) {
    console.error('Error reseteando estado volátil:', e)
  }
}

if (typeof window !== 'undefined') {
  window.__canvasApi = { recomputeBoundsAndIndex, forceRedraw, resetVolatileState }
}

watch(
  () => [layerConfig.value.width, layerConfig.value.height],
  async () => {
    await nextTick()
    recomputeBoundsAndIndex({ skipCenter: isInfinitePlant.value })
    await nextTick()
    forceRedraw()
  },
)

watch(
  () => canvasStore.elementoSeleccionadoCompleto,
  (elementoActual) => {
    // Comprobamos si hay un cambio Y SI NO estamos interactuando con el transformer.
    if (elementoActual && isEditingSelected.value && !isInteractingWithTransformer.value) {
      nextTick(() => {
        setupTransformer()
      })
    }
  },
  { deep: true },
)

// Ajustar la vista para encuadrar la planta activa
const fitToPlanta = () => {
  try {
    const stage = stageRef.value?.getNode?.()

    if (!stage) {
      // Fallback seguro: usar min zoom y centrar
      fitToMinZoom(stageRef.value?.getNode?.())
      return
    }

    // Ajustar directamente al contenido (BBox + margen)
    fitToContent(stage)

    // Sincronizar llamada explícita para compatibilidad con pruebas:
    // intentar usar el bbox del polígono crudo (sin interpretar unidades)
    const dynamicMinZoom = getDynamicMinZoom()
    let z = dynamicMinZoom
    try {
      const poly = canvasStore.plantaActivaData?.poligono
      if (Array.isArray(poly) && poly.length >= 3) {
        const xs = poly.map((p) => Number(p.x) || 0)
        const ys = poly.map((p) => Number(p.y) || 0)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        const bw = Math.max(1, maxX - minX)
        const bh = Math.max(1, maxY - minY)
        const margin = 40
        const vw = Math.max(16, stageSize.value.width - margin * 2)
        const vh = Math.max(16, stageSize.value.height - margin * 2)
        const sx = vw / bw
        const sy = vh / bh
        const fit = Math.min(sx, sy)
        if (Number.isFinite(fit) && fit > 0) z = fit
      }
    } catch { /* ignore */ }

    if (isInfinitePlant.value) {
      canvasStore.configurarZoom(canvasStore.zoom, dynamicMinZoom)
    } else {
      canvasStore.configurarZoom(z, z)
    }
  } catch (e) {
    console.error('fitToPlanta error', e)
    try {
      const stage = stageRef.value?.getNode?.()
      if (stage) fitToMinZoom(stage)
    } catch {
      /* ignore */
    }
  }
}

// Auto-ajustar siempre que cambia el contexto (planta / elemento / contenedor)
watch(
  () => {
    const ctx = canvasStore.contextoActual || {}
    return [ctx?.tipo, ctx?.id]
  },
  async () => {
    const ctx = canvasStore.contextoActual
    if (!ctx || !ctx.tipo) return
    // Esperar a que el store recalcule canvasAdaptativo y layerConfig
    await nextTick()
    await nextTick()

    const dynamicMinZoom = getDynamicMinZoom()
    canvasStore.configurarZoom(dynamicMinZoom, dynamicMinZoom)

    const stage = stageRef.value?.getNode?.()
    if (stage) {
      const centerX = stageSize.value.width / 2
      const centerY = stageSize.value.height / 2
      canvasStore.configurarPan(centerX, centerY)
    }
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
  if (elemento?.restrictions && elemento.restrictions.includes('right-click')) return
  try {
    ;(evt?.evt || evt)?.preventDefault?.()
  } catch {
    /* ignore */
  }
  // No abrir si hay drag activo
  if (isElementDragging.value || (typeof window !== 'undefined' && window.__dvCanvasDragActive)) {
    return
  }
  // No abrir si hay cambios pendientes
  const isNotCurrentElement = canvasStore.elementoSeleccionado !== elemento.id
  if (canvasStore.cambiosNoAplicados && isNotCurrentElement) return
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
  const el =
    canvasStore.elementosVisibles.find((e) => e.id === id) || canvasStore.elementoPorId?.(id)
  if (el && (el.bloqueado === true || el.locked === true)) {
    showToast('Elemento bloqueado — desbloquéalo para eliminar', 'warning', { timeout: 5000 })
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

const getStageInstance = () => stageRef.value?.getNode?.() || null

const getStageSizeSnapshot = () => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
})

const getViewportWorldRect = () => {
  const stage = getStageInstance()
  if (!stage) return null
  const scale = typeof stage.scaleX === 'function' ? stage.scaleX() || 1 : 1
  if (!Number.isFinite(scale) || scale === 0) return null
  const stageX = typeof stage.x === 'function' ? stage.x() || 0 : 0
  const stageY = typeof stage.y === 'function' ? stage.y() || 0 : 0
  return {
    minX: (0 - stageX) / scale,
    minY: (0 - stageY) / scale,
    maxX: (stageSize.value.width - stageX) / scale,
    maxY: (stageSize.value.height - stageY) / scale,
  }
}

defineExpose({
  getStage: getStageInstance,
  getStageSize: getStageSizeSnapshot,
  getViewportWorldRect,
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

.canvas-container.infinite-floor {
  overflow: visible;
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

.canvas-info.should-wrap {
  flex-wrap: wrap;
  gap: 10px;
}
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.9);
}
</style>
