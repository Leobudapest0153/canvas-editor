<template>
  <v-shape :config="{ listening: false, versionKey }" :sceneFunc="draw"></v-shape>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Escala actual del Stage
  scale: { type: Number, required: true },
  // Unidades y escala
  pixelsPerUnit: { type: Number, required: true }, // px por unidad (m o cm)
  unit: { type: String, default: 'm' }, // 'm' | 'cm'
  // Bounding box del polígono: { minX, minY, maxX, maxY } o { x, y, width, height }
  bbox: { type: Object, default: () => ({ minX: 0, minY: 0, maxX: 0, maxY: 0 }) },
})

const versionKey = computed(() => [
  props.bbox?.minX, props.bbox?.minY, props.bbox?.maxX, props.bbox?.maxY,
  props.bbox?.x, props.bbox?.y, props.bbox?.width, props.bbox?.height,
  props.scale, props.pixelsPerUnit, props.unit
].join('|'))

function niceStep(targetPx, pxPerUnit) {
  if (!pxPerUnit || pxPerUnit <= 0) return 1
  const approxUnits = targetPx / pxPerUnit
  if (approxUnits <= 0) return 1
  const pow10 = Math.pow(10, Math.floor(Math.log10(approxUnits)))
  const candidates = [1, 2, 5].map(c => c * pow10)
  let best = candidates[0]
  let bestErr = Math.abs(best - approxUnits)
  for (const c of candidates) {
    const err = Math.abs(c - approxUnits)
    if (err < bestErr) { best = c; bestErr = err }
  }
  return best
}

const draw = (ctx, shape) => {
  const scale = props.scale || 1
  const ppu = Number(props.pixelsPerUnit) || 100
  const bbox = props.bbox || {}

  // Obtener el área visible del canvas (viewport)
  const stage = shape.getStage()
  if (!stage) return

  const stageWidth = stage.width()
  const stageHeight = stage.height()
  const stageX = stage.x()
  const stageY = stage.y()

  // Calcular los límites del mundo visible (en coordenadas del canvas)
  const worldX0 = -stageX / scale
  const worldY0 = -stageY / scale
  const worldX1 = worldX0 + stageWidth / scale
  const worldY1 = worldY0 + stageHeight / scale

  // Paso adaptativo menores y mayores (mayores cada 1 unidad)
  const pxPerUnitOnScreen = ppu * scale
  const minorTargetPx = 35
  let stepUnits = niceStep(minorTargetPx, pxPerUnitOnScreen)
  if (stepUnits <= 0) stepUnits = 1
  const stepPxWorld = stepUnits * ppu
  const majorPxWorld = 1 * ppu

  // Inicio alineado con paso menor, extendido más allá del viewport para cubrir todo
  const startX = Math.floor(worldX0 / stepPxWorld) * stepPxWorld
  const startY = Math.floor(worldY0 / stepPxWorld) * stepPxWorld

  const minorColor = '#e5e7eb'
  const majorColor = '#d1d5db'

  // Habilitar antialiasing para líneas más suaves
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Verticales - cubrir todo el canvas visible
  ctx.beginPath()
  for (let xw = startX; xw <= worldX1; xw += stepPxWorld) {
    const isMajor = (Math.round(xw / majorPxWorld) === xw / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    ctx.lineWidth = (isMajor ? 0.5 : 0.3) / scale // Líneas más delgadas para suavidad
    ctx.moveTo(xw, worldY0)
    ctx.lineTo(xw, worldY1)
  }
  ctx.stroke()

  // Horizontales - cubrir todo el canvas visible
  ctx.beginPath()
  for (let yw = startY; yw <= worldY1; yw += stepPxWorld) {
    const isMajor = (Math.round(yw / majorPxWorld) === yw / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    ctx.lineWidth = (isMajor ? 0.5 : 0.3) / scale
    ctx.moveTo(worldX0, yw)
    ctx.lineTo(worldX1, yw)
  }
  ctx.stroke()
}
</script>
