<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="placementSuggestionTitle"
    >
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('cancel')" />
      <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
        <header class="border-b border-gray-200 px-6 py-4">
          <h2 id="placementSuggestionTitle" class="text-lg font-semibold text-gray-900">
            Ajustes para colocar el elemento
          </h2>
          <p class="mt-1 text-sm text-gray-600">
            {{ suggestion?.reason }}
          </p>
        </header>

        <section class="space-y-4 px-6 py-5 text-sm text-gray-700">
          <div v-for="(adjustment, index) in suggestion?.adjustments || []" :key="index">
            <h3 class="font-medium text-gray-900">{{ adjustment.title }}</h3>
            <p class="mt-1 text-gray-600">{{ adjustment.message }}</p>

            <dl v-if="adjustment.type === 'dimensions' && adjustment.newDimensions" class="mt-3 grid grid-cols-2 gap-2">
              <div>
                <dt class="text-xs uppercase tracking-wide text-gray-500">Ancho</dt>
                <dd class="text-sm font-medium text-gray-900">{{ adjustment.newDimensions.ancho }} cm</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-gray-500">Largo</dt>
                <dd class="text-sm font-medium text-gray-900">{{ adjustment.newDimensions.largo }} cm</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-gray-500">Alto</dt>
                <dd class="text-sm font-medium text-gray-900">{{ adjustment.newDimensions.alto }} cm</dd>
              </div>
            </dl>

            <div v-else-if="adjustment.type === 'capacity'" class="mt-3 rounded-md bg-blue-50 p-3">
              <p class="text-sm font-medium text-blue-900">
                Nueva capacidad: {{ adjustment.newValue }} kg
              </p>
            </div>
          </div>
        </section>

        <footer class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            @click="emit('accept')"
          >
            Aplicar ajustes y colocar
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  suggestion: { type: Object, default: () => null },
})

const emit = defineEmits(['accept', 'cancel'])

// Referenciar props para evitar warning de lint
void props
</script>
