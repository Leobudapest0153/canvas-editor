<!-- src/components/CreateTagModal.vue -->
<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Crear Nueva Etiqueta</h3>
      <form @submit.prevent="guardar">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Texto de la etiqueta:</label>
          <input
            v-model="etiqueta.texto"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
          />
        </div>
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Color de fondo:</label>
            <input
              v-model="etiqueta.colorFondo"
              type="color"
              class="w-full h-10 border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Color de texto:</label>
            <input
              v-model="etiqueta.colorTexto"
              type="color"
              class="w-full h-10 border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Guardar Etiqueta
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  initialText: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'save'])

const etiqueta = ref({
  texto: '',
  colorFondo: '#DBEAFE',
  colorTexto: '#1E40AF',
})

watch(
  () => props.initialText,
  (newVal) => {
    etiqueta.value.texto = newVal
  }
)

const close = () => emit('close')
const guardar = () => {
  emit('save', { ...etiqueta.value })
  close()
}
</script>
