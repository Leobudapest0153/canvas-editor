<template>
  <div v-if="isOpen" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="onCancel">
    <div class="modal">
      <header class="modal-header">
        <h3 class="title">{{ title }}</h3>
        <button class="close" @click="onCancel" aria-label="Cerrar">×</button>
      </header>
      <section class="modal-body">
        <p class="message">{{ message }}</p>
      </section>
      <footer class="modal-footer">
        <button class="btn" @click="onCancel">{{ cancelLabel }}</button>
        <button class="btn btn-danger" @click="onConfirm">{{ confirmLabel }}</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const {
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  markMounted,
} = useConfirmDialog()

onMounted(() => {
  markMounted()
})
</script>

<style scoped>
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1100}
.modal{width:420px;max-width:92vw;background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb}
.title{font-size:16px;font-weight:600;color:#111827}
.close{background:transparent;border:none;font-size:20px;cursor:pointer;color:#6b7280}
.modal-body{padding:16px;color:#374151}
.message{white-space:pre-wrap}
.modal-footer{display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #e5e7eb}
.btn{border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:8px 12px;font-size:14px;cursor:pointer}
.btn-danger{background:#ef4444;color:#fff;border-color:#fecaca}
</style>

