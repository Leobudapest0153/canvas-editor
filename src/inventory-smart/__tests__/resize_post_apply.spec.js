import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, config } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlantasPanel from '@/inventory-smart/components/PlantasPanel.vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { ToastSymbol } from '@/inventory-smart/plugins/toast'

const makeEl = (id, w, h, x, y, opts = {}) => ({
  id,
  plantaId: 'planta_1',
  width: w,
  height: h,
  x,
  y,
  rotation: 0,
  visible: opts.visible !== false,
  ubicacion: 'suelo',
  ...opts,
})

describe('Post-apply validation pass en redimensionado de planta', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const toastMock = { toasts: { value: [] }, show: vi.fn(), remove: vi.fn(), clearAll: vi.fn(), maxToasts: 5 }
    config.global.provide = { ...(config.global.provide || {}), [ToastSymbol]: toastMock }
  })

  it('(1) elemento en esquina que queda fuera tras reducir termina dentro automáticamente', () => {
    const store = useCanvasStore()
    store.plantas = [
      { id: 'planta_1', nombre: 'PB', descripcion: '', elementos: [], activa: true, dimensiones: { ancho: 200, largo: 200, alto: 280 }, capacidadCargaSoportado: 3000 },
    ]
    store.plantaActiva = 'planta_1'

    // Elemento en esquina derecha que se saldrá al reducir ancho a 150
    store.elementos = [
      makeEl('E1', 60, 60, 160, 10), // 160+60=220 > 150 => fuera tras reducir
    ]

    const wrapper = shallowMount(PlantasPanel, { global: { stubs: { HistorialModal: true, ImportExportModal: true, Teleport: true } } })
    wrapper.vm.mostrarModalEditar = true
    wrapper.vm.formularioPlanta = { nombre: 'PB', descripcion: '', dimensiones: { ancho: 150, largo: 200, alto: 280 }, capacidadCargaSoportado: 3000 }

    wrapper.vm.guardarPlanta()

    const el = store.elementos[0]
    // Debe quedar dentro de 150x200 con margen 5cm
    expect(el.x).toBeGreaterThanOrEqual(5 - 1e-6)
    expect(el.y).toBeGreaterThanOrEqual(5 - 1e-6)
    expect(el.x + el.width).toBeLessThanOrEqual(150 - 5 + 1e-6)
    expect(el.y + el.height).toBeLessThanOrEqual(200 - 5 + 1e-6)

    // Toast warning y snapshot post-apply
  expect(config.global.provide[ToastSymbol].show).toHaveBeenCalled()
  })

  it('(2) ok-but-out-of-bounds se convierte en auto_adjust', () => {
    const store = useCanvasStore()
    store.plantas = [
      { id: 'planta_1', nombre: 'PB', descripcion: '', elementos: [], activa: true, dimensiones: { ancho: 300, largo: 200, alto: 280 }, capacidadCargaSoportado: 3000 },
    ]
    store.plantaActiva = 'planta_1'

    // Visible cabe; invisible fuera y grande, pero sim (preview) no lo considera => simulate ok
    store.elementos = [
      makeEl('V1', 50, 50, 10, 10, { visible: true }),
      makeEl('HIDDEN', 120, 120, 260, 50, { visible: false }), // quedará fuera si ancho->200
    ]

    const wrapper = shallowMount(PlantasPanel, { global: { stubs: { HistorialModal: true, ImportExportModal: true, Teleport: true } } })
    wrapper.vm.mostrarModalEditar = true
    wrapper.vm.formularioPlanta = { nombre: 'PB', descripcion: '', dimensiones: { ancho: 200, largo: 200, alto: 280 }, capacidadCargaSoportado: 3000 }

    // Simulate preview ok (no assert necesario, solo confirmamos)
    wrapper.vm.onDimChange()

    // Confirm
    wrapper.vm.guardarPlanta()

    const outNow = store.elementos.find((e) => e.id === 'HIDDEN')
    // Debe haberse reacomodado
    expect(outNow.x + outNow.width).toBeLessThanOrEqual(200 - 5 + 1e-6)
    expect(outNow.y + outNow.height).toBeLessThanOrEqual(200 - 5 + 1e-6)
  })

  it('(3) fallo de pack revierte planta', () => {
    const store = useCanvasStore()
    store.plantas = [
      { id: 'planta_1', nombre: 'PB', descripcion: '', elementos: [], activa: true, dimensiones: { ancho: 300, largo: 300, alto: 280 }, capacidadCargaSoportado: 3000 },
    ]
    store.plantaActiva = 'planta_1'

    // Visible pequeño cabe; invisible enorme no cabe individualmente tras reducir (pack fallará)
    store.elementos = [
      makeEl('V1', 50, 50, 10, 10, { visible: true }),
      makeEl('ENORME', 250, 250, 10, 10, { visible: false }),
    ]

    const wrapper = shallowMount(PlantasPanel, { global: { stubs: { HistorialModal: true, ImportExportModal: true, Teleport: true } } })
    wrapper.vm.mostrarModalEditar = true
    wrapper.vm.formularioPlanta = { nombre: 'PB', descripcion: '', dimensiones: { ancho: 200, largo: 200, alto: 280 }, capacidadCargaSoportado: 3000 }

    // Confirm
    wrapper.vm.guardarPlanta()

    // Debe revertir a 300x300
    const planta = store.plantaPorId('planta_1')
    expect(planta.dimensiones.ancho).toBe(300)
    expect(planta.dimensiones.largo).toBe(300)

    // Toast error
  expect(config.global.provide[ToastSymbol].show).toHaveBeenCalled()
  })
})

