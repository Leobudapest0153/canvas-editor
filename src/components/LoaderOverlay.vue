<template>
  <div v-if="isLoading" class="loader-overlay">
    <div class="loader-content">
      <div class="loader-spinner"></div>
      <div class="loader-text">{{ currentOperation?.description || 'Procesando...' }}</div>
    </div>
  </div>
</template><script setup>
import { computed } from 'vue'
import { useLoader } from '@/composables/useLoader'

const { isLoading, activeOperations } = useLoader()

// Operación principal a mostrar (la más reciente)
const currentOperation = computed(() => {
  if (activeOperations.value.length === 0) return null
  const operations = [...activeOperations.value]
  const sortedOperations = operations.sort((a, b) => b[1].startTime - a[1].startTime)
  return sortedOperations[0]?.[1] || null
})
</script>

<style scoped>
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loader-content {
  text-align: center;
}

.loader-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px auto;
}

.loader-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
