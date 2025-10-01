import { watch, getCurrentInstance, onUnmounted } from 'vue'
import { isPlantInfinite } from '@/inventory-smart/utils/polygonBounds'

// Automatically enable Konva node caching during drag operations.
// - On `dragstart`: calls `node.cache()` and `node.draw()`
// - On `dragend`: calls `node.clearCache()` and `node.draw()`
// Listeners attach when the ref gains a node and detach when it changes or on component unmount.
export function useCacheOnDrag(refNode) {
  /** @type {any|null} */
  let node = null

  const resolveNode = (val) => {
    if (!val) return null
    // Vue Konva components expose getNode(); underlying Konva nodes do not
    const n = val && typeof val.getNode === 'function' ? val.getNode() : val
    return n || null
  }

  const onDragStart = () => {
    try {
      if (isPlantInfinite()) return
      
      // Obtener dimensiones del nodo para ajustar el cache
      if (node && node.cache) {
        const width = typeof node.width === 'function' ? node.width() : (node.width || 0)
        const height = typeof node.height === 'function' ? node.height() : (node.height || 0)
        const area = width * height
        
        // No aplicar cache en elementos muy grandes (>500k píxeles) para evitar problemas de renderizado
        // Esto típicamente ocurre con elementos >700x700 px
        const MAX_CACHE_AREA = 500000
        
        if (area > MAX_CACHE_AREA) {
          // Para elementos grandes, simplemente no usar cache
          // El perf mode ya desactiva sombras y efectos pesados
          return
        }
        
        // Para elementos medianos (100k-500k), usar pixelRatio reducido
        const MEDIUM_AREA_THRESHOLD = 100000
        if (area > MEDIUM_AREA_THRESHOLD) {
          // Usar pixelRatio reducido para elementos medianos
          node.cache({ pixelRatio: 1 })
        } else {
          // Elementos pequeños usan cache normal
          node.cache()
        }
      }
      
      node && node.draw && node.draw()
    } catch (err) {
      // Si falla el cache, continuar sin él
      console.warn('Cache falló durante dragstart, continuando sin cache:', err)
    }
  }

  const onDragEnd = () => {
    try {
      // Limpiar cache siempre, incluso si no se aplicó (para evitar estados inconsistentes)
      if (node && node.clearCache) {
        node.clearCache()
      }
      
      // Forzar redibujado para asegurar que el elemento se renderiza correctamente
      if (node && node.draw) {
        node.draw()
      }
      
      // Si el nodo es un Group, también redibujar sus hijos
      if (node && node.getChildren && typeof node.getChildren === 'function') {
        const children = node.getChildren()
        children.forEach((child) => {
          try {
            if (child && child.clearCache) {
              child.clearCache()
            }
            if (child && child.draw) {
              child.draw()
            }
          } catch (err) {
            // Ignorar errores individuales de hijos
          }
        })
      }
      
      // Obtener el layer padre y forzar un redibujado completo
      try {
        const layer = node?.getLayer?.()
        if (layer) {
          layer.clearCache?.()
          layer.batchDraw?.()
        }
      } catch (err) {
        // Ignorar si no se puede obtener el layer
      }
    } catch (err) {
      console.warn('Error al limpiar cache en dragend:', err)
    }
  }

  const detach = () => {
    try {
      if (node) {
        node.off && node.off('dragstart.cache', onDragStart)
        node.off && node.off('dragend.cache', onDragEnd)
      }
    } catch {
      // ignore
    } finally {
      node = null
    }
  }

  const attach = (next) => {
    const real = resolveNode(next)
    if (real === node) return
    detach()
    if (!real) return
    node = real
    try {
      node.on && node.on('dragstart.cache', onDragStart)
      node.on && node.on('dragend.cache', onDragEnd)
    } catch {
      // ignore
    }
  }

  // Watch the ref for node availability/changes
  const stop = watch(
    () => refNode.value,
    (val) => {
      if (!val) {
        detach()
      } else {
        attach(val)
      }
    },
    { immediate: true }
  )

  // If inside a component setup, ensure cleanup on unmount
  const inst = getCurrentInstance()
  if (inst) {
    onUnmounted(() => {
      try { stop && stop() } catch { /* ignore */ }
      detach()
    })
  }

  return { attach, detach }
}
