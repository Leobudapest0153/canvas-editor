<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6">
        <h2 class="text-lg font-bold mb-4 text-primary text-center">Identificar ESL</h2>

        <!-- Indicador de detección de escáner -->
        <div v-if="detectandoEscaner" class="mb-3 p-2 bg-green-100 border border-green-300 rounded-md text-center text-sm text-green-700">
          📱 Detectando código...
        </div>

        <!-- Animación del escáner -->
        <div class="scanner-container mb-6">
          <div class="scanner-frame">
            <div class="scanner-corners"></div>
            <div class="scanner-line"></div>
          </div>
        </div>

        <!-- Input para código -->
        <div class="mb-6">
          <!-- <label class="block text-sm font-medium text-gray-700 mb-2">Código</label> -->
          <input
            ref="inputRef"
            v-model="codigoBarras"
            type="text"
            placeholder="Escanee o ingrese el código aquí"
            class="w-full p-3 border border-gray-300 rounded-md"
            @keyup.enter="guardar"
          />
        </div>

        <!-- Botones -->
        <div class="flex justify-center space-x-3">
          <button
            @click="cancelar"
            class="px-4 py-2 rounded-md text-[#364153] text-sm bg-gray-200 cursor-pointer ml-1 disabled:opacity-50 hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            @click="guardar"
            :disabled="!codigoBarras.trim()"
            class="px-4 py-2 cursor-pointer bg-primary text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const emit = defineEmits(['close', 'save'])

const codigoBarras = ref('')
const inputRef = ref(null)
const detectandoEscaner = ref(false)

// Variables para el listener del escáner
let barcodeBuffer = ''
let barcodeTimeout = null
const BARCODE_TIMEOUT = 100 // ms entre caracteres para considerar que es un escáner

const cancelar = () => {
  emit('close')
}

const guardar = () => {
  if (!codigoBarras.value.trim()) return
  emit('save', { codigoEsl: codigoBarras.value.trim() })
  emit('close')
}

// Función para manejar el input del código (escáner o manual)
const handleBarcodeInput = (e) => {
  // Si el foco está en el input, permitir escritura normal
  if (document.activeElement === inputRef.value) {
    return
  }

  // Solo procesar si no estamos en otros inputs (patrón usado en canvasHotkeys.js)
  if (e.target instanceof Element && e.target.matches('input, textarea, select, [contenteditable]')) {
    return
  }

  // Bloquear si hay texto seleccionado (patrón usado en InventorySmart.vue)
  if (window.getSelection().toString()) {
    return
  }

  // Bloquear si hay drag global activo (patrón usado en InventorySmart.vue)
  if (typeof window !== 'undefined' && window.__dvCanvasDragActive) {
    return
  }

  // Evitar teclas especiales y modificadores
  if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) {
    // Escapar - cerrar modal
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelar()
    }
    // Backspace/Delete - limpiar código y buffer
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      codigoBarras.value = ''
      barcodeBuffer = ''
      detectandoEscaner.value = false
      clearTimeout(barcodeTimeout)
    }
    return
  }

  // Prevenir que la tecla se procese en otros listeners
  e.preventDefault()
  e.stopPropagation()

  // Mostrar indicador de detección si es el primer carácter
  if (barcodeBuffer.length === 0) {
    detectandoEscaner.value = true
  }

  // Agregar carácter al buffer
  barcodeBuffer += e.key

  // Limpiar timeout anterior
  clearTimeout(barcodeTimeout)

  // Configurar nuevo timeout
  barcodeTimeout = setTimeout(() => {
    detectandoEscaner.value = false

    // Si el buffer tiene contenido válido (mínimo 3 caracteres), asumimos que es un código
    if (barcodeBuffer.length >= 3) {
      codigoBarras.value = barcodeBuffer

      // Auto-guardar si el código parece completo (más de 8 caracteres)
      if (barcodeBuffer.length >= 8) {
        setTimeout(() => {
          if (codigoBarras.value.trim()) {
            guardar()
          }
        }, 300) // Pequeña pausa para que el usuario vea el código
      }
    }
    barcodeBuffer = ''
  }, BARCODE_TIMEOUT)
}

onMounted(async () => {
  // Agregar listener global para capturar input del escáner con alta prioridad
  // Usamos capture: true para interceptar el evento antes que otros listeners
  window.addEventListener('keydown', handleBarcodeInput, { capture: true })

  // Enfocar el input cuando se abre el modal
  await nextTick()
  if (inputRef.value) {
    inputRef.value.focus()
  }
})

onUnmounted(() => {
  // Limpiar listeners y timeouts
  window.removeEventListener('keydown', handleBarcodeInput, { capture: true })
  clearTimeout(barcodeTimeout)
  detectandoEscaner.value = false
  barcodeBuffer = ''
})
</script>

<style scoped>
.scanner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 150px;
  /* background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); */
  /* border-radius: 8px; */
  position: relative;
  overflow: hidden;
}

.scanner-frame {
  position: relative;
  width: 100px;
  height: 100px;
  /* border: 2px solid var(--color-primary);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1); */
}

.scanner-corners::before,
.scanner-corners::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid var(--color-primary);
}

.scanner-corners::before {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
}

.scanner-corners::after {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
}

.scanner-frame::before,
.scanner-frame::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid var(--color-primary);
}

.scanner-frame::before {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
}

.scanner-frame::after {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
}

.scanner-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    #10b981 5%,
    #059669 50%,
    #10b981 95%,
    transparent 100%
  );
  border-radius: 2px;
  animation: scan 2s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

@keyframes scan {
  0% {
    top: 0;
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    top: calc(100% - 3px);
    opacity: 1;
  }
}

/* Efectos adicionales para la animación */
.scanner-frame {
  animation: glow 2s ease-in-out infinite alternate;
}

/* @keyframes glow {
  from {
    box-shadow: 0 0 5px rgba(5, 150, 105, 0.3);
  }
  to {
    box-shadow:
      0 0 20px rgba(5, 150, 105, 0.6),
      0 0 30px rgba(5, 150, 105, 0.4);
  }
} */

kbd {
  display: inline-block;
  padding: 2px 4px;
  font-size: 11px;
  font-family: monospace;
  color: #333;
  background-color: #f1f1f1;
  border: 1px solid #ccc;
  border-radius: 3px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}
</style>
