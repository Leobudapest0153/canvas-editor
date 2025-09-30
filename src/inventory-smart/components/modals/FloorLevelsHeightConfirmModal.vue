<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[100] flex items-center justify-center"
  >
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

    <div
      class="relative z-10 bg-white shadow-2xl flex flex-col w-full max-w-[820px] max-h-[90vh] rounded"
    >
      <!-- Header -->
      <div class="px-4 sm:px-6 pt-4">
        <h3 class="font-bold text-lg text-[#1C1E4D]">
          Confirmar ajustes
        </h3>
        <p class="text-xs text-gray-500">
          Elige cómo ajustar y confirma para aplicar los cambios.
        </p>
      </div>

      <!-- Selector de estrategia -->
      <div class="px-4 sm:px-6 mt-3">
        <div class="inline-flex rounded border border-gray-300 overflow-hidden">
          <button
            class="px-3 sm:px-4 py-1.5 text-sm"
            :class="selectedStrategy === 'clamp' ? 'bg-primary-700 text-white' : 'bg-white text-gray-700'"
            @click="selectedStrategy = 'clamp'"
          >
            Limitar
          </button>
          <button
            class="px-3 sm:px-4 py-1.5 text-sm"
            :class="selectedStrategy === 'redistribute' ? 'bg-primary-700 text-white' : 'bg-white text-gray-700'"
            @click="selectedStrategy = 'redistribute'"
          >
            Forzar
          </button>
        </div>
      </div>

      <!-- Body scrollable -->
      <div class="px-4 sm:px-6 pb-4 mt-3 overflow-y-auto">
        <!-- Resumen de problemas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-if="props.draft?.deficitCm" class="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Altura excedida: falta {{ props.draft.deficitCm }} cm.
          </div>
          <div
            v-if="props.draft?.roomWeightMax != null"
            class="text-sm rounded px-3 py-2"
            :class="weightExceeded ? 'text-red-700 bg-red-50 border border-red-200' : 'text-gray-700 bg-gray-50 border border-gray-200'"
          >
            <template v-if="weightExceeded">
              Peso excedido: falta {{ weightExcess }} kg.
              Total: <b>{{ pesoTotal }}</b> kg / Máximo: <b>{{ props.draft.roomWeightMax }}</b> kg.
            </template>
            <template v-else>
              Peso total: {{ pesoTotal }} kg / Máximo: {{ props.draft.roomWeightMax }} kg.
            </template>
          </div>
        </div>

        <!-- Vista unificada por estrategia: Altura + Peso -->
        <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Alturas (comparativo y resultado con estrategia) -->
          <div class="border border-gray-300 rounded p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-primary-800">Alturas</h4>
              <span class="text-xs text-gray-500">
                Estrategia: {{ strategyLabel }}
              </span>
            </div>

            <div class="max-h-[260px] overflow-auto space-y-1.5 text-sm">
              <div
                v-for="id in props.draft?.nivelesOrden || []"
                :key="id"
                class="flex justify-between gap-2 px-1"
                :class="{ 'bg-yellow-50 w-full py-1 font-semibold border-l-4 border-yellow-500': isTarget(id) }"
              >
                <div class="truncate">{{ props.draft?.nombresPorId?.[id] || id }}</div>
                <div class="text-right whitespace-nowrap">
                  <span class="text-gray-500 mr-1">{{ fmtM(props.draft?.alturasActuales?.[id]) }}m</span>
                  <span class="text-gray-400">→</span>
                  <span class="ml-1" :class="diffClass(props.draft?.alturasActuales?.[id], proposedHeights[id], true)">
                    {{ fmtM(proposedHeights[id]) }}m
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              Resultado altura: {{ heightResultOk ? 'Cabe dentro del cuarto' : 'No cabe (ajusta estrategia o valores)' }}
            </div>
          </div>

          <!-- Pesos (comparativo y resultado con estrategia) -->
          <div class="border border-gray-300 rounded p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-primary-800">Pesos</h4>
              <span class="text-xs text-gray-500">
                Estrategia: {{ strategyLabel }}
              </span>
            </div>

            <div class="max-h-[260px] overflow-auto space-y-1.5 text-sm">
              <div
                v-for="id in props.draft?.nivelesOrden || []"
                :key="id"
                class="flex justify-between gap-2 px-1"
                :class="{ 'bg-yellow-50 w-full py-1 font-semibold border-l-4 border-yellow-500': isTarget(id) }"
              >
                <div class="truncate">{{ props.draft?.nombresPorId?.[id] || id }}</div>
                <div class="text-right whitespace-nowrap">
                  <span class="text-gray-500 mr-1">{{ fmtKg(props.draft?.pesosActuales?.[id]) }}kg</span>
                  <span class="text-gray-400">→</span>
                  <span class="ml-1" :class="diffClass(props.draft?.pesosActuales?.[id], proposedWeights[id], true)">
                    {{ fmtKg(proposedWeights[id]) }}kg
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              Resultado peso:
              <template v-if="props.draft?.roomWeightMax != null">
                {{ weightResultOk ? 'Dentro del máximo permitido' : 'Excede el máximo' }}
              </template>
              <template v-else>
                Sin límite configurado para el cuarto.
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer sticky -->
      <div class="mt-auto px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
        <div class="text-xs text-gray-500 flex-1 sm:flex-none">
          Estrategía seleccionada: <b>{{ strategyLabel }}</b>
        </div>
        <button class="bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer" @click="$emit('cancel')">
          Cancelar
        </button>
        <button
          class="bg-primary-700 text-white px-4 py-2 rounded cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canConfirm"
          @click="$emit('confirm', selectedStrategy)"
        >
          Confirmar cambios
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore';

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
});
defineEmits(['confirm', 'cancel']);

const canvasStore = useCanvasStore();

// Helper: identificar el nivel objetivo
const isTarget = (id) => {
  const storeId = canvasStore.nivelAEditar?.id;
  const draftId = props.draft?.targetId;
  return id === storeId || id === draftId;
};

// Estado local: estrategia seleccionada (una sola para altura y peso)
const selectedStrategy = ref('clamp');
watch(
  () => props.draft,
  (d) => {
    // Autoselección inicial: clamp por defecto
    // Si no hay excedente de altura pero sí de peso, igual clamp funciona
    selectedStrategy.value = 'clamp';
  },
  { immediate: true }
);

// Formateadores
const fmtM = (cm) => {
  const v = Number(cm);
  return Number.isFinite(v) ? (v / 100).toFixed(2) : '-';
};
const fmtKg = (kg) => {
  const v = Number(kg);
  return Number.isFinite(v) ? v.toFixed(2) : '-';
};

// Detección de cambios: pinta el valor destino si cambia
const diffClass = (from, to, toSide = false) => {
  const a = Number(from), b = Number(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
    return toSide ? 'font-semibold' : '';
  }
  const directionClass = b > a ? 'text-primary-700' : 'text-rose-700';
  const weight = toSide ? 'font-bold' : 'font-semibold';
  return `${weight} ${directionClass}`;
};

// Flags y resúmenes de PESO basados en draft original
const weightExceeded = computed(() => !!props.draft?.weightExceeded);
const weightExcess = computed(() => Math.max(0, Number(props.draft?.weightExcess || 0)));
const pesoTotal = computed(() => Math.round(Number(props.draft?.pesoTotal || 0)));

// Propuestas por estrategia (unificadas)
const proposedHeights = computed(() => {
  const ids = props.draft?.nivelesOrden || [];
  const map =
    selectedStrategy.value === 'clamp'
      ? props.draft?.clamp?.alturas
      : props.draft?.redistribute?.alturas;

  // Fallback: si no hay propuesta (p.ej., solo falló peso), usar alturas actuales
  const out = {};
  for (const id of ids) {
    const current = props.draft?.alturasActuales?.[id];
    const next = map?.[id];
    out[id] = Number.isFinite(Number(next)) ? Number(next) : Number(current);
  }
  return out;
});

const proposedWeights = computed(() => {
  const ids = props.draft?.nivelesOrden || [];
  const map =
    selectedStrategy.value === 'clamp'
      ? props.draft?.weightClamp
      : props.draft?.weightRedistribute;

  // Fallback: si no hay propuesta (p.ej., solo falló altura), mostrar pesos propuestos por patch si existen,
  // y si no, los actuales.
  const out = {};
  for (const id of ids) {
    const current = Number(props.draft?.pesosActuales?.[id]);
    const patchProposed = Number(props.draft?.pesosPropuestos?.[id]);
    const next = map?.[id];
    if (Number.isFinite(Number(next))) out[id] = Number(next);
    else if (Number.isFinite(patchProposed)) out[id] = patchProposed;
    else out[id] = Number.isFinite(current) ? current : 0;
  }
  return out;
});

const strategyLabel = computed(() => (selectedStrategy.value === 'clamp' ? 'Limitar' : 'Forzar'));

// Validación final de la estrategia elegida
const heightResultOk = computed(() => {
  const totalH = Object.values(proposedHeights.value).reduce((a, b) => a + (Number(b) || 0), 0);
  const roomH = Number(props.draft?.roomHeightCm || 0);
  if (!Number.isFinite(roomH) || roomH <= 0) return true; // no bloquear si no hay dato
  return totalH <= roomH + 1e-6;
});

const weightResultOk = computed(() => {
  if (props.draft?.roomWeightMax == null) return true;
  const totalW = Object.values(proposedWeights.value).reduce((a, b) => a + (Number(b) || 0), 0);
  const maxW = Number(props.draft?.roomWeightMax || 0);
  if (!Number.isFinite(maxW) || maxW <= 0) return true;
  return totalW <= maxW + 1e-6;
});

const canConfirm = computed(() => {
  // Debe resolver todos los excesos
  return heightResultOk.value && weightResultOk.value;
});

// Reglas de altura (solo para aviso visual en "Limitar altura" original)
const invalidLevels = computed(() => {
  // Conserva tu regla original: si 'Nuevo' queda <= 1 cm, marcar inválido
  const clampAlturas = selectedStrategy.value === 'clamp' ? props.draft?.clamp?.alturas : null;
  if (!clampAlturas) return false;
  return Object.entries(clampAlturas).some(([id, altura]) => id == 'Nuevo' && (Number(altura) || 0) <= 1);
});
</script>

<style scoped>
/* En móviles, asegurar que el contenedor interno sea totalmente visible y con scroll */
</style>
