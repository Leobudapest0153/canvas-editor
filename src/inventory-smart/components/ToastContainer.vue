<template>
  <div class="toasts">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type" role="alert" :data-toast-id="t.id">
      <span class="msg">{{ t.message }}</span>
      <button v-if="t.cta" class="cta" @click="handleCta(t)">{{ t.cta.label }}</button>
      <button class="close" @click="remove(t.id)">
        &times;
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { ToastSymbol } from '@/inventory-smart/plugins/toast'

const toastApi = inject(ToastSymbol)
const toasts = toastApi?.toasts ?? { value: [] }

function remove(id) {
  toastApi?.remove?.(id)
}

function handleCta(t) {
  try { t.cta?.onClick?.() } finally { remove(t.id) }
}
</script>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 5.5rem);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
  width: min(90vw, 420px);
  z-index: 1100;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #111827;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  width: 100%;
  pointer-events: auto;
}
.toast.info {
  background: #1f2937;
}
.toast.success {
  background: #059669;
}
.toast.warn {
  background: #b45309;
}
.toast.error {
  background: #991b1b;
}
.toast .msg {
  font-size: 14px;
  /* Preserve line breaks and allow wrapping for long messages */
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.toast .cta {
  background: #3b82f6;
  border: none;
  color: #fff;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.toast .close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}
@media (max-width: 640px) {
  .toasts {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 104px);
    width: calc(100vw - 32px);
  }
}
@media (max-height: 720px) {
  .toasts {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
  }
}
</style>


