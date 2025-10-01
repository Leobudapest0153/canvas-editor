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

    // Limpia por eliminación
    if (store.cambiosNoAplicados) {
      store.setCambiosNoAplicados(false);
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

    // Verificar que el uso esté en 0 antes de eliminar
    const childElementsWithUsage = () => {
      const parent = store.elementos.find(el => el.id== selectedId);


      if (parent.categoria === 'contenedores' && parent.uso && (parent.uso.volumen > 0 || parent.uso.peso > 0)) {
        return true;
      }

      if (!parent || !parent.hijos || parent.hijos.length === 0) {
        return false;
      }

      return parent.hijos.some(hijoId => {
        const hijo = store.elementos.find(el => el.id === hijoId);

        if (!hijo) {
          return false;
        }

        const isContainer = hijo.categoria === 'contenedores';
        const hasUsage = hijo.uso && (hijo?.uso?.volumen > 0) || (hijo?.uso?.peso > 0);

        return isContainer && hasUsage;
      });
    };

    if (childElementsWithUsage()) {
      confirmDialog.open({
        title: 'Acción no permitida',
        message: 'El elemento ya tiene productos ingresados. No se puede eliminar.',
        confirmLabel: 'Entendido',
        background: '#568fec',
        color: '#FFFFFF',
        border: '#568fec'
      });
      return false
    }


    // Confirmación siempre que se solicite
    if (withConfirm) {
      // Construir lista para modal descriptivo
      const idsLista = [selectedId, ...Array.from(descendants)]
      const elementosLista = idsLista
        .map(id => store.elementoPorId(id))
        .filter(Boolean)
      const LIMIT = 12
      const lines = elementosLista.slice(0, LIMIT).map(el => `• ${el.nombre || el.id}`)
      const extra = elementosLista.length > LIMIT ? `\n… (+${elementosLista.length - LIMIT} más)` : ''
      const cabecera = elementosLista.length > 1
        ? `Se eliminarán los siguientes elementos:`
        : 'Se eliminará el elemento:'
      const msg = `${cabecera}\n\n${lines.join('\n')}${extra}\n\n¿Desea continuar?`
      const ok = await confirmDialog.confirm({
        title: `Eliminar elemento${elementosLista.length > 1 ? 's' : ''}`,
        message: msg,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
      })
      if (!ok) return false
    }

    // Ejecutar eliminación en cascada optimizada
    const okCascade = deleteCascade([selectedId])
    if (!okCascade) return false

    // Snackbar con deshacer (5s) - versión reactiva
    try {
      if (typeof window !== 'undefined') {
        let tiempo = 5
        let interval
        let toastCerrado = false
        let toastId = null

        // Crear una función que genera el mensaje
        const generarMensaje = () => `Elemento(s) eliminados — Deshacer (${tiempo}s)`

        // Crear el toast inicial
        toastId = showInfo(generarMensaje(), {
          timeout: 6000, // Un poco más que nuestra cuenta regresiva
          onDismiss: () => {
            toastCerrado = true
            if (interval) {
              clearInterval(interval)
              interval = null
            }
          },
          cta: {
            label: 'Deshacer',
            onClick: () => {
              toastCerrado = true
              if (interval) {
                clearInterval(interval)
                interval = null
              }
              try { history.undo() } catch (err) { void err }
            },
          },
        })

        // Actualizar el countdown
        interval = setInterval(() => {
          if (toastCerrado) {
            clearInterval(interval)
            interval = null
            return
          }

          tiempo--

          if (tiempo <= 0) {
            clearInterval(interval)
            interval = null
            return
          }

          // Buscar el toast en el DOM usando diferentes selectores posibles
          try {
            const selectors = [
              '[data-toast-message]',
              '.vue-notification',
              '.notification',
              '.toast',
              '[role="alert"]'
            ]

            let toastElement = null
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector)
              const found = Array.from(elements).find(el =>
                el.textContent && el.textContent.includes('Elemento(s) eliminados')
              )
              if (found) {
                toastElement = found
                break
              }
            }

            if (toastElement) {
              // Intentar actualizar diferentes tipos de elementos de texto
              const textSelectors = [
                '[data-toast-text]',
                '.notification-content',
                '.toast-message',
                '.message',
                'div',
                'span',
                'p'
              ]

              let updated = false
              for (const textSelector of textSelectors) {
                const textEl = toastElement.querySelector(textSelector)
                if (textEl && textEl.textContent && textEl.textContent.includes('Elemento(s) eliminados')) {
                  textEl.textContent = generarMensaje()
                  updated = true
                  break
                }
              }

              // Si no encontramos un elemento hijo, actualizar directamente
              if (!updated && toastElement.textContent && toastElement.textContent.includes('Elemento(s) eliminados')) {
                // Preservar el botón de deshacer si existe
                const actionButton = toastElement.querySelector('button')
                toastElement.textContent = generarMensaje()
                if (actionButton && actionButton.textContent === 'Deshacer') {
                  toastElement.appendChild(actionButton)
                }
              }
            }
          } catch (e) {
            // Fallback silencioso
            void e
          }
        }, 1000)
      }
    } catch (e) { void e }

    return true
  }

  // Utilidad: compacta hijos de un padre apilado basándose en su posición real (y).
// - Aplica solo si parentEl.tipo es 'cuartos' o 'elementos'.
// - Ignora 'visible'.
// - Reescribe y comenzando en 0, y reordena parentEl.hijos con el mismo orden resultante.
const compactStackChildrenByPosition = (parentEl, storeRef) => {
  if (!parentEl) return
  if (parentEl.tipo !== 'cuartos' && parentEl.tipo !== 'elementos') return

  const hijosIds = Array.isArray(parentEl.hijos) ? parentEl.hijos.slice() : []
  if (hijosIds.length === 0) return

  const children = hijosIds
    .map((id) => storeRef.elementoPorId(id))
    .filter(Boolean)

  if (children.length === 0) return

  // 1) Orden real: de arriba a abajo (y ascendente)
  children.sort((a, b) => (Number(a.y) || 0) - (Number(b.y) || 0))

  // 2) Compactar desde arriba (top = 0) sin huecos
  let runningTopY = 0
  const tops = [] // guardamos las y calculadas desde arriba
  let totalStackHeight = 0
  for (const child of children) {
    const h = Number(child.height) || 0
    tops.push(runningTopY)
    runningTopY += h
    totalStackHeight += h
  }

  // 3) Desplazar el bloque para pegarlo a la base del padre:
  //    base del padre = parent.height
  const H = Number(parentEl.height) || 0
  const offset = H - totalStackHeight

  // 4) Asignar y definitivas y sincronizar el orden lógico
  for (let i = 0; i < children.length; i++) {
    children[i].y = tops[i] + offset
  }
  parentEl.hijos = children.map(c => c.id)
}

// Nuevo método: elimina (con la cascada existente) y luego compacta hermanos si aplica.
// - Acepta id; si no viene, usa el seleccionado.
// - Reutiliza validaciones/confirmaciones de deleteSelected para no duplicar lógica.
const deleteAndCompact = async ({ id = null, withConfirm = true } = {}) => {
  // Identificar target (id o seleccionado)
  const targetId = id ?? store.elementoSeleccionado
  if (!targetId) return false

  const target = store.elementoPorId(targetId)
  if (!target) {
    if (!id) store.seleccionarElemento(null)
    return false
  }

  // Reutilizamos toda la lógica de deleteSelected, salvo la llamada final:
  // 1) bloquear por drag
  if (typeof window !== 'undefined' && window.__dvCanvasDragActive) return false

  // 2) limpiar cambios no aplicados
  if (store.cambiosNoAplicados) store.setCambiosNoAplicados(false)

  // 3) protegidos
  if (target?.tipo === 'suelo' || target?.esRaizPlanta === true) {
    await confirmDialog.confirm({
      title: 'Acción no permitida',
      message: 'Este elemento está protegido y no puede eliminarse.',
      confirmLabel: 'Entendido',
      cancelLabel: 'Cerrar',
    })
    return false
  }

  // 4) locked
  if (target?.locked === true || target?.bloqueado === true) {
    await confirmDialog.confirm({
      title: 'Acción no permitida',
      message: 'No se puede eliminar: hay elemento(s) bloqueado(s). Desbloquéelos primero.',
      confirmLabel: 'Entendido',
      cancelLabel: 'Cerrar',
    })
    return false
  }

  // 5) descendientes y referencias
  const descendants = new Set()
  ;(function collect(rootId, acc) {
    const el = store.elementoPorId(rootId)
    if (!el || !Array.isArray(el.hijos) || el.hijos.length === 0) return
    for (const childId of el.hijos) {
      if (!acc.has(childId)) {
        acc.add(childId)
        collect(childId, acc)
      }
    }
  })(targetId, descendants)

  const idsToAffect = new Set([targetId, ...descendants])
  const refs = (() => {
    const res = []
    try {
      const items = buffer.getBufferItems()
      for (const it of items) if (idsToAffect.has(it.originalId)) res.push({ type: 'buffer', label: it.elemento?.nombre || it.originalId })
    } catch (e) { void e }
    try {
      for (const el of store.elementos) {
        if (Array.isArray(el.referencias)) {
          for (const rid of el.referencias) if (idsToAffect.has(rid)) res.push({ type: 'referencias', label: el.nombre || el.id })
        }
        if (Array.isArray(el.vinculos)) {
          for (const rid of el.vinculos) if (idsToAffect.has(rid)) res.push({ type: 'vinculos', label: el.nombre || el.id })
        }
      }
    } catch (e) { void e }
    return res
  })()

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
    // limpiar referencias
    try {
      const items = buffer.getBufferItems()
      for (const it of items.slice()) if (idsToAffect.has(it.originalId)) buffer.removeFromBuffer(it.id)
    } catch (e) { void e }
    try {
      for (const el of store.elementos) {
        if (Array.isArray(el.referencias)) el.referencias = el.referencias.filter(rid => !idsToAffect.has(rid))
        if (Array.isArray(el.vinculos)) el.vinculos = el.vinculos.filter(rid => !idsToAffect.has(rid))
      }
    } catch (e) { void e }
  }

  // 6) Validar uso en contenedores (igual a deleteSelected)
  const hasUsage = (() => {
    const parent = store.elementos.find(el => el.id === targetId)
    if (parent?.categoria === 'contenedores' && parent.uso && ((parent.uso.volumen ?? 0) > 0 || (parent.uso.peso ?? 0) > 0)) return true
    if (!parent || !parent.hijos || parent.hijos.length === 0) return false
    return parent.hijos.some(hijoId => {
      const hijo = store.elementos.find(el => el.id === hijoId)
      if (!hijo) return false
      const isContainer = hijo.categoria === 'contenedores'
      const has = hijo.uso && ((hijo?.uso?.volumen ?? 0) > 0 || (hijo?.uso?.peso ?? 0) > 0)
      return isContainer && has
    })
  })()

  if (hasUsage) {
    confirmDialog.open({
      title: 'Acción no permitida',
      message: 'El elemento ya tiene productos ingresados. No se puede eliminar.',
      confirmLabel: 'Entendido',
      background: '#568fec',
      color: '#FFFFFF',
      border: '#568fec'
    })
    return false
  }

  // 7) Confirmación
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

  // Guardar referencia al padre (si existe) ANTES de eliminar
  const parentBefore = target.padre ? store.elementoPorId(target.padre) : null

  // 8) Eliminar en cascada (con snapshot y repaint internos)
  const okCascade = deleteCascade([targetId])
  if (!okCascade) return false

  // 9) Compactar si el padre sobrevivió y es apilador (cuartos o elementos)
  if (parentBefore) {
    // Suspender pintura para no parpadear, pero no pushear otro snapshot
    const prevSuspend = typeof window !== 'undefined' ? window.__suspendPaint : undefined
    if (typeof window !== 'undefined') window.__suspendPaint = true
    try {
      const parentLive = store.elementoPorId(parentBefore.id)
      if (parentLive && (parentLive.tipo === 'cuartos' || parentLive.tipo === 'elementos')) {
        compactStackChildrenByPosition(parentLive, store)
      }
    } finally {
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
  }

  // 10) Toast con deshacer (no añadimos snapshot extra)
  try {
    if (typeof window !== 'undefined') {
      let tiempo = 5
      let interval
      let toastCerrado = false
      const generarMensaje = () => `Elemento(s) eliminados — Deshacer (${tiempo}s)`
      showInfo(generarMensaje(), {
        timeout: 6000,
        onDismiss: () => {
          toastCerrado = true
          if (interval) { clearInterval(interval); interval = null }
        },
        cta: {
          label: 'Deshacer',
          onClick: () => {
            toastCerrado = true
            if (interval) { clearInterval(interval); interval = null }
            try { history.undo() } catch (err) { void err }
          },
        },
      })
      interval = setInterval(() => {
        if (toastCerrado) { clearInterval(interval); interval = null; return }
        tiempo--
        if (tiempo <= 0) { clearInterval(interval); interval = null; return }
      }, 1000)
    }
  } catch (e) { void e }

  return true
}

  return { deleteSelected, deleteCascade, deleteAndCompact }
}
