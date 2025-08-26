// filepath: src/__tests__/context_menu.spec.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import CanvasView from '@/components/CanvasView.vue'
import { useCanvasStore } from '@/composables/useCanvasStore'

// Stubs for vue-konva components capable of emitting events
const makeShapeStub = (name) => defineComponent({
  name,
  props: ['config'],
  emits: ['contextmenu', 'pointerdown', 'pointerup', 'pointercancel', 'click', 'dblclick', 'dragstart', 'dragmove', 'dragend', 'transformend'],
  setup(props, { emit }) {
    return () => h('div', {
      class: 'shape-' + name.toLowerCase(),
      role: 'shape',
      onContextmenu: (e) => emit('contextmenu', e),
      onPointerdown: (e) => emit('pointerdown', e),
      onPointerup: (e) => emit('pointerup', e),
      onPointercancel: (e) => emit('pointercancel', e),
    })
  },
})

const VStage = defineComponent({
  name: 'VStage',
  props: ['config'],
  setup(props, { slots, expose }) {
    const node = {
      x: () => props.config?.x ?? 0,
      y: () => props.config?.y ?? 0,
      scaleX: () => props.config?.scaleX ?? 1,
      scaleY: () => props.config?.scaleY ?? 1,
      getPointerPosition: () => ({ x: 0, y: 0 }),
      clearCache: () => {},
      batchDraw: () => {},
      findOne: () => null,
    }
    expose({ getNode: () => node })
    return () => h('div', { class: 'fake-stage' }, slots.default?.())
  },
})
const VLayer = defineComponent({ name: 'VLayer', setup(_, { slots, expose }) { const n = { clearCache: () => {}, batchDraw: () => {} }; expose({ getNode: () => n }); return () => h('div', { class: 'fake-layer' }, slots.default?.()) } })
const VLine = defineComponent({ name: 'VLine', setup: () => () => h('div') })
const VText = defineComponent({ name: 'VText', setup: () => () => h('div') })
const VTransformer = defineComponent({ name: 'VTransformer', setup: () => () => h('div') })

beforeEach(() => {
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} }
})

const mountCanvas = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(CanvasView, {
    global: {
      plugins: [pinia],
      components: {
        'v-stage': VStage,
        'v-layer': VLayer,
        'v-rect': makeShapeStub('VRect'),
        'v-circle': makeShapeStub('VCircle'),
        'v-line': VLine,
        'v-text': VText,
        'v-transformer': VTransformer,
      },
      stubs: { RulersOverlay: true },
    },
    attachTo: document.body,
  })
  const store = useCanvasStore()
  // agregar un elemento visible en planta activa
  store.agregarElemento({
    id: 'el1',
    tipo: 'elementos',
    nombre: 'Elemento 1',
    dimensiones: { ancho: 100, largo: 60, alto: 20 },
    x: 10, y: 10, width: 100, height: 60,
    color: '#3b82f6',
  })
  await nextTick()
  return { wrapper, store }
}

const emitContextMenuOnFirstShape = (wrapper, x = 10, y = 10) => {
  const shapes = wrapper.findAll('[role="shape"]')
  expect(shapes.length).toBeGreaterThan(0)
  const e = { evt: { clientX: x, clientY: y, preventDefault: () => {} } }
  shapes[0].trigger('contextmenu', e)
}

beforeEach(() => {
  // ensure viewport size for clamp
  Object.defineProperty(window, 'innerWidth', { writable: true, value: 320 })
  Object.defineProperty(window, 'innerHeight', { writable: true, value: 200 })
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Context menu', () => {
  it('(a) abre con clic derecho sobre un elemento', async () => {
    const { wrapper } = await mountCanvas()
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    expect(document.querySelector('.sdx-container')).toBeTruthy()
  })

  it('(b) lock/unlock toggle', async () => {
    const { wrapper, store } = await mountCanvas()
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    // Click bloquear
    const items = document.querySelectorAll('.sdx-item')
    expect(items.length).toBeGreaterThan(0)
    items[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(store.elementoPorId('el1')?.bloqueado).toBe(true)

    // Abrir de nuevo y desbloquear
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    const items2 = document.querySelectorAll('.sdx-item')
    items2[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(store.elementoPorId('el1')?.bloqueado).toBe(false)
  })

  it('(c) eliminar invoca deleteSelected y respeta bloqueo', async () => {
    const { wrapper, store } = await mountCanvas()
    // eliminar cuando no está bloqueado
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    const delBtn = document.querySelectorAll('.sdx-item')[1]
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(store.elementoPorId('el1')).toBeUndefined()

    // re-crear y bloquear, luego intentar eliminar -> no elimina
    store.agregarElemento({ id: 'el1', tipo: 'elementos', nombre: 'E1', dimensiones: { ancho: 100, largo: 60, alto: 20 }, x: 10, y: 10, width: 100, height: 60 })
    store.actualizarElemento('el1', { bloqueado: true })
    await nextTick()
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    const delBtn2 = document.querySelectorAll('.sdx-item')[1]
    delBtn2.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(store.elementoPorId('el1')).toBeTruthy()
  })

  it('(d) no abre mientras drag activo', async () => {
    const { wrapper } = await mountCanvas()
    window.__dvCanvasDragActive = true
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    expect(document.querySelector('.sdx-container')).toBeFalsy()
    window.__dvCanvasDragActive = false
  })

  it('(e) cierra en click fuera y Escape', async () => {
    const { wrapper } = await mountCanvas()
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    expect(document.querySelector('.sdx-container')).toBeTruthy()
    // click fuera
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('.sdx-container')).toBeFalsy()

    // abrir de nuevo y cerrar con Escape
    emitContextMenuOnFirstShape(wrapper, 20, 25)
    await nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(document.querySelector('.sdx-container')).toBeFalsy()
  })

  it('(f) clamp de posición al viewport', async () => {
    const { wrapper } = await mountCanvas()
    // abrir fuera de viewport intencionalmente
    emitContextMenuOnFirstShape(wrapper, 5000, 4000)
    await nextTick()
    const el = document.querySelector('.sdx-container')
    expect(el).toBeTruthy()
    const left = parseInt(el.style.left, 10)
    const top = parseInt(el.style.top, 10)
    expect(left).toBeLessThanOrEqual(window.innerWidth - 8)
    expect(top).toBeLessThanOrEqual(window.innerHeight - 8)
  })
})
