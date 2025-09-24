<template>
  <div v-if="isOpen" class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50" @click.self="$emit('close')">
    <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-[90%] max-h-[90vh] overflow-hidden" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-800">Historial de cambios</h2>
            <p class="text-sm text-slate-500">Registro detallado de modificaciones del sistema</p>
          </div>
        </div>
        <button @click="$emit('close')" class="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Filters -->
      <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-slate-700">Planta:</label>
            <select v-model="selectedPlanta" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option value="">Todas las plantas</option>
              <option v-for="p in plantas" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>
          <div class="flex-1"></div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-slate-700">Página:</label>
              <select v-model.number="page" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option v-for="n in totalPages" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-slate-700">Por página:</label>
              <select v-model.number="pageSize" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="20">20</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="items.length === 0" class="text-center py-8">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-slate-500 mb-2">No hay cambios registrados</p>
          <p class="text-sm text-slate-400">Los cambios aparecerán aquí cuando se realicen modificaciones</p>
        </div>

        <!-- Lista de Entradas -->
        <div v-else class="space-y-3 max-h-96 overflow-y-auto">
          <div v-for="entry in items" :key="entry.id" class="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <!-- Header de cada entrada -->
            <button class="w-full flex items-center justify-between text-left" @click="toggleEntry(entry.id)">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <div class="text-sm font-medium text-slate-800">{{ formatDate(entry.timestamp) }}</div>
                  <div class="text-xs text-slate-500">Autor: {{ entry.author?.name || 'Desconocido' }}</div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-4 text-sm text-slate-600">
                  <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">+{{ entry.summary.created }}</span>
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">~{{ entry.summary.updated }}</span>
                  <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">-{{ entry.summary.deleted }}</span>
                </div>
                <svg :class="['w-5 h-5 text-slate-400 transition-transform', isOpenEntry(entry.id) ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </button>
            <!-- Contenido colapsable -->
            <div v-show="isOpenEntry(entry.id)" class="mt-4 pt-4 border-t border-slate-200">
              <div class="space-y-3">
                <div v-for="ch in entry.changes" :key="ch.entityType + ':' + ch.op + ':' + ch.id" class="bg-slate-50 rounded-lg p-3">
                  <div class="flex items-center gap-2 mb-2">
                    <div :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                      ch.op === 'create' ? 'bg-green-100 text-green-700' :
                      ch.op === 'delete' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    ]">
                      <span v-html="iconFor(ch.op)"></span>
                    </div>
                    <div class="flex-1">
                      <div class="text-sm font-medium text-slate-800">
                        {{ labelOp(ch.op) }} {{ labelEntity(ch.entityType) }}
                      </div>
                      <div class="text-xs text-slate-500">
                        {{ ch.name || ch.id }}
                        <span v-if="ch.plantaId" class="ml-2">[Planta: {{ ch.plantaId }}]</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="ch.fields && ch.fields.length" class="ml-8">
                    <div class="space-y-2">
                      <div v-for="f in ch.fields.filter(ff => !bothEmpty(ff.before, ff.after))" :key="f.path" class="text-xs">
                        <div class="flex items-start gap-3">
                          <span class="min-w-[140px] text-slate-600 font-medium">{{ getFieldLabel(f.path) }}:</span>
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <span class="text-red-600 line-through bg-red-50 px-2 py-1 rounded">{{ formatValue(f.before, f.path) }}</span>
                              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                              </svg>
                              <span class="text-green-700 bg-green-50 px-2 py-1 rounded">{{ formatValue(f.after, f.path) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div class="flex items-center justify-between">
          <div class="text-sm text-slate-600">
            Total: <span class="font-medium">{{ total }}</span> entradas
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="page = page - 1"
              :disabled="page <= 1"
              class="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span class="text-sm text-slate-600">
              Página <span class="font-medium">{{ page }}</span> de <span class="font-medium">{{ totalPages }}</span>
            </span>
            <button
              @click="page = page + 1"
              :disabled="page >= totalPages"
              class="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useExternalServices } from '@/inventory-smart/composables/useExternalServices'
import { useChangeHistoryStore } from '@/inventory-smart/stores/changeHistory'
import { getFieldLabel } from '@/inventory-smart/constants/fieldLabels'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
})
defineEmits(['close'])

const page = ref(1)
const pageSize = ref(10)
const selectedPlanta = ref('')
const loading = ref(false)
const openEntries = ref(new Set())

const canvasStore = useCanvasStore()
const plantas = computed(() => canvasStore.plantas || [])

const items = ref([])
const total = ref(0)
const totalPages = ref(1)
const { getChangeHistory } = useExternalServices()
const changeHistoryStore = useChangeHistoryStore()

const load = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, plantaId: selectedPlanta.value || null }
  const external = await getChangeHistory(params)
  const res = external ?? changeHistoryStore.getPaginated(params)
    items.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (open) => { if (open) load() })
watch([page, pageSize, selectedPlanta], () => { if (props.isOpen) load() })

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleString('es-ES') } catch { return iso }
}
const labelOp = (op) => ({ create: 'Creado', update: 'Actualizado', delete: 'Eliminado' }[op] || op)
const labelEntity = (t) => ({ planta: 'Planta', elemento: 'Elemento' }[t] || t)
const shortJson = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s && s.length > 60 ? s.slice(0, 60) + '…' : s
}

const iconFor = (op) => {
  if (op === 'create') return '➕'
  if (op === 'delete') return '🗑️'
  return '✏️'
}

const formatValue = (v, path) => {
  if (v == null) return '—'
  const last = path.split('.').pop()
  if (['ancho','largo','alto','width','height','depth'].includes(last)) return `${v} cm`
  if (last === 'dimensiones' && v && typeof v === 'object') {
    const a = v.ancho ?? v.width ?? v.w
    const l = v.largo ?? v.length ?? v.depth ?? v.d
    const h = v.alto ?? v.height ?? v.h
    if ([a,l,h].every(n => n != null)) return `${a}x${l}x${h} cm`
  }
  if (['weight','capacity'].includes(last)) return `${v} Kg`
  return shortJson(v)
}

const toggleEntry = (id) => {
  if (openEntries.value.has(id)) openEntries.value.delete(id)
  else openEntries.value.add(id)
}
const isOpenEntry = (id) => openEntries.value.has(id)

const isEmptyish = (v) => {
  if (v == null) return true
  if (typeof v === 'string') return v.trim().length === 0
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v).length === 0
  return false
}
const bothEmpty = (a, b) => isEmptyish(a) && isEmptyish(b)
</script>

<style scoped>
</style>
