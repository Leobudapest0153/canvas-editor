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
import { useConfirmDialog } from './useConfirmDialog'

export function useDeleteElement() {
  const store = useCanvasStore()
  const history = useCanvasHistory()
  const buffer = useCanvasBuffer()
  const confirmDialog = useConfirmDialog()

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

  const isProtected = (el) => {
    // Elementos protegidos: tipo 'suelo' o marcados como raíz de planta
    return el?.tipo === 'suelo' || el?.esRaizPlanta === true
  }

  const isLocked = (el) => {
    return el?.locked === true || el?.bloqueado === true
  }

  const deleteSelected = async ({ withConfirm = true } = {}) => {
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

    // Protección: impedir borrar elementos protegidos
    if (isProtected(selected)) {
      await confirmDialog.confirm({
        title: 'Acción no permitida',
        message: 'Este elemento está protegido y no puede eliminarse.',
        confirmLabel: 'Entendido',
        cancelLabel: 'Cerrar',
      })
      return false
    }

    console.log(isLocked(selected), 'verificar si esta bloqueado')

    // Bloqueo: impedir borrar elementos bloqueados (selección)
    if (isLocked(selected)) {
      await confirmDialog.confirm({
        title: 'Acción no permitida',
        message: 'No se puede eliminar: hay elemento(s) bloqueado(s). Desbloquéelos primero.',
        confirmLabel: 'Entendido',
        cancelLabel: 'Cerrar',
      })
      return false
    }

    // Calcular hijos en cascada
    const descendants = new Set()
    collectDescendants(selectedId, descendants)

    // Bloqueo: impedir borrar si algún descendiente está bloqueado
    for (const id of descendants) {
      const el = store.elementoPorId(id)
      if (isLocked(el)) {
        if (typeof window !== 'undefined' && window.__toasts?.show) {
          window.__toasts.show('No se puede eliminar: hay elemento(s) bloqueado(s). Desbloquéelos primero.', { type: 'warn' })
        }
        await confirmDialog.confirm({
          title: 'Acción no permitida',
          message: 'No se puede eliminar: hay elemento(s) bloqueado(s). Desbloquéelos primero.',
          confirmLabel: 'Entendido',
          cancelLabel: 'Cerrar',
        })
        return false
      }
    }

    // Confirmación siempre que se solicite
    if (withConfirm) {
      const msg = descendants.size > 0
        ? `Se eliminará también ${descendants.size} elemento(s) dentro`
        : '¿Seguro que deseas eliminar este elemento?'
      const ok = await confirmDialog.confirm({
        title: 'Eliminar elemento',
        message: msg,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
      })
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

    // 7) Snackbar con opción de deshacer (5s)
    try {
      if (typeof window !== 'undefined' && window.__toasts?.show) {
        window.__toasts.show('Elemento(s) eliminados — Deshacer (5s)', {
          type: 'info',
          timeout: 5000,
          cta: {
            label: 'Deshacer',
            onClick: () => {
              try { history.undo() } catch (e) { /* noop */ }
            },
          },
        })
      }
    } catch (e) { void e }

    return true
  }

  return { deleteSelected }
}
