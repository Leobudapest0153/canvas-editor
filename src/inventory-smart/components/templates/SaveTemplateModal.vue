<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <h3 class="text-lg font-semibold mb-4">Guardar plantilla</h3>
      <form @submit.prevent="onSave">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Nombre</label>
          <input
            v-model="name"
            type="text"
            required
            minlength="3"
            maxlength="80"
            class="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div class="mb-4 text-sm text-gray-600" v-if="summary">
          <p>Tipo raíz: {{ summary.rootType }}</p>
          <p>Dimensiones: {{ summary.dims.width }}×{{ summary.dims.height }}</p>
          <p>Hijos totales: {{ summary.totalChildren }}</p>
          <p>Profundidad: {{ summary.depth }}</p>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="px-4 py-2 bg-gray-100 rounded-md" @click="emit('close')">
            Cancelar
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md">
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  summary: { type: Object, default: null },
})
const emit = defineEmits(['close', 'save'])

const name = ref('')

watch(
  () => props.visible,
  (v) => {
    if (!v) name.value = ''
  }
)

const onSave = () => {
  if (!name.value.trim()) return
  emit('save', { name: name.value.trim() })
}
</script>
