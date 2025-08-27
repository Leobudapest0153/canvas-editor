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
  it('drag de elemento Suelo no dispara ZBASE_REQUIRED', () => {
    setActivePinia(createPinia())
    const store = useCanvasStore()
    store.elementos.push({
      id: 'a',
      plantaId: 'planta_1',
      tipo: 'elementos',
      ubicacion: 'suelo',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('drag de elemento Pared con zBase válido no dispara error', () => {
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
      elevacion: { zBase: 10, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('candidate sin zBase pero con element.zBase válido pasa', () => {
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
      elevacion: { zBase: 10, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    showError.mockClear()
    const res = guards.onDragEndGuard({
      ...store.elementos[0],
      elevacion: { altura: 100 },
      x: 5,
      y: 5,
      start: { x: 0, y: 0 },
    })
    expect(res.valid).toBe(true)
    expect(showError).not.toHaveBeenCalled()
  })

  it('falla cuando zBase <= 0', () => {
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
      elevacion: { zBase: 0, altura: 100 },
    })
    const guards = usePlacementGuards({ store, alturaBodega: 300, CM_TO_PX })
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    showError.mockClear()
    const res = guards.onDragEndGuard({ ...store.elementos[0], x: 5, y: 5, start: { x: 0, y: 0 } })
    expect(res.valid).toBe(false)
    expect(res.code).toBe('ZBASE_REQUIRED')
    expect(spyUpdate).toHaveBeenCalledWith('a', { x: 0, y: 0 })
    expect(showError).toHaveBeenCalledWith(errorsPlacement.ZBASE_REQUIRED)
  })
  it('reviertes y no guardas cuando hay colisión vertical', () => {
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
        x: 20,
        y: 0,
        width: 10,
        height: 10,
        elevacion: { zBase: 50, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    showError.mockClear()
    store.elementos[1].x = 0
    const res = guards.onDragEndGuard({ ...store.elementos[1], start: { x: 20, y: 0 } })
    expect(res.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('b', { x: 20, y: 0 })
    expect(spySave).not.toHaveBeenCalled()
    expect(showError).toHaveBeenCalledWith(errorsPlacement.Z_STACKING_COLLISION)
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

  it('apilar estantes permite tocar pero no solapar', () => {
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
        x: 20,
        y: 0,
        width: 10,
        height: 10,
        elevacion: { zBase: 100, altura: 100 },
      },
      {
        id: 'c',
        plantaId: 'planta_1',
        tipo: 'elementos',
        ubicacion: 'pared',
        x: 40,
        y: 0,
        width: 10,
        height: 10,
        elevacion: { zBase: 150, altura: 100 },
      },
    )
    const guards = usePlacementGuards({ store, alturaBodega: 500, CM_TO_PX })
    const spySave = vi.spyOn(store, 'saveToHistory')
    showError.mockClear()
    store.elementos[1].x = 0
    const resB = guards.onDragEndGuard({ ...store.elementos[1], start: { x: 20, y: 0 } })
    if (resB.valid) store.saveToHistory('drag b')
    expect(resB.valid).toBe(true)
    expect(spySave).toHaveBeenCalledTimes(1)
    const spyUpdate = vi.spyOn(store, 'actualizarElemento')
    store.elementos[2].x = 0
    const resC = guards.onDragEndGuard({ ...store.elementos[2], start: { x: 40, y: 0 } })
    expect(resC.valid).toBe(false)
    expect(spyUpdate).toHaveBeenCalledWith('c', { x: 40, y: 0 })
    expect(showError).toHaveBeenCalledWith(errorsPlacement.Z_STACKING_COLLISION)
    expect(spySave).toHaveBeenCalledTimes(1)
  })
})
