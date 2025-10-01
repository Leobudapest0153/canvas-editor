<template>
  <div v-if="show" class="marquee-hint">
    <div class="marquee-hint-content">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <path d="M9 3v18"></path>
        <path d="M15 3v18"></path>
      </svg>
      <span class="marquee-hint-text">
        <kbd>Shift</kbd> + Arrastrar para selección múltiple
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  showHint: {
    type: Boolean,
    default: true,
  },
  isMarqueeActive: {
    type: Boolean,
    default: false,
  },
  selectedCount: {
    type: Number,
    default: 0,
  },
})

const show = computed(() => {
  // Mostrar hint solo si no hay marquesina activa y la prop lo permite
  return props.showHint && !props.isMarqueeActive
})
</script>

<style scoped>
.marquee-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
  animation: fadeIn 0.3s ease-in-out;
}

.marquee-hint-content {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-size: 14px;
  font-family: system-ui, -apple-system, sans-serif;
}

.marquee-hint-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.marquee-hint-text kbd {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Ocultar en pantallas pequeñas */
@media (max-width: 768px) {
  .marquee-hint {
    display: none;
  }
}
</style>
