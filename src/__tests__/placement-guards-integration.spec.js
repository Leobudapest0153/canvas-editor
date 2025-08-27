/* eslint-env vitest, jsdom */
import { describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/composables/useCanvasStore'
import usePlacementGuards from '@/composables/usePlacementGuards'
import { CM_TO_PX } from '@/utils/constants'

describe('placement guards integration', () => {
  it('no llama saveToHistory si z stacking es inválido', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push(
      {
        id: 'a',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'pared',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        elevacion: { zBase: 0, altura: 100 },
      },
      {
        id: 'b',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'pared',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        elevacion: { zBase: 50, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const spy = vi.spyOn(store, 'saveToHistory')
    const res = guards.onDragEndGuard(store.elementos[1])
    if (res.valid) {
      store.saveToHistory('drag end')
    }
    expect(spy).not.toHaveBeenCalled()
  })
})
