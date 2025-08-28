<template>
  <div class="dev-settings fixed top-2 right-2 z-50 text-xs">
    <button class="dev-btn" @click="open = !open">⚙️ dev</button>
    <div
      v-if="open"
      class="panel mt-1 bg-white border border-gray-300 rounded p-2 shadow"
    >
      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="useDragBoundsClamp" />
        Tope duro en drag (clamp)
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { storeToRefs } from 'pinia'

const open = ref(false)
const store = useCanvasStore()
const { useDragBoundsClamp } = storeToRefs(store)
</script>

<style scoped>
.dev-btn {
  background: #e5e7eb;
  border: 1px solid #d1d5db;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
