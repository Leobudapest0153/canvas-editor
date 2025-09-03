export function focusPrimerCampo() {
  const panel = document.querySelector('[data-properties-panel]')
  if (!panel) return
  const first = panel.querySelector('input, select, textarea')
  if (first && typeof first.focus === 'function') {
    first.focus()
  }
}
