<template>
  <div id="inventory-smart" :style="themeStyle">
    <!-- Mensaje para móviles -->
    <div
      v-if="isMobileDevice"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary"
    >
      <div class="bg-white/95 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div class="text-7xl mb-6">📱</div>
        <h2 class="text-slate-800 text-2xl font-semibold mb-6">Dispositivo no compatible</h2>
        <p class="text-slate-600 text-lg leading-relaxed mb-3">
          Esta aplicación requiere una pantalla de al menos 768px de ancho.
        </p>
        <p class="text-slate-600 text-lg leading-relaxed">
          Por favor, usa una tablet, laptop o computadora de escritorio.
        </p>
      </div>
    </div>

    <!-- Panel de plantas -->
    <PlantasPanel
      :author="author"
      @configChanged="handleConfigChanged"
      @back="handleBack"
      @showIdentifiers="handleShowIdentifiers"
    />

    <!-- Navegación jerárquica -->
    <NavegacionJerarquica />

    <main class="app-main relative">
      <!-- Sidebar con tabs -->
      <div class="app-sidebar-left" v-if="canvasStore.modoEdicion && canvasStore.sidebarVisible">
        <SidebarPanel />
      </div>

      <!-- Canvas principal -->
      <div class="app-canvas">
        <CanvasView
          ref="canvasViewRef"
          :safeRight="safeRightOffset"
          :showFloatingControls="!isMobileDevice"
        />
      </div>

      <!-- Botón flotante para mostrar sidebar cuando está oculto -->
      <button
        v-if="!isMobileDevice && canvasStore.modoEdicion && !canvasStore.sidebarVisible"
        class="sidebar-show-btn"
        @click="canvasStore.toggleSidebar()"
        title="Mostrar panel lateral"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <!-- Botón flotante para mostrar panel de propiedades cuando está oculto -->
      <button
        v-if="
          !isMobileDevice &&
          canvasStore.modoEdicion &&
          canvasStore.elementoSeleccionado &&
          !canvasStore.propertiesPanelVisible
        "
  class="properties-show-btn"
  :style="propertiesButtonStyle"
        @pointerdown.stop
        @mousedown.stop
        @touchstart.stop
        @click.stop="canvasStore.setPropertiesPanelVisible(true)"
        title="Mostrar panel de propiedades"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      <!-- Panel de propiedades (superpuesto para no empujar el canvas) -->
      <div
        class="app-sidebar-right absolute inset-y-0 right-0"
        v-if="canvasStore.mostrarPropiedades"
        data-properties-panel
      >
        <PropiedadesPanel @showIdentifier="handleShowIdentifier" />
      </div>
    </main>
    <!-- Contenedor de toasts -->
    <ToastContainer />
    <!-- Modal de confirmación global -->
    <ConfirmModal />
    <!-- Loader global -->
    <LoaderOverlay />
    <!-- Gestión de plantas -->
    <WorkspaceEditor />
    <UnsavedChangesModal
      :open="showUnsavedModal"
      :changes="unsavedDiff.changes"
      :summary="unsavedDiff.summary"
      @close="handleDismissUnsavedModal"
      @save="saveAndExit"
      @continue="exitWithoutSaving"
    />

    <!-- Gestión de pisos de cuartos desde las propiedades -->
    <ManagmentFloorRoomPropertiesModal />

    <IdentifyEslModal
      v-if="isIdentifyEslModalOpen"
      @close="handleIdentifyEslClose"
      @save="handleIdentifyEslSave"
    />

    <!-- Alerta de contexto de navegación -->
    <ContextAlert
      :show="contextAlert.showAlert.value"
      :message="contextAlert.alertMessage.value"
      :duration="contextAlert.alertDuration.value"
      @close="contextAlert.hideAlert"
    />

    <!-- Modal de sugerencias de colocación -->
    <PlacementSuggestionsModal
      :visible="placementSuggestions.showSuggestionsModal.value"
      :suggestions="placementSuggestions.currentSuggestions.value"
      :elementName="placementSuggestions.currentElement.value?.nombre || 'Elemento'"
      :reason="placementSuggestions.currentReason.value"
      @accept="placementSuggestions.handleAcceptSuggestions"
      @cancel="placementSuggestions.handleCancelSuggestions"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, provide, nextTick } from 'vue'
import SidebarPanel from './components/SidebarPanel.vue'
import CanvasView from './components/CanvasView.vue'
import PlantasPanel from './components/PlantasPanel.vue'
import PropiedadesPanel from './components/PropiedadesPanel.vue'
import NavegacionJerarquica from './components/NavegacionJerarquica.vue'
import WorkspaceEditor from './components/WorkspaceEditor.vue'
import ManagmentFloorRoomPropertiesModal from './components/modals/ManagmentFloorRoomPropertiesModal.vue'
import IdentifyEslModal from './components/modals/IdentifyEslModal.vue'
import ContextAlert from './components/ContextAlert.vue'
import PlacementSuggestionsModal from './components/modals/PlacementSuggestionsModal.vue'
import { useCanvasImportExport } from './composables/useCanvasImportExport'
import { useCanvasWithHistory } from './composables/useCanvasWithHistory'
import { useCanvasBuffer } from './composables/useCanvasBuffer'
import { useDeleteElement } from './composables/useDeleteElement'
import { useAutoPaste } from './composables/useAutoPaste'
import { useToast } from './composables/useToast'
import { useContextAlert } from './composables/useContextAlert'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import LoaderOverlay from './components/LoaderOverlay.vue'
// removed autosave/backup constants
import { useServicesStore } from './stores/services.js'
import { useStatePersistence } from './composables/useStatePersistence'
import { useChangeHistoryStore } from '@/inventory-smart/stores/changeHistory'
import { useConfirmDialog } from '@/inventory-smart/composables/useConfirmDialog'
import UnsavedChangesModal from './components/UnsavedChangesModal.vue'
import { useEditorMode } from './composables/useEditorMode'
import { useEditorShortcuts } from './composables/useEditorShortcuts'
import { useCatalogStore } from './stores/catalog'
import { usePlacementWithSuggestions } from './composables/usePlacementWithSuggestions'
import { generatePalette } from './utils/colorPalette'

const props = defineProps({
  configCanvas: {
    type: [String, null],
    default: () => '',
  },
  predefinedElements: {
    type: Array,
    default: () => null,
    validator: (value) => {
      if (value === null) return true
      if (!Array.isArray(value)) return false
      return value.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.nombre === 'string' &&
          typeof item.tipo === 'string',
      )
    },
  },
  supportedProductTypes: {
    type: Array,
    default: () => null,
    validator: (value) => {
      if (value === null) return true
      if (!Array.isArray(value)) return false
      return value.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.nombre === 'string',
      )
    },
  },
  themePalette: {
    type: Object,
    default: () => null,
    validator: (value) => {
      if (value === null) return true
      if (typeof value !== 'object') return false
      const allowed = [
        'primary',
        'primaryGray',
        'secondary',
        'success',
        'danger',
        'warning',
        'info',
      ]
      return Object.keys(value).every((k) => allowed.includes(k) && typeof value[k] === 'string')
    },
  },
  author: {
    type: Object,
    default: () => null,
    validator: (a) => {
      if (a == null) return true
      return typeof a.id === 'string' && typeof a.name === 'string'
    },
  },
  externalServices: {
    type: Array,
    default: () => [],
    validator: (services) => {
      if (!Array.isArray(services)) return false
      return services.every(
        (service) =>
          service &&
          typeof service.name === 'string' &&
          service.type === 'container_products' &&
          typeof service.handler === 'function',
      )
    },
  },
}) // Definir emits para comunicar cambios al componente padre
const emit = defineEmits(['configUpdated', 'back', 'printIdentifiers', 'printIdentifier'])

const { exportarCanvas, importarCanvas, validarJSON } = useCanvasImportExport()
const { undo, redo, store: canvasStore } = useCanvasWithHistory()
const buffer = useCanvasBuffer()
const { deleteSelected } = useDeleteElement()

// Inicializar sistema de sugerencias de colocación (debe estar antes de useAutoPaste)
const placementSuggestions = usePlacementWithSuggestions()

const { handlePaste: autoPaste } = useAutoPaste(placementSuggestions)
const { showToast } = useToast()
const servicesStore = useServicesStore()
const { ensureEditable } = useEditorMode()
const VISUAL_MODE_MESSAGE = 'No disponible en modo visualización'
const catalogStore = useCatalogStore()

// Inicializar sistema de alertas de contexto
const contextAlert = useContextAlert()

// Provide del sistema de sugerencias para componentes hijos (debe estar en nivel superior)
provide('placementSuggestions', placementSuggestions)

// Estado reactivo para saber si es móvil (true = móvil, false = tablet/laptop/desktop)
const isMobileDevice = ref(false)

const PROPERTIES_PANEL_WIDTH = 300
const SAFE_RIGHT_MARGIN = 12
const MOBILE_MAX_WIDTH = 768
const MOBILE_MAX_HEIGHT = 600

const safeRightOffset = computed(() =>
  canvasStore.mostrarPropiedades ? PROPERTIES_PANEL_WIDTH + SAFE_RIGHT_MARGIN : 20,
)

const propertiesButtonStyle = computed(() => ({
  right: `${safeRightOffset.value}px`,
}))

let coarsePointerQuery

const evaluateIsMobileDevice = () => {
  if (typeof window === 'undefined') return false

  const width = window.innerWidth
  const height = window.innerHeight
  const hasCoarsePointer = coarsePointerQuery?.matches ?? window.matchMedia('(pointer: coarse)').matches
  
  // Estrategia combinada:
  // 1. Si NO tiene puntero táctil (mouse/trackpad), definitivamente NO es móvil
  if (!hasCoarsePointer) return false
  
  // 2. Si tiene puntero táctil, verificar tamaño de pantalla:
  //    - Si ambas dimensiones son pequeñas (< 768px ancho O < 600px alto), ES móvil
  //    - Si alguna dimensión es grande, probablemente sea tablet/laptop con touch
  const isSmallScreen = width < MOBILE_MAX_WIDTH || height < MOBILE_MAX_HEIGHT
  
  return isSmallScreen
}

const updateDeviceProfile = () => {
  isMobileDevice.value = evaluateIsMobileDevice()
}

// Mapea claves de la prop a los prefijos de variables del @theme actual
const THEME_KEY_TO_PREFIX = {
  primary: 'primary', // --color-primary[...]
  primaryGray: 'primary-gray', // --color-primary-gray[...]
  secondary: 'secondary', // --color-secondary[...]
  success: 'success', // --color-success[...]
  danger: 'danger', // --color-danger[...]
  warning: 'warning', // --color-warning[...]
  info: 'info', // --color-info[...]
}

const buildThemeVars = (paletteProp) => {
  if (!paletteProp || typeof paletteProp !== 'object') return {}
  const vars = {}
  for (const [key, hex] of Object.entries(paletteProp)) {
    const prefix = THEME_KEY_TO_PREFIX[key]
    if (!prefix || typeof hex !== 'string') continue
    try {
      const shades = generatePalette(hex)
      // Establecer base (500) como --color-<prefix>
      const base = shades.find((s) => s.step === 500) || null
      if (base) vars[`--color-${prefix}`] = base.hex
      // Establecer rangos típicos 100-900
      const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
      for (const step of steps) {
        const item = shades.find((s) => s.step === step)
        if (item) vars[`--color-${prefix}-${step}`] = item.hex
      }
    } catch (e) {
      console.warn('No se pudo generar paleta para', key, e)
    }
  }
  return vars
}

const themeStyle = computed(() => buildThemeVars(props.themePalette))

// ======= Gestión de Servicios Externos =======
// Registrar servicios externos en la store cuando cambien las props
watch(
  () => props.externalServices,
  (newServices) => {
    try {
      servicesStore.registerServices(newServices)
    } catch (error) {
      console.error('Error al registrar servicios externos:', error)
      showToast('Error al registrar servicios externos', 'error')
    }
  },
  { immediate: true },
)

// Función auxiliar para llamar servicios externos
const callExternalService = async (serviceName, params = null, options = {}) => {
  try {
    const response = await servicesStore.callService(serviceName, params, options)
    return response
  } catch (error) {
    showToast(`Error en servicio: ${serviceName}`, 'error')
    throw error
  }
}

// Exponer funciones para uso en componentes hijos si es necesario
const externalServicesAPI = {
  callService: callExternalService,
  listServices: servicesStore.listServices,
  hasServices: servicesStore.hasServices,
  clearCache: servicesStore.clearCache,
  isServiceLoading: servicesStore.isServiceLoading,
  getServiceError: servicesStore.getServiceError,
}

const canvasViewRef = ref(null)
// const lastAppliedConfig = ref(null)

// Manejador para cuando PlantasPanel emite cambios de configuración
const handleConfigChanged = (configSerializada) => {
  try {
    // Validar que se recibió una configuración
    if (!configSerializada) {
      console.warn('No se recibió configuración para actualizar')
      return
    }
    emit('configUpdated', configSerializada)
    // Registrar última config emitida para evitar rehidratación inmediata en eco del padre
    // lastAppliedConfig.value = configSerializada
  } catch (error) {
    console.error('Error al procesar la configuración actualizada:', error)
    showToast('Error al procesar la configuración actualizada', 'error')
  }
}

const handleShowIdentifiers = (value) => {
  emit('printIdentifiers', value)
}

const handleShowIdentifier = (value) => {
  emit('printIdentifier', value)
}

const elementoEslActual = computed(() => {
  const targetId = canvasStore.elementoEslObjetivo
  if (!targetId) return null
  return canvasStore.elementoPorId(targetId)
})

const guardarCambios = async () => {
  try {
    if (canvasStore.cambiosNoAplicados) {
      showToast('No puedes guardar si hay cambios pendientes de guardar', 'warn')
      return
    }
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
    emit('configUpdated', configSerializada)
    showToast('Cambios guardados correctamente', 'success')
  } catch (error) {
    showToast('Error al guardar los cambios', 'error')
  }
}

const isIdentifyEslModalOpen = computed(
  () => canvasStore.modoConfigurarEsl && !!canvasStore.elementoEslObjetivo,
)

const handleIdentifyEslSave = ({ codigoEsl }) => {
  if (!canvasStore.elementoEslObjetivo) return
  const success = canvasStore.guardarCodigoEslElemento(canvasStore.elementoEslObjetivo, codigoEsl)
  if (success) {
    const target = elementoEslActual.value
    const descriptor = target?.nombre || target?.codigo || target?.id || 'elemento'
    showToast(`Código ESL configurado para ${descriptor}`, 'success')
    guardarCambios()
  } else {
    showToast('No se pudo actualizar el código ESL', 'error')
  }
}

const handleIdentifyEslClose = () => {
  canvasStore.finalizarConfiguracionEsl()
}

// Propagar evento regresar
const changeHistoryStore = useChangeHistoryStore()
const showUnsavedModal = ref(false)
const unsavedDiff = ref({ changes: [], summary: { created: 0, updated: 0, deleted: 0 } })
const pendingExitReason = ref(null)
const bypassBeforeUnloadOnce = ref(false)

const getCurrentCanvasState = () => ({
  plantas: canvasStore.plantas,
  elementos: canvasStore.elementos,
})

const requestUnsavedConfirmation = (reason) => {
  try {
    const diff = changeHistoryStore.previewUnsavedChanges(getCurrentCanvasState())
    if (diff?.changes?.length) {
      pendingExitReason.value = reason
      unsavedDiff.value = diff
      showUnsavedModal.value = true
      return true
    }
  } catch (e) {
    console.warn('No se pudo evaluar cambios pendientes', e)
  }
  return false
}

const handleBack = () => {
  if (requestUnsavedConfirmation('back')) return
  emit('back')
}

const handleDismissUnsavedModal = () => {
  showUnsavedModal.value = false
  pendingExitReason.value = null
}

const continueUnloadFlow = () => {
  if (typeof window === 'undefined') return
  bypassBeforeUnloadOnce.value = true
  window.setTimeout(() => {
    window.location.reload()
  }, 50)
}

const saveAndExit = () => {
  const reason = pendingExitReason.value
  try {
    const json = canvasStore.serialize(true)
    // Registrar última config emitida para evitar eco inmediato
    // lastAppliedConfig.value = json
    emit('configUpdated', json)
  } catch (e) {
    console.warn('Error serializando antes de salir', e)
  }
  showUnsavedModal.value = false
  pendingExitReason.value = null
  if (reason === 'back') {
    emit('back')
  } else if (reason === 'unload') {
    continueUnloadFlow()
  }
}

const exitWithoutSaving = () => {
  const reason = pendingExitReason.value
  showUnsavedModal.value = false
  pendingExitReason.value = null

  if (reason === 'back') {
    emit('back')
  } else if (reason === 'unload') {
    continueUnloadFlow()
  }
}

const handleBeforeUnload = (event) => {
  if (bypassBeforeUnloadOnce.value) {
    bypassBeforeUnloadOnce.value = false
    return
  }
  const shouldBlock = requestUnsavedConfirmation('unload')
  if (!shouldBlock) return
  const warningMessage = 'Tienes cambios sin guardar. ¿Seguro que deseas salir sin guardar?'
  event.preventDefault()
  event.returnValue = warningMessage
}

// Handlers para buffer
const handleCopyToBuffer = () => {
  if (!ensureEditable(() => showToast(VISUAL_MODE_MESSAGE, 'warning'))) {
    return
  }
  const elementoSeleccionado = canvasStore.elementoSeleccionado
  if (elementoSeleccionado) {
    buffer.copyToBuffer(elementoSeleccionado)
  }
}

const triggerPaste = () => {
  if (!ensureEditable(() => showToast(VISUAL_MODE_MESSAGE, 'warning'))) {
    return
  }
  try {
    const stage = canvasViewRef.value?.getStage?.()
    const viewportSize = canvasViewRef.value?.getStageSize?.() || null
    const viewportWorld = canvasViewRef.value?.getViewportWorldRect?.() || null

    let startPosition = null

    if (stage && typeof stage.getPointerPosition === 'function') {
      const pointer = stage.getPointerPosition()
      const scale = typeof stage.scaleX === 'function' ? stage.scaleX() || 1 : 1
      const stageX = typeof stage.x === 'function' ? stage.x() || 0 : 0
      const stageY = typeof stage.y === 'function' ? stage.y() || 0 : 0

      if (pointer) {
        startPosition = {
          x: (pointer.x - stageX) / (scale || 1),
          y: (pointer.y - stageY) / (scale || 1),
        }
      }

      if (!startPosition && viewportSize) {
        startPosition = {
          x: (viewportSize.width / 2 - stageX) / (scale || 1),
          y: (viewportSize.height / 2 - stageY) / (scale || 1),
        }
      }
    }

    if (!startPosition && viewportSize) {
      const scale = canvasStore.zoom || 1
      const stageX = canvasStore.panX || 0
      const stageY = canvasStore.panY || 0
      startPosition = {
        x: (viewportSize.width / 2 - stageX) / (scale || 1),
        y: (viewportSize.height / 2 - stageY) / (scale || 1),
      }
    }

    void autoPaste({
      startPosition: startPosition || null,
      viewportSize,
      viewportWorld,
    })
  } catch (error) {
    console.warn('No se pudo calcular el punto inicial para pegar:', error)
    void autoPaste()
  }
}

useEditorShortcuts({
  onUndo: () => undo(),
  onRedo: () => redo(),
  onCopy: () => handleCopyToBuffer(),
  onPaste: () => triggerPaste(),
  onDelete: () => {
    if (!ensureEditable(() => showToast(VISUAL_MODE_MESSAGE, 'warning'))) {
      return
    }
    if (!canvasStore.elementoSeleccionado) return
    deleteSelected({ withConfirm: true })
  },
  onBlocked: () => showToast(VISUAL_MODE_MESSAGE, 'warning'),
})


watch(
  () => props.configCanvas,
  async (json) => {
    if (typeof json !== 'string' || json.trim().length === 0) return
    // Evitar reimportar exactamente la misma configuración ya aplicada
    // if (json === lastAppliedConfig.value) return
    try {
      const ok = canvasStore.deserialize(json)

      if (!ok) {
        showToast('No se pudo importar la configuración', 'error')
      } else {
        // lastAppliedConfig.value = json
      }
      await nextTick()
      catalogStore.setPredefinedElements(props.predefinedElements)
    } catch (e) {
      console.error('Error deserializando configCanvas:', e)
      showToast('Error al importar la configuración', 'error')
    }
  },
  { immediate: true },
)

onMounted(() => {
  try {
    if (typeof window !== 'undefined') {
      coarsePointerQuery = window.matchMedia('(pointer: coarse)')
      updateDeviceProfile()
      
      // Escuchar cambios de tamaño y orientación
      window.addEventListener('resize', updateDeviceProfile)
      window.addEventListener('orientationchange', updateDeviceProfile)
      
      try {
        if (typeof coarsePointerQuery.addEventListener === 'function') {
          coarsePointerQuery.addEventListener('change', updateDeviceProfile)
        } else if (typeof coarsePointerQuery.addListener === 'function') {
          coarsePointerQuery.addListener(updateDeviceProfile)
        }
      } catch (pointerError) {
        console.warn('No se pudo suscribir a cambios de pointer media query', pointerError)
      }
    }

    provide('externalServicesAPI', externalServicesAPI)

    // Inicializar visibilidad del sidebar basado en el dispositivo
    canvasStore.initializeSidebarVisibility(!isMobileDevice.value)
  } catch (error) {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    showToast('Ha ocurrido un error al importar la configuración', 'error')
    console.error('Error al importar la configuración:', error)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('resize', updateDeviceProfile)
    window.removeEventListener('orientationchange', updateDeviceProfile)
  }

  if (coarsePointerQuery) {
    try {
      if (typeof coarsePointerQuery.removeEventListener === 'function') {
        coarsePointerQuery.removeEventListener('change', updateDeviceProfile)
      } else if (typeof coarsePointerQuery.removeListener === 'function') {
        coarsePointerQuery.removeListener(updateDeviceProfile)
      }
    } catch (pointerError) {
      console.warn('No se pudo remover la suscripción de pointer media query', pointerError)
    }
    coarsePointerQuery = null
  }
})

// Watcher para actualizar sidebar cuando cambia el dispositivo
watch(isMobileDevice, (isMobile) => {
  canvasStore.initializeSidebarVisibility(!isMobile)
})

watch(
  () => props.predefinedElements,
  (newElements) => {
    try {
      catalogStore.setPredefinedElements(newElements)
    } catch (error) {
      console.error('Error al configurar elementos predefinidos:', error)
      showToast('Error al configurar elementos predefinidos', 'error')
    }
  },
  { immediate: true },
)

watch(
  () => props.supportedProductTypes,
  (newTipos) => {
    try {
      canvasStore.setTiposProductoAdmitidos(newTipos)
    } catch (error) {
      console.error('Error al configurar tipos de producto admitidos:', error)
      showToast('Error al configurar tipos de producto admitidos', 'error')
    }
  },
  { immediate: true },
)
</script>

<style>
@import 'tailwindcss';

/* DEFAULT THEME PALETTE */
/* Ignorar warning de unknown at rule @theme */
@theme {
  --color-primary: #1c1e4d;
  --color-primary-50: #73757f;
  --color-primary-100: #616470;
  --color-primary-200: #4d5061;
  --color-primary-300: #3b3f56;
  --color-primary-400: #2d3150;
  --color-primary-500: #1c1e4d;
  --color-primary-600: #101135;
  --color-primary-700: #060425;
  --color-primary-800: #01000f;
  --color-primary-900: #000000;
  --color-primary-950: #090910;

  --color-primary-gray: #8b98a8;
  --color-primary-gray-50: #f5f7fa;
  --color-primary-gray-100: #e0e3e8;
  --color-primary-gray-200: #c8ccd3;
  --color-primary-gray-300: #b3bac3;
  --color-primary-gray-400: #a0aab7;
  --color-primary-gray-500: #8b98a8;
  --color-primary-gray-600: #798696;
  --color-primary-gray-700: #687484;
  --color-primary-gray-800: #596370;
  --color-primary-gray-900: #4a525f;
  --color-primary-gray-950: #363c44;

  --color-secondary: #e5e7eb;
  --color-secondary-50: #ffffff;
  --color-secondary-100: #ffffff;
  --color-secondary-200: #ffffff;
  --color-secondary-300: #ffffff;
  --color-secondary-400: #fafbfe;
  --color-secondary-500: #e5e7eb;
  --color-secondary-600: #d2d3d8;
  --color-secondary-700: #bec0c5;
  --color-secondary-800: #abadb1;
  --color-secondary-900: #999b9e;
  --color-secondary-950: #818285;

  --color-success: #4ba345;
  --color-success-100: #ecf9f0;
  --color-success-200: #d1f0db;
  --color-success-300: #a3e1b7;
  --color-success-400: #75d292;
  --color-success-500: #47c36e;
  --color-success-600: #389856;
  --color-success-700: #276b3e;
  --color-success-800: #164f27;
  --color-success-900: #0b3114;

  /* Danger (rojos) */
  --color-danger: #ef4444;
  --color-danger-100: #fee2e2;
  --color-danger-200: #fecaca;
  --color-danger-300: #fca5a5;
  --color-danger-400: #f87171;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-danger-700: #b91c1c;
  --color-danger-800: #991b1b;
  --color-danger-900: #7f1d1d;

  /* Warning (ámbar) */
  --color-warning: #f59e0b;
  --color-warning-100: #fef3c7;
  --color-warning-200: #fde68a;
  --color-warning-300: #fcd34d;
  --color-warning-400: #fbbf24;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;
  --color-warning-800: #92400e;
  --color-warning-900: #78350f;

  /* Info (celestes) */
  --color-info: #0ea5e9;
  --color-info-100: #e0f2fe;
  --color-info-200: #bae6fd;
  --color-info-300: #7dd3fc;
  --color-info-400: #38bdf8;
  --color-info-500: #0ea5e9;
  --color-info-600: #0284c7;
  --color-info-700: #0369a1;
  --color-info-800: #075985;
  --color-info-900: #0c4a6e;
}

:root {
  --ui-bg: rgba(255, 255, 255, 0.92);
  --ui-bg-dark: rgba(15, 17, 20, 0.92);
  --ui-border: rgba(0, 0, 0, 0.08);
  --ui-border-dark: rgba(255, 255, 255, 0.06);
  --ui-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  --ui-radius: 16px;
  --btn-size: 40px;
  --gap: 8px;
  --primary: #2563eb;
  --danger: #ef4444;
  --warning: #f59e0b;
  --muted: #64748b;
}

@media (max-width: 480px) {
  :root {
    --btn-size: 36px;
  }
}

/* Dark mode overrides */
.dark {
  --ui-bg: var(--ui-bg-dark);
  --ui-border: var(--ui-border-dark);
}

/* Utility helpers */
.ui-surface {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow);
  backdrop-filter: saturate(140%) blur(10px);
}

.dark .ui-surface {
  background: var(--ui-bg-dark);
  border: 1px solid var(--ui-border-dark);
}

/* Keep .ui-ring consistent with surface look */
.ui-ring {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow);
  backdrop-filter: saturate(140%) blur(10px);
}

.dark .ui-ring {
  background: var(--ui-bg-dark);
  border: 1px solid var(--ui-border-dark);
}

/* ====== Estilos para el conmutador de Catálogo (Elementos | Plantillas) ====== */
.catalog-switch {
  display: flex;
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.catalog-switch--compact {
  display: none;
}

.catalog-tab {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 9999px;
  background: var(--ui-bg);
  color: #334155;
  font-size: 0.875rem;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}

.catalog-tab:hover {
  background: #f1f5f9;
}

.catalog-tab.is-active {
  background: var(--color-primary);
  color: #fff;
}

.catalog-tab.kb-focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 479px) {
  .catalog-switch {
    display: none;
  }

  .catalog-switch.catalog-switch--compact {
    display: block;
  }

  .catalog-switch--compact select {
    width: 100%;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
  }
}

/* ====== Modal 'Guardar como plantilla' ====== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.modal {
  width: 420px;
  max-width: 92vw;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header .title {
  font-size: 18px;
  font-weight: 600;
}
.modal-header .close {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
}
.modal-body {
  padding: 16px;
  color: #374151;
}
.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
}
.btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.template-modal__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.template-modal__label {
  font-weight: 600;
  font-size: 0.95rem;
}
.template-modal__input,
.template-modal__textarea {
  width: 100%;
  border: 1px solid var(--border-color, #e3e6eb);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  font: inherit;
}
.template-modal__input:focus,
.template-modal__textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(38, 132, 255, 0.25);
}
.template-modal__summary {
  font-size: 0.9rem;
  color: var(--text-muted, #5b6473);
  background: var(--bg-muted, #f7f8fa);
  border: 1px solid var(--border-color, #e3e6eb);
  border-radius: 8px;
  padding: 10px;
}
.template-modal__error {
  color: #c62828;
  font-size: 0.85rem;
}

/* === Estilos para validaciones: arrastre desde Catálogo de Plantillas === */
.template-drag--invalid {
  outline: 2px dashed red;
}

.elastic-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  font-weight: 700;
  font-size: 12px;
  border-radius: 9999px;
  color: #0f172a;
  background: #a7f3d0; /* emerald-200 */
  border: 1px solid #34d399; /* emerald-400 */
}
</style>

<style scoped>
#inventory-smart {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.app-header {
  background: #1e293b;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-btn:hover {
  background: rgba(59, 130, 246, 1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.header-btn .icon {
  width: 16px;
  height: 16px;
}

.import-export-btn {
  background: rgba(34, 197, 94, 0.8) !important;
}

.import-export-btn:hover {
  background: rgba(34, 197, 94, 1) !important;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
}

.header-info span {
  font-size: 0.875rem;
  opacity: 0.8;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-sidebar-left {
  width: 320px;
  min-width: 320px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

.app-sidebar-right {
  width: 300px;
  min-width: 300px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
}

.app-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.main-canvas {
  width: 100%;
  height: 100%;
}

.sidebar-show-btn,
.properties-show-btn {
  position: absolute;
  width: 40px;
  height: 40px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow);
  backdrop-filter: saturate(140%) blur(10px);
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.sidebar-show-btn {
  top: 16px;
  left: 16px;
}

.properties-show-btn {
  top: calc(36px + 48px + 12px);
  width: 48px;
  height: 48px;
}

.sidebar-show-btn:hover,
.properties-show-btn:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sidebar-show-btn svg,
.properties-show-btn svg {
  width: 16px;
  height: 16px;
}
</style>
