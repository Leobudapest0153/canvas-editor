<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="modal-backdrop">
        <div class="modal-card" role="dialog" aria-modal="true">
          <header class="modal-header">
            <h2 class="modal-title">Sugerencias para colocar el elemento</h2>
          </header>
          <section class="modal-body">
            <p class="modal-description">
              El elemento no se pudo colocar con los valores actuales. Te proponemos estos ajustes para continuar
              sin modificar su contenedor.
            </p>
            <ul class="suggestions-list">
              <li v-if="dimensionSuggestion" class="suggestion-item">
                <h3 class="suggestion-title">Dimensiones ajustadas</h3>
                <p class="suggestion-text">{{ dimensionSuggestion }}</p>
              </li>
              <li v-if="capacitySuggestion" class="suggestion-item">
                <h3 class="suggestion-title">Carga efectiva sugerida</h3>
                <p class="suggestion-text">{{ capacitySuggestion }}</p>
              </li>
            </ul>
          </section>
          <footer class="modal-footer">
            <button type="button" class="btn-secondary" @click="emit('cancel')">
              Cancelar
            </button>
            <button type="button" class="btn-primary" @click="emit('accept')">
              Aceptar ajustes y colocar
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  suggestions: { type: Object, default: null },
})
const emit = defineEmits(['accept', 'cancel'])

const dimensionSuggestion = computed(() => {
  const dims = props.suggestions?.dimension
  if (!dims?.newDims) return ''
  const { newDims, original, scale } = dims
  const parts = []
  if (Number.isFinite(newDims.ancho)) parts.push(`Ancho: ${newDims.ancho} cm`)
  if (Number.isFinite(newDims.largo)) parts.push(`Largo: ${newDims.largo} cm`)
  if (Number.isFinite(newDims.alto)) parts.push(`Alto: ${newDims.alto} cm`)
  const base = parts.join(' · ')
  if (!Number.isFinite(scale) || !Number.isFinite(original?.ancho) || !Number.isFinite(original?.largo)) {
    return base
  }
  const percentage = Math.round(scale * 100)
  return `${base} (escala ${percentage}% respecto a las dimensiones originales)`
})

const capacitySuggestion = computed(() => {
  const cap = props.suggestions?.capacity
  if (!cap) return ''
  const prev = Number.isFinite(cap.previous) ? `${cap.previous} ${cap.unit}` : 'valor actual'
  return `Aplicaremos ${cap.newValue} ${cap.unit} en lugar de ${prev}.`
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1050;
}

.modal-card {
  width: min(480px, 100%);
  background: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1.25rem 1.5rem 0.75rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}

.modal-body {
  padding: 0.75rem 1.5rem 1.25rem;
  color: #1f2937;
}

.modal-description {
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.suggestion-item {
  background: #f8fafc;
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid #e2e8f0;
}

.suggestion-title {
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.35rem;
}

.suggestion-text {
  font-size: 0.95rem;
  color: #334155;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem 1.5rem;
}

.btn-primary,
.btn-secondary {
  min-width: 0;
  padding: 0.65rem 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
  border: none;
}

.btn-primary:hover {
  background: #1d4ed8;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.2);
}

.btn-secondary {
  background: #f1f5f9;
  color: #0f172a;
  border: none;
}

.btn-secondary:hover {
  background: #e2e8f0;
}
</style>
