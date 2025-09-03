import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CanvasView from '@/inventory-smart/components/CanvasView.vue'
import ElementEditor from '@/inventory-smart/components/modals/ElementEditor.vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { errorsPlacement } from '@/inventory-smart/validation/placementOrchestrator'

describe('wall placement integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.window = globalThis.window || {}
    window.__toasts = { show: vi.fn() }
  })

  it('reverts drop that exceeds warehouse height and skips history', () => {
    const store = useCanvasStore()
    store.plantas[0].dimensiones.alto = 100
    store.elementos = [
      {
        id: 'el1',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 20,
        x: 0,
        y: 0,
        alturaRespectoAlSuelo: 90,
      },
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

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[0])

    expect(shape.position()).toEqual({ x: 0, y: 0 })
    expect(spy).not.toHaveBeenCalled()
    expect(window.__toasts.show).toHaveBeenCalledWith(
      errorsPlacement.HEIGHT_EXCEEDS_WAREHOUSE,
      { type: 'error' },
    )
  })

  it('blocks form submit when wall element lacks zBase', async () => {
    const store = useCanvasStore()
    store.plantas[0].dimensiones.alto = 300
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const wrapper = mount(ElementEditor, {
      props: {
        visible: true,
        categorias: [{ id: 'cat', nombre: 'Cat' }],
        formas: [{ id: 'rectangular', nombre: 'Rect' }],
        ubicaciones: [
          { id: 'suelo', nombre: 'Suelo' },
          { id: 'pared', nombre: 'Pared' },
        ],
      },
    })

    const el = wrapper.vm.localElemento
    el.nombre = 'A'
    el.categoria = 'cat'
    el.forma = 'rectangular'
    el.ubicacion = 'pared'
    el.dimensiones.ancho = 10
    el.dimensiones.largo = 10
    el.dimensiones.alto = 10
    el.pesoMaximo = 5
    el.alturaRespectoAlSuelo = 0

    await wrapper.find('form').trigger('submit.prevent')

    expect(alertSpy).toHaveBeenCalledWith(errorsPlacement.ZBASE_REQUIRED)
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('prevents drop for wall element missing zBase', () => {
    const store = useCanvasStore()
    store.plantas[0].dimensiones.alto = 300
    store.elementos = [
      {
        id: 'el1',
        plantaId: 'planta_1',
        tipo: 'elementos',
        width: 10,
        height: 10,
        x: 0,
        y: 0,
        ubicacion: 'pared',
      },
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
      _pos: { x: 5, y: 5 },
      position(pos) {
        if (pos) this._pos = pos
        return this._pos
      },
    }

    wrapper.vm.onShapeDragEnd({ target: shape }, store.elementos[0])

    expect(shape.position()).toEqual({ x: 0, y: 0 })
    expect(spy).not.toHaveBeenCalled()
    expect(window.__toasts.show).toHaveBeenCalledWith(
      errorsPlacement.ZBASE_REQUIRED,
      { type: 'error' },
    )
  })
})
