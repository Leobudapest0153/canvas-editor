import Konva from 'konva'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { useToast } from '@/composables/useToast'

/**
 * Focus and select a canvas node by its element id.
 * @param {Object} opts
 * @param {Konva.Stage} opts.stage - Konva stage instance
 * @param {Konva.Layer} opts.layer - Konva layer containing the node
 * @param {string|number} opts.id - Element id
 * @param {number} [opts.paddingPx=24] - Extra padding around the node when centering
 * @param {number} [opts.duration=280] - Tween duration in ms
 * @param {boolean} [opts.openProperties=true] - Whether to open the properties panel
 */
export function focusAndSelectById({
  stage,
  layer,
  id,
  paddingPx = 24,
  duration = 280,
  openProperties = true,
}) {
  const { showToast } = useToast()
  const store = useCanvasStore()

  if (!stage || !layer) {
    showToast('No se pudo acceder al canvas', 'error')
    return
  }

  const node = layer.findOne(`#node-${id}`)
  if (!node || node.isVisible?.() === false || node.getAttr?.('blocked') || node.getAttr?.('visible') === false) {
    showToast('Elemento no disponible o está bloqueado/oculto', 'warning')
    return
  }

  const rect = node.getClientRect({ skipStroke: false })
  const padding = paddingPx
  const width = rect.width + padding * 2
  const height = rect.height + padding * 2
  const x = rect.x - padding
  const y = rect.y - padding

  const stageWidth = stage.width()
  const stageHeight = stage.height()
  const currentScale = stage.scaleX()
  const visibleWidth = stageWidth / currentScale
  const visibleHeight = stageHeight / currentScale

  let newScale = currentScale
  if (width > visibleWidth || height > visibleHeight) {
    newScale = Math.min(stageWidth / width, stageHeight / height)
  }

  const centerX = x + width / 2
  const centerY = y + height / 2
  const targetX = -centerX * newScale + stageWidth / 2
  const targetY = -centerY * newScale + stageHeight / 2

  stage.to({
    x: targetX,
    y: targetY,
    scaleX: newScale,
    scaleY: newScale,
    duration: duration / 1000,
    easing: Konva.Easings.EaseInOut,
  })

  // Selection state
  if (Array.isArray(store.selectedIds)) {
    store.selectedIds = [id]
  } else if (typeof store.seleccionarElemento === 'function') {
    store.seleccionarElemento(id)
  } else {
    store.elementoSeleccionado = id
  }

  if ('activeTool' in store) {
    store.activeTool = 'select'
  } else if (typeof store.setDraggableMode === 'function') {
    store.setDraggableMode(false)
  }

  // Attach transformer
  let tr = layer.findOne('Transformer')
  if (!tr) {
    tr = new Konva.Transformer({
      rotateEnabled: false,
      ignoreStroke: true,
    })
    layer.add(tr)
  }
  tr.nodes([node])
  layer.batchDraw()

  if (openProperties && typeof store.toggleMostrarPropiedades === 'function') {
    store.toggleMostrarPropiedades(true)
  }
}

export default focusAndSelectById
