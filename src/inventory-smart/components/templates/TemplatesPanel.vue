<template>
  <div class="p-4 overflow-y-auto h-full">
    <div v-if="templates.length === 0" class="text-center text-sm text-gray-500">
      No hay plantillas guardadas
    </div>
    <div v-else class="grid grid-cols-1 gap-4">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="border rounded-md p-3 flex flex-col gap-2 bg-white shadow-sm"
      >
        <div class="font-medium">{{ tpl.name }}</div>
        <div class="text-xs text-gray-500">
          {{ tpl.summary.rootType }} · {{ tpl.summary.dims.width }}×{{ tpl.summary.dims.height }} ·
          {{ tpl.summary.totalChildren }} hijos
        </div>
        <div class="flex gap-2 mt-2">
          <button class="px-2 py-1 text-sm bg-blue-600 text-white rounded" @click="insert(tpl)">
            Agregar
          </button>
          <button class="px-2 py-1 text-sm bg-gray-100 rounded" @click="rename(tpl)">
            Renombrar
          </button>
          <button class="px-2 py-1 text-sm bg-red-600 text-white rounded" @click="remove(tpl.id)">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTemplatesStore } from '@/inventory-smart/stores/templates.js'
import { instantiateTemplate } from '@/inventory-smart/services/templates/deserialize.js'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore.js'

const store = useTemplatesStore()
const canvasStore = useCanvasStore()
const templates = ref([])

onMounted(async () => {
  if (!store.loaded) await store.init()
  templates.value = store.listTemplates()
})

const insert = (tpl) => {
  const nodes = instantiateTemplate(tpl, { x: 0, y: 0 }, { unitMode: tpl.unitMeta || 'px' })
  nodes.forEach((n) => {
    canvasStore.agregarElemento(n)
  })
}

const rename = async (tpl) => {
  const nuevo = window.prompt('Nuevo nombre', tpl.name)
  if (nuevo && nuevo.trim()) {
    await store.updateName(tpl.id, nuevo.trim())
    templates.value = store.listTemplates()
  }
}

const remove = async (id) => {
  if (window.confirm('¿Eliminar plantilla?')) {
    await store.deleteTemplate(id)
    templates.value = store.listTemplates()
  }
}
</script>
