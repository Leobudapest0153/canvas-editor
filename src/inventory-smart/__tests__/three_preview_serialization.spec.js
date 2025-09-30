import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

describe('Serialización para visor 3D', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('incluye dimensiones, jerarquía y orientación necesarias', () => {
    const canvas = useCanvasStore()

    canvas.elementos.push({
      id: 'root_el',
      tipo: 'contenedores',
      categoria: 'contenedores',
      nombre: 'Contenedor Principal',
      plantaId: 'planta_1',
      orientacion: 90,
      posicion: { x: 120, y: 340, z: 0, rotation: 0 },
      alturaRespectoAlSuelo: 50,
      dimensiones: { ancho: 200, largo: 100, alto: 300 },
      hijos: ['child_el'],
      padre: null,
      visible: true,
    })

    canvas.elementos.push({
      id: 'child_el',
      tipo: 'elementos',
      categoria: 'anaqueles',
      nombre: 'Nivel Superior',
      plantaId: 'planta_1',
      orientacion: 0,
      posicion: { x: 10, y: 20, z: 30 },
      dimensiones: { ancho: 50, largo: 40, alto: 20 },
      hijos: [],
      padre: 'root_el',
      visible: true,
    })

    const snapshot = canvas.serializeForThreePreview()

    expect(snapshot).toBeTruthy()
    expect(Array.isArray(snapshot.plantas)).toBe(true)
    expect(Array.isArray(snapshot.elementos)).toBe(true)

    const root = snapshot.elementos.find((el) => el.id === 'root_el')
    const child = snapshot.elementos.find((el) => el.id === 'child_el')

    expect(root).toBeTruthy()
    expect(child).toBeTruthy()

    expect(root.dimensiones).toMatchObject({ alto: 300, ancho: 200, largo: 100 })
    expect(root.orientacion).toBe(90)
    expect(root.hijos).toContain('child_el')

    expect(child.padre).toBe('root_el')
    expect(child.dimensiones).toMatchObject({ alto: 20, ancho: 50, largo: 40 })
    expect(child.posicion).toMatchObject({ x: 10, y: 20 })
  })
})

