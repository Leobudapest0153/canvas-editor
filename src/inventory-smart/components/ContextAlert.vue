<!--
  ContextAlert.vue

  Componente de alerta informativa para mostrar el contexto de navegación actual.
  Aparece como una notificación temporal en la parte superior del canvas.
-->

<template>
  <div
    v-if="show && message"
    class="context-alert-wrapper"
    role="alert"
    aria-live="polite"
  >
    <div class="context-alert">
      <!-- Icono -->
      <div class="context-alert-icon">
        {{ message.icon }}
      </div>

      <!-- Contenido -->
      <div class="context-alert-content">
        <div class="context-alert-message">{{ message.message }}</div>
        <div class="context-alert-subtext">{{ message.subtext }}</div>
      </div>

      <!-- Botón de cerrar -->
      <button
        class="context-alert-close"
        @click="handleClose"
        aria-label="Cerrar alerta"
      >
        &times;
      </button>

      <!-- Barra de progreso -->
      <div class="context-alert-progress">
        <div
          class="context-alert-progress-bar"
          :style="{ animationDuration: `${duration}ms` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: Object,
    default: () => null
  },
  duration: {
    type: Number,
    default: 5000
  }
})

const emit = defineEmits(['close'])

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
/* Posicionamiento igual que los toasts del sistema */
.context-alert-wrapper {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 5.5rem);
  transform: translateX(-50%);
  width: min(90vw, 420px);
  z-index: 1100;
  pointer-events: none;
}

/* Estilo base del alert (similar a los toasts) */
.context-alert {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  /* Usar color info del sistema (#1f2937) */
  background: #1f2937;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  width: 100%;
  pointer-events: auto;
  overflow: hidden;
}

.context-alert-icon {
  font-size: 24px;
  flex-shrink: 0;
  line-height: 1;
}

.context-alert-content {
  flex: 1;
  min-width: 0;
}

.context-alert-message {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 2px;
  color: white;
}

.context-alert-subtext {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.context-alert-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.context-alert-close:hover {
  opacity: 1;
}

.context-alert-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.context-alert-progress-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  animation: progress-shrink linear forwards;
  transform-origin: left;
}

@keyframes progress-shrink {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .context-alert-wrapper {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 104px);
    width: calc(100vw - 32px);
  }

  .context-alert {
    padding: 10px 12px;
  }

  .context-alert-icon {
    font-size: 20px;
  }

  .context-alert-message {
    font-size: 13px;
  }

  .context-alert-subtext {
    font-size: 11px;
  }
}

@media (max-height: 720px) {
  .context-alert-wrapper {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
  }
}
</style>
