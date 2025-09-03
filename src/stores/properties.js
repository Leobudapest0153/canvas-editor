import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore.js'

export const usePropertiesStore = defineStore('properties', () => {
  const currentId = ref(null)
  const canvasStore = useCanvasStore()

  const openFor = (id) => {
    currentId.value = id
    canvasStore.toggleMostrarPropiedades(true)
  }

  const toggle = () => {
    canvasStore.toggleMostrarPropiedades(!canvasStore.mostrarPropiedades.value)
  }

  return { currentId, openFor, toggle }
})
