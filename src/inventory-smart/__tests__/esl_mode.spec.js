import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'

const makeElementoBase = (overrides = {}) => ({
  id: 'elemento-esl',
  tipo: 'elementos',
  nombre: 'Elemento ESL',
  orientacion: 0,
  plantaId: 'planta_1',
  x: 100,
  y: 100,
  width: 80,
  height: 60,
  dimensiones: { ancho: 8, largo: 6, alto: 4 },
  codigoEsl: '',
  ...overrides,
})

describe('Modo Configurar ESL en useCanvasStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('desactiva el modo ESL al entrar en modo edición', () => {
    const store = useCanvasStore()

    store.setModoConfigurarEsl(true, { silent: true })
    expect(store.modoConfigurarEsl).toBe(true)

    store.setModoEdicion(true)
    expect(store.modoConfigurarEsl).toBe(false)
  })

  it('permite seleccionar un elemento y asignar su código ESL', () => {
    const store = useCanvasStore()

    store.agregarElementoSinValidacion('elemento-esl', makeElementoBase())
    store.setModoConfigurarEsl(true, { silent: true })

    const iniciado = store.iniciarConfiguracionEsl('elemento-esl')
    expect(iniciado).toBe(true)
    expect(store.elementoEslObjetivo).toBe('elemento-esl')

    const guardado = store.guardarCodigoEslElemento('elemento-esl', 'ESL-123')
    expect(guardado).toBe(true)

    const elemento = store.elementos.find((el) => el.id === 'elemento-esl')
    expect(elemento?.codigoEsl).toBe('ESL-123')
    expect(store.cambiosNoAplicados).toBe(true)
  })
})
