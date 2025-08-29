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
import { useToast } from './useToast'

const { showInfo } = useToast()

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

  const findBlockingReferences = (idsSet) => {
    const refs = []
    // Buffer
    try {
      const items = buffer.getBufferItems()
      for (const it of items) {
        if (idsSet.has(it.originalId)) {
          refs.push({ type: 'buffer', label: it.elemento?.nombre || it.originalId, raw: it })
        }
      }
    } catch (e) { void e }

    // Element links: referencias / vinculos arrays si existen
    try {
      for (const el of store.elementos) {
        const arrs = []
        if (Array.isArray(el.referencias)) arrs.push({ key: 'referencias', arr: el.referencias })
        if (Array.isArray(el.vinculos)) arrs.push({ key: 'vinculos', arr: el.vinculos })
        for (const { key, arr } of arrs) {
          for (const rid of arr) {
            if (idsSet.has(rid)) {
              refs.push({ type: key, label: el.nombre || el.id, raw: { el, key, rid } })
            }
          }
        }
      }
    } catch (e) { void e }

    return refs
  }

  const cleanReferences = (idsSet) => {
    // Remove from buffer
    try {
      const items = buffer.getBufferItems()
      for (const it of items.slice()) {
        if (idsSet.has(it.originalId)) {
          buffer.removeFromBuffer(it.id)
        }
      }
    } catch (e) { void e }

    // Remove from elementos.referencias / vinculos
    try {
      for (const el of store.elementos) {
        if (Array.isArray(el.referencias)) {
          el.referencias = el.referencias.filter((rid) => !idsSet.has(rid))
        }
        if (Array.isArray(el.vinculos)) {
          el.vinculos = el.vinculos.filter((rid) => !idsSet.has(rid))
        }
      }
    } catch (e) { void e }
  }

  // Eliminación en cascada O(n), atómica, con un solo repaint y snapshot
  const deleteCascade = (idsRaiz) => {
    const roots = Array.isArray(idsRaiz) ? idsRaiz : [idsRaiz]
    if (!roots.length) return false

    // Map O(1) de id->elemento
    const idToEl = new Map()
    for (const el of store.elementos) idToEl.set(el.id, el)

    // BFS/DFS para recolectar todos los descendientes en Set
    const idsABorrar = new Set()
    const queue = [...roots]
    while (queue.length) {
      const id = queue.pop()
      if (!id || idsABorrar.has(id)) continue
      const el = idToEl.get(id)
      if (!el) continue
      idsABorrar.add(id)
      const hijos = Array.isArray(el.hijos) ? el.hijos : []
      for (let i = 0; i < hijos.length; i++) queue.push(hijos[i])
    }
    if (idsABorrar.size === 0) return false

    // Protección: si algún id está bloqueado, abortar
    for (const id of idsABorrar) {
      const el = idToEl.get(id)
      if (isLocked(el)) {
        confirmDialog.confirm({
          title: 'Acción no permitida',
          message: 'No se puede eliminar: hay elemento(s) bloqueado(s). Desbloquéelos primero.',
          confirmLabel: 'Entendido',
          cancelLabel: 'Cerrar',
        })
        return false
      }
    }

    // Suspender pintado pesado
    const prevSuspend = typeof window !== 'undefined' ? window.__suspendPaint : undefined
    if (typeof window !== 'undefined') window.__suspendPaint = true

    try {
      // Quitar referencias de padres externos y de plantas en un solo pase
      // Construir Map padreId -> hijos para acceso O(1) y Set de padres externos
      for (const id of idsABorrar) {
        const el = idToEl.get(id)
        if (!el) continue
        // Remover del padre si el padre NO se elimina
        if (el.padre && !idsABorrar.has(el.padre)) {
          const p = idToEl.get(el.padre)
          if (p && Array.isArray(p.hijos)) p.hijos = p.hijos.filter((cid) => cid !== id)
        }
        // Remover de planta si es raíz
        if (!el.padre && el.plantaId) {
          const planta = store.plantas.find((p) => p.id === el.plantaId)
          if (planta && Array.isArray(planta.elementos)) {
            planta.elementos = planta.elementos.filter((eid) => eid !== id)
          }
        }
      }

      // Reemplazar elementos con los restantes en un único splice
      const remaining = []
      for (const el of store.elementos) {
        if (!idsABorrar.has(el.id)) remaining.push(el)
      }
      store.elementos.splice(0, store.elementos.length, ...remaining)

      // Limpiar selección si apunta a eliminados
      if (store.elementoSeleccionado && idsABorrar.has(store.elementoSeleccionado)) {
        store.seleccionarElemento(null)
      }

      // Limpiar buffer por id en O(1) con Set
      try {
        const items = buffer.getBufferItems()
        for (const it of items.slice()) if (idsABorrar.has(it.originalId)) buffer.removeFromBuffer(it.id)
      } catch (e) { void e }

      // Un solo snapshot
      history.pushState('Eliminar en cascada')
    } finally {
      // Rehabilitar pintado y hacer un único batchDraw explícito si existe
      if (typeof window !== 'undefined') {
        window.__suspendPaint = !!prevSuspend
        try {
          if (window.__konvaLayer && typeof window.__konvaLayer.batchDraw === 'function') {
            window.__konvaLayer.batchDraw()
          } else if (window.__konvaStage && typeof window.__konvaStage.draw === 'function') {
            window.__konvaStage.draw()
          }
        } catch (e) { void e }
      }
    }

    return true
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

    // Construir descendientes para referencias y confirmación
    const descendants = new Set()
    collectDescendants(selectedId, descendants)

    // Referencias bloqueantes (buffer y vínculos)
    const idsToAffect = new Set([selectedId, ...descendants])
    const refs = findBlockingReferences(idsToAffect)
    if (refs.length > 0) {
      const K = refs.length
      const list = refs.slice(0, 5).map((r) => `• ${r.label}`).join('\n') + (K > 5 ? `\n… (+${K - 5} más)` : '')
      const msg = `Este elemento está siendo usado por ${K} elemento(s):\n\n${list}\n\nPara poder eliminarlo ahora, podemos quitar esas referencias por ti.\n\n¿Quieres que quitemos las referencias y continuemos con la eliminación?`
      const okRefs = await confirmDialog.confirm({
        title: 'No se puede eliminar aún',
        message: msg,
        confirmLabel: 'Quitar referencias y continuar',
        cancelLabel: 'Cancelar',
      })
      if (!okRefs) return false
      cleanReferences(idsToAffect)
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

    // Ejecutar eliminación en cascada optimizada
    const okCascade = deleteCascade([selectedId])
    if (!okCascade) return false

    // Snackbar con deshacer (5s)
    try {
    if (typeof window !== 'undefined' && window.__toasts?.show) {
      let tiempo = 5
      let interval

      const mostrarToast = () => {
        showInfo(`Elemento(s) eliminados — Deshacer (${tiempo}s)`, {
          timeout: 1000,
          cta: {
            label: 'Deshacer',
            onClick: () => {
              clearInterval(interval)
              try { history.undo() } catch (err) { void err }
            },
          },
        })
      }

      // Mostrar el primero inmediatamente
      mostrarToast()

      // Arrancar la cuenta regresiva
      interval = setInterval(() => {
        tiempo--
        if (tiempo > 0) {
          mostrarToast()
        } else {
          clearInterval(interval)
        }
      }, 1000)
    }
  } catch (e) { void e }

    return true
  }

  return { deleteSelected, deleteCascade }
}
