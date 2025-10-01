<template>
  <div v-if="isOpen" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="onCancel">
    <div class="modal">
      <header class="modal-header">
        <span class="close-placeholder" />
        <h3 class="title center">{{ title }}</h3>
        <button class="close" @click="onCancel" aria-label="Cerrar">×</button>
      </header>
      <section class="modal-body">
        <p class="message">{{ message }}</p>
      </section>
      <footer class="modal-footer centered">
        <button class="btn" @click="onCancel">{{ cancelLabel }}</button>
        <button
          class="btn"
          @click="onConfirm"
          :style="{
            backgroundColor: background,
            color: color,
            border: border,
          }"
        >{{ confirmLabel }}</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'

const {
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  markMounted,
  background,
  border,
  color
} = useConfirmDialog()

onMounted(() => {
  markMounted()
})
</script>

<style scoped>
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1100}
.modal{width:420px;max-width:92vw;background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden}
.modal-header{position:relative;display:flex;align-items:center;justify-content:center;padding:12px 16px;border-bottom:1px solid #e5e7eb}
.modal-header .close{position:absolute;right:12px;top:50%;transform:translateY(-50%)}
.close-placeholder{width:24px;height:24px;display:block;position:absolute;left:12px;top:50%;transform:translateY(-50%)}
.title{font-size:16px;font-weight:600;color:#111827;margin:0;text-align:center;width:100%}
.title.center{text-align:center}
.close{background:transparent;border:none;font-size:20px;cursor:pointer;color:#6b7280;line-height:1}
.modal-body{padding:16px;color:#374151}
.message{white-space:pre-wrap}
.modal-footer{display:flex;gap:12px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #e5e7eb}
.modal-footer.centered{justify-content:center}
.btn{border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:8px 12px;font-size:14px;cursor:pointer}
.btn-danger{background:#ef4444;color:#fff;border-color:#fecaca}
</style>

