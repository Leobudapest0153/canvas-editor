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
-->

<template>
  <div class="bg-white border-b border-gray-200 p-4 shadow-sm" style="overflow: visible;">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center" style="overflow: visible;">
      <!-- Lista de plantas con scroll horizontal -->
      <div class="flex flex-row overflow-x-auto space-x-4 col-span-1 lg:col-span-8" style="overflow-y: visible;">
          <!-- Tarjetas de plantas -->
          <div
            v-for="planta in canvasStore.plantas"
            :key="planta.id"
            :class="[
              'relative flex items-center justify-between p-3 rounded-lg border-2 min-w-max cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-400',
              {
                'bg-blue-50 border-blue-300 shadow-md': planta.id === canvasStore.plantaActiva,
                'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300': planta.id !== canvasStore.plantaActiva,
              },
            ]"
            style="overflow: visible;"
          >
            <div class="flex items-center space-x-3" @click="seleccionarPlanta(planta.id)">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-blue-600">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-800">{{ planta.nombre }}</h3>
                <p class="text-xs text-gray-500 m-0">{{ contarElementosEnPlanta(planta.id) }} elementos</p>
                <p class="text-xs text-gray-400 m-0 font-medium">
                  {{ planta.dimensiones?.ancho || 800 }}×{{ planta.dimensiones?.largo || 1000 }}×{{
                    planta.dimensiones?.alto || 280
                  }}cm
                </p>
              </div>
            </div>

            <!-- Menú desplegable de acciones -->
            <div class="relative ml-2">
              <button
                @click.stop="toggleMenuPlanta(planta.id, $event)"
                class="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Opciones de planta"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </button>
            </div>

            <!-- Indicador de planta activa -->
            <div
              v-if="planta.id === canvasStore.plantaActiva"
              class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            ></div>
          </div>
                <!-- Botón de agregar planta (siempre visible al hacer scroll) -->
          <div class="sticky right-0 z-10 pl-2 -mr-2 bg-gradient-to-l from-white via-white/70 to-transparent flex items-center pointer-events-none">
            <button
              @click="canvasStore.abrirEditor()"
              class="pointer-events-auto inline-flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md hover:shadow-lg cursor-pointer"
              title="Agregar nueva planta"
              type="button"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
      </div>

      <!-- Acciones (Historial e Import/Export) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 col-span-1 lg:col-span-4 lg:justify-self-end">
        <button
          type="button"
          class="inline-flex items-center gap-2 w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer"
          title="Ver historial completo"
          @click="openHistorialModal"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Historial</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer"
          title="Importar / Exportar Canvas"
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
          <span>Import/Export</span>
        </button>
      </div>
    </div>

    <!-- Modal para agregar/editar planta -->
    <div
      v-if="mostrarModalAgregar || mostrarModalEditar"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="cerrarModales"
    >
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-screen overflow-y-auto" @click.stop>
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">
            {{ mostrarModalEditar ? 'Editar Planta' : 'Nueva Planta' }}
          </h2>
          <button @click="cerrarModales" class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer transition-colors">
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
            <label for="nombre" class="block text-sm font-medium text-gray-700 mb-2">Nombre de la planta</label>
            <input
              id="nombre"
              v-model="formularioPlanta.nombre"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
              placeholder="Ej: Planta Baja, Primer Piso..."
              required
            />
          </div>

          <div class="mb-4">
            <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
            <textarea
              id="descripcion"
              v-model="formularioPlanta.descripcion"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all resize-none"
              placeholder="Descripción de la planta..."
              rows="3"
            ></textarea>
          </div>

          <!-- Dimensiones -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Dimensiones (cm)</label>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label for="ancho" class="block mb-1 text-xs font-medium text-gray-600">Ancho</label>
                <input
                  id="ancho"
                  v-model.number="formularioPlanta.dimensiones.ancho"
                  @input="onDimChange()"
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
                  placeholder="800"
                  min="100"
                  max="5000"
                  required
                />
              </div>
              <div>
                <label for="largo" class="block mb-1 text-xs font-medium text-gray-600">Largo</label>
                <input
                  id="largo"
                  v-model.number="formularioPlanta.dimensiones.largo"
                  @input="onDimChange()"
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
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
                  preview.status === 'block' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200',
                ]"
              >
                <strong v-if="preview.status==='block'">No es posible reducir</strong>
                <strong v-else>Se requiere reacomodo</strong>
                <span class="ml-1">{{ preview.message }}</span>
              </div>
            </div>
          </div>

          <!-- Peso máximo soportado -->
          <div class="mb-6">
            <label for="pesoMaximo" class="block text-sm font-medium text-gray-700 mb-2">Peso máximo soportado (kg)</label>
            <input
              id="pesoMaximo"
              v-model.number="formularioPlanta.pesoMaximoSoportado"
              type="number"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
              placeholder="3000"
              min="500"
              max="50000"
              required
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" @click="cerrarModales" class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 border-none rounded-lg cursor-pointer transition-colors">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg cursor-pointer transition-colors">
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
          <p class="text-gray-700 mb-4">
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
          <button @click="mostrarConfirmacionEliminar = false" class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 border-none rounded-lg cursor-pointer transition-colors">Cancelar</button>
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
      class="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32"
      :style="{ top: menuPosY + 'px', left: menuPosX + 'px' }"
      v-click-outside="() => cerrarMenuPlanta()"
    >
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
    </div>
  </teleport>

  <!-- Modal de historial -->
  <HistorialModal :is-open="showHistorialModal" @close="closeHistorialModal" />

  <!-- Modal de importar/exportar -->
  <ImportExportModal :mostrar="showImportExportModal" @cerrar="closeImportExportModal" />
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import HistorialModal from './HistorialModal.vue'
import ImportExportModal from './ImportExportModal.vue'
import { usePlantResizeGuard, pack as packShelf } from '@/composables/usePlantResizeGuard'
import { CM_TO_PX, MARGIN_CM, FACTOR_UTILIZACION } from '@/utils/constants'
// Store
const canvasStore = useCanvasStore()

// Estado local para modales
const showHistorialModal = ref(false)
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
  pesoMaximoSoportado: 3000,
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
      preview.value = { status: 'block', message: 'elementos no caben con las nuevas dimensiones', placements: [] }
    } else if (res.status === 'auto_adjust') {
      preview.value = { status: 'auto_adjust', message: `Se reacomodarán ${res.placements.length} elementos`, placements: res.placements }
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
const openHistorialModal = () => {
  showHistorialModal.value = true
}

const closeHistorialModal = () => {
  showHistorialModal.value = false
}

const openImportExportModal = () => {
  showImportExportModal.value = true
}

const closeImportExportModal = () => {
  showImportExportModal.value = false
}

const seleccionarPlanta = (plantaId) => {
  canvasStore.navegarAPlanta(plantaId)
}

const contarElementosEnPlanta = (plantaId) => {
  return canvasStore.elementosEnPlanta(plantaId).length
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

      // Alinear por defecto bajo el botón y con borde derecho alineado al botón
      let left = rect.right + window.scrollX - w
      let top = rect.bottom + window.scrollY + gap

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
      pesoMaximoSoportado: planta.pesoMaximoSoportado || 3000,
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
      alert(error.message)
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
    left >= margin - EPS && top >= margin - EPS && right <= W - margin + EPS && bottom <= H - margin + EPS
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
    alert('El nombre de la planta es requerido')
    return
  }

  try {
    const dims = formularioPlanta.value.dimensiones
    const res = guard.simulateResize(dims.ancho, dims.largo)

    if (res.status === 'block') {
      window.__toasts?.show?.('No es posible reducir: elementos no caben con las nuevas dimensiones', { type: 'error' })
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
        pesoMaximoSoportado: formularioPlanta.value.pesoMaximoSoportado,
      })

      // 2) Post-apply validation pass
      const W = dims.ancho
      const H = dims.largo
      const plantaId = canvasStore.plantaActiva
      const gridCm = gridPxToCm(canvasStore.gridSize)

      // Candidatos: raíz + suelo (incluso invisibles), excluir suelo decorativo si existiera
      const candidates = canvasStore.elementos.filter(
        (e) => e.plantaId === plantaId && !e.padre && (e.ubicacion || 'suelo') === 'suelo' && !(e.decorativo && (e.tipo === 'suelo' || /\bsuelo\b/i.test(e.nombre || ''))),
      )

      const anyOut = candidates.some((e) => !isInside(e, W, H, MARGIN_CM))

      if (anyOut) {
        // Ejecutar pack determinista
        const placements = packShelf(candidates, { W, H }, { grid: gridCm, margin: MARGIN_CM, rotPerm: true })
        if (!placements) {
          // Revertir dimensiones
          canvasStore.editarPlanta(canvasStore.plantaActiva, {
            dimensiones: { ...prevDims },
          })
          window.__toasts?.show?.('No fue posible reacomodar elementos; se revierte la redimensión', { type: 'error' })
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
          const drot = Math.abs((((el.posicion?.rotation ?? el.rotation ?? 0) % 360) + 360) % 360 - (((p.rotation ?? 0) % 360) + 360) % 360)
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

        window.__toasts?.show?.(`Se reacomodaron ${moved} elementos`, { type: 'warn' })
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
        pesoMaximoSoportado: formularioPlanta.value.pesoMaximoSoportado,
      })
      canvasStore.navegarAPlanta(nuevaPlantaId)
      canvasStore.saveToHistory('Nueva planta creada')
      await runCanvasSyncSequence()
    }

    cerrarModales()
  } catch (error) {
    console.error('Error al guardar planta:', error)
    alert('Error al guardar la planta')
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
    pesoMaximoSoportado: 3000,
  }
}

// Directiva personalizada para cerrar el menú al hacer clic fuera
const vClickOutside = {
  beforeMount: (el, binding) => {
    el.clickOutsideEvent = event => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted: el => {
    document.removeEventListener('click', el.clickOutsideEvent)
  },
}
</script>

<style scoped>
</style>
