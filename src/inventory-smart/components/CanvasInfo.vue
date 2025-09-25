<template>
  <div ref="infoRef" class="canvas-info" :style="styleObject">
    <span>Zoom: {{ (store.zoom * 100).toFixed(2) }}%</span>
    <span>{{ t('views.label') }}: {{ t(`views.${store.vistaActiva}`) }}</span>
    <template v-if="store.estaEnPlanta && store.plantaActivaData?.isInfinite === true">
      <UiTooltip
        label="Modo elástico: no hay límites de planta. Usa la grilla y el minimapa para orientarte."
        position="bottom"
        :delay="300"
      >
        <span class="elastic-badge">Infinito</span>
      </UiTooltip>
    </template>
    <!-- <span v-if="store.estaEnPlanta && store.plantaActivaData">
      Planta: {{ fmtCm(store.plantaActivaData.dimensiones.ancho) }} x {{ fmtCm(store.plantaActivaData.dimensiones.largo) }}
    </span> -->
    <!-- <span v-if="(store.estaEnElemento || store.estaEnContenedor) && store.estructuraContenedorActual">
      {{ store.estaEnElemento ? 'Elemento' : 'Contenedor' }}: {{ store.estructuraContenedorActual.nombre }}
      <template v-if="store.vistaActiva === 'XZ' && store.estructuraContenedorActual.dimensiones">
        ({{ fmtCm(store.estructuraContenedorActual.dimensiones.ancho) }} x {{ fmtCm(store.estructuraContenedorActual.dimensiones.alto) }})
      </template>
      <template v-else>
        ({{ fmtCm(pxToCm(store.canvasAdaptativo.width, viewport.cmPerPx)) }} x {{ fmtCm(pxToCm(store.canvasAdaptativo.height, viewport.cmPerPx)) }})
      </template>
    </span> -->
  </div>
</template>
<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useCanvasWithHistory } from '@/inventory-smart/composables/useCanvasWithHistory'
import { t } from '@/inventory-smart/utils/translator'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'

const { store } = useCanvasWithHistory()
const infoRef = ref(null)
const styleObject = ref({})

function recompute() {
  try {
    const container = infoRef.value?.parentElement
    const infoEl = infoRef.value
    const controlsEl = document.querySelector('.floating-controls')
    if (!container || !infoEl || !controlsEl) { styleObject.value = {}; return }
    const containerRect = container.getBoundingClientRect()
    const controlsRect = controlsEl.getBoundingClientRect()
    const margin = 12
    const availableToRight = controlsRect.left - containerRect.left - margin
    const infoElRect = infoEl.getBoundingClientRect()
    const naturalWidth = infoEl.scrollWidth || Math.ceil(infoElRect.width)
    if (naturalWidth + 24 <= availableToRight) {
      styleObject.value = { maxWidth: 'none' }
      infoEl.classList.remove('should-wrap')
    } else {
      const maxW = Math.max(120, availableToRight - 24)
      styleObject.value = { maxWidth: `${maxW}px` }
      infoEl.classList.add('should-wrap')
    }
  } catch { styleObject.value = {} }
}

let resizeObs
onMounted(() => {
  nextTick(recompute)
  window.addEventListener('resize', recompute)
  try {
    resizeObs = new ResizeObserver(recompute)
    resizeObs.observe(infoRef.value?.parentElement)
  } catch (e) {
    console.warn('ResizeObserver not supported?')
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', recompute)
  try {
    resizeObs && resizeObs.disconnect()
  } catch (e) {
    console.warn('Error disconnecting ResizeObserver:', e)
  }
})

watch(
  () => {
    const ctx = store.contextoActual || {}
    return [store.zoom, store.vistaActiva, ctx?.id]
  },
  () => nextTick(recompute),
)
</script>
