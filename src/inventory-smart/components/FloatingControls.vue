<template>
  <div ref="controlsRef" class="floating-controls" :style="{ right: `${floatingRight}px` }">
    <UiTooltip label="Deshacer (Ctrl+Z)" :delay="200" position="bottom">
      <button @click="$emit('undo')" :disabled="!canUndo" class="floating-btn btn-undo">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
    </UiTooltip>
    <UiTooltip label="Rehacer (Ctrl+Y)" :delay="200" position="bottom">
      <button @click="$emit('redo')" :disabled="!canRedo" class="floating-btn btn-redo">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
        </svg>
      </button>
    </UiTooltip>
    <UiTooltip label="Alejar (Ctrl+ -)" :delay="200" position="bottom">
      <button @click="$emit('zoom-out')" :disabled="!canZoomOut" class="floating-btn btn-zoom btn-zoom-out" title="Alejar (Ctrl+ -)">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </UiTooltip>
    <UiTooltip label="Acercar (Ctrl+ +)" :delay="200" position="bottom">
      <button @click="$emit('zoom-in')" :disabled="!canZoomIn" class="floating-btn btn-zoom btn-zoom-in" title="Acercar (Ctrl+ +)">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </UiTooltip>
    <UiTooltip label="Ajustar vista" position="bottom" :delay="200">
      <button @click="$emit('fit')" :disabled="!canFit" class="floating-btn btn-fit">
        <svg class="icon-xl" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor"
            d="M18.25 4A3.75 3.75 0 0 1 22 7.75v8.5A3.75 3.75 0 0 1 18.25 20H5.75A3.75 3.75 0 0 1 2 16.25v-8.5A3.75 3.75 0 0 1 5.75 4zm0 1.5H5.75A2.25 2.25 0 0 0 3.5 7.75v8.5a2.25 2.25 0 0 0 2.25 2.25h12.5a2.25 2.25 0 0 0 2.25-2.25v-8.5a2.25 2.25 0 0 0-2.25-2.25m0 7.5a.75.75 0 0 1 .75.75V15a2 2 0 0 1-2 2h-1.25a.75.75 0 0 1 0-1.5H17a.5.5 0 0 0 .5-.5v-1.25a.75.75 0 0 1 .75-.75m-12.5 0a.75.75 0 0 1 .75.75V15a.5.5 0 0 0 .5.5h1.25a.75.75 0 0 1 0 1.5H7a2 2 0 0 1-2-2v-1.25a.75.75 0 0 1 .75-.75M7 7h1.25a.75.75 0 0 1 .102 1.493L8.25 8.5H7a.5.5 0 0 0-.492.41L6.5 9v1.25a.75.75 0 0 1-1.493.102L5 10.25V9a2 2 0 0 1 1.85-1.995zm10 0a2 2 0 0 1 2 2v1.25a.75.75 0 0 1-1.5 0V9a.5.5 0 0 0-.5-.5h-1.25a.75.75 0 0 1 0-1.5z" />
        </svg>
      </button>
    </UiTooltip>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import UiTooltip from './ui/UiTooltip.vue'

const props = defineProps({
  safeRight: { type: Number, default: 20 },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  canZoomIn: { type: Boolean, default: true },
  canZoomOut: { type: Boolean, default: true },
  canFit: { type: Boolean, default: true }
})

const floatingRight = ref(props.safeRight)
const controlsRef = ref(null)
let panelResizeObserver = null
let panelObserver = null

function recomputeFloatingRight() {
  try {
    const panel = document.querySelector('[data-properties-panel]')
    const margin = 12
    if (panel && panel.offsetParent !== null) {
      const rect = panel.getBoundingClientRect()
      floatingRight.value = Math.ceil(props.safeRight + rect.width + margin)
    } else {
      floatingRight.value = props.safeRight
    }
  } catch { floatingRight.value = props.safeRight }
}

onMounted(() => {
  recomputeFloatingRight()
  window.addEventListener('resize', recomputeFloatingRight)
  try {
    panelObserver = new MutationObserver(() => {
      recomputeFloatingRight()
      const panel = document.querySelector('[data-properties-panel]')
      if (panel) {
        if (!panelResizeObserver) panelResizeObserver = new ResizeObserver(recomputeFloatingRight)
        panelResizeObserver.observe(panel)
      }
    })
    panelObserver.observe(document.body, { childList: true, subtree: true, attributes: true })
  } catch (e) {
    // noop
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', recomputeFloatingRight)
  try {
    panelObserver && panelObserver.disconnect();
    panelResizeObserver && panelResizeObserver.disconnect()
  } catch (e) {
    // noop
  }
})

watch(() => props.safeRight, recomputeFloatingRight)

</script>


<style scoped>

/* Botones flotantes para undo/redo */
.floating-controls {
  position: absolute;
  top: 36px;
  right: 36px; /* valor por defecto, será sobrescrito por :style */
  display: flex;
  gap: 8px;
  z-index: 10;
}

.floating-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Botones de zoom: heredan tamaño de .floating-btn y comparten color/hover con btn-undo */
.btn-zoom:not(:disabled) {
  color: #3b82f6;
}
.btn-zoom:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

/* Si el espacio horizontal es reducido, desplazar .canvas-info hacia la izquierda y reducir su padding */
@media (max-width: 900px) {
  .canvas-info { left: 16px; top: 24px; padding: 6px 8px; font-size: 11px }
  .floating-controls { top: 24px; right: 12px }
  .floating-btn { width: 40px; height: 40px }
}

/* Si todavía hay conflicto visual, forzar que .canvas-info tome dos líneas y tenga menor gap */
@media (max-width: 640px) {
  .canvas-info { gap: 8px; font-size: 11px }
  .floating-controls { gap: 6px }
  .floating-btn { width: 36px; height: 36px }
}

.floating-btn:hover:not(:disabled) {
  background: white;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.floating-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.floating-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.7);
}

.btn-undo:not(:disabled) {
  color: #3b82f6;
}

.btn-undo:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

.btn-redo:not(:disabled) {
  color: #059669;
}

.btn-redo:hover:not(:disabled) {
  background: #ecfdf5;
  border-color: #059669;
}

/* Ajuste visual del botón de 'fit' para que coincida con el botón Deshacer */
.btn-fit:not(:disabled) {
  color: #3b82f6;
}
.btn-fit:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

/* Gear button style to match Undo */
.btn-gear {
  color: #3b82f6;
}
.btn-gear:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

.floating-btn .icon {
  width: 20px;
  height: 20px;
}

.floating-btn .icon-xl {
  width: 24px;
  height: 24px;
}

.btn-fit { position: relative; z-index: 30; }
</style>
