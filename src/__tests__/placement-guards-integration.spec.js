/* eslint-env vitest, jsdom */
import { describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/composables/useCanvasStore'
const showError = vi.fn()
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ showError }) }))
import usePlacementGuards from '@/composables/usePlacementGuards'
import { CM_TO_PX } from '@/utils/constants'
import { errorsPlacement } from '@/utils/errorsPlacement'

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

  it('reviertes y no guardas si altura excede en drag end', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 250, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 10, y: 10, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('a', { x: 0, y: 0 })
    expect(spySave).not.toHaveBeenCalled()
    expect(showError).toHaveBeenCalledWith(errorsPlacement.HEIGHT_EXCEEDS_WAREHOUSE)
  })

  it('permite drag end válido dentro de altura', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 100, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 10, y: 10, start: { x: 0, y: 0 } })
    if (res.valid) {
      store.saveToHistory('drag end')
    }
    expect(spySave).toHaveBeenCalled()
  })

  it('reviertes resize cuando altura excede', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 250, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    const res = guards.onTransformEndGuard({ ...store.elementos[0], width: 20, height: 20, start: { x: 0, y: 0, width: 10, height: 10 } })
    expect(res.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('a', { x: 0, y: 0, width: 10, height: 10 })
    expect(showError).toHaveBeenCalledWith(errorsPlacement.HEIGHT_EXCEEDS_WAREHOUSE)
  })

  it('permite resize válido dentro de altura', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'pared',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      elevacion: { zBase: 100, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const res = guards.onTransformEndGuard({ ...store.elementos[0], width: 20, height: 20, start: { x: 0, y: 0, width: 10, height: 10 } })
    expect(res.valid).toBe(true)
  })
})
