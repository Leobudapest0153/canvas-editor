<template>
  <v-shape :config="{ listening: false, versionKey }" :sceneFunc="draw"></v-shape>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Tamaño del lienzo/stage en px (pantalla)
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  // Escala actual del Stage
  scale: { type: Number, required: true },
  // Posición actual del Stage (en px pantalla)
  stageX: { type: Number, required: true },
  stageY: { type: Number, required: true },
  // Unidades y escala
  pixelsPerUnit: { type: Number, required: true }, // px por unidad (m o cm)
  unit: { type: String, default: 'm' }, // 'm' | 'cm'
  // Bounding box del polígono: { minX, minY, maxX, maxY }
  bbox: { type: Object, default: () => ({ minX: 0, minY: 0, maxX: 0, maxY: 0 }) },
})

const versionKey = computed(() => [
  props.bbox?.minX, props.bbox?.minY, props.bbox?.maxX, props.bbox?.maxY,
  props.scale, props.stageX, props.stageY, props.pixelsPerUnit, props.unit
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

const draw = (ctx) => {
  const w = props.width
  const h = props.height
  const scale = props.scale || 1
  const stageX = props.stageX || 0
  const stageY = props.stageY || 0
  const ppu = Number(props.pixelsPerUnit) || 100

  // Viewport visible (coords mundo)
  const viewW = w / scale
  const viewH = h / scale
  const worldX0 = -stageX / scale
  const worldY0 = -stageY / scale
  const worldX1 = worldX0 + viewW
  const worldY1 = worldY0 + viewH

  // Paso adaptativo menores y mayores (mayores cada 1 unidad)
  const pxPerUnitOnScreen = ppu * scale
  const minorTargetPx = 35
  let stepUnits = niceStep(minorTargetPx, pxPerUnitOnScreen)
  if (stepUnits <= 0) stepUnits = 1
  const stepPxWorld = stepUnits * ppu
  const majorPxWorld = 1 * ppu

  // Inicio alineado con paso menor
  const startX = Math.floor(worldX0 / stepPxWorld) * stepPxWorld
  const startY = Math.floor(worldY0 / stepPxWorld) * stepPxWorld

  const minorColor = '#e5e7eb'
  const majorColor = '#d1d5db' // Ligeramente más oscuro para mejor contraste

  // Verticales
  ctx.beginPath()
  for (let xw = startX; xw <= worldX1; xw += stepPxWorld) {
    const isMajor = (Math.round(xw / majorPxWorld) === xw / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    // --- ¡CAMBIO CLAVE AQUÍ! ---
    ctx.lineWidth = (isMajor ? 0.75 : 0.5) / scale
    ctx.moveTo(xw, worldY0)
    ctx.lineTo(xw, worldY1)
  }
  ctx.stroke()

  // Horizontales
  ctx.beginPath()
  for (let yw = startY; yw <= worldY1; yw += stepPxWorld) {
    const isMajor = (Math.round(yw / majorPxWorld) === yw / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    // --- ¡Y CAMBIO CLAVE AQUÍ! ---
    ctx.lineWidth = (isMajor ? 0.75 : 0.5) / scale
    ctx.moveTo(worldX0, yw)
    ctx.lineTo(worldX1, yw)
  }
  ctx.stroke()
}
</script>
