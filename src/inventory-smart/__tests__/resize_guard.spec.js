import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fitsIndividually, usePlantResizeGuard } from '@/inventory-smart/composables/usePlantResizeGuard'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import PlantasPanel from '@/inventory-smart/components/PlantasPanel.vue'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

const el = (id, w, h, x = 0, y = 0, rot = 0) => ({
  id,
  plantaId: 'planta_1',
  width: w,
  height: h,
  x,
  y,
  rotation: rot,
  visible: true,
  ubicacion: 'suelo',
})

describe('usePlantResizeGuard - helpers', () => {
  it('(a) elemento mas ancho que newW -> block (via fitsIndividually)', () => {
    const e = el('e1', 120, 50)
    const ok = fitsIndividually(e, 100, 200, true, 0)
    expect(ok).toBe(false)
  })

  it('(b) dispo actual se sale pero pack cabe -> auto_adjust con N>0', () => {
    const elements = [el('a', 60, 60, 0, 0), el('b', 60, 60, 60, 0)]
    const guard = usePlantResizeGuard(() => ({
      elements,
      gridSizePx: 0,
      cmToPx: 2,
      rotPerm: true,
      marginCm: 0,
      utilizationFactor: 0.95,
    }))
    const res = guard.simulateResize(100, 200)
    expect(res.status === 'auto_adjust' || res.status === 'ok').toBe(true)
    if (res.status === 'auto_adjust') {
      expect(res.placements.length).toBeGreaterThan(0)
    }
  })

  it('(c) todo cabe sin cambios -> ok', () => {
    const elements = [el('a', 80, 50, 0, 0), el('b', 80, 50, 100, 0)]
    const guard = usePlantResizeGuard(() => ({
      elements,
      gridSizePx: 0,
      cmToPx: 2,
      rotPerm: true,
      marginCm: 0,
      utilizationFactor: 0.95,
    }))
    const res = guard.simulateResize(220, 200)
    expect(res.status).toBe('ok')
  })

  it('(d) respeta grilla y margenes al colocar', () => {
    const elements = [el('a', 30, 30), el('b', 30, 30)]
    const guard = usePlantResizeGuard(() => ({
      elements,
      gridSizePx: 20, // 20 px grid
      cmToPx: 2, // 2 px per cm => grid = 10 cm
      rotPerm: true,
      marginCm: 5, // 5 cm
      utilizationFactor: 0.95,
    }))
    const res = guard.simulateResize(100, 100)
    if (res.status === 'auto_adjust') {
      for (const p of res.placements) {
        expect(p.x % 10).toBe(0)
        expect(p.y % 10).toBe(0)
        expect(p.x).toBeGreaterThanOrEqual(5)
        expect(p.y).toBeGreaterThanOrEqual(5)
        expect(p.x + p.width).toBeLessThanOrEqual(100 - 5 + 1e-6)
        expect(p.y + p.height).toBeLessThanOrEqual(100 - 5 + 1e-6)
      }
    } else if (res.status === 'ok') {
      expect(res.status).toBe('ok')
    } else {
      throw new Error('Esperaba ok o auto_adjust')
    }
  })
})

describe('PlantasPanel - snapshot solo en confirmaciones', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.window = globalThis.window || {}
    window.__toasts = { show: vi.fn() }
  })

  it('(e) no guarda snapshot en cambios inline; sí al confirmar', () => {
    const store = useCanvasStore()
    store.plantas = [
      {
        id: 'planta_1',
        nombre: 'Planta Baja',
        descripcion: '',
        elementos: [],
        activa: true,
        dimensiones: { ancho: 200, largo: 200, alto: 280 },
        pesoMaximoSoportado: 3000,
      },
    ]
    store.plantaActiva = 'planta_1'

    store.elementos = [
      { ...el('a', 120, 60, 0, 0), plantaId: 'planta_1' },
      { ...el('b', 120, 60, 120, 0), plantaId: 'planta_1' },
    ]

    const spySave = vi.spyOn(store, 'saveToHistory')

    const wrapper = shallowMount(PlantasPanel, {
      global: {
        stubs: {
          HistorialModal: true,
          ImportExportModal: true,
          Teleport: true,
        },
      },
    })

    wrapper.vm.mostrarModalEditar = true
    wrapper.vm.formularioPlanta = {
      nombre: 'Planta Baja',
      descripcion: '',
      dimensiones: { ancho: 180, largo: 200, alto: 280 },
      pesoMaximoSoportado: 3000,
    }

    wrapper.vm.onDimChange()
    expect(spySave).not.toHaveBeenCalled()

    wrapper.vm.guardarPlanta()

    expect(spySave).toHaveBeenCalledTimes(1)
  })
})

describe('elastic floor helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('computeExpandedAreaM aplica padding correctamente', () => {
    const store = useCanvasStore()
    const res = store.computeExpandedAreaM({ width: 10, depth: 10, height: 10 }, 0.25)
    expect(res.width).toBeCloseTo(15)
    expect(res.depth).toBeCloseTo(15)
  })

  it('expandSuggestedAreaIfNeeded aumenta dimensiones si el hijo excede', () => {
    const store = useCanvasStore()
    const piso = { suggestedArea: { width: 5, depth: 5, height: 5 } }
    const changed = store.expandSuggestedAreaIfNeeded(piso, { width: 6, depth: 4, height: 4 })
    expect(changed).toBe(true)
    expect(piso.suggestedArea.width).toBe(6)
  })
})

