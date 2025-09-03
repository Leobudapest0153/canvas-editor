import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useViewportStore = defineStore('viewport', () => {
  const zoom = ref(1)
  const minZoom = 0.2
  const maxZoom = 4
  const step = 0.2

  const setZoom = (value) => {
    const clamped = Math.max(minZoom, Math.min(maxZoom, value))
    zoom.value = clamped
  }

  const zoomIn = () => setZoom(zoom.value + step)
  const zoomOut = () => setZoom(zoom.value - step)
  const resetZoom = () => setZoom(1)

  return { zoom, minZoom, maxZoom, setZoom, zoomIn, zoomOut, resetZoom }
})
