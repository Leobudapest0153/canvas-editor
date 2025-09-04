import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore.js'
import { CM_TO_PX } from '@/inventory-smart/utils/constants.js'

const cmToPx = (v) => v * CM_TO_PX

export function serializeSubtree(rootId, { unitMode = 'px' } = {}) {
  const store = useCanvasStore()
  const getById = store.elementoPorId?.value || store.elementoPorId
  const root = getById(rootId)
  if (!root) return null

  const toPx = unitMode === 'cm' ? cmToPx : (v) => v

  const walk = (node, parentOrigin) => {
    const rel = {
      x: (node.x || 0) - parentOrigin.x,
      y: (node.y || 0) - parentOrigin.y,
      rotation: node.rotation || 0,
    }
    const base = {
      type: node.tipo || node.type,
      name: node.nombre || node.name || node.tipo,
      dims: {
        width: toPx(node.width || 0),
        height: toPx(node.height || 0),
        depth: node.depth != null ? toPx(node.depth) : null,
      },
      position: rel,
      attrs: node.attrs || {},
      domainProps: node.domainProps || {},
      children: [],
    }
    const originForChildren = { x: node.x || 0, y: node.y || 0 }
    ;(node.hijos || node.children || []).forEach((childId) => {
      const child = typeof childId === 'string' ? getById(childId) : childId
      if (child) base.children.push(walk(child, originForChildren))
    })
    return base
  }

  const subtree = walk(root, { x: root.x || 0, y: root.y || 0 })
  subtree.position = { x: 0, y: 0, rotation: root.rotation || 0 }

  return { unitMeta: unitMode, subtree }
}

export function normalizeToRoot(serialized) {
  // serializeSubtree already normalizes; simply return same object
  return serialized
}

export function summarize(serialized) {
  const tree = serialized.subtree || serialized
  const countDepth = (node, depth = 1) => {
    let total = 0
    let maxDepth = depth
    ;(node.children || []).forEach((ch) => {
      total += 1
      const [cd, cc] = countDepth(ch, depth + 1)
      total += cc
      if (cd > maxDepth) maxDepth = cd
    })
    return [maxDepth, total]
  }
  const [depth, totalChildren] = countDepth(tree, 1)
  return {
    rootType: tree.type,
    totalChildren,
    depth,
    dims: tree.dims,
  }
}
