<template>
  <div v-if="open" class="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50" @click.self="onCancel">
    <div class="bg-white rounded-xl shadow-2xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <header class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2m1 14h-2v-2h2Zm0-4h-2V6h2Z"/></svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-800 m-0">Hay cambios sin guardar</h2>
            <p class="text-sm text-slate-500 m-0">Revisa antes de salir del editor</p>
          </div>
        </div>
        <button @click="onCancel" class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" aria-label="Cerrar">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>
      <section class="p-6 overflow-y-auto flex-1">
        <div v-if="loading" class="flex items-center justify-center py-10">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent"></div>
        </div>
        <div v-else-if="!changes.length" class="text-center py-10 text-slate-500">
          No se detectaron diferencias.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="ch in limitedChanges"
            :key="ch.entityType + ':' + ch.op + ':' + ch.id"
            class="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div class="flex gap-2 items-start">
              <div class="w-5 h-5 mt-0.5 flex-shrink-0" v-html="iconFor(ch.op)"></div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-700">
                  {{ labelOp(ch.op) }} {{ labelEntity(ch.entityType) }}
                  <span class="font-normal text-slate-500">{{ ch.name || ch.code || ch.id }}</span>
                </div>
                <div v-if="ch.fields && ch.fields.length" class="mt-1 space-y-1">
                  <div
                    v-for="f in ch.fields.slice(0, maxFieldsPerEntity)"
                    :key="f.path"
                    class="text-xs text-slate-600 flex flex-wrap gap-2 items-center"
                  >
                    <span class="font-semibold text-slate-700">{{ f.path }}:</span>
                    <span class="text-amber-600">→</span>
                    <span class="font-medium">{{ formatValue(f.after, f.path) }}</span>
                  </div>
                  <div v-if="ch.fields.length > maxFieldsPerEntity" class="text-[11px] text-slate-400">
                    + {{ ch.fields.length - maxFieldsPerEntity }} cambio(s) más…
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="changes.length > maxEntities" class="text-center text-[11px] text-slate-400">
            Mostrando primeros {{ maxEntities }} de {{ changes.length }} cambios.
          </div>
        </div>
      </section>
      <footer class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-4">
        <div class="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <div>{{ summary.created }} creados · {{ summary.updated }} modificados · {{ summary.deleted }} eliminados</div>
          <div v-if="changes.length" class="font-medium">Total: {{ changes.length }}</div>
        </div>
        <div class="flex flex-wrap justify-end gap-3">
          <button @click="onCancel" class="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">Cancelar</button>
          <button @click="onContinueNoSave" class="px-4 py-2 text-slate-600 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">Continuar sin guardar</button>
          <button @click="onSaveAndContinue" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer">Guardar y continuar</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  open: { type: Boolean, default: false },
  changes: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({ created: 0, updated: 0, deleted: 0 }) },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'save', 'continue'])

const maxEntities = 40
const maxFieldsPerEntity = 8
const isEmptyish = (v) => {
  if (v == null) return true
  if (typeof v === 'string') return v.trim().length === 0
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v).length === 0
  return false
}

const sanitizedChanges = computed(() => {
  return (props.changes || [])
    .map((entry) => {
      const cleanFields = (entry.fields || []).filter((field) => {
        if (/hijos/i.test(field.path)) return false
        if (isEmptyish(field.before) && isEmptyish(field.after)) return false
        return true
      })
      if (entry.op === 'update' && cleanFields.length === 0) return null
      return { ...entry, fields: cleanFields }
    })
    .filter(Boolean)
})

const limitedChanges = computed(() => sanitizedChanges.value.slice(0, maxEntities))

const labelOp = (op) => ({ create: 'Creado', update: 'Modificado', delete: 'Eliminado' }[op] || op)
const labelEntity = (t) => {
  if (t === 'plantas') return 'planta'
  if(t === 'contenedores') return 'contenedor'
  if (!t) return 'entidad'
  return t.replace(/s$/, '')
}
const iconFor = (op) => {
  if (op === 'create') return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#16a34a" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>'
  if (op === 'delete') return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#dc2626" d="M7 21q-.825 0-1.412-.587T5 19V7H4V5h4V4q0-.425.288-.712T9 3h6q.425 0 .713.288T16 4v1h4v2h-1v12q0 .825-.587 1.413T17 21zM9 17h2V9H9zm4 0h2V9h-2z"/></svg>'
  return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#d97706" d="M5 19V7h14v12zm2-2h10V9H7zm0-10V5h10v2z"/></svg>'
}
const numberOrDash = (val) => (Number.isFinite(val) ? Number(val) : '—')

const formatValue = (v, path = '') => {
  if (v == null || v === '') return '—'

  // Dimensiones (cm)
  if (typeof v === 'object' && /dimensiones/i.test(path)) {
    const ancho = numberOrDash(v.ancho ?? v.width)
    const largo = numberOrDash(v.largo ?? v.length ?? v.depth)
    const alto = numberOrDash(v.alto ?? v.height)
    if (ancho !== '—' || largo !== '—' || alto !== '—') {
      const parts = [ancho, largo, alto].filter((part) => part !== '—')
      return parts.length ? `${parts.join(' × ')} cm` : '—'
    }
  }

  // Posiciones (canvas px)
  if (typeof v === 'object' && /posicion|position/i.test(path)) {
    const x = numberOrDash(v.x)
    const y = numberOrDash(v.y)
    const rotation = numberOrDash(v.rotation ?? v.rotacion)
    const pieces = [`x=${x}`, `y=${y}`]
    if (rotation !== '—') pieces.push(`rot=${rotation}°`)
    return pieces.join(', ')
  }

  if (typeof v === 'object') {
    try {
      const json = JSON.stringify(v)
      return json.length > 40 ? `${json.slice(0, 37)}…` : json
    } catch {
      return '[obj]'
    }
  }

  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toString() : v.toFixed(2)
  }

  return String(v)
}
const onCancel = () => emit('close')
const onSaveAndContinue = () => emit('save')
const onContinueNoSave = () => emit('continue')
</script>

<style scoped>
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>