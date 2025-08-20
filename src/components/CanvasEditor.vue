<template>
  <v-shape :config="{ listening: false }" :sceneFunc="draw" />
</template>

<script setup>
const props = defineProps({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  scale: { type: Number, required: true },
  stageX: { type: Number, required: true },
  stageY: { type: Number, required: true },
  pixelsPerUnit: { type: Number, required: true },
});

// Función para encontrar un valor de paso "agradable" para las líneas de la grilla
function niceStep(targetPx, pxPerUnitOnScreen) {
  if (!pxPerUnitOnScreen || pxPerUnitOnScreen <= 0) return 1;
  const approxUnits = targetPx / pxPerUnitOnScreen;
  if (approxUnits <= 0) return 1;
  const pow10 = Math.pow(10, Math.floor(Math.log10(approxUnits)));
  const candidates = [1, 2, 5, 10].map(c => c * pow10);
  let best = candidates[0];
  let bestErr = Math.abs(best - approxUnits);
  for (const c of candidates) {
    const err = Math.abs(c - approxUnits);
    if (err < bestErr) {
      best = c;
      bestErr = err;
    }
  }
  return best;
}

const draw = (ctx) => {
  const { width, height, scale, stageX, stageY, pixelsPerUnit: ppu } = props;

  // Calcula el área visible en coordenadas del "mundo"
  const worldX0 = -stageX / scale;
  const worldY0 = -stageY / scale;
  const worldX1 = worldX0 + width / scale;
  const worldY1 = worldY0 + height / scale;

  // Determina tamaños de paso adaptativos para las líneas
  const pxPerUnitOnScreen = ppu * scale;
  const minorStepUnits = niceStep(40, pxPerUnitOnScreen); // Espaciado objetivo de 40px
  const majorStepUnits = niceStep(150, pxPerUnitOnScreen); // Espaciado objetivo de 150px

  if (minorStepUnits <= 0 || majorStepUnits <= 0) return;

  const minorStepPxWorld = minorStepUnits * ppu;
  const majorStepPxWorld = majorStepUnits * ppu;

  // Alinea el punto de inicio a la grilla
  const startX = Math.floor(worldX0 / minorStepPxWorld) * minorStepPxWorld;
  const startY = Math.floor(worldY0 / minorStepPxWorld) * minorStepPxWorld;

  const minorColor = '#e5e7eb'; // gray-200
  const majorColor = '#cbd5e1'; // gray-300

  // Dibuja las líneas verticales
  ctx.beginPath();
  for (let xw = startX; xw <= worldX1; xw += minorStepPxWorld) {
    const isMajor = Math.abs(xw % majorStepPxWorld) < 0.001;
    ctx.strokeStyle = isMajor ? majorColor : minorColor;
    ctx.lineWidth = (isMajor ? 1 : 0.5) / scale; // Mantiene el grosor de línea consistente
    ctx.moveTo(xw, worldY0);
    ctx.lineTo(xw, worldY1);
  }
  ctx.stroke();

  // Dibuja las líneas horizontales
  ctx.beginPath();
  for (let yw = startY; yw <= worldY1; yw += minorStepPxWorld) {
    const isMajor = Math.abs(yw % majorStepPxWorld) < 0.001;
    ctx.strokeStyle = isMajor ? majorColor : minorColor;
    ctx.lineWidth = (isMajor ? 1 : 0.5) / scale;
    ctx.moveTo(worldX0, yw);
    ctx.lineTo(worldX1, yw);
  }
  ctx.stroke();
};
</script>
