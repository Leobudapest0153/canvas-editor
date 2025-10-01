<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[100] flex items-center justify-center"
  >
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

    <div
      class="relative z-10 bg-white shadow-2xl flex flex-col w-full max-w-[820px] max-h-[90vh] rounded"
    >
      <div class="px-4 sm:px-6 pt-4">
        <h3 class="font-bold text-lg text-[#1C1E4D]">
          Confirmar ajustes
        </h3>
        <p class="text-xs text-gray-500">
          Elige cómo ajustar y confirma para aplicar los cambios.
        </p>
      </div>

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

        <div
          v-if="selectedStrategy === 'clamp' && clampHasNoEffect"
          class="mt-3 text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2"
        >
          La estrategia <b>Limitar</b> no producirá cambios. Es posible que el nivel que editas ya esté en su altura/peso mínimo y no haya espacio para reducir otros niveles. Prueba con <b>Forzar</b>.
        </div>
      </div>

      <div class="px-4 sm:px-6 pb-4 mt-3 overflow-y-auto">
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

        <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div v-if="props.draft?.heightExceeded" class="border border-amber-300 bg-amber-50 rounded p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-amber-800">Alturas</h4>
              <span class="text-xs text-amber-600">
                Estrategia: {{ strategyLabel }}
              </span>
            </div>

            <div class="max-h-[260px] overflow-auto space-y-1.5 text-sm">
              <div
                v-for="id in props.draft?.nivelesOrden || []"
                :key="id"
                class="flex justify-between gap-2 px-1"
                :class="{ 'bg-amber-100 w-full py-1 font-semibold border-l-4 border-amber-500': isTarget(id) }"
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

            <div class="mt-2 text-xs text-amber-700">
              Ajuste automático para que cabe dentro del cuarto ({{ fmtM(props.draft?.roomHeightCm) }}m).
            </div>
          </div>

          <div v-if="props.draft?.weightExceeded" class="border border-red-300 bg-red-50 rounded p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-red-800">Pesos</h4>
              <span class="text-xs text-red-600">
                Estrategia: {{ strategyLabel }}
              </span>
            </div>

            <div class="max-h-[260px] overflow-auto space-y-1.5 text-sm">
              <div
                v-for="id in props.draft?.nivelesOrden || []"
                :key="id"
                class="flex justify-between gap-2 px-1"
                :class="{ 'bg-red-100 w-full py-1 font-semibold border-l-4 border-red-500': isTarget(id) }"
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

            <div class="mt-2 text-xs text-red-700">
              Resultado peso:
              <template v-if="props.draft?.roomWeightMax != null">
                {{ weightResultOk ? 'Dentro del máximo permitido' : 'Excede el máximo' }} ({{ fmtKg(props.draft?.roomWeightMax) }}kg).
              </template>
              <template v-else>
                Sin límite configurado para el cuarto.
              </template>
            </div>
          </div>

          <div v-if="hasDimensionChanges" class="border border-blue-300 bg-blue-50 rounded p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-blue-800">Dimensiones</h4>
              <span class="text-xs text-blue-600">
                Por elementos internos
              </span>
            </div>

            <div class="space-y-1.5 text-sm">
              <div v-if="isFiniteNumber(minAnchoCm) && proposedDimensions.ancho < minAnchoCm" class="flex justify-between gap-2 px-1">
                <div class="truncate">Ancho mínimo</div>
                <div class="text-right whitespace-nowrap">
                  <span class="text-gray-500 mr-1">{{ fmtM(proposedDimensions.ancho) }}m</span>
                  <span class="text-gray-400">→</span>
                  <span class="ml-1 font-bold text-blue-700">
                    {{ fmtM(minAnchoCm) }}m
                  </span>
                  <span v-if="widthBinder" class="ml-2 text-xs text-gray-400">({{ elLabel(widthBinder) }})</span>
                </div>
              </div>

              <div v-if="isFiniteNumber(minLargoCm) && proposedDimensions.largo < minLargoCm" class="flex justify-between gap-2 px-1">
                <div class="truncate">Largo mínimo</div>
                <div class="text-right whitespace-nowrap">
                  <span class="text-gray-500 mr-1">{{ fmtM(proposedDimensions.largo) }}m</span>
                  <span class="text-gray-400">→</span>
                  <span class="ml-1 font-bold text-blue-700">
                    {{ fmtM(minLargoCm) }}m
                  </span>
                  <span v-if="lengthBinder" class="ml-2 text-xs text-gray-400">({{ elLabel(lengthBinder) }})</span>
                </div>
              </div>

              <div v-if="isFiniteNumber(minAltoCm) && proposedDimensions.alto < minAltoCm" class="flex justify-between gap-2 px-1">
                <div class="truncate">Alto mínimo</div>
                <div class="text-right whitespace-nowrap">
                  <span class="text-gray-500 mr-1">{{ fmtM(proposedDimensions.alto) }}m</span>
                  <span class="text-gray-400">→</span>
                  <span class="ml-1 font-bold text-blue-700">
                    {{ fmtM(minAltoCm) }}m
                  </span>
                  <span v-if="heightBinder" class="ml-2 text-xs text-gray-400">({{ elLabel(heightBinder) }})</span>
                </div>
              </div>
            </div>

            <div class="mt-2 text-xs text-blue-700">
              Ajuste automático para que los elementos internos sigan cabiendo.
            </div>
          </div>

          <div v-if="props.draft?.childFit && isFiniteNumber(minCapacidad) && proposedCapacity < minCapacidad" class="border border-green-300 bg-green-50 rounded p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-green-800">Capacidad</h4>
              <span class="text-xs text-green-600">
                Por elementos internos
              </span>
            </div>

            <div class="space-y-1.5 text-sm">
              <div class="flex justify-between gap-2 px-1">
                <div class="truncate">Capacidad mínima</div>
                <div class="text-right whitespace-nowrap">
                  <span class="text-gray-500 mr-1">{{ fmtKg(proposedCapacity) }}kg</span>
                  <span class="text-gray-400">→</span>
                  <span class="ml-1 font-bold text-green-700">
                    {{ fmtKg(minCapacidad) }}kg
                  </span>
                  <span v-if="capacityCount > 0" class="ml-2 text-xs text-gray-400">({{ capacityCount }} elementos)</span>
                </div>
              </div>
            </div>

            <div class="mt-2 text-xs text-green-700">
              Ajuste automático para cubrir la capacidad de los elementos internos.
            </div>
          </div>
        </div>
      </div>

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

// Dimensiones y capacidad propuestas del nivel objetivo
const proposedDimensions = computed(() => {
  const patch = props.draft?.targetPatch?.dimensiones || {};
  return {
    ancho: Number(patch.ancho) || 0,
    largo: Number(patch.largo) || 0,
    alto: Number(patch.alto) || 0,
  };
});

const proposedCapacity = computed(() => {
  return Number(props.draft?.targetPatch?.capacidadCarga) || 0;
});

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
  const vFrom = Number(from);
  const vTo = Number(to);
  if (!Number.isFinite(vFrom) || !Number.isFinite(vTo)) return '';

  const changed = Math.abs(vFrom - vTo) > 1e-6; // Comparación con tolerancia
  if (!changed) return '';

  if (toSide) {
    return vTo > vFrom ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
  }
  return 'font-bold';
};

// Detectar si hay cambios para mostrar recuadros
const hasHeightChanges = computed(() => {
  if (!props.draft?.heightExceeded) return false;
  const ids = props.draft?.nivelesOrden || [];
  return ids.some(id => {
    const current = Number(props.draft?.alturasActuales?.[id] || 0);
    const proposed = Number(proposedHeights.value[id] || 0);
    return Math.abs(current - proposed) > 1; // Cambio > 1cm
  });
});

const hasWeightChanges = computed(() => {
  if (!props.draft?.weightExceeded) return false;
  const ids = props.draft?.nivelesOrden || [];
  return ids.some(id => {
    const current = Number(props.draft?.pesosActuales?.[id] || 0);
    const proposed = Number(proposedWeights.value[id] || 0);
    return Math.abs(current - proposed) > 0.1; // Cambio > 0.1kg
  });
});

const hasDimensionChanges = computed(() => {
  if (!props.draft?.childFit) return false;
  const hasAnchoChange = isFiniteNumber(minAnchoCm.value) && proposedDimensions.value.ancho < minAnchoCm.value;
  const hasLargoChange = isFiniteNumber(minLargoCm.value) && proposedDimensions.value.largo < minLargoCm.value;
  const hasAltoChange = isFiniteNumber(minAltoCm.value) && proposedDimensions.value.alto < minAltoCm.value;
  return hasAnchoChange || hasLargoChange || hasAltoChange;
});

// Flags y resúmenes de PESO basados en draft original
const weightExceeded = computed(() => !!props.draft?.weightExceeded);
const weightExcess = computed(() => Math.max(0, Number(props.draft?.weightExcess || 0)));
const pesoTotal = computed(() => Math.round(Number(props.draft?.pesoTotal || 0)));

// Propuestas por estrategia (unificadas)

// Helpers para mínimos y etiquetado (deben estar a nivel superior)
const isFiniteNumber = (v) => Number.isFinite(Number(v));
const minAnchoCm = computed(() => props.draft?.childFit?.minAnchoCm);
const minLargoCm = computed(() => props.draft?.childFit?.minLargoCm);
const minAltoCm = computed(() => props.draft?.childFit?.minAltoCm);
const minCapacidad = computed(() => props.draft?.childFit?.minCapacidad);
const widthBinder = computed(() => props.draft?.childFit?.widthBoundById);
const lengthBinder = computed(() => props.draft?.childFit?.lengthBoundById);
const heightBinder = computed(() => props.draft?.childFit?.heightBoundById);
const capacityCount = computed(() => Number(props.draft?.childFit?.capacityCount || 0));

const elLabel = (id) => {
  if (!id) return '';
  const el = canvasStore.elementoPorId?.(id);
  if (!el) return id;
  const name = el.nombre || el.codigo || id;
  const code = el.codigo && el.codigo !== name ? ` (${el.codigo})` : '';
  return `${name}${code}`;
};

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

// NUEVO: Helper para comparar mapas de valores
const areMapsEqual = (map1, map2, ids, tolerance = 1e-6) => {
  if (!map1 || !map2) return map1 === map2; // Casos nulos
  for (const id of ids) {
    if (Math.abs((map1[id] || 0) - (map2[id] || 0)) > tolerance) {
      return false;
    }
  }
  return true;
};

// NUEVO: Detectar si la estrategia clamp no tuvo efecto
const clampHasNoEffect = computed(() => {
  const draft = props.draft;
  if (!draft || (!draft.heightExceeded && !draft.weightExceeded)) {
    return false; // No hay problema que resolver
  }

  const ids = draft.nivelesOrden || [];

  // Si hay exceso de altura, verificar si clamp cambió algo
  let heightsUnchanged = true;
  if (draft.heightExceeded) {
    heightsUnchanged = areMapsEqual(draft.alturasActuales, draft.clamp?.alturas, ids, 1); // Tolerancia 1cm
  }

  // Si hay exceso de peso, verificar si clamp cambió algo
  let weightsUnchanged = true;
  if (draft.weightExceeded) {
    weightsUnchanged = areMapsEqual(draft.pesosActuales, draft.weightClamp, ids, 0.1); // Tolerancia 0.1kg
  }

  // Si ninguna de las dos ramas aplicables tuvo cambios, entonces no hay efecto
  return heightsUnchanged && weightsUnchanged;
});

const canConfirm = computed(() => {
  // Debe resolver todos los excesos; ambas estrategias se autoajustan a los mínimos por hijos
  return heightResultOk.value && weightResultOk.value;
});
</script>

<style scoped>
/* En móviles, asegurar que el contenedor interno sea totalmente visible y con scroll */
</style>
