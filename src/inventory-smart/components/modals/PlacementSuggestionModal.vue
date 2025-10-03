<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[1050] flex items-center justify-center">
      <div class="absolute inset-0 bg-slate-900/60" />
      <div class="relative z-10 max-w-lg w-full mx-4 rounded-lg bg-white shadow-xl">
        <header class="px-6 pt-6 pb-4 border-b border-slate-200">
          <h2 class="text-lg font-semibold text-slate-900">
            Ajustes sugeridos para {{ elementLabel }}
          </h2>
          <p v-if="failureMessage" class="mt-2 text-sm text-slate-600">
            {{ failureMessage }}
          </p>
        </header>
        <section class="px-6 py-4 space-y-4">
          <article
            v-for="(suggestion, index) in suggestions"
            :key="index"
            class="rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p class="text-sm font-medium text-slate-900">{{ suggestion.summary }}</p>
            <p v-if="suggestion.description" class="mt-1 text-sm text-slate-600">
              {{ suggestion.description }}
            </p>
          </article>
          <p class="text-xs text-slate-500">
            Se aplicarán los ajustes y se intentará colocar el elemento automáticamente.
          </p>
        </section>
        <footer class="px-6 pb-6 pt-4 flex justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            @click="$emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            @click="$emit('accept')"
          >
            Aplicar ajustes
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  suggestions: { type: Array, default: () => [] },
  elementLabel: { type: String, default: 'Elemento' },
  failureMessage: { type: String, default: '' },
})

defineEmits(['accept', 'cancel'])
</script>
