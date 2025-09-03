import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useViewportStore = defineStore('viewport', () => {
  const scale = ref(1)
  const cmPerPxBase = ref(0.1)

  const cmPerPx = computed(() => cmPerPxBase.value / scale.value)

  return { scale, cmPerPxBase, cmPerPx }
})
