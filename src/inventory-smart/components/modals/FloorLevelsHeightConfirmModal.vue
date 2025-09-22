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
      <p class="text-sm text-gray-700 mb-4" v-if="props.draft?.deficitCm">
        La altura propuesta excede la altura disponible para asignar en {{ props.draft.deficitCm }} cm.

        Elige como proceder:
      </p>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- Vista comparativa -->
        <div class="border border-gray-400 rounded p-3 flex flex-col">
          <h4 class="font-semibold text-primary-800 mb-2">Limitar a espacio disponible</h4>
          <div class="h-18">
            <p class="text-sm text-gray-500">Ajusta la altura al espacio libre (Si existe) sin afectar el resto de pisos.</p>
          </div>
          <div class="max-h-[240px] overflow-auto space-y-2 text-sm mb-2">
            <div v-for="id in props.draft?.nivelesOrden || []" :key="id" class="flex justify-between gap-2" :class="{ 'bg-gray-200 w-full py-1 font-bold': canvasStore.nivelAEditar?.id === id }">
              <div class="truncate">
                {{ props.draft?.nombresPorId?.[id] || id }}
              </div>
              <div class="text-right whitespace-nowrap">
                <span class="text-gray-500 mr-1"> {{ (props.draft?.alturasActuales?.[id] / 100).toFixed(2) ?? '-' }}m</span>
                <span class="text-gray-400">→</span>
                <span class="ml-1">
                  {{ (props.draft?.clamp?.alturas?.[id] / 100).toFixed(2) ?? '-' }}m
                </span>
              </div>
            </div>
          </div>
          <div class="flex-1 max-h-max flex justify-between w-full items-center" :class="{'!justify-end': !notChanges}">
            <h1
              v-if="notChanges"
              class="text-sm text-gray-500 italic"
            >
              No hay cambios que aplicar
            </h1>
            <button
              class="mt-auto bg-primary-700 text-white px-4 py-2 max-w-max max-h-max rounded self-end flex-1 cursor-pointer"
              @click="$emit('confirm', 'clamp')"
            >
              Limitar
            </button>
          </div>
        </div>

        <div class="border border-gray-400 rounded p-3 flex flex-col">
          <h4 class="font-semibold text-primary-800 mb-2">Forzar altura</h4>
          <p class="text-sm text-gray-500 h-18">Usa la altura solicitada y reparte el resto entre los niveles.</p>
          <div class="max-h-[240px] overflow-auto space-y-2 text-sm mb-2">
            <div v-for="id in props.draft?.nivelesOrden || []" :key="id" class="flex justify-between gap-2" :class="{ 'bg-gray-200 w-full py-1 font-bold': canvasStore.nivelAEditar?.id === id }">
              <div class="truncate">
                {{ props.draft?.nombresPorId?.[id] || id }}
              </div>
              <div class="text-right whitespace-nowrap">
                <span class="text-gray-500 mr-1"> {{ (props.draft?.alturasActuales?.[id] / 100).toFixed(2) ?? '-' }}m</span>
                <span class="text-gray-400">→</span>
                <span class="ml-1">
                  {{ (props.draft?.redistribute?.alturas?.[id] / 100).toFixed(2) ?? '-' }}m
                </span>
              </div>
            </div>
          </div>
          <button
            class="bg-primary-700 text-white px-4 py-2 max-w-max max-h-max rounded self-end flex-1 mt-auto cursor-pointer"
            @click="$emit('confirm', 'redistribute')"
          >
            Forzar
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button class="bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer" @click="$emit('cancel')">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore';
const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
});
defineEmits(['confirm', 'cancel']);

const canvasStore = useCanvasStore();

const notChanges = computed(() => {
  const current = canvasStore.nivelAEditar.dimensiones.alto;
  const modify = props.draft?.clamp?.alturas?.[canvasStore.nivelAEditar.id];
  console.log({ current, modify });
  return current === modify;
});
</script>
