<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white rounded-xl shadow-2xl max-w-4xl w-[90%] max-h-[90vh] overflow-hidden"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-secondary-500 rounded-lg flex items-center justify-center">
            <svg
              class="w-6 h-6 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12 21q-3.15 0-5.575-1.912T3.275 14.2q-.1-.375.15-.687t.675-.363q.4-.05.725.15t.45.6q.6 2.25 2.475 3.675T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H8q.425 0 .713.288T9 9t-.288.713T8 10H4q-.425 0-.712-.288T3 9V5q0-.425.288-.712T4 4t.713.288T5 5v1.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m1-9.4l2.5 2.5q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-2.8-2.8q-.15-.15-.225-.337T11 11.975V8q0-.425.288-.712T12 7t.713.288T13 8z"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-800">Historial de cambios</h2>
            <p class="text-sm text-slate-500">Registro detallado de modificaciones del sistema</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="items.length === 0" class="text-center py-8">
          <div
            class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p class="text-slate-500 mb-2">No hay cambios registrados</p>
          <p class="text-sm text-slate-400">Los cambios aparecerán aquí cuando se guarden</p>
        </div>

        <!-- Lista de Entradas -->
        <div v-else class="space-y-3 max-h-96 overflow-y-auto">
          <div v-for="entry in items" :key="entry.id" class="p-4 rounded-lg bg-[#f8fafc]">
            <!-- Header de cada entrada -->
            <button
              class="w-full cursor-pointer flex items-center justify-between text-left focus:outline-none"
              @click="toggleEntry(entry.id)"
            >
              <div class="flex items-center gap-3">
                <!-- <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div> -->
                <div>
                  <div class="text-sm font-medium text-primary">
                    {{ formatDate(entry.timestamp) }}
                  </div>
                  <div class="text-xs font-medium text-primary">
                    <div class="flex items-center gap-2 mt-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        class="flex-shrink-0"
                      >
                        <path
                          fill="#1c1e4d"
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88a9.95 9.95 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20"
                        />
                      </svg>
                      <span>{{ entry.author?.name || 'Desconocido' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <!-- <div class="flex items-center gap-4 text-sm text-slate-600">
                  <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">+{{ entry.summary.created }}</span>
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">~{{ entry.summary.updated }}</span>
                  <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">-{{ entry.summary.deleted }}</span>
                </div> -->
                <svg
                  :class="[
                    'w-5 h-5 text-slate-400 transition-transform',
                    isOpenEntry(entry.id) ? 'rotate-180' : '',
                  ]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>
            <!-- Contenido colapsable -->
            <div v-show="isOpenEntry(entry.id)" class="mt-2">
              <div class="space-y-3">
                <div
                  v-for="ch in entry.changes"
                  :key="ch.entityType + ':' + ch.op + ':' + ch.id"
                  class="bg-[#f8fafc] rounded-lg p-3"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    >
                      <span v-html="svgFor(ch.op)"></span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="text-sm font-bold text-primary-800">
                        {{ labelOp(ch.op) }} {{ labelEntity(ch.entityType, ch) }}
                      </div>
                      <div class="text-xs text-slate-500">
                        {{ ch.code || ch.name || ch.id }}
                        <!-- <span v-if="ch.plantaId" class="ml-2">[Planta: {{ ch.plantaId }}]</span> -->
                      </div>
                    </div>
                  </div>

                  <div v-if="ch.fields && ch.fields.length && ch.op !== 'create'" class="ml-8">
                    <div class="space-y-2">
                      <div
                        v-for="f in ch.fields.filter((ff) => !bothEmpty(ff.before, ff.after))"
                        :key="f.path"
                        class="text-xs"
                      >
                        <div class="flex items-center gap-3">
                          <span class="min-w-[140px] text-primary font-medium"
                            >{{ getFieldLabel(f.path, { tipo: getElementType(ch) }) }}:</span
                          >
                          <div class="flex-1">
                            <div class="flex items-center gap-2 font-medium text-slate-400">
                              <span class="px-2 py-1 rounded">{{
                                formatValue(f.before, f.path)
                              }}</span>
                              <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                              </svg>
                              <span class="px-2 py-1 rounded">{{
                                formatValue(f.after, f.path)
                              }}</span>
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
        <div class="flex items-center justify-end">
          <!-- <div class="text-sm text-slate-600">
            Total: <span class="font-medium">{{ total }}</span> entradas
          </div> -->
          <div class="flex items-center gap-3">
            <button
              @click="page = page - 1"
              :disabled="page <= 1"
              class="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span class="text-sm text-slate-600">
              Página <span class="font-medium">{{ page }}</span> de
              <span class="font-medium">{{ totalPages }}</span>
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
import { getFieldLabel, formatTipoValue } from '@/inventory-smart/constants/fieldLabels'
import { TIPOS_ENTIDAD } from '@/inventory-smart/utils/constants'

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
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      plantaId: selectedPlanta.value || null,
    }
    const external = await getChangeHistory(params)
    const res = external ?? changeHistoryStore.getPaginated(params)
    items.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages
  } finally {
    loading.value = false
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) load()
  },
)
watch([page, pageSize, selectedPlanta], () => {
  if (props.isOpen) load()
})

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}
const labelOp = (op) =>
  ({ create: 'Se creó', update: 'Se modificó', delete: 'Se eliminó' })[op] || op

const getElementType = (change) => {
  if (!change) return null
  const tipoField = change.fields?.find(f => f.path === 'tipo')
  return tipoField?.after || tipoField?.before
}

const labelEntity = (entityType, change) => {
  if (entityType === 'plantas') return 'planta'
  const tipoEntidad = TIPOS_ENTIDAD.find(t => t.id === entityType)
  if (tipoEntidad) {
    return tipoEntidad.nombreSingular.toLowerCase()
  }
  return entityType
}
const shortJson = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s && s.length > 60 ? s.slice(0, 60) + '…' : s
}

const svgFor = (op) => {
  if (op === 'create')
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#5bbf98" d="M17 13h-4v4h-2v-4H7v-2h4V7h2v4h4m-5-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/></svg>'
  if (op === 'delete') return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#de4731" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3zm0 5h2v9H9zm4 0h2v9h-2z"/></svg>'
  return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#f1c235" d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83l3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75z"/></svg>'
}

const formatValue = (v, path) => {
  if (v == null) return '—'
  const last = path.split('.').pop()

  // Caso especial para hijos: mostrar conteo
  if (last === 'hijos' && Array.isArray(v)) {
    return `${v.length}`
  }

  // Caso especial para tipos: mostrar nombre amigable
  if (last === 'tipo' && typeof v === 'string') {
    return formatTipoValue(v)
  }

  // Agregar 'cm' para campos de medidas
  if (['ancho', 'largo', 'alto', 'alturaRespectoAlSuelo'].includes(last)) return `${v} cm`

  if (last === 'dimensiones' && v && typeof v === 'object') {
    const a = v.ancho ?? v.width ?? v.w
    const l = v.largo ?? v.length ?? v.depth ?? v.d
    const h = v.alto ?? v.height ?? v.h
    if ([a, l, h].every((n) => n != null)) return `${a}x${l}x${h} cm`
  }
  if (['weight', 'capacity'].includes(last)) return `${v} Kg`
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

<style scoped></style>
