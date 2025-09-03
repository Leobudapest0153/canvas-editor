import Konva from 'konva'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { useToast } from '@/composables/useToast'

/**
 * Focus an element by id in the canvas and attach a transformer
 * @param {Object} params
 * @param {Konva.Stage} params.stage - Stage instance
 * @param {Konva.Layer} params.layer - Layer instance
 * @param {string} params.id - Element id
 * @param {number} [params.paddingPx=24] - Padding around element when focusing
 * @param {number} [params.duration=280] - Tween duration in ms
 * @param {boolean} [params.openProperties=true] - Whether to open properties panel
 */
export function focusAndSelectById({
  stage,
  layer,
  id,
  paddingPx = 24,
  duration = 280,
  openProperties = true,
}) {
  const { showError } = useToast()
  const canvasStore = useCanvasStore()

  if (!stage || !layer || !id) {
    showError('No se pudo enfocar el elemento')
    return
  }

  // Try to find the node either with prefix node- or plain id
  const node =
    stage.findOne(`#node-${id}`) || stage.findOne(`#${id}`) || layer.findOne(`#node-${id}`) || layer.findOne(`#${id}`)

  const elemento = canvasStore.elementoPorId?.(id)

  // Validate existence and state
  if (
    !node ||
    !elemento ||
    elemento.visible === false ||
    elemento.bloqueado === true ||
    elemento.locked === true
  ) {
    showError('Elemento no encontrado, oculto o bloqueado')
    return
  }

  const box = node.getClientRect({ skipTransform: false })
  const stageWidth = stage.width()
  const stageHeight = stage.height()

  const scale = Math.min(
    (stageWidth - paddingPx * 2) / box.width,
    (stageHeight - paddingPx * 2) / box.height,
  )

  const targetX = -box.x * scale + (stageWidth - box.width * scale) / 2
  const targetY = -box.y * scale + (stageHeight - box.height * scale) / 2

  // Tween stage to new position and scale
  new Konva.Tween({
    node: stage,
    duration: duration / 1000,
    x: targetX,
    y: targetY,
    scaleX: scale,
    scaleY: scale,
    easing: Konva.Easings.EaseInOut,
  }).play()

  // Update selection state
  canvasStore.seleccionarElemento(id)
  if (Array.isArray(canvasStore.selectedIds)) {
    canvasStore.selectedIds = [id]
  }
  if (typeof canvasStore.activeTool !== 'undefined') {
    canvasStore.activeTool = 'select'
  }

  // Manage transformer
  layer.find('Transformer').forEach((tr) => tr.destroy())
  const tr = new Konva.Transformer()
  layer.add(tr)
  tr.nodes([node])
  layer.draw()

  if (openProperties && canvasStore.toggleMostrarPropiedades) {
    canvasStore.toggleMostrarPropiedades(true)
  }
}

export default focusAndSelectById

