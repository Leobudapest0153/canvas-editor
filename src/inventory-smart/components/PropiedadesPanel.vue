<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200" data-properties-panel>
    <div class="p-4 border-b border-gray-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Propiedades</h2>
    </div>

    <div v-if="elementoSeleccionado" class="flex-1 overflow-y-auto p-3">
      <div class="space-y-4">
        <!-- Información general -->
        <details open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">
            Información general
          </summary>
          <div class="mt-3 space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Código</label>
              <input
                v-model="edited.codigo"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2
                focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                disabled:cursor-not-allowed disabled:text-gray-500"
                placeholder="Código del elemento"
                :disabled="true"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                v-model="edited.nombre"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2
                focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                disabled:cursor-not-allowed disabled:text-gray-500"
                placeholder="Nombre del elemento"
                :disabled="isSaving || isElementRestricted"
              />
            </div>
            <div class="grid grid-cols-1 gap-3">
              <!-- <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <input
                  :value="getTipoNombre(elementoSeleccionado.tipo)"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                />
              </div> -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <input
                  :value="getCategoriaDisplay(elementoSeleccionado.categoria)"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed capitalize"
                />
              </div>
            </div>

            <div v-if="!esPasillo">
              <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <div class="flex items-center gap-3">
                <input
                  v-model="edited.color"
                  type="color"
                  class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer
                  disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                  :disabled="isSaving || isElementRestricted"
                />
                <input
                  v-model="edited.color"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2
                  focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                  disabled:cursor-not-allowed disabled:text-gray-500"
                  placeholder="#3B82F6"
                  :disabled="isSaving || isElementRestricted"
                />
              </div>
            </div>

            <div v-if="pasilloAsignadoNombre && !esPasillo">
              <label class="block text-xs font-medium text-gray-600 mb-1">Pasillo asignado</label>
              <input
                :value="pasilloAsignadoNombre"
                type="text"
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 cursor-not-allowed"
                disabled
              />
              <p v-if="pasilloAsignado" class="text-xs text-gray-500 mt-1">
                El nombre se sincroniza automáticamente según el pasillo relacionado.
              </p>
            </div>

            <!-- Orientación (oculta para pasillos y circulares) -->
            <div v-if="!esPasillo && !esCircular">
              <label class="block text-xs font-medium text-gray-600 mb-1">Orientación</label>
              <select
                v-model.number="edited.orientacion"
                :disabled="isSaving || isElementRestricted"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2
                focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                disabled:cursor-not-allowed disabled:text-gray-500 cursor-pointer"
              >
                <option :value="0">0°</option>
                <option :value="90">90°</option>
                <option :value="180">180°</option>
                <option :value="270">270°</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Indica el lado de referencia del elemento para su orientación visual.
              </p>
            </div>

            <!-- Etiquetas -->
            <!--
            <div>
              <TagFilter
                class="pb-3"
                :selected-ids="edited?.tags || []"
                @add="onTagAdd"
                @remove="onTagRemove"
                @create="onTagCreateOpen"
              />
              <CreateTagModal
                :show="createTagModalOpen"
                :initial-text="newTagText"
                @close="createTagModalOpen = false"
                @save="onTagCreateSave"
              />
            </div>
            -->
          </div>
        </details>

        <details v-if="mostrarDimensiones" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">
            Dimensiones ({{ t('units.cm') }})
          </summary>
          <div class="mt-3 space-y-3">
            <!-- Para formas no circulares, mostrar ancho/largo -->
            <div v-if="!ocultarAnchoLargo" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-gray-500">Ancho</label>
                <div class="flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    v-model.number="edited.dimensiones.ancho"
                    @change="validarDimension('ancho')"
                    class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm
                    focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                    disabled:cursor-not-allowed disabled:text-gray-500"
                    :disabled="isSaving || isElementRestricted"
                  />
                  <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
                </div>
              </div>
              <div>
                <label class="text-sm text-gray-500">Largo</label>
                <div class="flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    v-model.number="edited.dimensiones.largo"
                    @change="validarDimension('largo')"
                    class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm
                    focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                    disabled:cursor-not-allowed disabled:text-gray-500"
                    :disabled="isSaving || isElementRestricted"
                  />
                  <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
                </div>
              </div>
            </div>
            <div v-if="!esCircular">
              <label class="text-sm text-gray-500">Alto</label>
              <div class="flex items-center">
                <input
                  type="number"
                  min="0"
                  step="any"
                  v-model.number="edited.dimensiones.alto"
                  @change="validarDimension('alto')"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm
                  focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                  disabled:cursor-not-allowed disabled:text-gray-500"
                  :disabled="isSaving || isElementRestricted"
                />
                <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
              </div>
              <p v-if="esPasillo" class="text-xs text-gray-500 mt-1">
                El alto del pasillo se ajusta a la altura de la planta.
              </p>
            </div>
            <!-- Diámetro para circulares -->
            <div v-if="esCircular">
              <label class="text-sm text-gray-500">Diámetro</label>
              <div class="flex items-center">
                <input
                  type="number"
                  min="1"
                  step="any"
                  :max="maxDiametroPlanta"
                  v-model.number="edited.diametroCm"
                  @change="validarDiametro"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm
                  focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                  disabled:cursor-not-allowed disabled:text-gray-500"
                  :disabled="isSaving || isElementRestricted"
                />
                <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
              </div>
              <p v-if="advertenciaDiametroLimite" class="text-xs text-amber-600">
                {{ advertenciaDiametroLimite }}
              </p>
              <p v-if="advertenciaDiametroContencion" class="text-xs text-amber-600">
                {{ advertenciaDiametroContencion }}
              </p>
            </div>
            <p v-if="advertenciaAltura" class="text-xs text-amber-600">{{ advertenciaAltura }}</p>
            <p v-if="dimensionError" class="text-xs text-red-600">{{ dimensionError }}</p>
            <ul
              v-if="dimensionSugerencias && dimensionSugerencias.length"
              class="list-disc ml-5 text-xs text-gray-600"
            >
              <li v-for="(s, i) in dimensionSugerencias" :key="i">{{ s }}</li>
            </ul>
          </div>
        </details>

        <!-- Posicionamiento en pared -->
        <details v-if="estaUbicadoEnPared" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">
            Posicionamiento en pared
          </summary>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-sm text-gray-500">Altura sobre el suelo</label>
              <div class="flex items-center">
                <input
                  type="number"
                  :min="0"
                  :max="maxAlturaSobreSuelo"
                  v-model.number="edited.alturaSobreSueloCm"
                  @change="validarAlturaSobreSuelo"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm
                  focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                  disabled:cursor-not-allowed disabled:text-gray-500"
                  :disabled="isSaving || !estaUbicadoEnPared"
                />
                <span class="ml-1 text-sm text-gray-500">{{ t('units.cm') }}</span>
              </div>
              <p v-if="advertenciaZBase" class="text-xs text-amber-600">{{ advertenciaZBase }}</p>
            </div>
          </div>
        </details>

        <!-- Capacidad -->
        <details v-if="mostrarCapacidad" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">Capacidad</summary>
          <div class="mt-3 space-y-3">
            <!-- Capacidad de carga (peso) -->
            <div>
              <label class="text-sm text-gray-500">Capacidad de carga</label>
              <div class="flex items-center">
                <input
                  type="number"
                  min="0"
                  v-model.number="edited.capacidadCarga"
                  @change="validarPeso"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm
                  focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                  disabled:cursor-not-allowed disabled:text-gray-500"
                  :disabled="isSaving || isElementRestricted"
                />
                <span class="ml-1 text-sm text-gray-500">kg</span>
              </div>
              <p v-if="advertenciaPeso" class="text-xs text-amber-600">{{ advertenciaPeso }}</p>
            </div>

            <!-- Uso real del padre -->
            <div v-if="mostrarUsoRealPadre" class="border-t pt-3">
              <label class="text-sm font-medium text-gray-700 mb-2 block">Uso {{ getTipoNombrePadre() }}</label>
              <!-- Peso real usado del padre -->
              <div class="mb-2">
                <!-- <label class="text-xs text-gray-500">Capacidad de peso usada</label> -->
                <!-- <div class="flex items-center">
                  <input
                    :value="usoRealPesoPadre"
                    disabled
                    class="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600"
                  />
                  <span class="ml-1 text-sm text-gray-500">kg</span>
                </div> -->
                <div v-if="infoPesoPadre.usado > 0" class="mt-1">
                  <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{{ porcentajePesoUsadoPadre }}% usado</span>
                    <span>{{ infoPesoPadre.usado.toFixed(2) }} / {{ infoPesoPadre.maximo }} kg</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div
                      class="h-3 rounded-full transition-all duration-300"
                      :style="{ width: porcentajePesoUsadoPadre + '%', backgroundColor: colorPesoUsadoPadre }"
                    ></div>
                  </div>
                </div>
                <!-- <div v-if="nombrePadre" class="mt-1">
                  <p class="text-xs text-gray-500">
                    Contenedor: <span class="font-medium">{{ nombrePadre }}</span>
                  </p>
                </div> -->
              </div>
            </div>

            <!-- Uso real del elemento -->
            <div v-if="mostrarUsoReal" class="border-t pt-3">
              <label class="text-sm font-medium text-gray-700 mb-2 block">Uso {{ getTipoNombreActual() }}</label>
              <!-- Peso real usado -->
              <div class="mb-2">
                <!-- <label class="text-xs text-gray-500">Capacidad de peso usada</label> -->
                <!-- <div class="flex items-center">
                  <input
                    :value="usoRealPeso"
                    disabled
                    class="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600"
                  />
                  <span class="ml-1 text-sm text-gray-500">kg</span>
                </div> -->
                <div v-if="usoRealPeso > 0" class="mt-1">
                  <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{{ porcentajePesoUsado }}% usado</span>
                    <span>{{ usoRealPeso }} / {{ edited.capacidadCarga || 0 }} kg</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div
                      class="h-3 rounded-full transition-all duration-300"
                      :style="{ width: porcentajePesoUsado + '%', backgroundColor: colorPesoUsado }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>

        <!-- Edición de niveles (Solo para cuartos)-->
        <details
          v-if="['cuartos', 'elementos'].includes(elementoSeleccionado.tipo)"
          open
          class="bg-gray-50 rounded-lg p-4"
        >
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">
            <div class="flex justify-between items-center w-full -mt-6 pl-4">
              Pisos
              <button
                :disabled="isSaving || isElementRestricted"
                @click="canvasStore.abrirCuartoNivelesPropiedades(elementoSeleccionado.id)"
                class="bg-primary-700 text-white p-1 rounded-full cursor-pointer
                disabled:bg-gray-400 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>
                </svg>
              </button>
            </div>
          </summary>
          <div class="mt-3 space-y-3">
            <template v-if="pisos.length > 0">
              <div
                v-for="(piso, index) in pisos"
                :key="index"
                class="bg-white p-3 flex items-center justify-between rounded-md shadow-sm relative"
              >
              <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-[#1C1E4D] mr-2">
                  <path fill="currentColor" d="M11.325 11.5q-.825 0-1.412-.587T9.325 9.5V7q0-.825.588-1.412T11.325 5H19q.825 0 1.413.588T21 7v2.5q0 .825-.587 1.413T19 11.5zm6.35 7.5q-.825 0-1.412-.587T15.675 17v-2.5q0-.825.588-1.412t1.412-.588H19q.825 0 1.413.588T21 14.5V17q0 .825-.587 1.413T19 19zm-6.35 0q-.825 0-1.412-.587T9.325 17v-2.5q0-.825.588-1.412t1.412-.588h1.35q.825 0 1.413.588t.587 1.412V17q0 .825-.587 1.413T12.675 19zM5 19q-.825 0-1.413-.587T3 17V7q0-.825.588-1.412T5 5h1.325q.825 0 1.413.588T8.325 7v10q0 .825-.587 1.413T6.325 19z"/>
                </svg>
              <span class="text-[14px] text-[#637381]">{{ piso.nombre }}</span>
              </div>

              <div>
                <button @click="toggleMenu(index)" class="p-1 rounded-full hover:bg-gray-100
                  menu-trigger-button cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 3a2 2 0 1 0 0 4a2 2 0 0 0 0-4m-2 9a2 2 0 1 1 4 0a2 2 0 0 1-4 0m0 7a2 2 0 1 1 4 0a2 2 0 0 1-4 0"/>
                  </svg>
                </button>

                <div v-if="openMenuIndex === index" class="absolute right-0 mt-2 bg-white rounded-md shadow-lg z-20 border border-gray-100 dropdown-menu">
                  <ul class="py-1">
                    <li>
                      <button
                        class="flex items-center justify-center px-4 py-2 text-sm text-primary-700 cursor-pointer"
                        @click="deleteAndCompact({ id: piso.id })"
                      >
                        Eliminar
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" class="ml-2">
                          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/>
                        </svg>
                      </button>
                    </li>
                    <li>
                      <button
                        @click="canvasStore.abrirCuartoNivelesPropiedades(piso.id)"
                        class="flex items-center justify-center px-4 py-2 text-sm text-primary-700
                        w-full cursor-pointer"
                      >
                        Editar
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" class="ml-2">
                          <path
                            fill="currentColor"
                            d="m14.06 9l.94.94L5.92 19H5v-.92zM17.66 3c-.26 0-.51.1-.7.29l-1.83 1.83l3.75 3.75l1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29m-3.6 3.19L3 17.25V21h3.75L17.81 9.94z"/>
                        </svg>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            </template>
            <div
              v-else
              class="text-sm text-gray-500"
            >
              Sin pisos registrados
            </div>
          </div>
        </details>
        <details open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">
            Propiedades de ESL
          </summary>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-sm text-[#111928] font-medium">Código</label>
              <div class="flex items-center">
                <input
                  v-model="edited.codigoEsl"
                  type="text"
                  min="0"
                  :disabled="isSaving"
                  placeholder="B123456789ABCD"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm
                  focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100
                  disabled:cursor-not-allowed disabled:text-gray-500"
                />
                <button
                  @click="abrirModalIdentificarEsl"
                  :disabled="isSaving"
                  class="text-[#364153] text-sm bg-gray-200 px-3 py-2 cursor-pointer rounded-[6px] ml-1
                  disabled:opacity-50 hover:bg-gray-300 disabled:cursor-not-allowed">
                  Configurar
                </button>
              </div>
            </div>
          </div>
        </details>

        <!-- Productos del contenedor -->
        <details v-if="esContenedor" open class="bg-gray-50 rounded-lg p-4">
          <summary class="text-sm font-medium text-gray-700 cursor-pointer">
            Productos/Insumos almacenados
          </summary>
          <div class="mt-3">
            <ContainerProductsList
              v-if="elementoSeleccionado?.codigo"
              :containerId="elementoSeleccionado.codigo"
            />
            <div v-else class="text-sm text-gray-500 text-center py-4">
              El nivel necesita un código para mostrar los productos
            </div>
          </div>
        </details>
      </div>
    </div>

    <div v-if="elementoSeleccionado" class="p-4 border-t border-gray-200 bg-white">
      <div v-if="isDirty" class="space-x-2 mb-3 flex justify-end">
        <button
          class="px-3 py-1 cursor-pointer border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          @click="revertir"
          :disabled="isSaving || isElementRestricted"
        >
          Revertir
        </button>
        <button
          class="px-3 cursor-pointer py-1 bg-primary text-white rounded text-sm hover:bg-primary-900 disabled:opacity-50"
          @click="guardar"
          :disabled="guardarDeshabilitado"
        >
          Guardar
        </button>
      </div>
      <button
        @click="deseleccionarElemento"
        class="w-full cursor-pointer px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors text-sm"
      >
        Deseleccionar
      </button>
    </div>
  </div>

  <!-- Modal Identificar ESL -->
  <IdentifyEslModal v-if="identifyEslModalOpen"
    @close="cerrarModalIdentificarEsl"
    @save="guardarCodigoEsl"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore.js'
import { TIPOS_ENTIDAD, TODAS_LAS_CATEGORIAS, CM_TO_PX } from '@/inventory-smart/utils/constants'
import { deepClone, deepEqual, makePatch } from '@/inventory-smart/utils/object'
import { useToast } from '@/inventory-smart/composables/useToast.js'
import ContainerProductsList from './ContainerProductsList.vue'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation.js'
import { useDimensionValidation } from '@/inventory-smart/composables/useDimensionValidation.js'
import { isPlacementValid } from '@/inventory-smart/utils/isPlacementValid'
import { resolveAutoGrowthPlacement } from '@/inventory-smart/utils/autoGrowthPlacement'
import { t } from '@/inventory-smart/utils/translator'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import { toPrecisionCm } from '../utils/fixedDimensions'
import IdentifyEslModal from './modals/IdentifyEslModal.vue'
import { useDeleteElement } from '@/inventory-smart/composables/useDeleteElement';

const canvasStore = useCanvasStore()
const { showWarning, showSuccess } = useToast()
const { deleteAndCompact } = useDeleteElement();
const confirmDialog = useConfirmDialog()
const {
  validarPesoElemento,
  validarPesoMaximoVsUsoReal,
  validarCapacidadVsHijos,
  calcularPesoDisponible,
} = useWeightValidation()
const { validarDimensiones } = useDimensionValidation()

const catalogStore = useCatalogStore()

const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)

const snapshotOriginal = ref(null)
const edited = ref(null)
const isSaving = ref(false)
const dimensionError = ref(null)
const dimensionSugerencias = ref([])

const openMenuIndex = ref(null);


// Forzar el catálogo de elementos cuando se abre el detalle (monta el panel)
onMounted(() => {
  if (catalogStore.selectedCatalog === 'plantillas') {
    catalogStore.setSelectedCatalog('elementos')
  }
})

const cargarDesdeStore = (el) =>
  deepClone({
    codigo: el.codigo || '',
    nombre: el.nombre || '',
    color: el.color || '#1C1E4D',
    orientacion: Number(el.orientacion) || 0,
    dimensiones: {
      ancho: el.dimensiones?.ancho || 0,
      largo: el.dimensiones?.largo || 0,
      alto: el.dimensiones?.alto || 0,
    },
    capacidadCarga: el.capacidadCarga || 0,
    alturaSobreSueloCm:
      el.alturaSobreSueloCm != null
        ? Number(el.alturaSobreSueloCm)
        : el.alturaRespectoAlSuelo != null
        ? Number(el.alturaRespectoAlSuelo)
        : 0,
    diametroCm:
      el.forma === 'circular' ? Number(el.dimensiones?.ancho ?? el.dimensiones?.largo ?? 0) : 0,
    // Buffer local de etiquetas (IDs)
    tags: Array.isArray(el.etiquetas) ? [...el.etiquetas] : [],
    // Propiedad ESL
    codigoEsl: el.codigoEsl || '',
  })// Estado para trackear valores previos y evitar validaciones innecesarias
const valorDimensionAnterior = ref({})
const valorPesoAnterior = ref(0)
const valorDiametroAnterior = ref(0)

watch(
  () => elementoSeleccionado.value?.id,
  (id) => {
    if (id) {
      snapshotOriginal.value = cargarDesdeStore(elementoSeleccionado.value)
      edited.value = deepClone(snapshotOriginal.value)

      // Inicializar valores anteriores para evitar validaciones innecesarias al cargar
      valorDimensionAnterior.value = {
        ancho: edited.value?.dimensiones?.ancho || 0,
        largo: edited.value?.dimensiones?.largo || 0,
        alto: edited.value?.dimensiones?.alto || 0,
      }
      valorPesoAnterior.value = edited.value?.capacidadCarga || 0
      valorDiametroAnterior.value = edited.value?.diametroCm || 0

      // Limpiar errores al cargar nuevo elemento
      dimensionError.value = null
      dimensionSugerencias.value = []

      // Ejecutar validación inicial para detectar errores existentes
      // Esto se ejecuta en el siguiente tick para asegurar que el estado esté completamente inicializado
      nextTick(() => {
        ejecutarValidacionDimensiones()
      })
    } else {
      snapshotOriginal.value = null
      edited.value = null

      // Limpiar valores anteriores
      valorDimensionAnterior.value = {}
      valorPesoAnterior.value = 0
      valorDiametroAnterior.value = 0

      // Limpiar errores
      dimensionError.value = null
      dimensionSugerencias.value = []
    }
  },
  { immediate: true },
)

// Watch para actualizar automáticamente cuando cambian las dimensiones desde el transformer
// Esto permite que el panel de propiedades refleje inmediatamente los cambios hechos con el transformer
watch(
  () => elementoSeleccionado.value?.dimensiones,
  (newDimensiones) => {
    if (!elementoSeleccionado.value || !edited.value || !newDimensiones) return

    // Solo actualizar si las dimensiones cambiaron realmente
    const currentDims = edited.value.dimensiones || {}
    const hasChanged =
      currentDims.ancho !== newDimensiones.ancho ||
      currentDims.largo !== newDimensiones.largo ||
      currentDims.alto !== newDimensiones.alto

    if (hasChanged) {
      // Actualizar las dimensiones en el estado editado
      edited.value.dimensiones = { ...newDimensiones }

      // Si es circular, también actualizar el diámetro
      if (esCircular.value) {
        edited.value.diametroCm = newDimensiones.ancho || 0
      }

      // Actualizar el snapshot original para evitar mostrar cambios no aplicados
      // cuando los cambios vienen del transformer (ya están aplicados en el store)
      if (elementoSeleccionado.value.dimensionLock) {
        snapshotOriginal.value.dimensiones = { ...newDimensiones }
        if (esCircular.value) {
          snapshotOriginal.value.diametroCm = newDimensiones.ancho || 0
        }
      }
    }
  },
  { deep: true, immediate: false },
)

// Watch para actualizar automáticamente las propiedades cuando se usen transformaciones
watch(
  [
    () => elementoSeleccionado.value?.width,
    () => elementoSeleccionado.value?.height,
    () => elementoSeleccionado.value?.x,
    () => elementoSeleccionado.value?.y,
  ],
  ([newWidth, newHeight, newX, newY]) => {
    if (!elementoSeleccionado.value || !edited.value) return

    // Solo sincronizar si el elemento tiene dimensionLock (indica que fue transformado)
    if (elementoSeleccionado.value.dimensionLock) {
      // Las dimensiones en píxeles ya se reflejarán automáticamente en el watch de dimensiones
      // Este watch principalmente maneja cambios de posición si es necesario en el futuro
    }
  },
  { immediate: false },
)

// Comparación order-insensitive solo para tags
const normalizeForCompare = (obj) => {
  const c = deepClone(obj || {})
  if (Array.isArray(c.tags)) c.tags = [...c.tags].sort((a, b) => a - b)
  return c
}
/*const isDirty = computed(() => {
  if (!edited.value || !snapshotOriginal.value) return false
  return !deepEqual(normalizeForCompare(edited.value), normalizeForCompare(snapshotOriginal.value))
})*/

const isDirty = ref(false)
watch(
  [() => edited.value, () => snapshotOriginal.value],
  () => {
    if (!edited.value || !snapshotOriginal.value) {
      isDirty.value = false
      canvasStore.setCambiosNoAplicados()
      return
    }

    // No marcar como dirty si los cambios vienen del transformer (dimensionLock = true)
    // ya que estos cambios ya están aplicados en el store
    if (elementoSeleccionado.value?.dimensionLock) {
      const currentNormalized = normalizeForCompare(edited.value)
      const originalNormalized = normalizeForCompare(snapshotOriginal.value)

      // Solo comparar campos que no sean dimensiones si hay dimensionLock
      const {
        dimensiones: currentDims,
        diametroCm: currentDiam,
        ...currentWithoutDims
      } = currentNormalized
      const {
        dimensiones: originalDims,
        diametroCm: originalDiam,
        ...originalWithoutDims
      } = originalNormalized

      isDirty.value = !deepEqual(currentWithoutDims, originalWithoutDims)
    } else {
      isDirty.value = !deepEqual(
        normalizeForCompare(edited.value),
        normalizeForCompare(snapshotOriginal.value),
      )
    }

    canvasStore.setCambiosNoAplicados(isDirty.value)
  },
  { deep: true },
)

const guardarDeshabilitado = computed(
  () =>
    isSaving.value ||
    !!advertenciaAltura.value ||
    !!advertenciaZBase.value ||
    !!advertenciaDiametroLimite.value ||
    !!advertenciaDiametroContencion.value ||
    !!advertenciaPeso.value ||
    !!dimensionError.value, // Bloquear si hay errores de dimensiones
)

const pisos = computed(() => {
  const hijos = elementoSeleccionado.value.hijos ?? [];

  return canvasStore.elementos.filter((e) => hijos.includes(e.id)).reverse();
})

const revertir = () => {
  edited.value = deepClone(snapshotOriginal.value)
  // Limpiar todos los errores de validación
  dimensionError.value = null
  dimensionSugerencias.value = []
}

const toggleMenu = (index) => {
  // El .stop en @click.stop previene que el clic se propague y active
  // el listener de cierre inmediatamente.
  openMenuIndex.value = openMenuIndex.value === index ? null : index;
};

// 4. Función que se ejecuta en cada clic en la página
const handleClickOutside = (event) => {
  if (openMenuIndex.value === null) return;

  const target = event.target;

  // Verificamos si el clic fue en un botón que abre menús O dentro de un menú abierto.
  // El método .closest() busca el elemento o sus padres hasta encontrar el selector.
  const isClickOnTrigger = target.closest('.menu-trigger-button');
  const isClickInMenu = target.closest('.dropdown-menu');

  // Si el clic NO fue en un trigger Y TAMPOCO fue dentro del menú, lo cerramos.
  if (!isClickOnTrigger && !isClickInMenu) {
    openMenuIndex.value = null;
  }
};

const guardar = async () => {
  if (!elementoSeleccionado.value) return
  if (guardarDeshabilitado.value) return
  isSaving.value = true

  // Reset UI de validación
  dimensionError.value = null
  dimensionSugerencias.value = []

  // 1) Validación de dimensiones (cm)
  let anchoCm, largoCm, altoCm
  if (esCircular.value) {
    const diam = Number(edited.value?.diametroCm)
    if (!Number.isFinite(diam) || diam <= 0) {
      dimensionError.value = 'El diámetro debe ser mayor a 0.'
      isSaving.value = false
      return
    }
    anchoCm = diam
    largoCm = diam
  } else {
    anchoCm = Number(edited.value?.dimensiones?.ancho)
    largoCm = Number(edited.value?.dimensiones?.largo)
  }
  altoCm = Number(edited.value?.dimensiones?.alto)

  const isValidDimension = (value) => Number.isFinite(value) && value >= 0
  if (!isValidDimension(anchoCm) || !isValidDimension(largoCm) || !isValidDimension(altoCm)) {
    dimensionError.value = 'Las dimensiones deben ser números válidos y no negativos.'
    isSaving.value = false
    return
  }

  // Solo validar dimensiones si realmente cambiaron las dimensiones
  const dimensionesOriginales = snapshotOriginal.value?.dimensiones || {}
  const dimensionesCambiaron =
    Math.abs((dimensionesOriginales.ancho || 0) - anchoCm) > 0.01 ||
    Math.abs((dimensionesOriginales.largo || 0) - largoCm) > 0.01 ||
    Math.abs((dimensionesOriginales.alto || 0) - altoCm) > 0.01 ||
    (esCircular.value && Math.abs((snapshotOriginal.value?.diametroCm || 0) - anchoCm) > 0.01)

  let autoPlacement = null

  if (dimensionesCambiaron) {
    // Crear elemento temporal con las nuevas dimensiones para validación completa
    const vista = canvasStore.vistaActiva || 'XY'
    const esVistaFrontal = vista === 'XZ'
    const widthPx = anchoCm * CM_TO_PX
    const heightPx = esVistaFrontal ? altoCm * CM_TO_PX : largoCm * CM_TO_PX

    const elementoTemporal = {
      ...elementoSeleccionado.value,
      width: widthPx,
      height: heightPx,
      dimensiones: {
        ancho: anchoCm,
        largo: largoCm,
        alto: altoCm,
      },
    }

    // VALIDACIÓN 1: Validación de posicionamiento (colisiones y área)
    const neighbors = canvasStore.elementosVisibles.filter(
      (e) => e.id !== elementoSeleccionado.value.id,
    )
    const layerWidth = canvasStore.canvasAdaptativo?.width || 1000
    const layerHeight = canvasStore.canvasAdaptativo?.height || 1000
    let areaBounds = { minX: 0, minY: 0, maxX: layerWidth, maxY: layerHeight, polygon: null }
    // Si está en planta, agregar poligono a propiedades del área
    if (canvasStore.estaEnPlanta) {
      console.debug('[PropiedadesPanel] Validando con polígono de planta activa')
      areaBounds.polygon = canvasStore.plantaActivaData?.poligono || null
    } else {
      console.debug('[PropiedadesPanel] Validando sin polígono (vista lateral)')
    }

    autoPlacement = resolveAutoGrowthPlacement({
      element: elementoSeleccionado.value,
      newWidth: elementoTemporal.width,
      newHeight: elementoTemporal.height,
      areaBounds,
      neighbors,
      vista,
    })

    if (autoPlacement?.applied) {
      elementoTemporal.x = autoPlacement.x
      elementoTemporal.y = autoPlacement.y
    }

    const isValidPosition = isPlacementValid({
      pos: { x: elementoTemporal.x, y: elementoTemporal.y },
      movingEl: elementoTemporal,
      neighbors,
      areaBounds,
      CM_TO_PX,
      epsPx: 0.5,
    })

    if (!isValidPosition) {
      dimensionError.value = 'Con estas dimensiones el elemento no cabe en su posición actual'
      dimensionSugerencias.value = [
        'Reducir las dimensiones',
        'Mover el elemento a otra posición',
        'Verificar que no haya colisiones con otros elementos',
      ]
      isSaving.value = false
      return
    }

    // VALIDACIÓN 2: Validación de dimensiones físicas
    const resultadoDims = validarDimensiones(
      elementoSeleccionado.value.id,
      { ancho: anchoCm, largo: largoCm, alto: altoCm },
      { silencioso: false, elementoTemporal },
    )
    if (!resultadoDims?.valida) {
      dimensionError.value = resultadoDims?.razon || 'Dimensiones inválidas'
      dimensionSugerencias.value = resultadoDims?.sugerencias || []
      isSaving.value = false
      return
    }
  }

  // Las dimensiones son válidas, proceder con el guardado normal
  const patch = makePatch(snapshotOriginal.value, edited.value)

  // Mapear buffer local de tags -> propiedad real del store 'etiquetas' si cambió (orden-insensible)
  const sortIds = (arr) => (Array.isArray(arr) ? [...arr].sort((a, b) => a - b) : [])
  const origTags = sortIds(snapshotOriginal.value?.tags)
  const newTags = sortIds(edited.value?.tags)
  if (!deepEqual(origTags, newTags)) {
    patch.etiquetas = [...newTags]
  }
  delete patch.tags

  if (autoPlacement?.applied) {
    patch.x = autoPlacement.x
    patch.y = autoPlacement.y
    patch.posicion = {
      ...(elementoSeleccionado.value?.posicion || {}),
      x: autoPlacement.x,
      y: autoPlacement.y,
    }
  }

  // Mapear propiedad ESL
  if (edited.value?.codigoEsl !== snapshotOriginal.value?.codigoEsl) {
    patch.codigoEsl = edited.value?.codigoEsl || ''
  }

  // Si es un elemento de pared, reflejar valores verticales y posicionar Y en px
  if (estaUbicadoEnPared.value) {
    const zBase = Number(edited.value?.alturaSobreSueloCm) || 0
    patch.alturaRespectoAlSuelo = zBase
    patch.alturaSobreSueloCm = zBase

    const alturaTechoCm = Number(
      canvasStore.plantaPorId(canvasStore.plantaActiva)?.dimensiones?.alto || 0,
    )
    const altoCm = Number(
      edited.value?.dimensiones?.alto || elementoSeleccionado.value?.dimensiones?.alto || 0,
    )
    const yTopPx = (alturaTechoCm - (zBase + altoCm)) * (CM_TO_PX || 10)
    if (Number.isFinite(yTopPx)) {
      if (canvasStore.vistaActiva === 'XZ') {
        patch.y = yTopPx
      }
      // Guardar en estructura de posición para futuras vistas XZ
      patch.posicion = {
        ...(patch.posicion || elementoSeleccionado.value?.posicion || {}),
        y: yTopPx,
      }
    }
  }

  // Si es circular, normalizar dimensiones con el diámetro y sincronizar px
  if (esCircular.value) {
    const d = Number(edited.value?.diametroCm) || 0
    if (!patch.dimensiones) patch.dimensiones = {}
    patch.dimensiones.ancho = d
    patch.dimensiones.largo = d
    // No contaminar el store con la propiedad auxiliar
    delete patch.diametroCm
  }
  const diamChanged =
    esCircular.value && snapshotOriginal.value?.diametroCm !== edited.value?.diametroCm

  // 3) Validación de peso solo si cambió
  const pesoCambio =
    Math.abs((valorPesoAnterior.value || 0) - (Number(edited.value?.capacidadCarga) || 0)) > 0.01
  if (pesoCambio && advertenciaPeso.value) {
    showWarning(advertenciaPeso.value)
    isSaving.value = false
    return
  }

  // 4) Persistencia final
  const ok = await canvasStore.updateElementById(elementoSeleccionado.value.id, patch)
  if (ok) {
    snapshotOriginal.value = deepClone(edited.value)
    // Actualizar valores anteriores después de guardar exitosamente
    valorDimensionAnterior.value = {
      ancho: anchoCm,
      largo: largoCm,
      alto: altoCm,
    }
    valorPesoAnterior.value = Number(edited.value?.capacidadCarga) || 0
    valorDiametroAnterior.value = esCircular.value ? anchoCm : 0

    showSuccess(diamChanged ? 'Diámetro actualizado' : 'Cambios guardados')
  }
  isSaving.value = false
}

// Función para ejecutar validación completa de dimensiones y posicionamiento
const ejecutarValidacionDimensiones = () => {
  if (!elementoSeleccionado.value || !edited.value) return

  // Reset UI de validación previa
  dimensionError.value = null
  dimensionSugerencias.value = []

  // Obtener dimensiones actuales editadas
  let anchoCm, largoCm, altoCm
  if (esCircular.value) {
    const diam = Number(edited.value?.diametroCm)
    anchoCm = diam
    largoCm = diam
  } else {
    anchoCm = Number(edited.value?.dimensiones?.ancho)
    largoCm = Number(edited.value?.dimensiones?.largo)
  }
  altoCm = Number(edited.value?.dimensiones?.alto)

  // Validar que las dimensiones sean válidas antes de proceder
  const isValidDimension = (value) => Number.isFinite(value) && value >= 0
  if (!isValidDimension(anchoCm) || !isValidDimension(largoCm) || !isValidDimension(altoCm)) {
    return // No validar si las dimensiones no son válidas
  }

  // Calcular nuevas dimensiones en píxeles según la vista actual
  const vista = canvasStore.vistaActiva || 'XY'
  const esVistaFrontal = vista === 'XZ'
  const widthPx = anchoCm * CM_TO_PX
  const heightPx = esVistaFrontal ? altoCm * CM_TO_PX : largoCm * CM_TO_PX

  // Crear elemento temporal con las nuevas dimensiones para validación (similar a useTransformer)
  const elementoTemporal = {
    ...elementoSeleccionado.value,
    width: widthPx,
    height: heightPx,
    dimensiones: {
      ancho: anchoCm,
      largo: largoCm,
      alto: altoCm,
    },
  }

  // VALIDACIÓN 1: Validación de posicionamiento (colisiones y área) - similar a useTransformer
  const neighbors = canvasStore.elementosVisibles.filter(
    (e) => e.id !== elementoSeleccionado.value.id,
  )
  const layerWidth = canvasStore.canvasAdaptativo?.width || 1000
  const layerHeight = canvasStore.canvasAdaptativo?.height || 1000
  let areaBounds = { minX: 0, minY: 0, maxX: layerWidth, maxY: layerHeight, polygon: null }
  // Si está en planta, agregar poligono a propiedades del área
  if (canvasStore.estaEnPlanta) {
    console.debug('[PropiedadesPanel] Validando con polígono de planta activa')
    areaBounds.polygon = canvasStore.plantaActivaData?.poligono || null
  } else {
    console.debug('[PropiedadesPanel] Validando sin polígono (vista lateral)')
  }

  const autoPlacementPreview = resolveAutoGrowthPlacement({
    element: elementoSeleccionado.value,
    newWidth: elementoTemporal.width,
    newHeight: elementoTemporal.height,
    areaBounds,
    neighbors,
    vista,
  })

  if (autoPlacementPreview?.applied) {
    elementoTemporal.x = autoPlacementPreview.x
    elementoTemporal.y = autoPlacementPreview.y
  }

  const isValidPosition = isPlacementValid({
    pos: { x: elementoTemporal.x, y: elementoTemporal.y },
    movingEl: elementoTemporal,
    neighbors,
    areaBounds,
    CM_TO_PX,
    epsPx: 0.5,
  })

  if (!isValidPosition) {
    dimensionError.value = 'Con estas dimensiones el elemento no cabe en su posición actual'
    dimensionSugerencias.value = [
      'Reducir las dimensiones',
      'Mover el elemento a otra posición',
      'Verificar que no haya colisiones con otros elementos',
    ]
    return
  }

  // VALIDACIÓN 2: Validación de dimensiones físicas (contención, volumen, etc.)
  const resultadoDims = validarDimensiones(
    elementoSeleccionado.value.id,
    { ancho: anchoCm, largo: largoCm, alto: altoCm },
    { silencioso: true, elementoTemporal },
  )

  // Actualizar UI con los resultados
  if (!resultadoDims?.valida) {
    dimensionError.value = resultadoDims?.razon || 'Dimensiones inválidas'
    dimensionSugerencias.value = resultadoDims?.sugerencias || []
  } else {
    // Limpiar errores si todas las validaciones pasan
    dimensionError.value = null
    dimensionSugerencias.value = []
  }
}

const validarDimension = (prop) => {
  const val = Number(edited.value.dimensiones[prop])
  const valorAnterior = valorDimensionAnterior.value[prop]

  if (isNaN(val) || val < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    edited.value.dimensiones[prop] = snapshotOriginal.value.dimensiones[prop]
    // Limpiar errores ya que revertimos a un valor válido
    dimensionError.value = null
    dimensionSugerencias.value = []
    return
  }

  // Solo ejecutar validaciones si el valor realmente cambió
  if (valorAnterior !== undefined && Math.abs(valorAnterior - val) < 0.01) {
    return
  }

  // Actualizar valor anterior
  valorDimensionAnterior.value[prop] = val

  // Si el usuario modifica manualmente las dimensiones, resetear dimensionLock
  // para permitir validaciones normales
  if (elementoSeleccionado.value?.dimensionLock) {
    canvasStore.actualizarElemento(elementoSeleccionado.value.id, { dimensionLock: false })
  }

  // Ejecutar validación de dimensiones solo si cambió
  ejecutarValidacionDimensiones()
}

// Contexto padre del elemento editado (planta o elemento/contenedor padre)
const padreContext = computed(() => {
  const el = elementoSeleccionado.value
  if (!el) return { padreId: null, padreType: null }
  if (el.padre) {
    const padre = canvasStore.elementoPorId(el.padre)
    const padreType = padre?.tipo || 'elementos'
    return { padreId: el.padre, padreType }
  }
  return { padreId: el.plantaId, padreType: 'plantas' }
})

const infoPesoPadre = computed(() => {
  const { padreId, padreType } = padreContext.value
  if (!padreId || !padreType)
    return { limiteDePeso: false, usado: 0, maximo: 0, disponible: Infinity, porcentajeUsado: 0 }
  return calcularPesoDisponible(padreId, padreType, { validacionTeorica: false })
})

const validarPeso = () => {
  const val = Number(edited.value.capacidadCarga)
  const valorAnterior = valorPesoAnterior.value

  if (isNaN(val) || val < 0) {
    showWarning('El valor debe ser mayor o igual a 0')
    edited.value.capacidadCarga = snapshotOriginal.value.capacidadCarga
    return
  }

  // Solo ejecutar validaciones costosas si el valor realmente cambió
  if (valorAnterior !== undefined && Math.abs(valorAnterior - val) < 0.01) {
    return
  }

  // Actualizar valor anterior
  valorPesoAnterior.value = val
}

const getTipoNombre = (tipo) => {
  return TIPOS_ENTIDAD.find((t) => t.id === tipo)?.nombre || tipo
}

const getTipoNombrePadre = () => {
  const { padreId, padreType } = padreContext.value
  if (!padreId || !padreType) return 'elemento'

  if (padreType === 'plantas') {
    return 'de la planta'
  }

  const elemento = canvasStore.elementoPorId(padreId)
  if (!elemento) return 'elemento'

  // Mapear tipos específicos
  const tipo = elemento.tipo
  if (tipo === 'cuartos') return 'del cuarto'
  if (tipo === 'pisos') return 'del piso'
  if (tipo === 'elementos') return 'del elemento'
  if (tipo === 'contenedores') return 'del nivel'
  if (tipo === 'pasillos') return 'del pasillo'

  return `del ${getTipoNombre(tipo)}`
}

const getTipoNombreActual = () => {
  const elemento = elementoSeleccionado.value
  if (!elemento) return 'elemento'

  const tipo = elemento.tipo
  if (tipo === 'cuartos') return 'del cuarto'
  if (tipo === 'pisos') return 'del piso'
  if (tipo === 'elementos') return 'del elemento'
  if (tipo === 'contenedores') return 'del nivel'
  if (tipo === 'pasillos') return 'del pasillo'
  if (tipo === 'plantas') return 'de la planta'

  return `del ${getTipoNombre(tipo)}`
}

const getCategoriaDisplay = (categoria) => {
  return TODAS_LAS_CATEGORIAS.find((c) => c.id === categoria)?.nombre || categoria
}

const esEstructura = computed(() => {
  const cat = elementoSeleccionado.value?.categoria
  return cat !== 'contenedores' && cat !== 'pasillos'
})

const estaUbicadoEnPared = computed(
  () => (elementoSeleccionado.value?.ubicacion || '').toLowerCase() === 'pared',
)

const esContenedor = computed(() => {
  const el = elementoSeleccionado.value
  return el?.tipo === 'contenedores'
})

const mostrarCapacidad = computed(() => esEstructura.value || esContenedor.value)
const mostrarDimensiones = computed(() => true)
const esCircular = computed(
  () =>
    (elementoSeleccionado.value?.forma || '').toLowerCase() === 'circular' ||
    (elementoSeleccionado.value?.forma || '').toLowerCase() === 'circle',
)
const ocultarAnchoLargo = computed(() => esCircular.value)
const esPasillo = computed(
  () => (elementoSeleccionado.value?.tipo || '').toLowerCase() === 'pasillos',
)

// Reflejamos el pasillo calculado (pasilloId) en el panel para ayudar a depurar asignaciones.
const pasilloAsignado = computed(() => {
  if (!elementoSeleccionado.value || esPasillo.value) return null
  const id = elementoSeleccionado.value.pasilloId
  if (!id) return null
  return canvasStore.elementoPorId(id) || null
})

// Mostramos un nombre amigable y dejamos un fallback determinista si el pasillo fue removido.
const pasilloAsignadoNombre = computed(() => {
  if (!elementoSeleccionado.value || esPasillo.value) return ''
  const id = elementoSeleccionado.value.pasilloId
  if (!id) return ''
  const pasillo = pasilloAsignado.value
  if (pasillo) {
    return pasillo.nombre || pasillo.codigo || `Pasillo ${pasillo.id}`
  }
  return `Pasillo no disponible (ID: ${id})`
})

/**
 * Uso real del elemento
 */
const mostrarUsoReal = computed(() => {
  const elemento = elementoSeleccionado.value
  return elemento && elemento.uso && (elemento.uso.peso > 0 || elemento.uso.volumen > 0)
})

const usoRealPeso = computed(() => {
  const uso = elementoSeleccionado.value?.uso
  return uso?.peso ? uso.peso.toFixed(2) : '0.00'
})

const porcentajePesoUsado = computed(() => {
  const peso = parseFloat(usoRealPeso.value)
  const maximo = edited.value?.capacidadCarga || 0
  if (maximo === 0) return 0
  return Math.min(100, toPrecisionCm((peso / maximo) * 100)).toFixed(2)
})

const colorPesoUsado = computed(() => {
  const porcentaje = porcentajePesoUsado.value
  if (porcentaje < 50) return '#10b981' // Verde
  if (porcentaje < 85) return '#f59e0b' // Amarillo
  return '#ef4444' // Rojo
})

/**
 * Datos del uso real del padre
 */
const mostrarUsoRealPadre = computed(() => {
  const { padreId, padreType } = padreContext.value
  return padreId && padreType && infoPesoPadre.value.limiteDePeso && infoPesoPadre.value.usado > 0
})

const usoRealPesoPadre = computed(() => {
  return infoPesoPadre.value.usado ? infoPesoPadre.value.usado.toFixed(2) : '0.00'
})

const porcentajePesoUsadoPadre = computed(() => {
  const usado = infoPesoPadre.value.usado || 0
  const maximo = infoPesoPadre.value.maximo || 0
  if (maximo === 0) return 0
  return Math.min(100, toPrecisionCm((usado / maximo) * 100)).toFixed(2)
})

const colorPesoUsadoPadre = computed(() => {
  const porcentaje = porcentajePesoUsadoPadre.value
  if (porcentaje < 50) return '#10b981' // Verde
  if (porcentaje < 85) return '#f59e0b' // Amarillo
  return '#ef4444' // Rojo
})

const alturaPlanta = computed(
  () => canvasStore.plantaPorId(canvasStore.plantaActiva)?.dimensiones?.alto || 0,
)
const advertenciaAltura = computed(() => {
  if (!esEstructura.value) return null
  const max = alturaPlanta.value
  const actual = edited.value?.dimensiones?.alto || 0
  return actual > max
    ? `La altura no debe superar ${max} cm (debido a la altura de planta o un elemento situado encima)`
    : null
})

// Advertencia de peso por límite del contexto padre (bloquea Guardar)
const advertenciaPeso = computed(() => {
  if (!elementoSeleccionado.value || !edited.value) return null

  const newVal = Number(edited.value?.capacidadCarga || 0)
  if (!Number.isFinite(newVal) || newVal < 0) return 'La capacidad debe ser un número válido.'

  // 1. VALIDACIÓN DE USO REAL: capacidad ≥ uso actual del elemento
  const validacionReal = validarPesoMaximoVsUsoReal(elementoSeleccionado.value, newVal)
  if (!validacionReal.valido) {
    return validacionReal.mensaje
  }

  // 2. VALIDACIÓN DE HIJOS: capacidad ≥ suma de capacidades de hijos
  const validacionHijos = validarCapacidadVsHijos(elementoSeleccionado.value, newVal)
  if (!validacionHijos.valido) {
    return validacionHijos.mensaje
  }

  // 3. VALIDACIÓN TEÓRICA: no exceder capacidad del contenedor padre
  const { padreId, padreType } = padreContext.value
  if (padreId && padreType) {
    const elementoSimulado = {
      ...elementoSeleccionado.value,
      capacidadCarga: newVal,
    }

    const validacionTeorica = validarPesoElemento(elementoSimulado, padreId, padreType, {
      validacionTeorica: true,
      esEdicion: true,
    })

    if (!validacionTeorica.valido && validacionTeorica.limiteDePeso) {
      return `Se excede la capacidad de peso teórica ${getTipoNombrePadre()}. Exceso: ${validacionTeorica.exceso.toFixed(2)} kg (Total: ${validacionTeorica.pesoTotal.toFixed(2)}/${validacionTeorica.capacidadCarga} kg).`
    }
  }

  return null
})

// ===== Validaciones para círculo (diametro y contención) =====
const plantaDims = computed(() => {
  const p = canvasStore.plantaPorId(canvasStore.plantaActiva)
  return {
    ancho: Number(p?.dimensiones?.ancho || 0),
    largo: Number(p?.dimensiones?.largo || 0),
  }
})

const maxDiametroPlanta = computed(() => Math.min(plantaDims.value.ancho, plantaDims.value.largo))

const advertenciaDiametroLimite = computed(() => {
  if (!esCircular.value) return null
  const d = Number(edited.value?.diametroCm)
  if (!Number.isFinite(d) || d <= 0) return 'El diámetro debe ser mayor a 0.'
  if (d > maxDiametroPlanta.value) return 'El diámetro excede las dimensiones de la planta.'
  return null
})

const advertenciaDiametroContencion = computed(() => {
  if (!esCircular.value) return null
  const d = Number(edited.value?.diametroCm)
  if (!Number.isFinite(d) || d <= 0) return null
  // Top-left como ancla según el modelo
  const xPx = Number(elementoSeleccionado.value?.x || 0)
  const yPx = Number(elementoSeleccionado.value?.y || 0)
  const xCm = xPx / (CM_TO_PX || 10)
  const yCm = yPx / (CM_TO_PX || 10)
  if (xCm < 0 || yCm < 0) return 'El círculo se sale del área de trabajo con el diámetro actual.'
  if (xCm + d > plantaDims.value.ancho || yCm + d > plantaDims.value.largo)
    return 'El círculo se sale del área de trabajo con el diámetro actual.'
  return null
})

const validarDiametro = () => {
  if (!esCircular.value) return

  const d = Number(edited.value?.diametroCm)
  const valorAnterior = valorDiametroAnterior.value

  if (!Number.isFinite(d) || d < 1) {
    showWarning('El diámetro debe ser mayor o igual a 1 cm')
    edited.value.diametroCm = snapshotOriginal.value.diametroCm
    // Limpiar errores ya que revertimos a un valor válido
    dimensionError.value = null
    dimensionSugerencias.value = []
    return
  }

  // Solo ejecutar validaciones si el valor realmente cambió
  if (valorAnterior !== undefined && Math.abs(valorAnterior - d) < 0.01) {
    return
  }

  // Actualizar valor anterior
  valorDiametroAnterior.value = d

  // Si el usuario modifica manualmente el diámetro, resetear dimensionLock
  if (elementoSeleccionado.value?.dimensionLock) {
    canvasStore.actualizarElemento(elementoSeleccionado.value.id, { dimensionLock: false })
  }

  // Ejecutar validación de dimensiones para círculos
  ejecutarValidacionDimensiones()
}

const maxAlturaSobreSuelo = computed(() => {
  const techo = Number(alturaPlanta.value) || 0
  const alto = Number(edited.value?.dimensiones?.alto || 0)
  return Math.max(0, techo - alto)
})

const advertenciaZBase = computed(() => {
  if (!estaUbicadoEnPared.value) return null
  const z = Number(edited.value?.alturaSobreSueloCm)
  if (!Number.isFinite(z) || z < 0) return 'La altura sobre suelo debe ser mayor o igual a 0 cm'
  const max = maxAlturaSobreSuelo.value
  return z > max ? `La altura sobre el suelo no debe superar ${max} cm` : null
})

const validarAlturaSobreSuelo = () => {
  if (!estaUbicadoEnPared.value) return
  const z = Number(edited.value?.alturaSobreSueloCm)
  if (!Number.isFinite(z) || z < 0) {
    showWarning('La altura sobre el suelo debe ser mayor o igual a 0 cm')
    edited.value.alturaSobreSueloCm = snapshotOriginal.value.alturaSobreSueloCm
    return
  }
  const max = maxAlturaSobreSuelo.value
  if (z > max) {
    showWarning(`La altura sobre el suelo no debe superar ${max} cm`)
    edited.value.alturaSobreSueloCm = snapshotOriginal.value.alturaSobreSueloCm
  }
}

const deseleccionarElemento = () => {
  canvasStore.seleccionarElemento(null)
  canvasStore.setCambiosNoAplicados(false)
}

// ====== Gestión del modal Identificar ESL ======
const identifyEslModalOpen = ref(false)

// ====== Gestión del modal Identificar ESL ======
const abrirModalIdentificarEsl = () => {
  identifyEslModalOpen.value = true
}

const cerrarModalIdentificarEsl = () => {
  identifyEslModalOpen.value = false
}

const guardarCodigoEsl = (payload) => {
  if (edited.value && payload?.codigoEsl) {
    edited.value.codigoEsl = payload.codigoEsl
  }
  cerrarModalIdentificarEsl()
}

const onKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (isDirty.value && !guardarDeshabilitado.value) {
      guardar()
    }
  }
}

const isElementRestricted = computed(() => {
   const type = elementoSeleccionado.value?.tipo;
   const restrictions = TIPOS_ENTIDAD.find(t => t.id === type)?.restrictions || [];
   return restrictions.includes('read-only-properties');
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', handleClickOutside);
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  document.removeEventListener('click', handleClickOutside);
})

onBeforeRouteLeave(async (to, from, next) => {
  if (!isDirty.value) {
    next()
    return
  }
  const save = await confirmDialog.confirm({
    title: 'Cambios sin guardar',
    message: 'Hay cambios sin guardar. ¿Guardar antes de salir?',
    confirmLabel: 'Guardar y salir',
    cancelLabel: 'Cancelar',
  })
  if (save) {
    await guardar()
    next()
  } else {
    const exit = await confirmDialog.confirm({
      title: 'Salir sin guardar',
      message: '¿Salir sin guardar?',
      confirmLabel: 'Salir',
      cancelLabel: 'Cancelar',
    })
    if (exit) next()
    else next(false)
  }
})
</script>

<style scoped>
/* No custom styles */
</style>
