<template>
  <div class="absolute top-0 left-0 pointer-events-none" :style="{ width: width + 'px', height: height + 'px' }">
    <canvas ref="hCanvas" class="absolute bg-slate-50 top-0 border-b border-slate-300 left-[28px] h-[28px] w-[calc(100%-28px)]" :width="width - rulerSize" :height="rulerSize"/>
    <canvas ref="vCanvas" class="absolute bg-slate-50 left-0 border-r border-slate-300 top-[28px] w-[28px] h-[calc(100%-28px)]" :width="rulerSize" :height="height - rulerSize"/>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'

const props = defineProps({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  scale: { type: Number, required: true },
  stageX: { type: Number, required: true },
  stageY: { type: Number, required: true },
  pixelsPerUnit: { type: Number, required: true },
  unit: { type: String, default: 'm' },
})

const rulerSize = 28
const hCanvas = ref(null)
const vCanvas = ref(null)

function niceStep(target) {
  if (target <= 0) return 1;
  const pow10 = Math.pow(10, Math.floor(Math.log10(target)))
  const cands = [1, 2, 5, 10].map(c => c * pow10)
  let best = cands[0]
  let bestErr = Math.abs(best - target)
  for (const c of cands) {
    const err = Math.abs(c - target)
    if (err < bestErr) { best = c; bestErr = err }
  }
  return best
}

function drawRulers() {
  const s = Number(props.scale) || 1
  const ppu = Number(props.pixelsPerUnit) || 100
  const stageX = Number(props.stageX) || 0
  const stageY = Number(props.stageY) || 0
  const unit = props.unit === 'cm' ? 'cm' : 'm'

  const innerW = Math.max(0, props.width - rulerSize)
  const innerH = Math.max(0, props.height - rulerSize)

  const targetMinorScreenPx = 40
  const targetUnits = targetMinorScreenPx / (s * ppu)
  const stepUnits = niceStep(targetUnits)
  const minorStepWorldPx = stepUnits * ppu
  const minorStepScreenPx = minorStepWorldPx * s
  const targetMajorScreenPx = 150
  const majorsPerMinor = Math.round(targetMajorScreenPx / minorStepScreenPx)
  let majorMultiplier = 2
  if (majorsPerMinor > 3) majorMultiplier = 5
  if (majorsPerMinor > 7) majorMultiplier = 10
  const majorStepWorldPx = minorStepWorldPx * majorMultiplier

  // Horizontal
  const hc = hCanvas.value
  const hctx = hc?.getContext('2d')
  if (hctx) {
    hctx.clearRect(0,0,hc.width, hc.height)
    hctx.fillStyle = '#f8fafc'
    hctx.fillRect(0,0,hc.width, hc.height)
    hctx.strokeStyle = '#94a3b8'
    hctx.fillStyle = '#0f172a'
    hctx.lineWidth = 1
    const worldX0 = -stageX / s
    const worldX1 = worldX0 + (innerW / s)
    const startX = Math.floor(worldX0 / minorStepWorldPx) * minorStepWorldPx
    for (let xw = startX; xw <= worldX1; xw += minorStepWorldPx) {
      const xs = Math.round((xw - worldX0) * s)
      const isMajor = Math.abs(xw % majorStepWorldPx) < 1e-9 || Math.abs(majorStepWorldPx - (xw % majorStepWorldPx)) < 1e-9
      const tickH = isMajor ? 14 : 8
      hctx.beginPath()
      hctx.moveTo(xs + 0.5, rulerSize)
      hctx.lineTo(xs + 0.5, rulerSize - tickH)
      hctx.stroke()
      if (isMajor) {
        let unitsVal = xw / ppu
        if (Math.abs(unitsVal) < 1e-9) unitsVal = 0
        // CORREGIDO: Añadir la unidad a la etiqueta
        const label = unit === 'cm' ? `${unitsVal.toFixed(0)}` : `${unitsVal.toFixed(2)} ${unit}`
        hctx.font = '10px sans-serif'
        hctx.textAlign = 'center'
        hctx.textBaseline = 'bottom'
        hctx.fillText(label, xs, rulerSize - 14)
      }
    }
  }

  // Vertical
  const vc = vCanvas.value
  const vctx = vc?.getContext('2d')
  if (vctx) {
    vctx.clearRect(0,0,vc.width, vc.height)
    vctx.fillStyle = '#f8fafc'
    vctx.fillRect(0,0,vc.width, vc.height)
    vctx.strokeStyle = '#94a3b8'
    vctx.fillStyle = '#0f172a'
    vctx.lineWidth = 1
    const worldY0 = -stageY / s
    const worldY1 = worldY0 + (innerH / s)
    const startY = Math.floor(worldY0 / minorStepWorldPx) * minorStepWorldPx
    for (let yw = startY; yw <= worldY1; yw += minorStepWorldPx) {
      const ys = Math.round((yw - worldY0) * s)
      const isMajor = Math.abs(yw % majorStepWorldPx) < 1e-9 || Math.abs(majorStepWorldPx - (yw % majorStepWorldPx)) < 1e-9
      const tickW = isMajor ? 14 : 8
      vctx.beginPath()
      vctx.moveTo(rulerSize, ys + 0.5)
      vctx.lineTo(rulerSize - tickW, ys + 0.5)
      vctx.stroke()
      if (isMajor) {
        let unitsVal = yw / ppu
        if (Math.abs(unitsVal) < 1e-9) unitsVal = 0
        // CORREGIDO: Añadir la unidad a la etiqueta
        const label = unit === 'cm' ? `${unitsVal.toFixed(0)}` : `${unitsVal.toFixed(2)} ${unit}`
        vctx.save()
        vctx.translate(rulerSize - 16, ys)
        vctx.rotate(-Math.PI/2)
        vctx.font = '10px sans-serif'
        vctx.textAlign = 'center'
        vctx.textBaseline = 'top'
        vctx.fillText(label, 0, 0)
        vctx.restore()
      }
    }
  }
}

onMounted(() => { drawRulers() })
onBeforeUnmount(() => {})
watch(() => [props.scale, props.stageX, props.stageY, props.pixelsPerUnit, props.unit, props.width, props.height], () => {
  nextTick(() => drawRulers())
})
</script>
