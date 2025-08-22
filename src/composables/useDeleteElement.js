// filepath: c:\xampp\htdocs\proyectos-inventario\dv-canvas-editor\src\composables\useDeleteElement.js
/**
 * useDeleteElement.js
 *
 * Provee deleteSelected({ withConfirm = true }) para eliminar el elemento seleccionado
 * con soporte de confirmación, cascada para hijos y un único snapshot en historial.
 */
import { useCanvasStore } from './useCanvasStore'
import { useCanvasHistory } from './useCanvasHistory'
import { useCanvasBuffer } from './useCanvasBuffer'

export function useDeleteElement() {
  const store = useCanvasStore()
  const history = useCanvasHistory()
  const buffer = useCanvasBuffer()

  const collectDescendants = (rootId, accSet) => {
    const el = store.elementoPorId(rootId)
    if (!el || !Array.isArray(el.hijos) || el.hijos.length === 0) return
    for (const childId of el.hijos) {
      if (!accSet.has(childId)) {
        accSet.add(childId)
        collectDescendants(childId, accSet)
      }
    }
  }

  const deleteSelected = ({ withConfirm = true } = {}) => {
    // No eliminar si hay drag global activo
    if (typeof window !== 'undefined' && window.__dvCanvasDragActive) return false

    const selectedId = store.elementoSeleccionado
    if (!selectedId) return false

    const selected = store.elementoPorId(selectedId)
    if (!selected) {
      // Limpia selección inconsistente
      store.seleccionarElemento(null)
      return false
    }

    // Calcular hijos en cascada
    const descendants = new Set()
    collectDescendants(selectedId, descendants)

    // Confirmación si hay hijos/descendientes
    if (withConfirm && descendants.size > 0) {
      const msg = `Se eliminará también ${descendants.size} elemento(s) dentro`
      const ok = typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(msg) : true
      if (!ok) return false
    }

    // IDs a eliminar (seleccionado + todos sus descendientes)
    const idsToDelete = new Set([selectedId, ...descendants])

    // 1) Quitar referencias desde padres que NO se eliminan
    for (const id of idsToDelete) {
      const el = store.elementoPorId(id)
      if (!el) continue
      if (el.padre && !idsToDelete.has(el.padre)) {
        const parent = store.elementoPorId(el.padre)
        if (parent && Array.isArray(parent.hijos)) {
          const idx = parent.hijos.indexOf(id)
          if (idx !== -1) parent.hijos.splice(idx, 1)
        }
      }
    }

    // 2) Quitar referencias desde plantas (elementos raíz)
    for (const id of idsToDelete) {
      const el = store.elementoPorId(id)
      if (!el) continue
      if (!el.padre && el.plantaId) {
        const planta = store.plantaPorId(el.plantaId)
        if (planta && Array.isArray(planta.elementos)) {
          const i = planta.elementos.indexOf(id)
          if (i !== -1) planta.elementos.splice(i, 1)
        }
      }
    }

    // 3) Filtrar elementos del store de una sola vez
    const remaining = store.elementos.filter((e) => !idsToDelete.has(e.id))
    store.elementos.splice(0, store.elementos.length, ...remaining)

    // 4) Limpiar selección si hace referencia a eliminados
    if (store.elementoSeleccionado && idsToDelete.has(store.elementoSeleccionado)) {
      store.seleccionarElemento(null)
    }

    // 5) Limpiar buffer si hace referencia a elementos eliminados
    try {
      const items = buffer.getBufferItems()
      if (Array.isArray(items)) {
        for (const item of items.slice()) {
          if (idsToDelete.has(item.originalId)) {
            buffer.removeFromBuffer(item.id)
          }
        }
      }
    } catch (e) { void e }

    // 6) Empujar un único snapshot al historial
    history.pushState('Eliminar elemento')

    return true
  }

  return { deleteSelected }
}
