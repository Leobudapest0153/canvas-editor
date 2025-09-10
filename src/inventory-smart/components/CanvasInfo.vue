<template>
  <div ref="infoRef" class="canvas-info" :style="styleObject">
    <span>Zoom: {{ Math.round(store.zoom * 100) }}%</span>
    <span>{{ t('views.label') }}: {{ t(`views.${store.vistaActiva}`) }}</span>
    <span v-if="store.estaEnPlanta && store.plantaActivaData">
      Planta: {{ fmtCm(store.plantaActivaData.dimensiones.ancho) }} x {{ fmtCm(store.plantaActivaData.dimensiones.largo) }}
    </span>
    <!-- <span v-if="(store.estaEnElemento || store.estaEnContenedor) && store.elementoContenedorActual">
      {{ store.estaEnElemento ? 'Elemento' : 'Contenedor' }}: {{ store.elementoContenedorActual.nombre }}
      <template v-if="store.vistaActiva === 'XZ' && store.elementoContenedorActual.dimensiones">
        ({{ fmtCm(store.elementoContenedorActual.dimensiones.ancho) }} x {{ fmtCm(store.elementoContenedorActual.dimensiones.alto) }})
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
import { useViewportStore } from '@/inventory-smart/stores/viewport'
import { pxToCm, fmtCm } from '@/inventory-smart/utils/units'
import { t } from '@/inventory-smart/i18n'

const { store } = useCanvasWithHistory()
const viewport = useViewportStore()
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
    // noop
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', recompute)
  try {
    resizeObs && resizeObs.disconnect()
  } catch (e) {
    // noop
  }
})

watch(() => [store.zoom, store.vistaActiva, store.contextoActual.id], () => nextTick(recompute))
</script>
