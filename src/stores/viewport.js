import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'

export const useViewportStore = defineStore('viewport', () => {
  const canvasStore = useCanvasStore()

  const zoom = computed(() => canvasStore.zoom)
  const minZoom = 0.2
  const maxZoom = 4

  function setZoom(value) {
    const clamped = Math.max(minZoom, Math.min(maxZoom, value))
    canvasStore.configurarZoom(clamped)
  }

  function zoomIn() {
    setZoom(zoom.value * 1.2)
  }

  function zoomOut() {
    setZoom(zoom.value / 1.2)
  }

  function resetZoom() {
    setZoom(1)
  }

  return { zoom, minZoom, maxZoom, setZoom, zoomIn, zoomOut, resetZoom }
})
