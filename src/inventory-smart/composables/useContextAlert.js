/**
 * useContextAlert.js
 *
 * Composable para gestionar alertas informativas del contexto de navegación.
 * Muestra mensajes amigables indicando al usuario en qué nivel se encuentra.
 */

import { ref, computed, watch } from 'vue'
import { useCanvasStore } from './useCanvasStore'

export function useContextAlert() {
  const canvasStore = useCanvasStore()
  const showAlert = ref(false)
  const alertMessage = ref('')
  const alertDuration = ref(10000) // 10 segundos por defecto

  // Tiempo de espera antes de mostrar la alerta (para evitar mostrarla en carga inicial)
  let timeoutId = null
  let hideTimeoutId = null

  /**
   * Genera un mensaje amigable según el tipo de contexto y el elemento actual
   */
  const generateContextMessage = (contexto) => {
    const { tipo, id, path } = contexto

    // Si no hay path válido, intentar construirlo desde el store
    let realPath = path
    if (!realPath || realPath.length === 0) {
      realPath = canvasStore.contextoNavegacion.path || []
    }

    // Contexto de planta principal
    if (tipo === 'plantas') {
      const planta = canvasStore.plantaPorId(id)
      if (!planta) return null

      const vista = canvasStore.vistaActiva
      const vistaTexto = vista === 'XY' ? 'Vista aérea (desde arriba)' : 'Vista frontal'

      return {
        message: `Planta: ${planta.nombre}`,
        subtext: `${vistaTexto} · Aquí puedes organizar espacios, cuartos y pasillos`,
        icon: '🏢'
      }
    }

    // Navegación dentro de un cuarto
    if (tipo === 'cuartos') {
      const cuarto = canvasStore.elementoPorId(id)
      if (!cuarto) return null

      const plantaNombre = realPath[0]?.nombre || 'planta'
      const vista = canvasStore.vistaActiva
      const vistaTexto = vista === 'XY' ? 'Vista aérea' : 'Vista frontal'

      return {
        message: `Interior: ${cuarto.nombre}`,
        subtext: `${vistaTexto} · Espacio dentro de ${plantaNombre} · Organiza sus pisos internos`,
        icon: '🚪'
      }
    }

    // Navegación dentro de un piso
    if (tipo === 'pisos') {
      const piso = canvasStore.elementoPorId(id)
      if (!piso) return null

      const parenteCuarto = realPath.find(p => p.tipo === 'cuartos')
      const cuartoNombre = parenteCuarto?.nombre || 'cuarto'
      const vista = canvasStore.vistaActiva
      const vistaTexto = vista === 'XY' ? 'Vista aérea (desde arriba)' : 'Vista frontal'

      return {
        message: `Piso: ${piso.nombre}`,
        subtext: `${vistaTexto} · Dentro de ${cuartoNombre} · Coloca elementos como estantes o cajas`,
        icon: '📦'
      }
    }

    // Navegación dentro de un elemento
    if (tipo === 'elementos') {
      const elemento = canvasStore.elementoPorId(id)
      if (!elemento) return null

      // Determinar el contexto padre
      let contextoTexto = ''
      if (realPath.length >= 2) {
        const padre = realPath[realPath.length - 2]
        if (padre.tipo === 'cuartos') {
          contextoTexto = `dentro de ${padre.nombre}`
        } else if (padre.tipo === 'pisos') {
          contextoTexto = `en el ${padre.nombre}`
        } else if (padre.tipo === 'plantas') {
          contextoTexto = `en ${padre.nombre}`
        }
      }

      const vista = canvasStore.vistaActiva
      const vistaTexto = vista === 'XY' ? 'Vista aérea' : 'Vista frontal (de frente)'

      return {
        message: `Interior: ${elemento.nombre}`,
        subtext: `${vistaTexto} · Ubicado ${contextoTexto} · Organiza su contenido`,
        icon: '📐'
      }
    }

    // Navegación dentro de un contenedor
    if (tipo === 'contenedores') {
      const contenedor = canvasStore.elementoPorId(id)
      if (!contenedor) return null

      const padreElemento = realPath.find(p => p.tipo === 'elementos')
      const elementoNombre = padreElemento?.nombre || 'elemento padre'
      const vista = canvasStore.vistaActiva
      const vistaTexto = vista === 'XY' ? 'Vista aérea' : 'Vista frontal'

      return {
        message: `Contenedor: ${contenedor.nombre}`,
        subtext: `${vistaTexto} · Pertenece a ${elementoNombre} · Administra su distribución`,
        icon: '🗃️'
      }
    }

    // Navegación dentro de un pasillo
    if (tipo === 'pasillos') {
      const pasillo = canvasStore.elementoPorId(id)
      if (!pasillo) return null

      const plantaNombre = realPath[0]?.nombre || 'planta'
      const vista = canvasStore.vistaActiva
      const vistaTexto = vista === 'XY' ? 'Vista aérea' : 'Vista frontal'

      return {
        message: `Pasillo: ${pasillo.nombre}`,
        subtext: `${vistaTexto} · En ${plantaNombre} · Gestiona accesos y circulación`,
        icon: '🛤️'
      }
    }

    return null
  }

  /**
   * Muestra la alerta con el mensaje del contexto actual
   */
  const displayAlert = (duration = 10000) => {
    const contexto = canvasStore.contextoNavegacion
    const messageData = generateContextMessage(contexto)

    if (!messageData) {
      showAlert.value = false
      return
    }

    alertMessage.value = messageData
    alertDuration.value = duration
    showAlert.value = true

    // Ocultar automáticamente después de la duración
    if (hideTimeoutId) clearTimeout(hideTimeoutId)
    hideTimeoutId = setTimeout(() => {
      hideAlert()
    }, duration)
  }

  /**
   * Oculta la alerta
   */
  const hideAlert = () => {
    showAlert.value = false
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId)
      hideTimeoutId = null
    }
  }

  /**
   * Detecta cambios en el contexto de navegación y muestra la alerta
   */
  watch(
    () => [canvasStore.contextoNavegacion.tipo, canvasStore.contextoNavegacion.id],
    ([nuevoTipo, nuevoId], [anteriorTipo, anteriorId]) => {
      // Evitar mostrar alerta en la carga inicial o si no cambió realmente
      if (!anteriorTipo || (nuevoTipo === anteriorTipo && nuevoId === anteriorId)) {
        return
      }

      // Limpiar timeout anterior si existe
      if (timeoutId) clearTimeout(timeoutId)

      // Pequeño delay para que la transición del canvas termine
      timeoutId = setTimeout(() => {
        displayAlert()
      }, 300)
    }
  )

  return {
    showAlert,
    alertMessage,
    alertDuration,
    displayAlert,
    hideAlert
  }
}
