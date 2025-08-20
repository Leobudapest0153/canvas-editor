import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PlantasPanel from '@/components/PlantasPanel.vue'
import { useCanvasStore } from '@/composables/useCanvasStore'

const makeEl = (id: string, w: number, h: number, x: number, y: number, opts: any = {}) => ({
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
    ;(globalThis as any).window = (globalThis as any).window || {}
    ;(window as any).__toasts = { show: vi.fn() }
  })

  it('(1) elemento en esquina que queda fuera tras reducir termina dentro automáticamente', () => {
    const store = useCanvasStore()
    store.plantas = [
      { id: 'planta_1', nombre: 'PB', descripcion: '', elementos: [], activa: true, dimensiones: { ancho: 200, largo: 200, alto: 280 }, pesoMaximoSoportado: 3000 } as any,
    ] as any
    store.plantaActiva = 'planta_1' as any

    // Elemento en esquina derecha que se saldrá al reducir ancho a 150
    store.elementos = [
      makeEl('E1', 60, 60, 160, 10), // 160+60=220 > 150 => fuera tras reducir
    ] as any

    const wrapper = shallowMount(PlantasPanel, { global: { stubs: { HistorialModal: true, ImportExportModal: true, Teleport: true } } })
    ;(wrapper.vm as any).mostrarModalEditar = true
    ;(wrapper.vm as any).formularioPlanta = { nombre: 'PB', descripcion: '', dimensiones: { ancho: 150, largo: 200, alto: 280 }, pesoMaximoSoportado: 3000 }

    ;(wrapper.vm as any).guardarPlanta()

    const el = store.elementos[0]
    // Debe quedar dentro de 150x200 con margen 5cm
    expect(el.x).toBeGreaterThanOrEqual(5 - 1e-6)
    expect(el.y).toBeGreaterThanOrEqual(5 - 1e-6)
    expect(el.x + el.width).toBeLessThanOrEqual(150 - 5 + 1e-6)
    expect(el.y + el.height).toBeLessThanOrEqual(200 - 5 + 1e-6)

    // Toast warning y snapshot post-apply
    expect((window as any).__toasts.show).toHaveBeenCalled()
  })

  it('(2) ok-but-out-of-bounds se convierte en auto_adjust', () => {
    const store = useCanvasStore()
    store.plantas = [
      { id: 'planta_1', nombre: 'PB', descripcion: '', elementos: [], activa: true, dimensiones: { ancho: 300, largo: 200, alto: 280 }, pesoMaximoSoportado: 3000 } as any,
    ] as any
    store.plantaActiva = 'planta_1' as any

    // Visible cabe; invisible fuera y grande, pero sim (preview) no lo considera => simulate ok
    store.elementos = [
      makeEl('V1', 50, 50, 10, 10, { visible: true }),
      makeEl('HIDDEN', 120, 120, 260, 50, { visible: false }), // quedará fuera si ancho->200
    ] as any

    const wrapper = shallowMount(PlantasPanel, { global: { stubs: { HistorialModal: true, ImportExportModal: true, Teleport: true } } })
    ;(wrapper.vm as any).mostrarModalEditar = true
    ;(wrapper.vm as any).formularioPlanta = { nombre: 'PB', descripcion: '', dimensiones: { ancho: 200, largo: 200, alto: 280 }, pesoMaximoSoportado: 3000 }

    // Simulate preview ok (no assert necesario, solo confirmamos)
    ;(wrapper.vm as any).onDimChange()

    // Confirm
    ;(wrapper.vm as any).guardarPlanta()

    const outNow = store.elementos.find((e) => e.id === 'HIDDEN') as any
    // Debe haberse reacomodado
    expect(outNow.x + outNow.width).toBeLessThanOrEqual(200 - 5 + 1e-6)
    expect(outNow.y + outNow.height).toBeLessThanOrEqual(200 - 5 + 1e-6)
  })

  it('(3) fallo de pack revierte planta', () => {
    const store = useCanvasStore()
    store.plantas = [
      { id: 'planta_1', nombre: 'PB', descripcion: '', elementos: [], activa: true, dimensiones: { ancho: 300, largo: 300, alto: 280 }, pesoMaximoSoportado: 3000 } as any,
    ] as any
    store.plantaActiva = 'planta_1' as any

    // Visible pequeño cabe; invisible enorme no cabe individualmente tras reducir (pack fallará)
    store.elementos = [
      makeEl('V1', 50, 50, 10, 10, { visible: true }),
      makeEl('ENORME', 250, 250, 10, 10, { visible: false }),
    ] as any

    const wrapper = shallowMount(PlantasPanel, { global: { stubs: { HistorialModal: true, ImportExportModal: true, Teleport: true } } })
    ;(wrapper.vm as any).mostrarModalEditar = true
    ;(wrapper.vm as any).formularioPlanta = { nombre: 'PB', descripcion: '', dimensiones: { ancho: 200, largo: 200, alto: 280 }, pesoMaximoSoportado: 3000 }

    // Confirm
    ;(wrapper.vm as any).guardarPlanta()

    // Debe revertir a 300x300
    const planta = store.plantaPorId('planta_1')
    expect(planta.dimensiones.ancho).toBe(300)
    expect(planta.dimensiones.largo).toBe(300)

    // Toast error
    expect((window as any).__toasts.show).toHaveBeenCalled()
  })
})

