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

const draw = (ctx) => {
  const scale = props.scale || 1
  const ppu = Number(props.pixelsPerUnit) || 100
  const bbox = props.bbox || {}

  // Usar el bbox como límite de dibujo (área de la figura/planta)
  const bboxX0 = Number(bbox.minX) || Number(bbox.x) || 0
  const bboxY0 = Number(bbox.minY) || Number(bbox.y) || 0
  const bboxX1 = Number(bbox.maxX) || (bboxX0 + (Number(bbox.width) || 0))
  const bboxY1 = Number(bbox.maxY) || (bboxY0 + (Number(bbox.height) || 0))

  // Si no hay bbox válido, no dibujar nada
  if (bboxX1 <= bboxX0 || bboxY1 <= bboxY0) return

  // Paso adaptativo menores y mayores (mayores cada 1 unidad)
  const pxPerUnitOnScreen = ppu * scale
  const minorTargetPx = 35
  let stepUnits = niceStep(minorTargetPx, pxPerUnitOnScreen)
  if (stepUnits <= 0) stepUnits = 1
  const stepPxWorld = stepUnits * ppu
  const majorPxWorld = 1 * ppu

  // Inicio alineado con paso menor, pero limitado al bbox
  const startX = Math.floor(bboxX0 / stepPxWorld) * stepPxWorld
  const startY = Math.floor(bboxY0 / stepPxWorld) * stepPxWorld

  const minorColor = '#e5e7eb'
  const majorColor = '#d1d5db' // Ligeramente más oscuro para mejor contraste

  // Verticales - solo dentro del bbox
  ctx.beginPath()
  for (let xw = startX; xw <= bboxX1; xw += stepPxWorld) {
    const isMajor = (Math.round(xw / majorPxWorld) === xw / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    ctx.lineWidth = (isMajor ? 0.75 : 0.5) / scale
    ctx.moveTo(xw, bboxY0)
    ctx.lineTo(xw, bboxY1)
  }
  ctx.stroke()

  // Horizontales - solo dentro del bbox
  ctx.beginPath()
  for (let yw = startY; yw <= bboxY1; yw += stepPxWorld) {
    const isMajor = (Math.round(yw / majorPxWorld) === yw / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    ctx.lineWidth = (isMajor ? 0.75 : 0.5) / scale
    ctx.moveTo(bboxX0, yw)
    ctx.lineTo(bboxX1, yw)
  }
  ctx.stroke()
}
</script>
