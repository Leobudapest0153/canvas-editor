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
    <!-- Indicador de peso máximo (solo se muestra cuando hay un límite de peso) -->
    <!-- <div
      v-if="weightValidation.contextoActualTieneLimiteDePeso"
      class="weight-indicator"
      :class="{
        'weight-warning': weightValidation.infoPesoContextoActual.porcentajeUsado > 75,
        'weight-danger': weightValidation.infoPesoContextoActual.porcentajeUsado > 90
      }"
    >
      <div class="weight-icon">⚖️</div>
      <div class="weight-bar">
        <div
          class="weight-progress"
          :style="{ width: `${Math.min(100, weightValidation.infoPesoContextoActual.porcentajeUsado)}%` }"
        ></div>
      </div>
      <div class="weight-text">
        {{ Math.round(weightValidation.infoPesoContextoActual.usado) }} u/
        {{ weightValidation.infoPesoContextoActual.maximo }} m kg
      </div>
    </div> -->
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


        <!-- Aquí podrías añadir v-circle, etc., si tienes otras formas -->
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

          <v-group
            v-if="getUsoInfo(elemento)"
            :config="{
              listening: false
            }"
          >
            <template v-for="(info, index) in getUsoInfo(elemento)" :key="info.tipo">
              <template v-if="((
        barHeight = 12,
        barMargin = 12,
        totalHeight = (barHeight + barMargin) * 2,
        barWidth = elemento.width * 0.8 > 200 ? 200 : elemento.width * 0.8,
        offsetX = (elemento.width - barWidth) / 2,
        offsetY = elemento.height - totalHeight + (barHeight + barMargin) * index
      ))">
        <!-- 1. Texto del Título (Volumen / Peso) -->
        <v-text
          :config="{
            x: elemento.x,
            y: elemento.y + offsetY - 7,
            width: elemento.width,
            height: barHeight,
            text: info.tipo,
            fontSize: 9,
            fontFamily: 'Arial',
            fill: '#4b5563',
            align: 'center',
            verticalAlign: 'middle',
          }"
        />

        <!-- 2. Barra de fondo (gris) -->
        <v-rect
          :config="{
            x: elemento.x + offsetX,
            y: elemento.y + offsetY + 4,
            width: barWidth,
            height: barHeight,
            fill: '#FFF',
            cornerRadius: 4,
            stroke: '#242930',
            strokeWidth: 0.5,
          }"
        />

        <!-- 3. Barra de progreso (color dinámico) -->
        <v-rect
          :config="{
            x: elemento.x + offsetX,
            y: elemento.y + offsetY + 4,
            width: barWidth * (info.porcentaje / 100),
            height: barHeight,
            fill: info.color,
            cornerRadius: 4,
          }"
        />

        <!-- 4. Texto del Porcentaje -->
        <v-text
          :config="{
            x: elemento.x + offsetX,
            y: elemento.y + offsetY + 5,
            height: barHeight,
            width: barWidth,
            align: 'center',
            text: `${info.porcentaje}%`,
            fontSize: 9,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#242930',
            verticalAlign: 'middle',
          }"
        />
      </template>
            </template>
          </v-group>

        </template>

        <!-- Los contenedores se renderizan junto con los elementos en la sección principal -->

      </v-layer>

      <v-layer ref="uiLayerRef" :config="{ listening: false }">

        <!-- Debug: mostrar información según el contexto -->
        <v-text
          :config="{
            x: 10,
            y: -(39 / canvasStore.zoom),
            text:
              canvasStore.estaEnElemento || canvasStore.estaEnContenedor
                ? `${canvasStore.elementoContenedorActual?.nombre || 'Elemento'} - ${fmtCm(pxToCm(layerConfig.width, viewport.cmPerPx))}x${fmtCm(pxToCm(layerConfig.height, viewport.cmPerPx))} (Adaptativo)`
                : `${canvasStore.plantaActivaData?.nombre || 'Planta'} - ${fmtCm(pxToCm(layerConfig.width, viewport.cmPerPx))}x${fmtCm(pxToCm(layerConfig.height, viewport.cmPerPx))} (${fmtCm(canvasStore.plantaActivaData?.dimensiones.ancho)}x${fmtCm(canvasStore.plantaActivaData?.dimensiones.largo)})`,
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
      unit="m"
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
      @fill-container="() => simularLlenadoContenedor(canvasStore.elementoSeleccionado)"
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
      @close="ctx.close()"
    />

    <!-- Información de zoom, vista y dimensiones -->
    <div class="canvas-info">
      <span>Zoom: {{ Math.round(canvasStore.zoom * 100) }}%</span>
      <span>{{ t('views.label') }}: {{ t(`views.${canvasStore.vistaActiva}`) }}</span>
      <span v-if="canvasStore.estaEnPlanta && canvasStore.plantaActivaData">
        Planta: {{ fmtCm(canvasStore.plantaActivaData.dimensiones.ancho) }}×{{
          fmtCm(canvasStore.plantaActivaData.dimensiones.largo)
        }} (Vista aérea)
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
          ({{ fmtCm(canvasStore.elementoContenedorActual.dimensiones.ancho) }}×{{ fmtCm(canvasStore.elementoContenedorActual.dimensiones.alto) }} - Vista de frente)
        </template>
        <template v-else>
          ({{ fmtCm(pxToCm(canvasStore.canvasAdaptativo.width, viewport.cmPerPx)) }}×{{ fmtCm(pxToCm(canvasStore.canvasAdaptativo.height, viewport.cmPerPx)) }})
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

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { t } from '@/inventory-smart/i18n'
import { useCacheOnDrag } from '@/inventory-smart/composables/useCacheOnDrag'
import { setupRafDrag } from '@/inventory-smart/composables/useRafDrag'
import { enablePerfMode } from '@/inventory-smart/composables/usePerfMode'
import { throttleEveryNFrames } from '@/inventory-smart/utils/dragMath'
import { useCanvasWithHistory } from '@/inventory-smart/composables/useCanvasWithHistory'
import { useCanvasBuffer } from '@/inventory-smart/composables/useCanvasBuffer'
import { useConflicts } from '@/inventory-smart/composables/useConflicts'
import RulersOverlay from '@/inventory-smart/components/RulersOverlay.vue'
import {
  detectConflictsFor,
  throttle,
  computeMTD,
  projectMTDAgainstBoundary,
} from '@/inventory-smart/utils/collision'
import {
  clampRectToRect,
  snapToGrid,
  nudgePlace,
} from '@/inventory-smart/utils/geometry'
import { clampRectToPolygon, pointInPolygon, clampPointToPolygon } from '@/inventory-smart/utils/polygonBounds'
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
import { applyEdgeConstraint } from '@/inventory-smart/utils/edgeConstraint'
import { resetEdgeState } from '@/inventory-smart/composables/useEdgeState'
import { finalizePlacement } from '@/inventory-smart/utils/finalizeDrag'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { makeInnerSession } from '@/inventory-smart/composables/useInnerNoOverlap'
import { useObjectSnapping } from '@/inventory-smart/composables/useObjectSnapping'
import { usePlacementGuards } from '@/inventory-smart/composables/usePlacementGuards'
import FloatingToolbar from '@/inventory-smart/components/FloatingToolbar.vue'
import { getUsoInfo, useProductSimulation } from '@/inventory-smart/utils/simulateProducts'
import SnapGuides from '@/inventory-smart/components/SnapGuides.vue'
import { useToast } from '@/inventory-smart/composables/useToast'

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

// Map of template refs for draggable nodes, keyed by element id
const draggableNodeRefs = new Map()
const registerDraggableRef = (id, node) => {
  let r = draggableNodeRefs.get(id)
  if (!r) {
    r = ref(null)
    draggableNodeRefs.set(id, r)
    // Enable caching on drag for this node
    useCacheOnDrag(r)
  }
  r.value = node
}

const innerSessions = new Map()
let needsDraw = false
let rafId = null
function scheduleDraw() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    if (needsDraw) {
      const layerNode = layerRef.value?.getNode ? layerRef.value.getNode() : layerRef.value
      layerNode?.batchDraw?.()
      needsDraw = false
    }
  })
}

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
  } else if (boundary.type === 'polygon') {
    const c = clampRectToPolygon({ x, y, width: w, height: h }, boundary.inset)
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
      const c2 = clampRectToPolygon({ x, y, width: w, height: h }, boundary.inset)
      x = c2.x
      y = c2.y
    }

    // Si la corrección fue nula, detener
    if (Math.abs(accDx) < 1e-6 && Math.abs(accDy) < 1e-6) break
  }

  // Validaciones finales: si aún hay colisión bloqueante o quedó fuera, volver a última válida
  const movingEnd = { ...elemento, x, y }
  const endConf = detectConflictsFor(movingEnd, all).filter((c) => c.bloqueante)
  const outsideArea =
    boundary.type === 'rect'
      ? x < -1e-6 || y < -1e-6 || x + w > W + 1e-6 || y + h > H + 1e-6
      : !pointInPolygon({ x: x + w / 2, y: y + h / 2 }, boundary.points)
  if (outsideArea) {
    const cp = clampPointToPolygon({ x: x + w / 2, y: y + h / 2 }, boundary.inset)
    x = cp.x - w / 2
    y = cp.y - h / 2
  }
  if (endConf.length > 0 || outsideArea) {
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
  // Limpiar guías de snapping
  clearGuides()
  }
}

// === FUNCIONES DE ELEMENTOS ===
const selectElement = (elementId) => {
  console.log('Seleccionando elemento:', elementId)
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
// Nuevos: tracking de última pos deseada y última velocidad en rAF
const lastDesiredPosMap = ref(new Map())
const lastVelocityMap = ref(new Map())

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
    const { w_cm, h_cm } = dimsCmFor(elemento)
    const w = w_cm * CM_TO_PX
    const h = h_cm * CM_TO_PX
    const c = clampInsideArea(lp.x, lp.y, w, h, boundary)
    return toStageCoords(c)
  } catch {
    return pos
  }
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
    // Inicializar pos deseada y velocidad
    lastDesiredPosMap.value.set(elementId, { x: elemento.x, y: elemento.y })
    lastVelocityMap.value.set(elementId, { x: 0, y: 0 })
  }

  // Resetear estado de borde/histéresis al iniciar
  try { resetEdgeState(elementId) } catch { /* ignore */ }

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
        return {
          x: shape.x(),
          y: shape.y(),
          width: shape.width?.() || 0,
          height: shape.height?.() || 0,
        }
      }

      const onValidateLight = throttle2((bbox) => {
        // Overlay rojo/ok basado en el MISMO predicado de validez (modelo puro)
        const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
        const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
        if (!elemento) return
        const moving = {
          id: elementId,
          width: elemento.forma === 'circular' ? Math.min(bbox.width, bbox.height) : bbox.width,
          height: elemento.forma === 'circular' ? Math.min(bbox.width, bbox.height) : bbox.height,
          forma: elemento.forma || 'rectangular',
          ubicacion: elemento.ubicacion || 'suelo',
        }
        const neighbors = canvasStore.elementosVisibles.filter((e) => e.id !== elementId)
        const isOk = isPlacementValid({
          pos: { x: bbox.x, y: bbox.y },
          movingEl: moving,
          neighbors,
          areaBounds,
          CM_TO_PX,
          epsPx: 0.5,
        })
        const warn = !isOk
        try {
          const bbox = shape.findOne('.bbox')
          const circle =
            elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'
              ? shape.findOne('Circle')
              : null
          if (elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY') {
            circle?.stroke(warn ? '#ef4444' : undefined)
            circle?.strokeWidth(warn ? 2 : 0)
          } else {
            bbox?.stroke(warn ? '#ef4444' : undefined)
            bbox?.strokeWidth(warn ? 2 : 0)
          }
        } catch {
          console.warn('Error al actualizar el color del borde del shape:', elementId)
        }
      })

      const onCommitEnd = () => {}

      // onFrame: aplicar clamp puro de borde con histéresis y luego resolver colisiones
      const onFrame = (desiredPos) => {
        if (!shape) return
        const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
        if (!elemento) return
        const W = layerConfig.value.width
        const H = layerConfig.value.height
        const areaBounds = { minX: 0, minY: 0, maxX: W, maxY: H }

        // Para círculos, desiredPos ya es top-left (convertido en updateElementPosition)
        const asRect = elemento.forma === 'circular'
          ? { ...elemento, width: Math.min(elemento.width, elemento.height), height: Math.min(elemento.width, elemento.height) }
          : elemento

        const { pos } = applyEdgeConstraint({ x: desiredPos.x, y: desiredPos.y }, asRect, areaBounds)

        // Resolver colisiones después del clamp a borde
        let x = pos.x
        let y = pos.y
        const res = resolveAgainstBlockingObstacles(x, y, asRect)
        x = res.x
        y = res.y

        // Escribir en el shape sin snap durante drag
        shape.x(x)
        shape.y(y)
        lastValidPositions.value.set(elementId, { x, y })
      }

      // Función de validación para el RAF drag
      const validatePosition = (pos) => {
        const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
        if (!elemento) return false
        const neighbors = canvasStore.elementosVisibles.filter((e) => e.id !== elementId)
        const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
        return isPlacementValid({ pos, movingEl: elemento, neighbors, areaBounds, CM_TO_PX, epsPx: 0.5 })
      }

      const ctrl = setupRafDrag({
        stage,
        layer,
        getMovingShapeBBox,
        onValidateLight,
        onCommitEnd,
        onFrame,
        validatePosition
      })
      rafControllers.set(elementId, { ctrl, shape, layer })
      ctrl.start()
    }
  } catch {
    console.warn('Error al iniciar el arrastre del elemento:', elementId)
  }
}

const updateElementPosition = (e, elementId) => {
  const target = e.target
  let x = target.x()
  let y = target.y()
  const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
  if (!elemento) return

  // Aplicar object snapping solo si está habilitado y hay movimiento activo
  if (isSnappingEnabled.value && isElementDragging.value) {
    const otherElements = canvasStore.elementosVisibles.filter(el => el.id !== elementId)
  const snapResult = performSnap(elemento, x, y, otherElements, { width: layerConfig.value.width, height: layerConfig.value.height })

    // Usar la posición ajustada por snapping
    x = snapResult.x
    y = snapResult.y
  } else {
    // Si el snapping está deshabilitado o no hay arrastre activo, limpiar guías
    clearGuides()
  }

  // Actualizar lastVelocity respecto a la última pos deseada conocida
  const prev = lastDesiredPosMap.value.get(elementId) || { x: elemento.x, y: elemento.y }
  lastVelocityMap.value.set(elementId, { x: x - prev.x, y: y - prev.y })
  lastDesiredPosMap.value.set(elementId, { x, y })

  // Detectar conflictos en tiempo real (no bloquea)
  const moving = { ...elemento, x, y }
  setLiveConflictsThrottled(moving)

  // Dejar feedback visual y draw al rAF loop; NO escribir en store
  const rec = rafControllers.get(elementId)
  if (rec && rec.ctrl) rec.ctrl.move({ x, y })
}

const endElementDrag = async (elementId) => {
  // console.log('Finalizando arrastre del elemento:', elementId)
  isElementDragging.value = false
  stageDragEnabled.value = true // Rehabilitar arrastre del canvas

  // Limpiar guías de snapping
  clearGuides()

  // Guardar en historial al finalizar el arrastre
  const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
  if (!elemento) return

  // Obtener lastGoodPos y pausar rAF/validaciones live
  const rec = rafControllers.get(elementId)
  let lastGoodPos = null
  if (rec && rec.ctrl && rec.ctrl.getLastGoodPos) {
    lastGoodPos = rec.ctrl.getLastGoodPos()
  }
  // Pausar rAF inmediatamente para evitar interferencias durante finalize
  try { rec?.ctrl?.end?.() } catch { /* ignore */ }

  // Ejecutar validación y finalización con nueva lógica
  try {
    const stage = stageRef.value.getNode()
    const layer = layerRef.value.getNode()
    const shape = stage.findOne(`#${elementId}`)
    if (shape && layer) {
      const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
      const elementoActual = canvasStore.elementosVisibles.find((e) => e.id === elementId)
      if (elementoActual) {
        // Candidato desde el shape (bbox de modelo)
        let candX = shape.x()
        let candY = shape.y()

        // Vecinos bloqueantes (suelo–suelo)
        const neighbors = canvasStore.elementosVisibles.filter((e) =>
          e.id !== elementId && (e.ubicacion || 'suelo') === 'suelo' && (elementoActual.ubicacion || 'suelo') === 'suelo',
        )

        // strokePxEstable: usar el stroke normal del elemento (no la selección). Por defecto 1px
        const strokePx = 1

        // 1. Verificar validez de la posición actual después de finalizePlacement
        const lastPos = lastValidPositions.value.get(elementId) || { x: elementoActual.x, y: elementoActual.y }
        const lastVel = lastVelocityMap.value.get(elementId) || { x: 0, y: 0 }

        // Elemento rectangular para resolver (círculos como AABB)
        const asRect = elementoActual.forma === 'circular'
          ? { ...elementoActual, width: Math.min(elementoActual.width, elementoActual.height), height: Math.min(elementoActual.width, elementoActual.height) }
          : { ...elementoActual }
        asRect.__strokePx = strokePx

        // Ejecutar finalizePlacement primero
        const solved = finalizePlacement({
          candidate: { x: candX, y: candY },
          movingEl: asRect,
          neighbors,
          areaBounds,
          grid: canvasStore.gridSize ?? GRID_SIZE,
          lastValidPos: lastPos,
          CM_TO_PX,
          strokePx,
          lastVelocity: lastVel,
        })

        // 2. Verificar validez final con el MISMO predicado isPlacementValid (modelo puro)
        const finalIsValid = isPlacementValid({
          pos: { x: solved.x, y: solved.y },
          movingEl: elementoActual,
          neighbors,
          areaBounds,
          CM_TO_PX,
          epsPx: 0.5,
        })

        let finalPosition = { x: solved.x, y: solved.y }
        let fallbackUsed = false

        // 3. Si la posición final no es válida, usar lastGoodPos o lastValidPos
        if (!finalIsValid) {
          console.log('Posición final inválida, usando fallback...')

          if (lastGoodPos) {
            console.log('Usando lastGoodPos del RAF drag:', lastGoodPos)
            finalPosition = { x: lastGoodPos.x, y: lastGoodPos.y }
          } else {
            console.log('Usando lastValidPos de dragstart:', lastPos)
            finalPosition = { x: lastPos.x, y: lastPos.y }
          }

          // Aplicar clamp→snap→re-clamp en la posición de fallback
          const { MARGIN_CM } = await import('@/inventory-smart/utils/constants')
          const marginPx = (MARGIN_CM || 0) * (CM_TO_PX || 1)

          const reclampResult = finalizePlacement({
            candidate: finalPosition,
            movingEl: asRect,
            neighbors,
            areaBounds,
            grid: canvasStore.gridSize ?? GRID_SIZE,
            lastValidPos: lastPos,
            CM_TO_PX,
            strokePx,
            lastVelocity: { x: 0, y: 0 }, // Sin velocidad en fallback
          })

          // Validar el resultado del re-clamp
          const reclampIsValid = isPlacementValid({
            pos: { x: reclampResult.x, y: reclampResult.y },
            movingEl: elementoActual,
            neighbors,
            areaBounds,
            CM_TO_PX,
            epsPx: 0.5,
          })

          if (reclampIsValid) {
            finalPosition = { x: reclampResult.x, y: reclampResult.y }
          } else {
            // Si sigue inválido, mantener lastValidPos original
            console.log('Re-clamp sigue inválido, manteniendo lastValidPos original')
            finalPosition = { x: lastPos.x, y: lastPos.y }
          }

          fallbackUsed = true
        }

        // 4. Aplicar posición final al shape
        shape.x(finalPosition.x)
        shape.y(finalPosition.y)

        // 5. Limpiar stroke rojo - elemento ya no debe estar en estado inválido
        try {
          const bbox = shape.findOne('.bbox')
          const circle =
            elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'
              ? shape.findOne('Circle')
              : null
          if (elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY') {
            circle?.stroke(undefined)
            circle?.strokeWidth(0)
          } else {
            bbox?.stroke(undefined)
            bbox?.strokeWidth(0)
          }
        } catch {
          console.warn('Error al limpiar stroke del shape:', elementId)
        }

        // Repaint sincronizado
        await nextTick()
        await new Promise((r) => requestAnimationFrame(() => r()))
        layer.clearCache?.()
        layer.batchDraw?.()
        await new Promise((r) => requestAnimationFrame(() => r()))

        // 6. Guardar snapshot solo si la posición final difiere de lastValidPos
        const positionChanged = Math.abs(finalPosition.x - lastPos.x) > 1e-6 || Math.abs(finalPosition.y - lastPos.y) > 1e-6

        if (positionChanged) {
          const guardRes = onDragEndGuard(elementoActual, finalPosition)
          if (guardRes.valid) {
            canvasStore.actualizarPosicion(
              elementId,
              finalPosition.x,
              finalPosition.y,
            true,
              `Elemento movido: ${elementoActual.nombre || elementoActual.tipo || elementId}`,
            )
          }
        }
        // Actualizar lastValidPositions con la posición final
        lastValidPositions.value.set(elementId, finalPosition)
      }
    }
  } catch (err) {
    console.warn('Error en endElementDrag:', err)
  }

  // Leer posición final del shape para persistir
  let finalX, finalY
  try {
    const stage = stageRef.value.getNode()
    const shape = stage.findOne(`#${elementId}`)
    const elemento = canvasStore.elementosVisibles.find((el) => el.id === elementId)
    if (shape && elemento) {
      finalX = shape.x()
      finalY = shape.y()
    }
  } catch { /* ignore */ }

  // Fallback si no se pudo leer shape
  if (finalX == null || finalY == null) {
    const last = lastValidPositions.value.get(elementId) || { x: elemento.x, y: elemento.y }
    finalX = last.x
    finalY = last.y
  }

  // Garantizar persistencia CON VALIDACIÓN: solo persistir si la posición final es válida
  try {
    const storeEl = canvasStore.elementosVisibles.find((el) => el.id === elementId)
    const EPS_PERSIST = 0.5 // px, tolerancia mínima para considerar cambio
    const posDiff = storeEl && (Math.abs((storeEl.x || 0) - finalX) > EPS_PERSIST || Math.abs((storeEl.y || 0) - finalY) > EPS_PERSIST)

    if (storeEl && posDiff) {
      // Validar que la posición final está dentro del área y es válida según el validador común
      const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
      const neighbors = canvasStore.elementosVisibles.filter((e) => e.id !== elementId)
      const isValidNow = isPlacementValid({ pos: { x: finalX, y: finalY }, movingEl: storeEl, neighbors, areaBounds, CM_TO_PX, epsPx: 0.5 })

      if (isValidNow) {
        const guardRes = onDragEndGuard(storeEl, { x: finalX, y: finalY })
        if (guardRes.valid) {
          // Persistir posición final con historial
          canvasStore.actualizarPosicion(
            elementId,
            finalX,
            finalY,
          true,
            `Elemento movido: ${storeEl.nombre || storeEl.tipo || elementId}`,
          )
          // Actualizar lastValidPositions para evitar divergencias posteriores
          lastValidPositions.value.set(elementId, { x: finalX, y: finalY })
          console.debug('[finalize] persisted final pos for', elementId, { finalX, finalY })
        }
      } else {
        // Si la posición final NO es válida, revertir visualmente a la última válida y persistir esa última válida
        const revertPos = lastGoodPos || lastValidPositions.value.get(elementId) || { x: storeEl.x || 0, y: storeEl.y || 0 }
        console.debug('[finalize] final pos INVALID - reverting to last valid pos for', elementId, { finalX, finalY, revertPos })
        try {
          const stage2 = stageRef.value?.getNode?.()
          const layer2 = layerRef.value?.getNode?.()
          const shape2 = stage2?.findOne?.(`#${elementId}`)
          if (shape2) {
            shape2.x(revertPos.x)
            shape2.y(revertPos.y)
            // repaint
            layer2?.batchDraw?.()
          }
        } catch (err) { console.warn('Error reverting shape position', err) }

        // Persistir la posición revertida para mantener consistencia
        try {
          const guardRes = onDragEndGuard(storeEl, revertPos)
          if (guardRes.valid) {
            canvasStore.actualizarPosicion(
              elementId,
              revertPos.x,
              revertPos.y,
            true,
              `Revertir posición inválida: ${storeEl.nombre || storeEl.tipo || elementId}`,
            )
            lastValidPositions.value.set(elementId, { x: revertPos.x, y: revertPos.y })
          }
        } catch (err) {
          console.warn('Error persisting revert position', err)
        }
      }
    } else {
      console.debug('[finalize] no persistence needed for', elementId, { finalX, finalY, storeX: storeEl?.x, storeY: storeEl?.y })
    }
  } catch (err) {
    console.warn('Error persisting final position for', elementId, err)
  }

  // 7. Limpiar conflictos después del dragend exitoso
  conflictsApi.clear()

  // Limpiar estado del controlador rAF (ya pausado arriba)
  if (rec && rec.ctrl) {
    try { rec.ctrl.resetLastGoodPos() } catch { /* ignore */ }
  }
  rafControllers.delete(elementId)
  const perf = perfContexts.get(elementId)
  try {
    if (perf && perf.restore) perf.restore()
  } catch {
    console.warn('Error al restaurar el contexto de rendimiento del elemento:', elementId)
  }
  perfContexts.delete(elementId)
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

const { showToast } = useToast()

const { simularLlenadoContenedor} = useProductSimulation({
  canvasStore,
  showToast,
  forceRedraw
});

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
    showToast('No puedes agregar este tipo aquí. En la vista de plantas solo se permiten elementos.', 'error')
    return
  }

  if (contextoActual === 'elementos' && tipoElemento !== 'contenedores') {
    showToast('No puedes agregar ese tipo aquí. Dentro de elementos solo se permiten contenedores.', 'error')
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

  // ===== VALIDACIÓN DE PESO MÁXIMO =====
  const resultadoValidacionPeso = weightValidation.validarPesoElemento(
    elemento,
    canvasStore.contextoActual.id,
    canvasStore.contextoActual.tipo
  )

  if (!resultadoValidacionPeso.valido) {
    // El elemento excedería el peso máximo permitido
    showToast(
      `No se puede agregar: excedería el peso máximo soportado por ${resultadoValidacionPeso.exceso} kg`,
      'error'
    )
    console.log('Validación de peso fallida:', resultadoValidacionPeso)
    return
  }

  // ===== CONTINUAR CON LA LÓGICA EXISTENTE =====

  // Obtener dimensiones en píxeles (convertir desde cm si es necesario)
  let { width, height } = getElementPixelDimensions(elemento)

  // Obtener dimensiones originales en cm para guardar (preservar todas las dimensiones)
  let anchoCm = elemento.dimensiones?.ancho || 100
  let largoCm = elemento.dimensiones?.largo || 60
  let altoCm = elemento.dimensiones?.alto || 20

  // Política de dimensiones para elementos de sistema por defecto
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
      // Offset vertical para estante de pared (altura desde el suelo)
      const off = OFFSETS?.offsetByType?.[elemento.id]?.zOffsetShare
      if (typeof off === 'number' && isFinite(off)) {
        // Redondear a cm enteros
        const zBase = Math.round((planta.dimensiones.alto || 0) * off)
        // Usar en la instancia recién creada
        elemento.alturaRespectoAlSuelo = zBase
      }
    }
  }

  // Aplicar dimensiones mínimas para mejorar la interacción
  const MIN_WIDTH = 40
  const MIN_HEIGHT = 30
  let finalWidth = Math.max(width, MIN_WIDTH)
  let finalHeight = Math.max(height, MIN_HEIGHT)

  // 1. Convertir pointer a coords de mundo (considerando zoom/pan)
  const worldCoords = getWorldCoordinatesFromPointer(dropEvent)

  // 2. Calcular posición candidata centrada en el puntero
  let candX = worldCoords.x - finalWidth / 2
  let candY = worldCoords.y - finalHeight / 2

  // 3. Aplicar snap a grilla ANTES de validar (usar valor runtime de canvasStore.gridSize: 0 desactiva)
  const snapped = snapToGrid(candX, candY, canvasStore.gridSize ?? GRID_SIZE)
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
        return
      }
      const world = sess.toWorld(local, parent)
      candX = world.x
      candY = world.y
    }
  }

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
    isInsideArea = pointInPolygon({
      x: candX + finalWidth / 2,
      y: candY + finalHeight / 2,
    }, boundary.inset)
    if (!isInsideArea) {
      const clamped = clampRectToPolygon({ x: candX, y: candY, width: finalWidth, height: finalHeight }, boundary.inset)
      candX = clamped.x
      candY = clamped.y
      isInsideArea = pointInPolygon({ x: candX + finalWidth / 2, y: candY + finalHeight / 2 }, boundary.inset)
    }
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
      canvasStore.gridSize ?? GRID_SIZE,
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
    showToast('No fue posible colocar el elemento dentro de los límites de la planta.', 'error')
    return // NO crear la instancia, NO comprometer historial
  }

  if (boundary.type === 'polygon') {
    const c = clampRectToPolygon(
      { x: finalPosition.x, y: finalPosition.y, width: finalWidth, height: finalHeight },
      boundary.inset,
    )
    finalPosition = { x: c.x, y: c.y }
  }

  // 10. Crear el elemento solo si la validación fue exitosa
  const color = elemento.color || elemento.colorBase || '#3B82F6'

  // Comprobar si estamos en un contexto de elementos y agregando un contenedor
  // En ese caso, debemos tomar el largo del elemento padre
  let largoCmFinal = largoCm;
  let finalHeightFinal = finalHeight;

  if (canvasStore.contextoActual.tipo === 'elementos' && elemento.tipo === 'contenedores') {
    // Obtener el elemento padre (el elemento actual donde estamos)
    const elementoPadre = canvasStore.elementoContenedorActual;
    if (elementoPadre && elementoPadre.dimensiones) {
      // Usar el largo del elemento padre para el contenedor
      largoCmFinal = elementoPadre.dimensiones.largo;

      // La altura en píxeles para el renderizado depende de la vista
      if (canvasStore.vistaActiva === 'XY') {
        // En vista aérea (XY), la altura visual corresponde al largo
        finalHeightFinal = largoCmFinal * CM_TO_PX;
      } else if (canvasStore.vistaActiva === 'XZ') {
        // En vista de frente (XZ), la altura visual corresponde al alto, no al largo
        // No modificamos finalHeightFinal en este caso
      }

      console.log('Contenedor ajustado al largo del elemento padre:', {
        largoPadre: largoCmFinal,
        altoPxFinal: finalHeightFinal,
        vista: canvasStore.vistaActiva
      });
    }
  }

  const nuevoElemento = {
    id: `${elemento.tipo || elemento.categoria || 'elemento'}_${Date.now()}`,
    tipo: elemento.tipo || (elemento.categoria === 'contenedores' ? 'contenedores' : 'elementos'), // Asegurar que siempre tenga tipo
    categoria: elemento.categoria, // Mantener también la categoría
    nombre: elemento.nombre || 'Nuevo elemento',

    // Estructura correcta para dimensiones (preservar todas las dimensiones independientemente de la vista)
    dimensiones: {
      ancho: anchoCm,
      largo: largoCmFinal, // Usamos el largo ajustado si corresponde
      alto: altoCm,
    },

    // Propiedades legacy para compatibilidad con Konva (en px para renderizado)
    x: finalPosition.x,
    y: finalPosition.y,
    width: finalWidth,
    height: finalHeightFinal, // Usamos la altura ajustada si corresponde

    color: color,
    colorBase: color,
    forma: elemento.forma || 'rectangular',
    ubicacion: elemento.ubicacion || elemento.montado || 'suelo',
    alturaRespectoAlSuelo: elemento.alturaRespectoAlSuelo || 0,
    pesoMaximo: elemento.pesoMaximo || 0,
    volumenMaximo: anchoCm * largoCmFinal * altoCm,
    // Política de dimensiones
    dimensionLock: false,
    systemTypeKey: elemento.id,
    uso: {
      volumen: 0,
      peso: 0
    },
    descripcion: elemento.descripcion || '',

    // Copiar contenedores del elemento original si los tiene
    contenedores: elemento.contenedores ? [...elemento.contenedores] : [],

    hijos: []
  }

  console.log('✅ Creando elemento desde drop en posición válida:', nuevoElemento)
  canvasStore.agregarElemento(nuevoElemento)

  // Seleccionar el elemento recién creado
  canvasStore.seleccionarElemento(nuevoElemento.id)
}

const onShapeDragStart = (e, el) => {
  if (canvasStore.estaEnElemento || canvasStore.estaEnContenedor) {
    const shape = e.target
    const parent =
      canvasStore.elementoContenedorActual || canvasStore.elementoPorId(canvasStore.elementoSeleccionado)
    const siblings = parent?.hijos?.map((id) => canvasStore.elementoPorId(id)).filter(Boolean) || []
    const session = makeInnerSession({
      parentEl: parent,
      movingEl: el,
      siblings,
      vista: canvasStore.vistaActiva,
    })
    const pointer = e.evt ? { x: e.evt.clientX || 0, y: e.evt.clientY || 0 } : { x: 0, y: 0 }
    innerSessions.set(el.id, {
      session,
      parent,
      lastPointer: pointer,
      initial: { x: el.posicion?.x ?? el.x ?? 0, y: el.posicion?.y ?? el.y ?? 0 },
    })
    isElementDragging.value = true
    stageDragEnabled.value = false
  } else {
    startElementDrag(el.id)
  }
  onDragStartGuard(e.target, el)
}

const onShapeDragMove = (e, el) => {
  const data = innerSessions.get(el.id)
  if (data) {
    const { session, parent } = data
    const shape = e.target
    const pointer = e.evt ? { x: e.evt.clientX || 0, y: e.evt.clientY || 0 } : { x: 0, y: 0 }
    const vel = {
      x: e.evt?.movementX ?? pointer.x - data.lastPointer.x,
      y: e.evt?.movementY ?? pointer.y - data.lastPointer.y,
    }
    data.lastPointer = pointer
    let posWorld = shape.position()

    // Primero aplicar las restricciones de sesión
    const posLocal = session.toLocal(posWorld, parent)
    const nextLocal = session.dragBoundFuncLocal(posLocal, vel)
    const constrainedWorld = session.toWorld(nextLocal, parent)

    // Luego aplicar object snapping si está habilitado
    let finalWorld = constrainedWorld
    if (isSnappingEnabled.value && isElementDragging.value) {
      // Obtener elementos hermanos (otros elementos dentro del mismo contenedor)
      const siblings = parent?.hijos?.map((id) => canvasStore.elementoPorId(id)).filter(Boolean) || []
      const otherElements = siblings.filter(sibling => sibling.id !== el.id)

      if (otherElements.length > 0) {
        // Convertir posición del shape a coordenadas de elemento
        const elementX = constrainedWorld.x
        const elementY = constrainedWorld.y

        // Aplicar snapping
        const snapResult = performSnap(el, elementX, elementY, otherElements, { width: layerConfig.value.width, height: layerConfig.value.height })

        // Convertir de vuelta a coordenadas del shape
        finalWorld = { x: snapResult.x, y: snapResult.y }
      }
    }
const guardRes = onDragMoveGuard(el, { x: finalWorld.x, y: finalWorld.y })
    if (!guardRes.valid) return
    shape.position(finalWorld)
    needsDraw = true
    scheduleDraw()
  } else {
    const candidate = { x: e.target?.x?.() ?? 0, y: e.target?.y?.() ?? 0 }
    const guardRes = onDragMoveGuard(el, candidate)
    if (guardRes.valid) {
      updateElementPosition(e, el.id)
    }
  }
}

const onShapeDragEnd = (e, el) => {
  const data = innerSessions.get(el.id)
  if (data) {
    const { session, parent, initial } = data
    innerSessions.delete(el.id)
    isElementDragging.value = false
    stageDragEnabled.value = true

    // Limpiar guías de snapping
    clearGuides()

    const shape = e.target
    let candLocal = session.toLocal(shape.position(), parent)
    let finalLocal = session.finalizeLocal(candLocal)
    const finalWorld = session.toWorld(finalLocal, parent)
    shape.position(finalWorld)
    needsDraw = true
    scheduleDraw()

    const guardRes = onDragEndGuard(
      el,
      { x: finalWorld.x, y: finalWorld.y },
      {
        revert: () => {
          shape.position(initial)
          needsDraw = true
          scheduleDraw()
        },
      },
    )
    if (!guardRes.valid) return

    const changed =
      Math.round(finalWorld.x) !== Math.round(initial.x) || Math.round(finalWorld.y) !== Math.round(initial.y)
    if (changed) {
      canvasStore.actualizarElemento(
        el.id,
        { posicion: { x: finalWorld.x, y: finalWorld.y }, x: finalWorld.x, y: finalWorld.y },
        true,
        `Elemento movido: ${el.id}`,
      )
    }
  } else {
    endElementDrag(el.id)
  }
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
      // Si estamos en vista de frente (XZ), ajustar el alto según el largo del padre
      if (canvasStore.vistaActiva === 'XZ') {
        const largoPadreCm = elementoPadre.dimensiones.largo;

        // Actualizar también las dimensiones en el elemento del buffer
        if (elemento.dimensiones) {
          elemento.dimensiones.largo = largoPadreCm;
        }

        console.log('Buffer: Contenedor ajustado al largo del elemento padre:', {
          largoPadreCm,
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
    isInsideArea = pointInPolygon({ x: candX + width / 2, y: candY + height / 2 }, boundary.inset)
    if (!isInsideArea) {
      const clamped = clampRectToPolygon({ x: candX, y: candY, width, height }, boundary.inset)
      candX = clamped.x
      candY = clamped.y
      isInsideArea = pointInPolygon({ x: candX + width / 2, y: candY + height / 2 }, boundary.inset)
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
    const c = clampRectToPolygon(
      { x: finalPosition.x, y: finalPosition.y, width, height },
      boundary.inset,
    )
    finalPosition = { x: c.x, y: c.y }
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
const isInteractingWithTransformer = ref(false);
// Estado para guardar dimensiones/pos antes de transformar (para poder revertir)
const transformInitialState = new Map()

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

const toggleSnapping = () => {
  isSnappingEnabled.value = !isSnappingEnabled.value
  // Si se desactiva el snapping, limpiar guías activas
  if (!isSnappingEnabled.value) {
    clearGuides()
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
    const elemento = canvasStore.elementosVisibles.find(e => e.id === canvasStore.elementoSeleccionado)
    trComp.setAttrs({
      flipEnabled: false,
      boundBoxFunc: (oldBox, newBox) => {
        const MINW = 10
        const MINH = 10
        if (newBox.width <= 0 || newBox.height <= 0) return oldBox
        if (newBox.width < MINW || newBox.height < MINH) return oldBox
        if (elemento?.forma === 'circular') {
          const size = Math.max(newBox.width, newBox.height)
          return { ...newBox, width: size, height: size }
        }
        return newBox
      },
    })
    trComp.getLayer()?.batchDraw?.()
  }
}


// Guardar estado inicial de la transformación para posible revert
const handleTransformStart = (e, elementId) => {
  isInteractingWithTransformer.value = true;
  try {
    const node = e.target
    if (!node) return
    const x = node.x()
    const y = node.y()
    const width = node.width() * node.scaleX()
    const height = node.height() * node.scaleY()
    const state = { x, y, width, height, rotation: node.rotation?.() || 0 }
    transformInitialState.set(elementId, state)
    console.debug('[transform-debug] start', elementId, state)
  } catch { /* ignore */ }
}

// Manejar fin de transformación con validación y revert si no es válido
const handleTransformEnd = (e, elementId) => {
  isInteractingWithTransformer.value = false;
  try {
    const node = e.target
    let width = node.width() * node.scaleX()
    let height = node.height() * node.scaleY()
    let x = node.x()
    let y = node.y()
    const bounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
    x = Math.max(bounds.minX, Math.min(x, bounds.maxX - width))
    y = Math.max(bounds.minY, Math.min(y, bounds.maxY - height))
    const rotation = node.rotation?.() || 0

    const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
    if (!elemento) return

    const guardRes = onTransformEndGuard(
      elemento,
      { x, y, width, height, rotation },
      {
        revert: () => {
          const prev =
            transformInitialState.get(elementId) ||
            { x: elemento.x, y: elemento.y, width: elemento.width, height: elemento.height, rotation: elemento.rotation || 0 }
          try {
            node.x(prev.x)
            node.y(prev.y)
            node.width && node.width(prev.width)
            node.height && node.height(prev.height)
            node.rotation && node.rotation(prev.rotation || 0)
          } catch {
            /* ignore */
          }
          needsDraw = true
          scheduleDraw()
        },
      },
    )
    if (!guardRes.valid) return

    // Validar con isPlacementValid contra vecinos y área
    const neighbors = canvasStore.elementosVisibles.filter(e => e.id !== elementId)
    const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
    const isValidNow = isPlacementValid({ pos: { x, y }, movingEl: { ...elemento, width, height }, neighbors, areaBounds, CM_TO_PX, epsPx: 0.5 })

  console.debug('[transform-debug] end', elementId, { prev: transformInitialState.get(elementId), new: { x, y, width, height, rotation }, isValidNow })
  if (!isValidNow) {
      // Revertir al estado inicial guardado
      const prev = transformInitialState.get(elementId) || { x: elemento.x, y: elemento.y, width: elemento.width, height: elemento.height }
      try {
        node.x(prev.x)
        node.y(prev.y)
        node.width && node.width(prev.width)
        node.height && node.height(prev.height)
        node.scaleX && node.scaleX(1); node.scaleY && node.scaleY(1)
        node.rotation && node.rotation(prev.rotation || 0)
        const layer = layerRef.value?.getNode?.()
        layer?.batchDraw?.()
      } catch { /* ignore */ }
      console.debug('[transform-debug] reverted', elementId, prev)

      // Persistir la reversión en el store
      try {
        canvasStore.actualizarElemento(elementId, { x: prev.x, y: prev.y, width: prev.width, height: prev.height, rotation: prev.rotation })
        lastValidPositions.value.set(elementId, { x: prev.x, y: prev.y })
      } catch (err) { console.warn('Error persisting transform revert', err) }
      nextTick(() => setupTransformer())
      return
    }

    // Si es válido, persistir cambios como antes
    let newDimensiones = elemento?.dimensiones ? { ...elemento.dimensiones } : undefined
    if (newDimensiones) {
      const widthCm = Math.round(width / CM_TO_PX)
      const heightCm = Math.round(height / CM_TO_PX)
      if (canvasStore.vistaActiva === 'XY') {
        newDimensiones.ancho = widthCm
        newDimensiones.largo = heightCm
      } else if (canvasStore.vistaActiva === 'XZ') {
        newDimensiones.ancho = widthCm
        newDimensiones.alto = heightCm
        if (newDimensiones.largo === undefined) newDimensiones.largo = elemento.dimensiones?.largo || 60
      }
    }

    node.width(width)
    node.height(height)
    node.scaleX(1)
    node.scaleY(1)
    node.x(x)
    node.y(y)
    canvasStore.actualizarElemento(
      elementId,
      { x, y, width, height, rotation, dimensiones: newDimensiones, dimensionLock: true },
      true,
      `Elemento redimensionado: ${elemento?.nombre || elemento?.tipo || elementId}`
    )
    lastValidPositions.value.set(elementId, { x, y })
    nextTick(() => setupTransformer())
  } catch (err) {
    console.warn('Error en handleTransformEnd:', err)
  }
}

// Mientras se transforma (resize/rotate) dar feedback visual en tiempo real y actualizar propiedades
const handleTransformMove = (e, elementId) => {
  try {
    const node = e.target
    if (!node) return
    const elemento = canvasStore.elementosVisibles.find(e => e.id === elementId)
    if (!elemento) return
    let width = node.width() * node.scaleX()
    let height = node.height() * node.scaleY()
    let x = node.x()
    let y = node.y()

    const neighbors = canvasStore.elementosVisibles.filter(e => e.id !== elementId)
    const areaBounds = { minX: 0, minY: 0, maxX: layerConfig.value.width, maxY: layerConfig.value.height }
    const valid = isPlacementValid({ pos: { x, y }, movingEl: { ...elemento, width, height }, neighbors, areaBounds, CM_TO_PX, epsPx: 0.5 })

    // Aplicar stroke rojo si inválido, volver al color habitual si válido
    try {
      const stage = stageRef.value.getNode()
      const shape = stage.findOne(`#${elementId}`)
      if (shape) {
        const bbox = shape.findOne('.bbox')
        const circle =
          elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY'
            ? shape.findOne('Circle')
            : null
        if (elemento.forma === 'circular' && canvasStore.vistaActiva === 'XY') {
          circle?.stroke(valid ? undefined : '#ef4444')
          circle?.strokeWidth(valid ? 0 : 2)
        } else {
          bbox?.stroke(valid ? undefined : '#ef4444')
          bbox?.strokeWidth(valid ? 0 : 2)
        }
        shape.getLayer()?.batchDraw?.()
      }
    } catch { /* ignore */ }

    // Actualizar propiedades en tiempo real para reflejar cambios en PropiedadesPanel
    let newDimensiones = elemento?.dimensiones ? { ...elemento.dimensiones } : undefined
    if (newDimensiones) {
      const widthCm = Math.round(width / CM_TO_PX)
      const heightCm = Math.round(height / CM_TO_PX)
      if (canvasStore.vistaActiva === 'XY') {
        newDimensiones.ancho = widthCm
        newDimensiones.largo = heightCm
      } else if (canvasStore.vistaActiva === 'XZ') {
        newDimensiones.ancho = widthCm
        newDimensiones.alto = heightCm
        if (newDimensiones.largo === undefined) newDimensiones.largo = elemento.dimensiones?.largo || 60
      }
    }

    // Actualizar en el store para reflejar cambios en tiempo real en PropiedadesPanel
    canvasStore.actualizarElemento(elementId, {
      x,
      y,
      width,
      height,
      dimensiones: newDimensiones
    })

  } catch (err) {
    console.warn('Error en handleTransformMove:', err)
  }
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
  const key = e.key.toLowerCase()
  if (key === 'escape' || key === 'esc') {
    canvasStore.seleccionarElemento(null)
    // Asegurar que el transformer/edición se cierre
    editingElementId.value = null
    speedDialOpen.value = false
    // Limpiar guías de snapping
    clearGuides()
  } else if (key === 'p') {
    e.preventDefault()
  } else {
    handleCanvasHotkeys(e, {
      dragMode: dragModeGlobal,
      toggleDragMode,
      toggleSnapping,
      toggleLock: () => toggleLockAndPreserveDrag(canvasStore.elementoSeleccionado),
    })
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
  // Aplicar fitToPlanta automáticamente al cargar la vista
  await nextTick()
  fitToPlanta()
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

/* Indicador de peso máximo */
.weight-indicator {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-width: 200px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
}

.weight-icon {
  font-size: 16px;
}

.weight-bar {
  flex: 1;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.weight-progress {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.weight-text {
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
}

/* Estados de advertencia */
.weight-warning .weight-progress {
  background-color: #f59e0b;
}

.weight-danger .weight-progress {
  background-color: #dc2626;
}
</style>
