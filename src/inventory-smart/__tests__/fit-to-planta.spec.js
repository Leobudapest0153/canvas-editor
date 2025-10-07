import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, defineComponent, h } from 'vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

vi.mock('vue-konva', () => ({ VueKonva: {}, default: { install: () => {} } }))

// Mock del sistema de sugerencias
const mockPlacementSuggestions = {
  tryPlaceWithSuggestions: vi.fn(() => Promise.resolve(true)),
  generatePlacementSuggestions: vi.fn(() => null),
  applySuggestedAdjustments: vi.fn((el) => el)
}

let mockStore
vi.mock('@/inventory-smart/composables/useCanvasWithHistory', () => ({
  useCanvasWithHistory: () => ({ store: mockStore })
}))

beforeEach(() => {
  setActivePinia(createPinia())
  mockStore = useCanvasStore()
})

import CanvasView from '@/inventory-smart/components/CanvasView.vue'

describe('fitToPlanta', () => {
  it('uses polygon bbox for zoom calculation', () => {
    mockStore.plantas = [
      {
        id: 'p1',
        nombre: 'Planta',
        isInfinite: false,
        dimensiones: { ancho: 200, largo: 100 },
        poligono: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 100 },
          { x: 0, y: 100 }
        ],
      }
    ]
    mockStore.plantaActiva = 'p1'
    mockStore.canvasAdaptativo = {
      width: 200,
      height: 100,
      escala: 1,
      frame: { x: 0, y: 0, width: 200, height: 100 },
    }
    mockStore.contextoNavegacion = { tipo: 'plantas', id: 'p1', path: [{ tipo: 'plantas', id: 'p1' }] }

    const wrapper = mount(CanvasView, {
      global: {
        provide: {
          placementSuggestions: mockPlacementSuggestions
        }
      }
    })
    const stageStub = {
      scale: vi.fn(),
      position: vi.fn(),
      batchDraw: vi.fn(),
    }
  wrapper.vm.stageRef = { getNode: () => stageStub }
    // Ensure both the ref proxy and its value point to the stub
    if (wrapper.vm.stageRef && 'value' in wrapper.vm.stageRef) {
      wrapper.vm.stageRef.value = { getNode: () => stageStub }
    }
    // Ajustar tamaño del stage antes de llamar
    wrapper.vm.stageSize.width = 400
    wrapper.vm.stageSize.height = 400

    const result = wrapper.vm.fitToPlanta()

    expect(result).toBeTruthy()
    const zoom = result.scale
    const vw = Math.max(16, wrapper.vm.stageSize.width - 80)
    const vh = Math.max(16, wrapper.vm.stageSize.height - 80)
    const expected = Math.min(vw / 200, vh / 100)
    expect(zoom).toBeCloseTo(expected)
  })

  it('is idempotent immediately after fitting container detail', () => {
    mockStore.plantas = [
      {
        id: 'p1',
        nombre: 'Planta',
        isInfinite: false,
        dimensiones: { ancho: 600, largo: 400 },
        poligono: [
          { x: 0, y: 0 },
          { x: 600, y: 0 },
          { x: 600, y: 400 },
          { x: 0, y: 400 }
        ],
      }
    ]
    mockStore.plantaActiva = 'p1'
    mockStore.elementos = [
      {
        id: 'c1',
        tipo: 'contenedores',
        width: 300,
        height: 200,
        plantaId: 'p1',
      }
    ]
    mockStore.canvasAdaptativo = {
      width: 300,
      height: 200,
      escala: 1,
      frame: { x: 0, y: 0, width: 300, height: 200 },
    }
    mockStore.contextoNavegacion = {
      tipo: 'elementos',
      id: 'c1',
      path: [
        { tipo: 'plantas', id: 'p1' },
        { tipo: 'elementos', id: 'c1' }
      ],
    }

    const wrapper = mount(CanvasView, {
      global: {
        provide: {
          placementSuggestions: mockPlacementSuggestions
        }
      }
    })
    const stageStub = {
      scale: vi.fn(),
      position: vi.fn(),
      batchDraw: vi.fn(),
    }
  wrapper.vm.stageRef = { getNode: () => stageStub }
  expect(wrapper.vm.stageRef.getNode()).toBe(stageStub)
    wrapper.vm.stageSize.width = 600
    wrapper.vm.stageSize.height = 400

    const firstFit = wrapper.vm.fitToPlanta()
    stageStub.scale.mockClear()
    stageStub.position.mockClear()
    const secondFit = wrapper.vm.fitToPlanta()

    expect(firstFit).toBeTruthy()
    expect(secondFit).toBeTruthy()
    expect(secondFit.scale).toBeCloseTo(firstFit.scale)
    expect(secondFit.position.x).toBeCloseTo(firstFit.position.x)
    expect(secondFit.position.y).toBeCloseTo(firstFit.position.y)
    expect(stageStub.scale).toHaveBeenCalledTimes(2)
    expect(stageStub.position).toHaveBeenCalledTimes(2)
    const [, scaleCall] = stageStub.scale.mock.calls
    const [, positionCall] = stageStub.position.mock.calls
    expect(scaleCall[0].x).toBeCloseTo(firstFit.scale)
    expect(scaleCall[0].y).toBeCloseTo(firstFit.scale)
    expect(positionCall[0].x).toBeCloseTo(firstFit.position.x)
    expect(positionCall[0].y).toBeCloseTo(firstFit.position.y)
  })
})

describe('floating origin rebase integration', () => {
  let originalRaf
  let originalCancelRaf
  let originalWindowRaf
  let originalWindowCancelRaf

  beforeEach(() => {
    originalRaf = globalThis.requestAnimationFrame
    originalCancelRaf = globalThis.cancelAnimationFrame
    originalWindowRaf = typeof window !== 'undefined' ? window.requestAnimationFrame : undefined
    originalWindowCancelRaf = typeof window !== 'undefined' ? window.cancelAnimationFrame : undefined
    globalThis.requestAnimationFrame = (cb) => {
      if (typeof cb === 'function') {
        cb(16)
      }
      return 1
    }
    globalThis.cancelAnimationFrame = vi.fn()
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame = globalThis.requestAnimationFrame
      window.cancelAnimationFrame = globalThis.cancelAnimationFrame
    }
  })

  afterEach(() => {
    if (originalRaf) {
      globalThis.requestAnimationFrame = originalRaf
    } else {
      delete globalThis.requestAnimationFrame
    }
    if (originalCancelRaf) {
      globalThis.cancelAnimationFrame = originalCancelRaf
    } else {
      delete globalThis.cancelAnimationFrame
    }
    if (typeof window !== 'undefined') {
      if (originalWindowRaf) {
        window.requestAnimationFrame = originalWindowRaf
      } else {
        delete window.requestAnimationFrame
      }
      if (originalWindowCancelRaf) {
        window.cancelAnimationFrame = originalWindowCancelRaf
      } else {
        delete window.cancelAnimationFrame
      }
    }
    vi.useRealTimers()
  })

  it('rebases at most once per 300ms and keeps overlays aligned', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))

    const store = mockStore
    store.plantas = [
      {
        id: 'planta_1',
        nombre: 'Infinita',
        isInfinite: true,
        dimensiones: { ancho: 200000, largo: 200000 },
      },
    ]
    store.plantaActiva = 'planta_1'
    store.contextoNavegacion = { tipo: 'plantas', id: 'planta_1', path: [{ tipo: 'plantas', id: 'planta_1' }] }
    store.canvasAdaptativo = {
      width: 200000,
      height: 200000,
      escala: 1,
      frame: { x: 0, y: 0, width: 200000, height: 200000 },
    }
    store.elementos = [
      {
        id: 'rack-1',
        tipo: 'elementos',
        forma: 'rectangular',
        plantaId: 'planta_1',
        x: 60010,
        y: 40,
        width: 80,
        height: 40,
        visible: true,
        posicion: { x: 60010, y: 40 },
      },
    ]
    store.zoom = 1
    store.configurarPan(-59500, 0)

    const layerCallLog = []
    const stageNode = {
      x: () => store.panX,
      y: () => store.panY,
      scaleX: () => store.zoom,
      scaleY: () => store.zoom,
      scale: vi.fn(),
      position: vi.fn(),
      batchDraw: vi.fn(),
      findOne: vi.fn(() => null),
    }
    const layerNode = {
      setAttr: vi.fn((key, value) => {
        layerCallLog.push([key, value])
      }),
      getAttr: vi.fn(() => null),
      clipFunc: vi.fn(),
      batchDraw: vi.fn(),
      clearCache: vi.fn(),
    }
    layerNode.getLayer = () => layerNode

    const backgroundLayerNode = {
      setAttr: vi.fn(),
      getAttr: vi.fn(() => null),
      clipFunc: vi.fn(),
      batchDraw: vi.fn(),
      clearCache: vi.fn(),
    }
    backgroundLayerNode.getLayer = () => backgroundLayerNode

    const makeGenericLayerNode = () => {
      const node = {
        setAttr: vi.fn(),
        getAttr: vi.fn(() => null),
        clipFunc: vi.fn(),
        batchDraw: vi.fn(),
        clearCache: vi.fn(),
      }
      node.getLayer = () => node
      return node
    }

    const layerNodes = [backgroundLayerNode, layerNode, makeGenericLayerNode(), makeGenericLayerNode(), makeGenericLayerNode()]
    let layerIndex = 0

    const StageComponentStub = defineComponent({
      name: 'StageStub',
      props: { config: { type: Object, default: () => ({}) } },
      setup(props, { slots, expose }) {
        expose({ getNode: () => stageNode })
        return () => h('div', slots.default ? slots.default() : [])
      },
    })

    const LayerComponentStub = defineComponent({
      name: 'LayerStub',
      props: { config: { type: Object, default: () => ({}) } },
      setup(props, { slots, expose }) {
        const node = layerNodes[layerIndex] || makeGenericLayerNode()
        layerIndex += 1
        expose({ getNode: () => node })
        return () => h('div', slots.default ? slots.default() : [])
      },
    })

    const wrapper = mount(CanvasView, {
      global: {
        provide: {
          placementSuggestions: mockPlacementSuggestions,
        },
        stubs: {
          'v-stage': StageComponentStub,
          'v-layer': LayerComponentStub,
        },
      },
    })

    await nextTick()
    await nextTick()

    const setupState = wrapper.vm.$.setupState

    if (!setupState.layerRef.value || typeof setupState.layerRef.value.getNode !== 'function') {
      setupState.layerRef.value = { getNode: () => layerNode }
    }
    if (
      !setupState.backgroundLayerRef.value ||
      typeof setupState.backgroundLayerRef.value.getNode !== 'function'
    ) {
      setupState.backgroundLayerRef.value = { getNode: () => backgroundLayerNode }
    }

    expect(wrapper.vm.getStage()).toBe(stageNode)
    expect(setupState.layerRef.value?.getNode?.()).toBe(layerNode)

    wrapper.vm.stageSize.width = 1000
    wrapper.vm.stageSize.height = 800

    store.zoom = 1
    store.configurarPan(-59500, 0)

    await nextTick()

    store.zoom = 1
    store.configurarPan(-59500, 0)

    const viewport = wrapper.vm.getViewportWorldRect()
    expect(viewport).not.toBeNull()

    wrapper.vm.startMarquee({ x: 60020, y: 50 })
    wrapper.vm.updateMarquee({ x: 60080, y: 110 })
    if (wrapper.vm.dragLastValidPositions?.value?.set) {
      wrapper.vm.dragLastValidPositions.value.set('rack-1', { x: 60010, y: 40 })
    }

    await nextTick()

    const originalShift = store.shiftWorldCoordinates
    const shiftSpy = vi
      .spyOn(store, 'shiftWorldCoordinates')
      .mockImplementation((...args) => originalShift(...args))

    const marqueeBefore = wrapper.vm.marqueeRect.x
    const rebaseTriggered = wrapper.vm.ensureFloatingOrigin('spec')
    await nextTick()

    expect(shiftSpy).toHaveBeenCalledTimes(1)
    expect(store.floatingOrigin.rebaseCount).toBe(1)
    expect(store.floatingOrigin.telemetry.lastViewCenter.x).toBeCloseTo(60000, 0)
    expect(store.floatingOrigin.telemetry.lastScale).toBeCloseTo(1, 5)
    const shiftDelta = store.floatingOrigin.lastShift?.x || 0
    expect(wrapper.vm.marqueeRect.x).toBeCloseTo(marqueeBefore - shiftDelta, 0)
    expect(store.floatingOrigin.telemetry.rebasesPerMinute).toBeGreaterThanOrEqual(1)

    const firstTimestamp = store.floatingOrigin.lastRebaseAt

    store.configurarPan(-59500, 0)
    vi.setSystemTime(new Date('2024-01-01T00:00:00.100Z'))
    const suppressed = wrapper.vm.ensureFloatingOrigin('cooldown')
    await nextTick()
    expect(suppressed).toBe(false)
    expect(store.floatingOrigin.rebaseCount).toBe(1)
    expect(shiftSpy).toHaveBeenCalledTimes(1)

    store.panX = -59500
    vi.setSystemTime(new Date('2024-01-01T00:00:00.520Z'))
    const secondRebase = wrapper.vm.ensureFloatingOrigin('after-cooldown')
    await nextTick()
    expect(secondRebase).toBe(true)
    expect(store.floatingOrigin.rebaseCount).toBe(2)
    expect(shiftSpy).toHaveBeenCalledTimes(2)
    expect(store.floatingOrigin.lastRebaseAt - firstTimestamp).toBeGreaterThanOrEqual(300)

    expect(layerCallLog.some(([key, value]) => key === 'floatingRebaseActive' && value === true)).toBe(true)

    shiftSpy.mockRestore()
  })
})
