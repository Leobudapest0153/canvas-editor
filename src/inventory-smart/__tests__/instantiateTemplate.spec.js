import { describe, it, expect } from 'vitest'
import { instantiateTemplate } from '@/inventory-smart/services/templates/deserialize.js'

describe('instantiateTemplate', () => {
  it('clona con nuevos ids y offsets', () => {
    const tpl = {
      unitMeta: 'px',
      subtree: {
        type: 'elementos',
        name: 'Root',
        dims: { width: 10, height: 10 },
        position: { x: 0, y: 0 },
        children: [
          {
            type: 'contenedores',
            name: 'Child',
            dims: { width: 5, height: 5 },
            position: { x: 5, y: 5 },
            children: [],
          },
        ],
      },
    }
    const nodes = instantiateTemplate(tpl, { x: 100, y: 50 }, { unitMode: 'px' })
    expect(nodes.length).toBe(2)
    const root = nodes[0]
    const child = nodes[1]
    expect(root.id).not.toBe(child.id)
    expect(root.x).toBe(100)
    expect(child.padre).toBe(root.id)
    expect(child.x).toBe(105)
    expect(child.y).toBe(55)
  })
})
