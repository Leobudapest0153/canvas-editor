import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

const makeElementoBase = (overrides = {}) => ({
  id: 'el-base',
  tipo: 'elementos',
  nombre: 'Elemento de prueba',
  orientacion: 0,
  plantaId: 'planta_1',
  x: 120,
  y: 120,
  width: 60,
  height: 60,
  dimensiones: { ancho: 6, largo: 6, alto: 10 },
  ...overrides,
})

const makePasillo = (overrides = {}) => ({
  tipo: 'pasillos',
  nombre: 'Pasillo',
  plantaId: 'planta_1',
  width: 80,
  height: 60,
  dimensiones: { ancho: 8, largo: 6, alto: 10 },
  ...overrides,
})

describe('pasilloId en useCanvasStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('actualiza pasilloId al agregar o quitar pasillos en la planta', () => {
    const store = useCanvasStore()

    store.agregarElementoSinValidacion('pas-abajo', makePasillo({
      id: 'pas-abajo',
      x: 90,
      y: 220,
    }))

    store.agregarElementoSinValidacion('el-1', makeElementoBase({ id: 'el-1' }))
    let el = store.elementos.find((e) => e.id === 'el-1')
    expect(el?.pasilloId).toBe('pas-abajo')

    store.agregarElementoSinValidacion('pas-cerca', makePasillo({
      id: 'pas-cerca',
      x: 95,
      y: 190,
    }))
    el = store.elementos.find((e) => e.id === 'el-1')
    expect(el?.pasilloId).toBe('pas-cerca')

    store.eliminarElemento('pas-cerca')
    el = store.elementos.find((e) => e.id === 'el-1')
    expect(el?.pasilloId).toBe('pas-abajo')
  })

  it('respeta la orientación del elemento para asignar el pasillo', () => {
    const store = useCanvasStore()

    store.agregarElementoSinValidacion('pas-derecha', makePasillo({
      id: 'pas-derecha',
      x: 200,
      y: 120,
    }))
    store.agregarElementoSinValidacion('pas-izquierda', makePasillo({
      id: 'pas-izquierda',
      x: 40,
      y: 120,
    }))
    store.agregarElementoSinValidacion('pas-arriba', makePasillo({
      id: 'pas-arriba',
      x: 120,
      y: 40,
    }))
    store.agregarElementoSinValidacion('pas-abajo', makePasillo({
      id: 'pas-abajo',
      x: 120,
      y: 220,
    }))

    store.agregarElementoSinValidacion('el-orientado', makeElementoBase({
      id: 'el-orientado',
      orientacion: 90,
    }))

    let el = store.elementos.find((e) => e.id === 'el-orientado')
    expect(el?.pasilloId).toBe('pas-derecha')

    store.actualizarElemento('el-orientado', { orientacion: 270 })
    el = store.elementos.find((e) => e.id === 'el-orientado')
    expect(el?.pasilloId).toBe('pas-izquierda')

    store.actualizarElemento('el-orientado', { orientacion: 0 })
    el = store.elementos.find((e) => e.id === 'el-orientado')
    expect(el?.pasilloId).toBe('pas-abajo')

    store.actualizarElemento('el-orientado', { orientacion: 180 })
    el = store.elementos.find((e) => e.id === 'el-orientado')
    expect(el?.pasilloId).toBe('pas-arriba')
  })
})
