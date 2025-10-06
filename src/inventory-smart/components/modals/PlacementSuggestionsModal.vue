<!--
  PlacementSuggestionsModal.vue

  Modal para mostrar sugerencias de ajuste automático cuando un elemento
  no puede ser colocado debido a restricciones de espacio o capacidad.

  Props:
  - visible: Boolean - Controla la visibilidad del modal
  - suggestions: Object - Sugerencias calculadas (dimensiones, peso)
  - elementName: String - Nombre del elemento que se intenta colocar
  - reason: String - Razón por la que falló la colocación

  Events:
  - @accept: Se emite cuando el usuario acepta los ajustes
  - @cancel: Se emite cuando el usuario cancela
-->

<template>
  <div
    v-if="visible"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    @click.self="handleCancel"
  >
    <div class="modal">
      <!-- Header -->
      <header class="modal-header">
        <span class="close-placeholder" />
        <h3 class="title center">⚠️ Ajuste Automático Disponible</h3>
        <button class="close" @click="handleCancel" aria-label="Cerrar">×</button>
      </header>

      <!-- Body -->
      <section class="modal-body">
        <!-- Elemento y razón -->
        <div class="alert alert-warning">
          <p class="alert-text">
            El elemento <strong>"{{ elementName }}"</strong> no puede colocarse:
          </p>
          <p class="alert-subtext">{{ reason }}</p>
        </div>

        <!-- Mensaje informativo -->
        <div class="alert alert-info">
          <div class="alert-icon">ℹ️</div>
          <p class="alert-text">
            Hemos encontrado ajustes que permiten colocar el elemento sin modificar la estructura padre.
          </p>
        </div>

        <!-- Sugerencias de dimensiones -->
        <div
          v-if="suggestions?.dimensionAdjustment"
          class="suggestion-box"
        >
          <h4 class="suggestion-title">
            📐 Ajuste de Dimensiones
          </h4>

          <div class="adjustment-details">
            <div class="adjustment-row">
              <span class="adjustment-label">Ancho:</span>
              <div class="adjustment-values">
                <span class="value-old">{{ suggestions.dimensionAdjustment.originalAncho }} cm</span>
                <span class="arrow">→</span>
                <span class="value-new">{{ suggestions.dimensionAdjustment.ancho }} cm</span>
              </div>
            </div>

            <div class="adjustment-row">
              <span class="adjustment-label">Largo:</span>
              <div class="adjustment-values">
                <span class="value-old">{{ suggestions.dimensionAdjustment.originalLargo }} cm</span>
                <span class="arrow">→</span>
                <span class="value-new">{{ suggestions.dimensionAdjustment.largo }} cm</span>
              </div>
            </div>

            <div class="adjustment-row">
              <span class="adjustment-label">Alto:</span>
              <div class="adjustment-values">
                <span class="value-old">{{ suggestions.dimensionAdjustment.originalAlto }} cm</span>
                <span class="arrow">→</span>
                <span class="value-new">{{ suggestions.dimensionAdjustment.alto }} cm</span>
              </div>
            </div>

            <div class="adjustment-footer">
              Reducción: {{ suggestions.dimensionAdjustment.reductionPercent }}% (elimina {{ suggestions.dimensionAdjustment.excesoEliminado || 'peso excedente' }})
            </div>
          </div>
        </div>

        <!-- Sugerencias de peso -->
        <div
          v-if="suggestions?.weightAdjustment"
          class="suggestion-box"
        >
          <h4 class="suggestion-title">
            ⚖️ Ajuste de Capacidad Consumida
          </h4>

          <div class="adjustment-details">
            <div class="adjustment-row">
              <span class="adjustment-label">Capacidad de carga:</span>
              <div class="adjustment-values">
                <span class="value-old">{{ suggestions.weightAdjustment.capacidadOriginal }} kg</span>
                <span class="arrow">→</span>
                <span class="value-new">{{ suggestions.weightAdjustment.capacidadAjustada }} kg</span>
              </div>
            </div>

            <div class="adjustment-footer">
              Reducción: {{ suggestions.weightAdjustment.reductionPercent }}% (elimina {{ suggestions.weightAdjustment.excesoEliminado }} kg de exceso)
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="modal-footer centered">
        <button class="btn" @click="handleCancel">Cancelar</button>
        <button class="btn btn-primary" @click="handleAccept">
          ✓ Aceptar y Colocar
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  suggestions: {
    type: Object,
    default: null,
  },
  elementName: {
    type: String,
    default: 'Sin nombre',
  },
  reason: {
    type: String,
    default: 'No se puede colocar el elemento',
  },
})

const emit = defineEmits(['accept', 'cancel'])

const handleAccept = () => {
  emit('accept', props.suggestions)
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
/* Modal Backdrop */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* Modal Container */
.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 520px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.close-placeholder {
  width: 24px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  flex: 1;
  text-align: center;
  margin: 0;
}

.close {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close:hover {
  color: #374151;
}

/* Body */
.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* Alert Boxes */
.alert {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.alert-warning {
  background-color: #fef3c7;
  border: 1px solid #fbbf24;
}

.alert-info {
  background-color: #dbeafe;
  border: 1px solid #3b82f6;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.alert-icon {
  font-size: 18px;
  line-height: 1;
  margin-top: 2px;
}

.alert-text {
  font-size: 14px;
  color: #374151;
  margin: 0 0 4px 0;
  line-height: 1.5;
}

.alert-subtext {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  font-style: italic;
}

/* Suggestion Boxes */
.suggestion-box {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.suggestion-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.adjustment-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.adjustment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.adjustment-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.adjustment-values {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-old {
  font-size: 13px;
  color: #9ca3af;
  text-decoration: line-through;
}

.arrow {
  color: #6b7280;
  font-weight: 600;
}

.value-new {
  font-size: 14px;
  color: #059669;
  font-weight: 600;
}

.adjustment-footer {
  font-size: 12px;
  color: #6b7280;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

/* Footer */
.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
  display: flex;
  gap: 10px;
}

.modal-footer.centered {
  justify-content: center;
}

/* Buttons */
.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #d1d5db;
  background-color: white;
  color: #374151;
}

.btn:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.btn-primary {
  background-color: #059669;
  border-color: #059669;
  color: white;
}

.btn-primary:hover {
  background-color: #047857;
  border-color: #047857;
}
</style>

