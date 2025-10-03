<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[1200] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="handleCancel" />
      <div class="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 p-6">
        <header class="mb-4">
          <h2 class="text-xl font-semibold text-slate-800">
            {{ title }}
          </h2>
          <p v-if="reason" class="text-sm text-slate-500 mt-1">
            {{ reason }}
          </p>
        </header>
        <section class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <article
            v-for="suggestion in suggestions"
            :key="suggestion.id"
            class="border border-slate-200 rounded-xl p-4 bg-slate-50"
          >
            <h3 class="text-sm font-semibold text-slate-700 mb-2">
              {{ suggestion.type === 'capacity' ? 'Capacidad' : 'Dimensiones' }}
            </h3>
            <p class="text-sm text-slate-600">
              {{ suggestion.message }}
            </p>
            <dl v-if="suggestion.summary?.length" class="mt-3 space-y-2">
              <div v-for="field in suggestion.summary" :key="field.key || field.label" class="flex justify-between text-sm">
                <dt class="text-slate-500">{{ field.label }}</dt>
                <dd class="text-slate-800 font-medium">
                  <span class="line-through text-slate-400 mr-2">{{ formatValue(field.from, field.unit) }}</span>
                  <span>{{ formatValue(field.to, field.unit) }}</span>
                </dd>
              </div>
            </dl>
          </article>
          <p v-if="errorMessage" class="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {{ errorMessage }}
          </p>
        </section>
        <footer class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
            @click="handleCancel"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="!hasSuggestions || processing"
            @click="handleAccept"
          >
            {{ processing ? 'Aplicando…' : 'Aplicar y colocar' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { usePlacementSuggestionStore } from '@/inventory-smart/stores/placementSuggestions'

const store = usePlacementSuggestionStore()

const isOpen = computed(() => store.open && store.hasSuggestions)
const suggestions = computed(() => store.payload?.suggestions || [])
const processing = computed(() => store.processing)
const errorMessage = computed(() => store.errorMessage)
const hasSuggestions = computed(() => store.hasSuggestions)
const title = computed(() => store.payload?.title || 'Ajustes sugeridos para el elemento')
const reason = computed(() => store.payload?.reasonMessage || '')

const formatValue = (value, unit = '') => {
  if (value == null) return '—'
  const val = typeof value === 'number' ? value.toFixed(2).replace(/\.00$/, '') : value
  return unit ? `${val} ${unit}` : String(val)
}

const handleCancel = () => {
  store.close()
}

const handleAccept = async () => {
  await store.accept()
}
</script>

<style scoped>
:focus-visible {
  outline: 2px solid theme('colors.primary.DEFAULT');
  outline-offset: 2px;
}
</style>
