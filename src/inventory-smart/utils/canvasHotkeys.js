
/**
 * Handles canvas-level hotkeys for toolbar actions.
 * @param {KeyboardEvent} e
 * @param {Object} ctx
 * @param {import('vue').Ref<boolean>} ctx.dragMode - current drag mode ref
 * @param {Function} ctx.toggleDragMode
 * @param {Function} ctx.toggleSnapping
 * @param {Function} ctx.toggleLock
 */
export function handleCanvasHotkeys(e, { dragMode, toggleDragMode, toggleSnapping, toggleLock }) {
    // Solo procesar si no estamos en un input
  if (e.target.matches('input, textarea, select, [contenteditable]')) {
    return
  }
  if (!e) return
  const key = e.key.toLowerCase()
  if (key === 'd') {
    if (dragMode.value) toggleDragMode()
  } else if (key === 'e') {
    if (!dragMode.value) toggleDragMode()
  } else if (key === 's') {
    toggleSnapping()
  } else if (key === 'l') {
    toggleLock()
  }
}
