import { watch, getCurrentInstance, onUnmounted } from 'vue'

// Automatically enable Konva node caching during drag operations.
// - On `dragstart`: calls `node.cache()` and `node.draw()`
// - On `dragend`: calls `node.clearCache()` and `node.draw()`
// Listeners attach when the ref gains a node and detach when it changes or on component unmount.
export function useCacheOnDrag(refNode, options = {}) {
  const isCachingEnabled = () => {
    try {
      if (typeof options.isEnabled === 'function') {
        return options.isEnabled() !== false
      }
      if (Object.prototype.hasOwnProperty.call(options, 'isEnabled')) {
        return !!options.isEnabled
      }
    } catch {
      /* ignore */
    }
    return true
  }

  /** @type {any|null} */
  let node = null

  const resolveNode = (val) => {
    if (!val) return null
    // Vue Konva components expose getNode(); underlying Konva nodes do not
    const n = val && typeof val.getNode === 'function' ? val.getNode() : val
    return n || null
  }

  const onDragStart = () => {
    if (!isCachingEnabled()) return
    try {
      node && node.cache && node.cache()
      node && node.draw && node.draw()
    } catch {
      // ignore
    }
  }

  const onDragEnd = () => {
    if (!isCachingEnabled()) return
    try {
      node && node.clearCache && node.clearCache()
      node && node.draw && node.draw()
    } catch {
      // ignore
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
