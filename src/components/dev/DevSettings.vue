<template>
  <div class="dev-settings relative">
    <button
      class="dev-btn text-xs px-2 py-1 bg-gray-200 rounded"
      @click="open = !open"
    >⚙️ dev</button>
    <div v-if="open" class="dev-panel absolute right-0 mt-2 bg-white p-2 rounded shadow text-xs">
      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="store.useDragBoundsClamp" />
        <span>Tope duro en drag (clamp)</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'

const store = useCanvasStore()
const open = ref(false)
</script>

<style scoped>
.dev-settings { position: relative; }
.dev-panel { z-index: 100; }
</style>
