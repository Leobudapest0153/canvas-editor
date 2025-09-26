<template>
  <div
    v-if="canvasStore.gestionPisosPropiedadesModal"
    class="fixed inset-0 z-50 flex items-center justify-center"
  >
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]"/>

    <div
      class="relative z-10 bg-white shadow-2xl flex flex-col max-h-max py-3 px-5 w-[569px]">
      <div class="mb-4 flex items-center">
        <h3 class="font-bold text-lg text-[#1C1E4D]">Piso</h3>
        <UiTooltip
          label="Considera que al no definir dimensiones, estas se consideran como infinitas"
          position="bottom"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            class="p-0.5 rounded-full bg-primary-700 text-white ml-8"
          >
            <g fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 7a2 2 0 0 1 2 2v7a2 2 0 1 1-4 0V9a2 2 0 0 1 2-2"
                clip-rule="evenodd"
                />
              <path d="M12 4a2 2 0 1 1-4 0a2 2 0 0 1 4 0"/>
            </g>
          </svg>
        </UiTooltip>
      </div>
      <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-7 w-full">
        <div class="col-span-2 flex flex-col gap-y-2">
          <label class="font-normal text-medium text-[#111928]" for="codigo_piso">Código del piso</label>
          <input
            type="text"
            placeholder="01"
            v-model="formValue.codigo"
            disabled
            class="border-[1px] border-[#9CA3AF] rounded-[6px] py-2 px-4 disabled:bg-gray-100">
        </div>
        <div class="col-span-2 flex flex-col gap-y-2">
          <label class="font-normal text-medium text-[#111928]" for="nombre_piso">Nombre del piso *</label>
          <input
            type="text"
            placeholder="piso bajo"
            v-model="formValue.nombre"
            class="border-[1px] border-[#9CA3AF] rounded-[6px] py-2 px-4">
        </div>
        <div class="flex flex-col gap-y-2">
          <label class="font-normal text-medium text-[#111928]" for="largo">Largo (m)</label>
          <input
            type="text"
            v-model="formValue.dimensiones.largo"
            placeholder="30"
            class="border-[1px] border-[#9CA3AF] rounded-[6px] py-2 px-4">
        </div>

        <div class="flex flex-col gap-y-2">
          <label class="font-normal text-medium text-[#111928]" for="alto">Alto (m)</label>
          <input
            type="text"
            placeholder="30"
            v-model="formValue.dimensiones.alto"
            class="border-[1px] border-[#9CA3AF] rounded-[6px] py-2 px-4">
        </div>
        <div class="flex flex-col gap-y-2">
          <label class="font-normal text-medium text-[#111928]" for="ancho">Ancho (m)</label>
          <input
            type="text"
            placeholder="30"
            v-model="formValue.dimensiones.ancho"
            class="border-[1px] border-[#9CA3AF] rounded-[6px] py-2 px-4">
        </div>
        <div class="flex flex-col gap-y-2">
          <label class="font-normal text-medium text-[#111928]" for="largo">Capacidad de carga (kg)</label>
          <input
            type="text"
            placeholder="30"
            v-model="formValue.capacidadCarga"
            class="border-[1px] border-[#9CA3AF] rounded-[6px] py-2 px-4">
        </div>
      <h3 class="font-semibold text-medium text-primary-800 col-span-2">Características del piso</h3>
      <div class="flex">
        <div class="relative max-w-max mr-2 flex items-center">
          <input
            type="radio"
            name="tipoZona-piso"
            id="zona-almacenaje"
            v-model="formValue.tipoZona"
            value="almacenaje"
            class="peer absolute z-30 top-0 bottom-0 left-0 right-0 opacity-0"
          />
          <div
            class="w-4 h-4 peer-checked:w-[8px] peer-checked:h-[8px] absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 rounded-full bg-white z-10">
          </div>

          <div class="w-5 h-5 rounded-full bg-primary-700"></div>
        </div>
        <label
          for="zona-almacenaje"
          class="font-light text-medium text-[#111928]"
        >
          Zona de almacenaje
        </label>
      </div>
      <div class="flex">
        <div class="relative max-w-max mr-2 flex items-center">
            <input
              type="radio"
              name="tipoZona-piso"
              id="zona-cross-docking"
              v-model="formValue.tipoZona"
              value="cross_docking"
              class="peer absolute z-30 top-0 bottom-0 left-0 right-0 opacity-0"
            />
            <div
              class="w-4 h-4 peer-checked:w-[8px] peer-checked:h-[8px] absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 rounded-full bg-white z-10">
            </div>

            <div class="w-5 h-5 rounded-full bg-primary-700"></div>

          </div>
          <label
            for="zona-cross-docking"
            class="font-light text-medium text-[#111928]"
          >
            Zona de Cross-docking
          </label>
        </div>
        <div class="flex items-center">
          <div class="relative mr-2 border-primary-700 border-[1px] rounded-sm">
            <input
              type="checkbox"
              id="materiales-fragiles"
              name="materiales-fragiles"
              v-model="formValue.permiteFragiles"
              class="z-10 absolute opacity-0 top-0 left-0 right-0 bottom-0 peer"
            >
            <label for="materiales-fragiles" class="w-4 h-4 border-2 border-gray-300 cursor-pointer flex opacity-0 peer-checked:opacity-100 justify-center items-center bg-primary-700 border-primary-700">
                <svg class="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path fill="currentColor" d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z"/>
                </svg>
            </label>
            </div>
          <label for="materiales-fragiles">Permite materiales frágiles</label>
        </div>
        <div class="flex flex-col gap-y-2 w-full mb-2 col-span-2">
          <label class="font-normal text-medium text-[#111928]" for="tipo_productos">
            Tipo de productos admitidos *
          </label>
          <div class="relative" ref="dropdownRef">
            <button
              @click.stop="dropdownOpen = !dropdownOpen"
              type="button"
              class="w-full border border-gray-300 rounded-[6px] py-2 px-4 flex justify-between items-center text-left text-[#6B7280]"
            >
              <span>
                <template v-if="formValue.tiposProductos.length === 0">
                  Placeholder
                </template>
                <template v-else>
                  {{ selectedTiposDisplay }}
                </template>
              </span>
              <svg
                class="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div
              v-if="dropdownOpen"
              class="absolute mt-1 w-full border border-gray-300 bg-white rounded-md shadow-lg z-20"
            >
              <div class="p-2">
                <input
                    type="text"
                  placeholder="Escriba"
                  v-model="search"
                  class="w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm"
                />
              </div>
              <ul class="max-h-40 overflow-y-auto">
                <li
                  v-for="option in filteredOptions"
                  :key="option.value"
                  class="px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                  :class="{ 'opacity-50 cursor-not-allowed': isAllSelected && !option.isAll }"
                >
                  <input
                    type="checkbox"
                    :id="option.value"
                    :checked="formValue.tiposProductos.includes(option.value)"
                    :disabled="isAllSelected && !option.isAll"
                    @change="toggleProductType(option.value)"
                    class="text-primary-700 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <label
                    :for="option.value"
                    class="text-sm text-[#111928]"
                    :class="isAllSelected && !option.isAll ? 'cursor-not-allowed' : 'cursor-pointer'"
                  >{{ option.label }}</label>
                </li>
              </ul>
            </div>
          </div>
        </div>
      <button
        class="bg-[#E5E7EB] px-4 py-3 place-self-end rounded-[6px] text-[#6B7280] w-[122px] h-[50px]
        cursor-pointer"
        @click="canvasStore.cerrarCuartoNivelesPropiedades()"
      >
        Cancelar
      </button>
      <button
        @click="onSave"
        :disabled="disableSaveButton"
        :class="disableSaveButton ? '!bg-gray-300 !cursor-not-allowed' : 'bg-primary-700 cursor-pointer'"
        class="bg-primary-700 w-[117px] h-[50px] font-normal text-white rounded-[6px]
        cursor-pointer">
        Guardar
      </button>

      </div>
    </div>
    <FloorLevelsHeightConfirmModal
      :open="canvasStore.confirmacionAlturasNivelesModal"
      :draft="canvasStore.propuestaAlturasNiveles"
      @confirm="(estrategia) => canvasStore.confirmarPropuestaAlturasNiveles(estrategia)"
      @cancel="() => canvasStore.cancelarPropuestaAlturasNiveles()"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore';
import FloorLevelsHeightConfirmModal from '@/inventory-smart/components/modals/FloorLevelsHeightConfirmModal.vue'

const canvasStore = useCanvasStore();

const dropdownOpen = ref(false);
const dropdownRef = ref();

const search = ref('');

const ALL_OPTION = 'Todos';
const productOptions = [
  { label: ALL_OPTION, value: ALL_OPTION, isAll: true },
  { label: 'Materiales peligrosos', value: 'Materiales peligrosos' },
  { label: 'Materiales radioactivos', value: 'Materiales radioactivos' },
  { label: 'Materiales tóxicos', value: 'Materiales tóxicos' },
];
const individualOptionValues = productOptions
  .filter((option) => !option.isAll)
  .map((option) => option.value);
const normalizeTiposProductos = (tipos) => {
  if (!Array.isArray(tipos)) return [];
  const unique = [];
  tipos.forEach((tipo) => {
    if (!tipo || unique.includes(tipo)) return;
    unique.push(tipo);
  });
  if (unique.includes(ALL_OPTION)) {
    return [ALL_OPTION];
  }
  const hasAllIndividuals =
    individualOptionValues.length > 0 &&
    unique.length === individualOptionValues.length &&
    individualOptionValues.every((value) => unique.includes(value));
  return hasAllIndividuals ? [ALL_OPTION] : unique;
};
const filteredOptions = computed(() =>
  productOptions.filter((option) =>
    option.label.toLowerCase().includes(search.value.toLowerCase())
  )
);

const disableSaveButton = computed(() => {
  return !formValue.value.nombre || formValue.value.tiposProductos.length === 0;
});

const formValue = ref({
  codigo: canvasStore.nivelAEditar?.codigo ?? '',
  nombre: canvasStore.nivelAEditar?.nombre ?? '',
  dimensiones: {
    ancho: canvasStore.nivelAEditar?.dimensiones?.ancho
      ? (canvasStore.nivelAEditar.dimensiones.ancho / 100).toFixed(2)
      : '',
    largo: canvasStore.nivelAEditar?.dimensiones?.largo
      ? (canvasStore.nivelAEditar.dimensiones.largo / 100).toFixed(2)
      : '',
    alto: canvasStore.nivelAEditar?.dimensiones?.alto
      ? (canvasStore.nivelAEditar.dimensiones.alto / 100).toFixed(2)
      : ''
  },
  capacidadCarga: canvasStore.nivelAEditar?.pesoMaximo ?? '',
  tipoZona: canvasStore.nivelAEditar?.tipoZona ?? '',
  tiposProductos: normalizeTiposProductos(canvasStore.nivelAEditar?.tiposProductos ?? []),
  permiteFragiles: canvasStore.nivelAEditar?.permiteFragiles ?? false
});
const arraysEqual = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const isAllSelected = computed(() =>
  formValue.value.tiposProductos.includes(ALL_OPTION)
);

const selectedTiposDisplay = computed(() => {
  if (formValue.value.tiposProductos.length === 0) return '';
  if (isAllSelected.value) return ALL_OPTION;
  return formValue.value.tiposProductos.join(', ');
});

const toggleProductType = (optionValue) => {
  const current = Array.isArray(formValue.value.tiposProductos)
    ? [...formValue.value.tiposProductos]
    : [];

  if (optionValue === ALL_OPTION) {
    formValue.value.tiposProductos = current.includes(ALL_OPTION) ? [] : [ALL_OPTION];
    return;
  }

  const withoutAll = current.filter((value) => value !== ALL_OPTION);
  const hasValue = withoutAll.includes(optionValue);
  const updated = hasValue
    ? withoutAll.filter((value) => value !== optionValue)
    : [...withoutAll, optionValue];

  formValue.value.tiposProductos = normalizeTiposProductos(updated);
};

watch(
  () => formValue.value.tiposProductos,
  (value) => {
    const current = Array.isArray(value) ? value : [];
    const normalized = normalizeTiposProductos(current);
    if (!arraysEqual(current, normalized)) {
      formValue.value.tiposProductos = normalized;
    }
  },
  { deep: true }
);



// Cierra dropdown al hacer clic fuera
const handleClickOutside = (event) => {
  // 1. Si el dropdown está cerrado, no hagas nada.
  if (!dropdownOpen.value) return;

  // 2. Si está abierto y el clic fue fuera, ciérralo.
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    dropdownOpen.value = false;
  }
};

const onSave = () => {
  const data = Object.assign({}, formValue.value);
  data.dimensiones = {
    ancho: formValue.value.dimensiones.ancho
      ? Math.round(parseFloat(formValue.value.dimensiones.ancho) * 100)
      : null,
    largo: formValue.value.dimensiones.largo
      ? Math.round(parseFloat(formValue.value.dimensiones.largo) * 100)
      : null,
    alto: formValue.value.dimensiones.alto
      ? Math.round(parseFloat(formValue.value.dimensiones.alto) * 100)
      : null
  };
  canvasStore.guardarCuartoNivelesPropiedades(data, canvasStore.nivelAEditar?.id);
}

watch(() => canvasStore.nivelAEditar, (newVal) => {
  formValue.value = {
    codigo: newVal?.codigo ?? '',
    nombre: newVal?.nombre ?? '',
    dimensiones: {
      ancho: newVal?.dimensiones?.ancho
        ? (newVal.dimensiones.ancho / 100).toFixed(2)
        : '',
      largo: newVal?.dimensiones?.largo
        ? (newVal.dimensiones.largo / 100).toFixed(2)
        : '',
      alto: newVal?.dimensiones?.alto
        ? (newVal.dimensiones.alto / 100).toFixed(2)
        : ''
    },
    capacidadCarga: newVal?.capacidadCarga ?? '',
    tipoZona: newVal?.tipoZona ?? '',
    tiposProductos: normalizeTiposProductos(newVal?.tiposProductos ?? []),
    permiteFragiles: newVal?.permiteFragiles ?? false
  };
}, { immediate: true, deep: true });
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
</script>
