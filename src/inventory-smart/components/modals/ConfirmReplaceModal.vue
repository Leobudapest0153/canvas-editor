<template>
  <div v-if="mostrar" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="onBackdrop">
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-[92%] overflow-hidden" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', headerBg]">
            <svg v-if="tipo === 'danger'" class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <svg v-else class="w-6 h-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path fill="currentColor" d="M11 21q-1.85 0-3.488-.712t-2.85-1.925t-1.925-2.85T2 12t.712-3.513t1.925-2.85t2.85-1.925T11 3q2.975 0 5.162 1.725T19.65 9H18q-.425 0-.712.288T17 10t.288.713T18 11h3q.425 0 .713-.288T22 10V7q0-.425-.288-.712T21 6t-.713.288T20 7v1.35q-1.275-1.6-3.113-2.475T11 5q-2.9 0-4.95 2.05T4 12t2.05 4.95T11 19q2.525 0 4.462-1.55T18 14q0-.425-.288-.712T17 13t-.712.288T16 14q0 1.675-1.163 2.838T11 18" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-800">{{ titulo }}</h2>
            <p v-if="subtitulo" class="text-xs text-slate-500">{{ subtitulo }}</p>
          </div>
        </div>
        <button @click="cerrar" class="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer transition-colors" aria-label="Cerrar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 text-slate-700">
        <slot>
          <p class="whitespace-pre-line">{{ mensaje }}</p>
        </slot>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-200 flex items-center justify-end gap-2">
        <button
          v-if="modo === 'confirm'"
          type="button"
          class="px-4 py-2 text-slate-600 hover:text-slate-800 bg-transparent border-none rounded cursor-pointer"
          @click="cerrar"
        >
          {{ cancelarTexto }}
        </button>
        <button
          type="button"
          :class="confirmBtnClass"
          @click="onConfirm"
        >
          {{ confirmarTextoComputed }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mostrar: { type: Boolean, default: false },
  modo: { type: String, default: 'notice' }, // 'notice' | 'confirm'
  tipo: { type: String, default: 'info' }, // 'info' | 'danger'
  titulo: { type: String, default: 'Confirmación' },
  subtitulo: { type: String, default: '' },
  mensaje: { type: String, default: '' },
  confirmarTexto: { type: String, default: '' },
  cancelarTexto: { type: String, default: 'Cancelar' },
  cerrarAlConfirmar: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true },
})

const emit = defineEmits(['confirmar', 'cerrar'])

const headerBg = computed(() => (props.tipo === 'danger' ? 'bg-red-100' : 'bg-primary-100'))
const confirmBtnClass = computed(() => {
  const base = 'px-4 py-2 rounded-lg text-white font-medium cursor-pointer transition-colors'
  return props.tipo === 'danger'
    ? `${base} bg-red-600 hover:bg-red-700`
    : `${base} bg-primary hover:bg-primary-200`
})
const confirmarTextoComputed = computed(() => {
  if (props.modo === 'notice') return 'Entendido'
  return props.confirmarTexto || 'Confirmar'
})

const cerrar = () => emit('cerrar')
const onConfirm = () => {
  emit('confirmar')
  if (props.cerrarAlConfirmar) emit('cerrar')
}
const onBackdrop = () => {
  if (props.closeOnBackdrop) emit('cerrar')
}
</script>
