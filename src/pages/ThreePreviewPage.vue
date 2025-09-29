<template>
  <div class="three-preview">
    <header class="three-preview__header">
      <div>
        <h1>Visor 3D de Inventario</h1>
        <p>Explora la jerarquía actual del canvas en un entorno tridimensional.</p>
      </div>
      <div class="three-preview__actions">
        <button type="button" class="three-preview__button" @click="loadScene" :disabled="isLoading">
          {{ isLoading ? 'Cargando…' : 'Recargar datos' }}
        </button>
      </div>
    </header>

    <section class="three-preview__content">
      <div v-if="error" class="three-preview__error">
        <p>{{ error }}</p>
        <button type="button" class="three-preview__button" @click="loadScene">Reintentar</button>
      </div>
      <div v-else class="three-preview__scene">
        <ThreeScene v-if="sceneData" :data="sceneData" />
        <div v-else class="three-preview__placeholder">
          <span v-if="isLoading">Preparando datos…</span>
          <span v-else>No se encontró información para renderizar.</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ThreeScene from '@/inventory-smart/components/three/ThreeScene.vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

const canvasStore = useCanvasStore()

const sceneData = ref(null)
const isLoading = ref(false)
const error = ref('')

const loadScene = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const serialized = await canvasStore.serializeForThreePreview({ validateBeforeSerialize: false })
    if (!serialized) {
      sceneData.value = null
      error.value = 'No fue posible obtener el estado del canvas.'
    } else {
      sceneData.value = serialized
    }
  } catch (err) {
    console.error(err)
    error.value = 'Ocurrió un error al preparar el visor 3D.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadScene()
})
</script>

<style scoped>
.three-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  height: 100%;
  box-sizing: border-box;
}

.three-preview__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.three-preview__header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: #0f172a;
}

.three-preview__header p {
  margin: 0.25rem 0 0;
  color: #475569;
  max-width: 42rem;
}

.three-preview__actions {
  display: flex;
  gap: 0.75rem;
}

.three-preview__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
}

.three-preview__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.three-preview__button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.25);
}

.three-preview__content {
  flex: 1;
  min-height: 400px;
  background: #0f172a;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.1);
  display: flex;
}

.three-preview__scene {
  flex: 1;
  display: flex;
}

.three-preview__placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5f5;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.three-preview__error {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
  color: #fecaca;
}

.three-preview__error p {
  margin: 0;
}
</style>

