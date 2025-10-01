<!--
  PlantasPanel.vue

  Panel superior para la gestión de plantas del edificio.

  Responsabilidades:
  - Mostrar lista de plantas disponibles (Planta Baja, Piso 1, etc.)
  - Permitir seleccionar la planta activa
  - Crear, editar y eliminar plantas
  - Mostrar información básica de cada planta (nombre, dimensiones)
  - Controlar la visibilidad de plantas en el canvas
  - Integrar con el sistema de navegación entre plantas
  - Panel de copias de seguridad y guardado
-->

<template>
  <div class="bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
    <div class="flex items-center gap-4">
      <!-- Contenedor de plantas y botón agregar - alineado a la izquierda -->
      <div class="flex items-center gap-3 plantas-container">
        <!-- Contenedor de plantas scrolleable -->
        <div class="flex overflow-x-auto space-x-3 plantas-scroll-container">
          <!-- Tarjetas de plantas -->
          <div
            v-for="planta in canvasStore.plantas"
            :key="planta.id"
            :class="[
              'relative m-2 flex items-center justify-between p-3 rounded-lg border-2 min-w-max cursor-pointer transition-all duration-200 hover:border-primary-400 flex-shrink-0',
              {
                'bg-primary-200 border-primary-200 shadow-md':
                  planta.id === canvasStore.plantaActiva,
                'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300':
                  planta.id !== canvasStore.plantaActiva,
              },
            ]"
            @contextmenu.stop.prevent="toggleMenuPlanta(planta.id, $event)"
          >
            <div class="flex items-center space-x-3" @click="seleccionarPlanta(planta.id)">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-white bg-primary"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-800">{{ planta.nombre }}</h3>
                <p class="text-xs text-gray-500 m-0">
                  {{ contarElementosEnPlanta(planta.id) }} elementos
                </p>
                <p class="text-xs text-gray-400 m-0 font-medium">
                  {{
                    formatLengthsCm([
                      planta.dimensiones?.ancho || 0,
                      planta.dimensiones?.largo || 0,
                      planta.dimensiones?.alto || 0,
                    ])
                  }}
                </p>
              </div>
            </div>

            <!-- Menú desplegable de acciones -->
            <UiTooltip
              class="relative ml-2"
              label="Opciones de planta"
              :delay="500"
              position="left"
            >
              <button
                @click.stop="toggleMenuPlanta(planta.id, $event)"
                class="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-primary-200 transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                  />
                </svg>
              </button>
            </UiTooltip>
            <!-- Indicador de planta activa -->
            <!-- <div
              v-if="planta.id === canvasStore.plantaActiva"
              class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            ></div> -->
          </div>

          <!-- Card para crear nueva planta -->
          <div
            v-if="canvasStore.modoEdicion"
            class="relative m-2 flex items-center justify-between p-3 rounded-lg border-2 min-w-max cursor-pointer transition-all duration-200 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 flex-shrink-0"
            role="button"
            tabindex="0"
            @click.prevent="handleCrearNuevoPiso"
            @keydown.enter.prevent="handleCrearNuevoPiso"
            @keydown.space.prevent="handleCrearNuevoPiso"
          >
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white bg-primary">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
                <div class="flex flex-col align-middle">
                <h3 class="text-sm font-semibold text-gray-800 leading-snug">Crear nuevo</h3>
                <h3 class="text-sm font-semibold text-gray-800 leading-snug">piso de almacén</h3>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Espacio flexible para empujar las acciones hacia la derecha -->
      <div class="flex-1"></div>

      <!-- Separador visual -->
      <div class="w-px h-8 bg-gray-300 separador-visual"></div>

      <div class="flex items-center gap-3">
        <!-- -- -- -->
        <!-- ACCIONES PARA PRUEBAS -- NO BORRAR -- -->
        <!-- <UiTooltip
          label="Importar / Exportar Canvas"
          position="bottom"
          :delay="200"
        >
        <button
          type="button"
          class="inline-flex items-center gap-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer"
          @click="openImportExportModal"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
        </button>
        </UiTooltip>-->
        <!-- -- -- -->

        <!-- Botón Regresar -->
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-ice-blue text-gray-600 hover:bg-ice-blue-300 hover:text-gray-500 rounded-lg transition-colors cursor-pointer"
            @click="onBack"
          >
            <span>Regresar</span>
          </button>

        <!-- Botón Todos los indicadores -->
        <UiTooltip label="Todos los indicadores" position="bottom" :delay="200">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-gray text-gray-100 hover:text-white hover:bg-primary-gray rounded-lg transition-colors cursor-pointer"
            @click="emitirIndicadores"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M19 8h-1V3H6v5H5c-1.1 0-2 .9-2 2v5h3v4h12v-4h3v-5c0-1.1-.9-2-2-2zM8 5h8v3H8V5zm8 14H8v-4h8v4zm1-6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"
              />
            </svg>
            <span class="ml-1">Todos los indicadores</span>
          </button>
        </UiTooltip>

        <!-- Botón Configurar ESL (modo visualización) -->
        <UiTooltip
          v-if="!canvasStore.modoEdicion"
          :label="eslModeTooltip"
          position="bottom"
          :delay="200"
        >
          <button
            type="button"
            :class="eslButtonClasses"
            @click="toggleEslMode"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 5v6a2 2 0 00.586 1.414l7 7a2 2 0 002.828 0l4-4a2 2 0 000-2.828l-7-7A2 2 0 0011 5H5z"
              />
            </svg>
            <span>{{ eslButtonLabel }}</span>
          </button>
        </UiTooltip>

        <!-- Toggle modo edición -->
        <UiTooltip :label="modoEdicionTooltip" position="bottom" :delay="200">
          <EditModeToggle
            :aria-label="modoEdicionTooltip"
            :title="modoEdicionTooltip"
          />
        </UiTooltip>

        <!-- Botón Historial de cambios -->
        <UiTooltip label="Historial de cambios" position="bottom" :delay="200">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-gray text-gray-100 hover:text-white hover:bg-primary-gray rounded-lg transition-colors cursor-pointer"
            @click="openChangeHistoryModal"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 21q-3.15 0-5.575-1.912T3.275 14.2q-.1-.375.15-.687t.675-.363q.4-.05.725.15t.45.6q.6 2.25 2.475 3.675T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H8q.425 0 .713.288T9 9t-.288.713T8 10H4q-.425 0-.712-.288T3 9V5q0-.425.288-.712T4 4t.713.288T5 5v1.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m1-9.4l2.5 2.5q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-2.8-2.8q-.15-.15-.225-.337T11 11.975V8q0-.425.288-.712T12 7t.713.288T13 8z"
              />
            </svg>
            <span class="ml-2">Historial</span>
          </button>
        </UiTooltip>

        <!-- Botón Guardar Cambios -->
        <UiTooltip label="Guardar cambios actuales" position="bottom" :delay="200">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success-600 text-white rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer"
            @click="guardarCambios"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <span>Guardar Cambios</span>
          </button>
        </UiTooltip>
      </div>
    </div>

    <!-- Modal para agregar/editar planta -->
    <div
      v-if="mostrarModalAgregar || mostrarModalEditar"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="cerrarModales"
    >
      <div
        class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-screen overflow-y-auto"
        @click.stop
      >
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">
            {{ mostrarModalEditar ? 'Editar Planta' : 'Nueva Planta' }}
          </h2>
          <button
            @click="cerrarModales"
            class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form @submit.prevent="guardarPlanta" class="p-6">
          <div class="mb-4">
            <label for="nombre" class="block text-sm font-medium text-gray-700 mb-2"
              >Nombre de la planta</label
            >
            <input
              id="nombre"
              v-model="formularioPlanta.nombre"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100 transition-all"
              placeholder="Ej: Planta Baja, Primer Piso..."
              required
            />
          </div>

          <div class="mb-4">
            <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2"
              >Descripción (opcional)</label
            >
            <textarea
              id="descripcion"
              v-model="formularioPlanta.descripcion"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100 transition-all resize-none"
              placeholder="Descripción de la planta..."
              rows="3"
            ></textarea>
          </div>

          <!-- Dimensiones -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Dimensiones (cm)</label>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label for="ancho" class="block mb-1 text-xs font-medium text-gray-600"
                  >Ancho</label
                >
                <input
                  id="ancho"
                  v-model.number="formularioPlanta.dimensiones.ancho"
                  @input="onDimChange()"
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100 transition-all"
                  placeholder="800"
                  min="100"
                  max="5000"
                  required
                />
              </div>
              <div>
                <label for="largo" class="block mb-1 text-xs font-medium text-gray-600"
                  >Largo</label
                >
                <input
                  id="largo"
                  v-model.number="formularioPlanta.dimensiones.largo"
                  @input="onDimChange()"
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100 transition-all"
                  placeholder="1000"
                  min="100"
                  max="5000"
                  required
                />
              </div>
              <div>
                <label for="alto" class="block mb-1 text-xs font-medium text-gray-600">Alto</label>
                <input
                  id="alto"
                  v-model.number="formularioPlanta.dimensiones.alto"
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100 transition-all"
                  placeholder="280"
                  min="200"
                  max="1000"
                  required
                />
              </div>
            </div>
            <!-- Aviso inline del guard -->
            <div v-if="preview.status !== 'ok'" class="mt-3">
              <div
                :class="[
                  'px-3 py-2 rounded text-sm',
                  preview.status === 'block'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200',
                ]"
              >
                <strong v-if="preview.status === 'block'">No es posible reducir</strong>
                <strong v-else>Se requiere reacomodo</strong>
                <span class="ml-1">{{ preview.message }}</span>
              </div>
            </div>
          </div>

          <!-- Peso máximo soportado -->
          <div class="mb-6">
            <label for="capacidadCarga" class="block text-sm font-medium text-gray-700 mb-2"
              >Peso máximo soportado (kg)</label
            >
            <input
              id="capacidadCarga"
              v-model.number="formularioPlanta.capacidadCargaSoportado"
              type="number"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100 transition-all"
              placeholder="3000"
              min="500"
              max="50000"
              required
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              @click="cerrarModales"
              class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 border-none rounded-lg cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white border-none rounded-lg cursor-pointer transition-colors"
            >
              {{ mostrarModalEditar ? 'Guardar Cambios' : 'Crear Planta' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar -->
    <div
      v-if="mostrarConfirmacionEliminar"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="mostrarConfirmacionEliminar = false"
    >
      <div class="bg-white rounded-lg shadow-2xl max-w-sm w-full mx-4" @click.stop>
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-red-600">Confirmar Eliminación</h2>
        </div>

        <div class="p-6">
          <p class="text-gray-700 mb-4" v-if="elementosEnPlantaAEliminar <= 0">
            ¿Estás seguro que deseas eliminar la planta
            <strong>"{{ plantaAEliminar?.nombre }}"</strong>?
          </p>

          <div
            v-if="elementosEnPlantaAEliminar > 0"
            class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
          >
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <span class="text-red-700 font-medium">
                Esta planta contiene {{ elementosEnPlantaAEliminar }} elemento(s). No se puede
                eliminar.
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            @click="mostrarConfirmacionEliminar = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 border-none rounded-lg cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            v-if="elementosEnPlantaAEliminar === 0"
            @click="eliminarPlantaConfirmada"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white border-none rounded-lg cursor-pointer transition-colors"
          >
            Eliminar Planta
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Teleport del menú a body para evitar overflow de contenedores -->
  <teleport to="body">
    <div
      v-if="menuAbiertoPlanta"
      ref="menuEl"
      class="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32 flex flex-col"
      :style="{ top: menuPosY + 'px', left: menuPosX + 'px' }"
      v-click-outside="() => cerrarMenuPlanta()"
    >
      <UiTooltip label="Editar planta" position="right">
        <button
          @click="editarPlanta(menuAbiertoPlanta)"
          class="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-all border-none bg-transparent cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span>Editar</span>
        </button>
      </UiTooltip>
      <UiTooltip label="Eliminar planta" position="right">
        <button
          @click="confirmarEliminarPlantaMenu(menuAbiertoPlanta)"
          :disabled="canvasStore.plantas.length <= 1"
          class="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-none bg-transparent cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>Eliminar</span>
        </button>
      </UiTooltip>
    </div>
  </teleport>

  <!-- Modal de historial de cambios (diff) -->
  <ChangeHistoryModal :is-open="showChangeHistoryModal" @close="closeChangeHistoryModal" />

  <!-- Modal de importar/exportar -->
  <ImportExportModal :mostrar="showImportExportModal" @cerrar="closeImportExportModal" />

</template>

<script setup>
// Definir emits (agregado 'regresar' y 'showIndicators')
const emit = defineEmits(['configChanged', 'regresar', 'showIndicators'])

import { ref, computed, nextTick } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useEditorMode } from '@/inventory-smart/composables/useEditorMode'
import { useAutoSave } from '@/inventory-smart/composables/useAutoSave'
import { useToast } from '@/inventory-smart/composables/useToast'
import ImportExportModal from './ImportExportModal.vue'
import ChangeHistoryModal from './ChangeHistoryModal.vue'
import EditModeToggle from './EditModeToggle.vue'
import {
  usePlantResizeGuard,
  pack as packShelf,
} from '@/inventory-smart/composables/usePlantResizeGuard'
import { CM_TO_PX, MARGIN_CM, FACTOR_UTILIZACION } from '@/inventory-smart/utils/constants'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'
import { formatLengthsCm } from '../utils/units'
import { useChangeHistoryStore } from '@/inventory-smart/stores/changeHistory'

// Props
const props = defineProps({
  author: {
    type: Object,
    default: null,
  },
})

// Store
const canvasStore = useCanvasStore()
const { ensureEditable } = useEditorMode()
const { showToast } = useToast()

const VISUAL_MODE_MESSAGE = 'No disponible en modo visualización'

const modoEdicionTooltip = computed(() =>
  canvasStore.modoEdicion ? 'Finalizar edición' : 'Editar configuración'
)

const eslModeTooltip = computed(() =>
  canvasStore.modoConfigurarEsl ? 'Finalizar configuración de ESL' : 'Configurar ESL'
)

const eslButtonLabel = computed(() =>
  canvasStore.modoConfigurarEsl ? 'Salir de Configurar ESL' : 'Configurar ESL'
)

const eslButtonClasses = computed(() => [
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer',
  canvasStore.modoConfigurarEsl
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : 'bg-ice-blue text-gray-600 hover:bg-ice-blue-300 hover:text-gray-500',
])

// Estado local para modales
const showChangeHistoryModal = ref(false)
const showImportExportModal = ref(false)
const mostrarModalAgregar = ref(false)
const mostrarModalEditar = ref(false)
const mostrarConfirmacionEliminar = ref(false)
const plantaAEliminar = ref(null)
const menuAbiertoPlanta = ref(null)

// Estado de preview del guard
const preview = ref({ status: 'ok', message: '', placements: [] })
let dimChangeTimer = null

// Posición del menú (teleport fijo)
const menuPosX = ref(0)
const menuPosY = ref(0)
const menuEl = ref(null)

// Formulario para agregar/editar plantas
const formularioPlanta = ref({
  nombre: '',
  descripcion: '',
  dimensiones: {
    alto: 280,
    ancho: 800,
    largo: 1000,
  },
  capacidadCargaSoportado: 3000,
})

// Guard de redimensionado ligado al estado actual
const guard = usePlantResizeGuard(() => {
  const plantaId = canvasStore.plantaActiva
  const elements = canvasStore.elementos.filter((el) => el.plantaId === plantaId)
  return {
    elements,
    gridSizePx: canvasStore.gridSize,
    cmToPx: CM_TO_PX,
    rotPerm: true,
    marginCm: MARGIN_CM,
    utilizationFactor: FACTOR_UTILIZACION,
  }
})

// Debounce preview en inputs de ancho/largo
const onDimChange = () => {
  clearTimeout(dimChangeTimer)
  dimChangeTimer = setTimeout(() => {
    const { ancho, largo } = formularioPlanta.value.dimensiones || {}
    if (!Number.isFinite(ancho) || !Number.isFinite(largo)) return
    const res = guard.simulateResize(ancho, largo)
    if (res.status === 'block') {
      preview.value = {
        status: 'block',
        message:
          'No hay suficiente espacio con las nuevas dimensiones. Ajusta el tamaño o mueve elementos.',
        placements: [],
      }
    } else if (res.status === 'auto_adjust') {
      preview.value = {
        status: 'auto_adjust',
        message: `Se reacomodarán ${res.placements.length} elementos`,
        placements: res.placements,
      }
    } else {
      preview.value = { status: 'ok', message: '', placements: [] }
    }
  }, 200)
}

// Computed
const elementosEnPlantaAEliminar = computed(() => {
  if (!plantaAEliminar.value) return 0
  return canvasStore.elementosEnPlanta(plantaAEliminar.value.id).length
})

// Métodos
const emitirIndicadores = () => {
  emit('showIndicators')
}

const toggleEslMode = () => {
  canvasStore.toggleModoConfigurarEsl()
}

// Emitir acción de regresar para que el componente padre pueda manejar navegación/salida
const onBack = () => {
  try {
    emit('regresar')
  } catch (e) {
    console.warn('No se pudo emitir evento regresar', e)
  }
}


const openChangeHistoryModal = () => {
  showChangeHistoryModal.value = true
}

const closeChangeHistoryModal = () => {
  showChangeHistoryModal.value = false
}

const openImportExportModal = () => {
  showImportExportModal.value = true
}

const closeImportExportModal = () => {
  showImportExportModal.value = false
}

const guardarCambios = async () => {
  try {
    // Capturar snapshot para historial de cambios ANTES de serializar
    try {
      const changeHistoryStore = useChangeHistoryStore()
      changeHistoryStore.recordSave(
        {
          plantas: canvasStore.plantas,
          elementos: canvasStore.elementos,
        },
        props.author,
      )
    } catch (e) {
      console.warn('No se pudo registrar historial de cambios', e)
    }

    const configSerializada = canvasStore.serialize(true)
    emit('configChanged', configSerializada)
    showToast('Cambios guardados correctamente', 'success')
  } catch (error) {
    console.error('Error al guardar cambios:', error)
    showToast('Error al guardar los cambios', 'error')
  }
}

const seleccionarPlanta = (plantaId) => {
  canvasStore.navegarAPlanta(plantaId)
}

const contarElementosEnPlanta = (plantaId) => {
  return canvasStore.elementosEnPlanta(plantaId).length
}

const handleCrearNuevoPiso = () => {
  if (!ensureEditable(() => showToast(VISUAL_MODE_MESSAGE, 'warning'))) {
    return
  }
  canvasStore.abrirEditor()
}

// Métodos para el menú desplegable
const toggleMenuPlanta = (plantaId, event) => {
  if (menuAbiertoPlanta.value === plantaId) {
    menuAbiertoPlanta.value = null
    return
  }
  menuAbiertoPlanta.value = plantaId
  const rect = event?.currentTarget?.getBoundingClientRect?.()
  if (rect) {
    nextTick(() => {
      const menuRect = menuEl.value?.getBoundingClientRect?.()
      const w = menuRect?.width || 180
      const h = menuRect?.height || 0
      const gap = 8

      const viewportLeft = window.scrollX + 8
      const viewportRight = window.scrollX + window.innerWidth - 8
      const viewportTop = window.scrollY + 8
      const viewportBottom = window.scrollY + window.innerHeight - 8

      // Posición inicial: si es clic derecho, usar el puntero; si no, alinear al botón
      let left
      let top
      if (event?.type === 'contextmenu' && Number.isFinite(event?.pageX) && Number.isFinite(event?.pageY)) {
        left = event.pageX
        top = event.pageY
      } else {
        // Alinear por defecto bajo el botón y con borde derecho alineado al botón
        left = rect.right + window.scrollX - w
        top = rect.bottom + window.scrollY + gap
      }

      // Si no cabe a la derecha/izquierda, ajustar
      if (left < viewportLeft) {
        left = Math.min(rect.left + window.scrollX, viewportRight - w)
      }

      // Si no cabe abajo, mostrar arriba del botón
      if (top + h > viewportBottom) {
        top = rect.top + window.scrollY - h - gap
      }

      // Clamp final a viewport
      left = Math.max(viewportLeft, Math.min(left, viewportRight - w))
      top = Math.max(viewportTop, Math.min(top, viewportBottom - h))

      menuPosX.value = left
      menuPosY.value = top
    })
  }
}

const cerrarMenuPlanta = () => {
  menuAbiertoPlanta.value = null
}

const editarPlanta = (plantaId) => {
  const planta = canvasStore.plantaPorId(plantaId)
  if (planta) {
    canvasStore.abrirEditor(planta.id)
    cerrarMenuPlanta()
  }
  /*const planta = canvasStore.plantaPorId(plantaId)

  if (planta) {
    formularioPlanta.value = {
      nombre: planta.nombre,
      descripcion: planta.descripcion || '',
      dimensiones: {
        alto: planta.dimensiones?.alto || 280,
        ancho: planta.dimensiones?.ancho || 800,
        largo: planta.dimensiones?.largo || 1000,
      },
      capacidadCargaSoportado: planta.capacidadCargaSoportado || 3000,
    }
    mostrarModalEditar.value = true
    cerrarMenuPlanta()
  }*/
}

const confirmarEliminarPlantaMenu = (plantaId) => {
  const planta = canvasStore.plantaPorId(plantaId)
  if (planta) {
    plantaAEliminar.value = planta
    mostrarConfirmacionEliminar.value = true
    cerrarMenuPlanta()
  }
}

const eliminarPlantaConfirmada = () => {
  if (plantaAEliminar.value && elementosEnPlantaAEliminar.value === 0) {
    try {
      canvasStore.eliminarPlanta(plantaAEliminar.value.id)
      mostrarConfirmacionEliminar.value = false
      plantaAEliminar.value = null
    } catch (error) {
      console.error('Error al eliminar planta:', error)
      showToast(error.message)
    }
  }
}

// Helpers post-apply
const EPS = 1e-6
const isInside = (el, W, H, margin) => {
  const x = el.posicion?.x ?? el.x ?? 0
  const y = el.posicion?.y ?? el.y ?? 0
  const rot = el.posicion?.rotation ?? el.rotation ?? 0
  const w = el.dimensiones?.ancho ?? el.width ?? 0
  const h = el.dimensiones?.largo ?? el.height ?? 0
  const orientedW = rot % 180 !== 0 ? h : w
  const orientedH = rot % 180 !== 0 ? w : h
  const left = x
  const top = y
  const right = left + orientedW
  const bottom = top + orientedH
  return (
    left >= margin - EPS &&
    top >= margin - EPS &&
    right <= W - margin + EPS &&
    bottom <= H - margin + EPS
  )
}
const gridPxToCm = (gridPx) => (gridPx > 0 ? gridPx / CM_TO_PX : 0)
const snapToGridCM = (x, y, gridCm) => {
  if (!gridCm) return { x, y }
  const sx = Math.round(x / gridCm) * gridCm
  const sy = Math.round(y / gridCm) * gridCm
  return { x: sx, y: sy }
}
const clampToArea = (x, y, w, h, W, H) => {
  const nx = Math.max(MARGIN_CM, Math.min(x, Math.max(MARGIN_CM, W - MARGIN_CM - w)))
  const ny = Math.max(MARGIN_CM, Math.min(y, Math.max(MARGIN_CM, H - MARGIN_CM - h)))
  return { x: nx, y: ny }
}

// Helpers de sincronización y repaint
const waitRaf = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
const runCanvasSyncSequence = async () => {
  try {
    await nextTick()
    await waitRaf()
    window.__canvasApi?.recomputeBoundsAndIndex?.()
    await nextTick()
    await waitRaf()
    window.__canvasApi?.forceRedraw?.()
    window.__canvasApi?.resetVolatileState?.()
  } catch {
    // noop
  }
}

const guardarPlanta = async () => {
  if (!formularioPlanta.value.nombre.trim()) {
    showToast('El nombre de la planta es requerido', 'error')
    return
  }

  try {
    const dims = formularioPlanta.value.dimensiones
    const res = guard.simulateResize(dims.ancho, dims.largo)

    if (res.status === 'block') {
      showToast('No es posible reducir: elementos no caben con las nuevas dimensiones', {
        type: 'error',
      })
      return
    }

    if (mostrarModalEditar.value) {
      // Guardar dimensiones previas para posibles reversiones
      const plantaPrev = canvasStore.plantaPorId(canvasStore.plantaActiva)
      const prevDims = {
        ancho: plantaPrev?.dimensiones?.ancho || 800,
        largo: plantaPrev?.dimensiones?.largo || 1000,
        alto: plantaPrev?.dimensiones?.alto || 280,
      }

      // 1) Aplicar nuevas dimensiones
      canvasStore.editarPlanta(canvasStore.plantaActiva, {
        nombre: formularioPlanta.value.nombre.trim(),
        descripcion: formularioPlanta.value.descripcion.trim(),
        dimensiones: { ...dims },
        capacidadCargaSoportado: formularioPlanta.value.capacidadCargaSoportado,
      })

      // 2) Post-apply validation pass
      const W = dims.ancho
      const H = dims.largo
      const plantaId = canvasStore.plantaActiva
      const gridCm = gridPxToCm(canvasStore.gridSize)

      // Candidatos: raíz + suelo (incluso invisibles), excluir suelo decorativo si existiera
      const candidates = canvasStore.elementos.filter(
        (e) =>
          e.plantaId === plantaId &&
          !e.padre &&
          (e.ubicacion || 'suelo') === 'suelo' &&
          !(e.decorativo && (e.tipo === 'suelo' || /\bsuelo\b/i.test(e.nombre || ''))),
      )

      const anyOut = candidates.some((e) => !isInside(e, W, H, MARGIN_CM))

      if (anyOut) {
        // Ejecutar pack determinista
        const placements = packShelf(
          candidates,
          { W, H },
          { grid: gridCm, margin: MARGIN_CM, rotPerm: true },
        )
        if (!placements) {
          // Revertir dimensiones
          canvasStore.editarPlanta(canvasStore.plantaActiva, {
            dimensiones: { ...prevDims },
          })
          showToast('No fue posible reacomodar elementos; se revierte la redimensión', {
            type: 'error',
          })
          // Secuencia de sync para reflejar reversión inmediatamente
          await runCanvasSyncSequence()
          return
        }

        // Aplicar placements con clamp->snap->clamp para seguridad
        const byId = new Map(candidates.map((e) => [e.id, e]))
        let moved = 0
        for (const p of placements) {
          const el = byId.get(p.id)
          if (!el) continue
          const w = p.width
          const h = p.height
          // clamp 1
          let pos = clampToArea(p.x, p.y, w, h, W, H)
          // snap
          const snapped = snapToGridCM(pos.x, pos.y, gridCm)
          // clamp 2
          pos = clampToArea(snapped.x, snapped.y, w, h, W, H)

          const dx = Math.abs((el.posicion?.x ?? el.x ?? 0) - pos.x)
          const dy = Math.abs((el.posicion?.y ?? el.y ?? 0) - pos.y)
          const drot = Math.abs(
            ((((el.posicion?.rotation ?? el.rotation ?? 0) % 360) + 360) % 360) -
              ((((p.rotation ?? 0) % 360) + 360) % 360),
          )
          if (dx > EPS || dy > EPS || drot > EPS) moved++

          el.x = pos.x
          el.y = pos.y
          el.width = w
          el.height = h
          if (!el.posicion) el.posicion = { x: pos.x, y: pos.y, rotation: p.rotation }
          else {
            el.posicion.x = pos.x
            el.posicion.y = pos.y
            el.posicion.rotation = p.rotation
          }
          if (el.dimensiones) {
            el.dimensiones.ancho = w
            el.dimensiones.largo = h
          }
          el.rotation = p.rotation
        }
        showToast(`Se reacomodaron ${moved} elementos`, 'warn')
        canvasStore.saveToHistory('Auto-adjust after resize (post-apply)')
      } else {
        // No ajustes requeridos
        canvasStore.saveToHistory('Dimensiones de planta actualizadas')
      }

      // Forzar repaint inmediato tras aplicar dimensiones/pack
      await runCanvasSyncSequence()
    } else {
      // Crear nueva planta
      const nuevaPlantaId = canvasStore.agregarPlanta({
        nombre: formularioPlanta.value.nombre.trim(),
        descripcion: formularioPlanta.value.descripcion.trim(),
        dimensiones: formularioPlanta.value.dimensiones,
        capacidadCargaSoportado: formularioPlanta.value.capacidadCargaSoportado,
      })
      canvasStore.navegarAPlanta(nuevaPlantaId)
      canvasStore.saveToHistory('Nueva planta creada')
      await runCanvasSyncSequence()
    }

    cerrarModales()
  } catch (error) {
    console.error('Error al guardar planta:', error)
    showToast('Error al guardar la planta', 'error')
  }
}

const cerrarModales = () => {
  mostrarModalAgregar.value = false
  mostrarModalEditar.value = false
  formularioPlanta.value = {
    nombre: '',
    descripcion: '',
    dimensiones: {
      alto: 280,
      ancho: 800,
      largo: 1000,
    },
    capacidadCargaSoportado: 3000,
  }
}

// Directiva personalizada para cerrar el menú al hacer clic fuera
const vClickOutside = {
  beforeMount: (el, binding) => {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted: (el) => {
    document.removeEventListener('click', el.clickOutsideEvent)
  },
}
</script>

<style scoped>
/* Estilos personalizados para el scroll horizontal - usando clases específicas */
.plantas-scroll-container {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  /* Limitar el ancho máximo para que aparezca el scroll cuando sea necesario */
  max-width: calc(100vw - 400px); /* Resta espacio para botones de acción y separador */
}

.plantas-scroll-container::-webkit-scrollbar {
  height: 6px;
}

.plantas-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.plantas-scroll-container::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

.plantas-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

/* Contenedor principal de plantas - configuración de overflow */
.plantas-container {
  /* Asegurar que se adapte al contenido y no crezca más de lo necesario */
  flex-shrink: 1;
  /* Permitir que el contenedor se reduzca cuando sea necesario */
  min-width: 0;
  /* Establecer un ancho máximo basado en el viewport menos espacio para acciones */
  max-width: calc(100vw - 350px);
}

/* Animación suave para el separador */
.separador-visual {
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

/* Responsive: ajustar en pantallas más pequeñas */
@media (max-width: 1024px) {
  .plantas-container {
    max-width: calc(100vw - 280px);
  }

  .plantas-scroll-container {
    max-width: calc(100vw - 320px);
  }
}

@media (max-width: 768px) {
  .plantas-container {
    max-width: calc(100vw - 220px);
  }

  .plantas-scroll-container {
    max-width: calc(100vw - 260px);
  }
}
</style>
