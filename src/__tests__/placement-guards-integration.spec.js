import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/composables/usePlacementGuards', () => ({
  usePlacementGuards: () => ({
    onDragMoveGuard: vi.fn(() => ({ valid: true })),
    onDragEndGuard: vi.fn(() => ({ valid: false, reason: 'nope' })),
    onTransformEndGuard: vi.fn(() => ({ valid: true })),
  }),
}))

import CanvasView from '@/components/CanvasView.vue'
import { useCanvasStore } from '@/composables/useCanvasStore'

describe('placement guards integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('invalid drop prevents saveToHistory', () => {
    const store = useCanvasStore()
    store.elementos = [
      { id: 'el1', plantaId: 'planta_1', tipo: 'elementos', width: 10, height: 10, x: 0, y: 0 },
    ]
    const spy = vi.spyOn(store, 'saveToHistory')

    const wrapper = mount(CanvasView)

    wrapper.vm.innerSessions.set('el1', {
      session: {
        toLocal: (p) => p,
        dragBoundFuncLocal: (p) => p,
        toWorld: (p) => p,
        finalizeLocal: (p) => p,
      },
      parent: null,
      initial: { x: 0, y: 0 },
    })

    const shape = {
      _pos: { x: 10, y: 10 },
      position(pos) {
        if (pos) this._pos = pos
        return this._pos
      },
    }

    wrapper.vm.onShapeDragEnd({ target: shape }, { id: 'el1' })

    expect(spy).not.toHaveBeenCalled()
  })
})
