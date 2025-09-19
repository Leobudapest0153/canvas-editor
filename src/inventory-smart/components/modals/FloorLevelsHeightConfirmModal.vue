<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[100] flex items-center justify-center"
  >
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

    <div class="relative z-10 bg-white shadow-2xl flex flex-col max-h-[80vh] py-4 px-5 w-[640px]">
      <h3 class="font-bold text-lg text-[#1C1E4D] mb-2">
        Confirmar ajuste de alturas
      </h3>
      <p class="text-sm text-gray-700 mb-4" v-if="draft?.deficitCm">
        El total propuesto excede la altura del cuarto en {{ draft.deficitCm }} cm.
        Elige cómo proceder:
      </p>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- Vista comparativa -->
        <div class="border rounded p-3">
          <h4 class="font-semibold text-primary-800 mb-2">Clamp (limitar nivel objetivo)</h4>
          <div class="max-h-[240px] overflow-auto space-y-2 text-sm">
            <div v-for="id in draft?.nivelesOrden || []" :key="id" class="flex justify-between gap-2">
              <div class="truncate">
                {{ draft?.nombresPorId?.[id] || id }}
              </div>
              <div class="text-right whitespace-nowrap">
                <span class="text-gray-500 mr-1">act: {{ draft?.alturasActuales?.[id] ?? '-' }}cm</span>
                <span class="text-gray-400">→</span>
                <span class="font-medium ml-1">
                  {{ draft?.clamp?.alturas?.[id] ?? '-' }}cm
                </span>
              </div>
            </div>
          </div>
          <button
            class="mt-3 bg-primary-700 text-white px-4 py-2 rounded"
            @click="$emit('confirm', 'clamp')"
          >
            Confirmar Clamp
          </button>
        </div>

        <div class="border rounded p-3">
          <h4 class="font-semibold text-primary-800 mb-2">Redistribuir (proporcional en otros)</h4>
          <div class="max-h-[240px] overflow-auto space-y-2 text-sm">
            <div v-for="id in draft?.nivelesOrden || []" :key="id" class="flex justify-between gap-2">
              <div class="truncate">
                {{ draft?.nombresPorId?.[id] || id }}
              </div>
              <div class="text-right whitespace-nowrap">
                <span class="text-gray-500 mr-1">act: {{ draft?.alturasActuales?.[id] ?? '-' }}cm</span>
                <span class="text-gray-400">→</span>
                <span class="font-medium ml-1">
                  {{ draft?.redistribute?.alturas?.[id] ?? '-' }}cm
                </span>
              </div>
            </div>
          </div>
          <button
            class="mt-3 bg-primary-700 text-white px-4 py-2 rounded"
            @click="$emit('confirm', 'redistribute')"
          >
            Confirmar Redistribución
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button class="bg-gray-200 text-gray-700 px-4 py-2 rounded" @click="$emit('cancel')">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
});
defineEmits(['confirm', 'cancel']);
</script>
