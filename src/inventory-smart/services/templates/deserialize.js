import { CM_TO_PX } from '@/inventory-smart/utils/constants.js'

const pxToCm = (v) => v / CM_TO_PX

export function instantiateTemplate(template, dropPoint = { x: 0, y: 0 }, { unitMode = 'px' } = {}) {
  const fromPx = unitMode === 'cm' ? pxToCm : (v) => v
  const nodes = []

  const clone = (node, offset, parentId = null) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    const pos = {
      x: (offset.x || 0) + (node.position?.x || 0),
      y: (offset.y || 0) + (node.position?.y || 0),
      rotation: node.position?.rotation || 0,
    }
    const newNode = {
      id,
      tipo: node.type,
      nombre: node.name,
      width: fromPx(node.dims?.width || 0),
      height: fromPx(node.dims?.height || 0),
      depth: node.dims?.depth != null ? fromPx(node.dims.depth) : null,
      x: dropPoint.x + pos.x,
      y: dropPoint.y + pos.y,
      rotation: pos.rotation,
      attrs: node.attrs || {},
      domainProps: node.domainProps || {},
      hijos: [],
      padre: parentId,
    }
    nodes.push(newNode)
    ;(node.children || []).forEach((ch) => {
      const childClone = clone(ch, pos, id)
      newNode.hijos.push(childClone.id)
    })
    return newNode
  }

  clone(template.subtree, { x: 0, y: 0 })
  return nodes
}
