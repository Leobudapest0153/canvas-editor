import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

export const useEditorMode = () => {
  const canvasStore = useCanvasStore()
  const { modoEdicion, editorPermissions } = storeToRefs(canvasStore)

  const isVisualizacion = computed(() => !modoEdicion.value)

  const canEditCanvas = computed(() => editorPermissions.value.canvasInteractivo)
  const canEditProperties = computed(() => editorPermissions.value.propiedadesEditable)
  const canMutateCatalog = computed(() => editorPermissions.value.catalogoMutable)
  const canMutateLayers = computed(() => editorPermissions.value.capasPersistentes)
  const canUseShortcuts = computed(() => editorPermissions.value.atajosActivos)
  const canUseContextMenus = computed(() => editorPermissions.value.menusEdicion)

  const ensureEditable = (onBlocked) => {
    if (!modoEdicion.value) {
      if (typeof onBlocked === 'function') onBlocked()
      return false
    }
    return true
  }

  const tooltipLabel = computed(() => (modoEdicion.value ? '' : 'No disponible en modo visualización'))

  return {
    modoEdicion,
    editorPermissions,
    isVisualizacion,
    canEditCanvas,
    canEditProperties,
    canMutateCatalog,
    canMutateLayers,
    canUseShortcuts,
    canUseContextMenus,
    tooltipLabel,
    activarModoEdicion: canvasStore.activarModoEdicion,
    desactivarModoEdicion: canvasStore.desactivarModoEdicion,
    toggleModoEdicion: canvasStore.toggleModoEdicion,
    ensureEditable,
  }
}
