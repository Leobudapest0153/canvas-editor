import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { serializeSubtree, summarize } from '@/inventory-smart/services/templates/serialize.js'

describe('serializeSubtree', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCanvasStore()
    store.agregarElemento({
      id: 'root',
      tipo: 'elementos',
      nombre: 'Root',
      width: 100,
      height: 50,
      x: 10,
      y: 20,
      hijos: ['child'],
    })
    store.agregarElemento({
      id: 'child',
      tipo: 'contenedores',
      nombre: 'Child',
      width: 20,
      height: 20,
      x: 30,
      y: 40,
      padre: 'root',
      hijos: [],
    })
  })

  it('serializa subárbol simple', () => {
    const data = serializeSubtree('root', { unitMode: 'px' })
    expect(data.unitMeta).toBe('px')
    expect(data.subtree.children.length).toBe(1)
    const summary = summarize(data)
    expect(summary.rootType).toBe('elementos')
    expect(summary.totalChildren).toBe(1)
  })
})
