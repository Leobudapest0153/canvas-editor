<template>
  <div class="toasts">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      <span class="msg">{{ t.message }}</span>
      <button v-if="t.cta" class="cta" @click="handleCta(t)">{{ t.cta.label }}</button>
      <button class="close" @click="remove(t.id)">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

let idSeq = 0
const toasts = ref([])

function show(message, options = {}) {
  const id = ++idSeq
  const toast = { id, message, type: options.type || 'info', cta: options.cta || null, timeout: options.timeout ?? 5000 }
  toasts.value.push(toast)
  if (toast.timeout > 0) {
    setTimeout(() => remove(id), toast.timeout)
  }
}

function remove(id) {
  const i = toasts.value.findIndex(t => t.id === id)
  if (i !== -1) toasts.value.splice(i, 1)
}

function handleCta(t) {
  t.cta?.onClick?.()
  remove(t.id)
}

// expose API globally via window for quick use
if (typeof window !== 'undefined') {
  window.__toasts = { show }
}
</script>

<style scoped>
.toasts{position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:1100}
.toast{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#111827;color:#fff;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.toast.info{background:#1f2937}
.toast.success{background:#059669}
.toast.warn{background:#b45309}
.toast.error{background:#991b1b}
.toast .msg{font-size:14px}
.toast .cta{background:#3b82f6;border:none;color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer}
.toast .close{background:transparent;border:none;color:#fff;font-size:16px;cursor:pointer}
</style>
