<template>
  <div class="relative" ref="root">
    <div
      class="w-full px-3 py-2 border rounded-lg text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer bg-white flex items-center justify-between gap-2"
      :class="error ? 'border-red-400' : 'border-gray-300'"
      @click.stop="toggle"
    >
      <div class="flex flex-wrap items-center gap-1 min-h-[1.25rem]">
        <template v-if="selectedIds.length">
          <span
            v-for="id in selectedIds"
            :key="id"
            class="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs"
          >
            {{ labelsMap[id] || id }}
          </span>
        </template>
        <span v-else class="text-gray-400">{{ placeholder }}</span>
      </div>
      <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
    <p v-if="error && errorMessage" class="mt-1 text-xs text-red-600">{{ errorMessage }}</p>

    <div v-if="open" class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
      <div class="p-2 border-b bg-gray-50 text-xs text-gray-600 flex justify-between">
        <button class="hover:text-blue-600 cursor-pointer" @click.stop="selectAll">Seleccionar todos</button>
        <button class="hover:text-blue-600 cursor-pointer" @click.stop="clearAll">Limpiar</button>
      </div>
      <ul class="p-2 space-y-1">
        <li v-for="opt in options" :key="opt.id" class="px-2 py-1 rounded hover:bg-gray-50">
          <label :for="`pt-${uid}-${opt.id}`" class="flex items-center gap-2 cursor-pointer">
            <input
              :id="`pt-${uid}-${opt.id}`"
              type="checkbox"
              class="h-4 w-4 text-blue-600 border-gray-300 rounded"
              :value="opt.id"
              :checked="selectedIds.includes(opt.id)"
              @change.stop="onToggle(opt.id)"
            />
            <span class="text-sm text-gray-700">{{ opt.nombre }}</span>
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Selecciona tipos de productos' },
  error: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'changed'])

const open = ref(false)
const root = ref(null)
const uid = Math.random().toString(36).slice(2)

const canvasStore = useCanvasStore()
const { tiposProductoAdmitidos } = storeToRefs(canvasStore)

const options = computed(() => tiposProductoAdmitidos.value || [])
const labelsMap = computed(() => Object.fromEntries((options.value || []).map(t => [t.id, t.nombre])))

const selectedIds = computed({
  get: () => (Array.isArray(props.modelValue) ? props.modelValue : []),
  set: (val) => {
    emit('update:modelValue', val)
    emit('changed', val)
  },
})

const toggle = () => {
  open.value = !open.value
}

const onToggle = (id) => {
  const arr = [...selectedIds.value]
  const idx = arr.indexOf(id)
  if (idx === -1) arr.push(id)
  else arr.splice(idx, 1)
  selectedIds.value = arr
}

const selectAll = () => {
  selectedIds.value = options.value.map((o) => o.id)
}

const clearAll = () => {
  selectedIds.value = []
}

const onClickDoc = (e) => {
  if (!open.value) return
  const el = root.value
  if (el && !el.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickDoc))
onBeforeUnmount(() => document.removeEventListener('click', onClickDoc))
</script>

<style scoped></style>
