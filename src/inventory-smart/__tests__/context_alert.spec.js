import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContextAlert } from '@/inventory-smart/composables/useContextAlert'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { nextTick } from 'vue'

describe('useContextAlert', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('genera mensaje correcto para contexto de planta', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    // Crear una planta
    canvasStore.agregarPlanta('planta_test', {
      nombre: 'Planta Principal',
      descripcion: 'Planta de prueba',
    })

    canvasStore.seleccionarPlanta('planta_test')
    await nextTick()

    // Simular navegación (disparar watcher manualmente)
    alert.displayAlert()

    expect(alert.showAlert.value).toBe(true)
    expect(alert.alertMessage.value).toBeTruthy()
    expect(alert.alertMessage.value.message).toContain('Planta')
    expect(alert.alertMessage.value.message).toContain('Planta Principal')
    expect(alert.alertMessage.value.subtext).toContain('Vista aérea')
    expect(alert.alertMessage.value.icon).toBe('🏢')
  })

  it('genera mensaje correcto para contexto de cuarto', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    // Crear planta
    canvasStore.agregarPlanta('planta_1', {
      nombre: 'Planta Baja',
      descripcion: 'Test',
    })
    canvasStore.seleccionarPlanta('planta_1')

    // Crear cuarto
    const cuartoId = canvasStore.agregarElemento({
      tipo: 'cuartos',
      nombre: 'Cuarto Principal',
      dimensiones: { alto: 300, ancho: 400, largo: 500 },
      posicion: { x: 100, y: 100 },
    })

    // Navegar al cuarto
    canvasStore.navegarAElemento(cuartoId)
    await nextTick()

    alert.displayAlert()

    expect(alert.showAlert.value).toBe(true)
    expect(alert.alertMessage.value.message).toContain('Cuarto Principal')
    expect(alert.alertMessage.value.subtext).toContain('Planta Baja')
    expect(alert.alertMessage.value.subtext).toContain('Vista frontal')
    expect(alert.alertMessage.value.icon).toBe('🚪')
  })

  it('genera mensaje correcto para contexto de piso', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    // Crear planta
    canvasStore.agregarPlanta('planta_1', {
      nombre: 'Planta Baja',
      descripcion: 'Test',
    })
    canvasStore.seleccionarPlanta('planta_1')

    // Crear cuarto
    const cuartoId = canvasStore.agregarElemento({
      tipo: 'cuartos',
      nombre: 'Almacén',
      dimensiones: { alto: 300, ancho: 400, largo: 500 },
      posicion: { x: 100, y: 100 },
    })

    // Navegar al cuarto
    canvasStore.navegarAElemento(cuartoId)

    // Crear piso dentro del cuarto
    const pisoId = canvasStore.agregarElemento({
      tipo: 'pisos',
      nombre: 'Piso 1',
      dimensiones: { alto: 50, ancho: 400, largo: 500 },
      posicion: { x: 0, y: 0 },
    })

    // Navegar al piso
    canvasStore.navegarAElemento(pisoId)
    await nextTick()

    alert.displayAlert()

    expect(alert.showAlert.value).toBe(true)
    expect(alert.alertMessage.value.message).toContain('Piso 1')
    expect(alert.alertMessage.value.subtext).toContain('Almacén')
    expect(alert.alertMessage.value.subtext).toContain('Vista aérea')
    expect(alert.alertMessage.value.icon).toBe('📦')
  })

  it('oculta la alerta correctamente', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    canvasStore.agregarPlanta('planta_1', {
      nombre: 'Test',
      descripcion: 'Test',
    })
    canvasStore.seleccionarPlanta('planta_1')
    await nextTick()

    alert.displayAlert()
    expect(alert.showAlert.value).toBe(true)

    alert.hideAlert()
    expect(alert.showAlert.value).toBe(false)
  })

  it('oculta automáticamente la alerta después de la duración especificada', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    canvasStore.agregarPlanta('planta_1', {
      nombre: 'Test',
      descripcion: 'Test',
    })
    canvasStore.seleccionarPlanta('planta_1')
    await nextTick()

    alert.displayAlert(3000) // 3 segundos
    expect(alert.showAlert.value).toBe(true)

    // Avanzar tiempo
    vi.advanceTimersByTime(3000)
    await nextTick()

    expect(alert.showAlert.value).toBe(false)
  })

  it('usa duración por defecto de 10 segundos', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    canvasStore.agregarPlanta('planta_1', {
      nombre: 'Test',
      descripcion: 'Test',
    })
    canvasStore.seleccionarPlanta('planta_1')
    await nextTick()

    alert.displayAlert() // Sin especificar duración
    expect(alert.alertDuration.value).toBe(10000)
  })

  it('no muestra alerta si el contexto no cambia', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    canvasStore.agregarPlanta('planta_1', {
      nombre: 'Test',
      descripcion: 'Test',
    })
    canvasStore.seleccionarPlanta('planta_1')
    await nextTick()

    const initialShow = alert.showAlert.value

    // Volver a seleccionar la misma planta (no debería mostrar alerta)
    canvasStore.seleccionarPlanta('planta_1')
    await nextTick()
    vi.advanceTimersByTime(500)

    // No debería haber cambiado desde la carga inicial
    expect(alert.showAlert.value).toBe(initialShow)
  })

  it('genera mensaje correcto para contexto de elemento', async () => {
    const canvasStore = useCanvasStore()
    const alert = useContextAlert()

    canvasStore.agregarPlanta('planta_1', {
      nombre: 'Planta Baja',
      descripcion: 'Test',
    })
    canvasStore.seleccionarPlanta('planta_1')

    const elementoId = canvasStore.agregarElemento({
      tipo: 'elementos',
      nombre: 'Estante A1',
      dimensiones: { alto: 200, ancho: 100, largo: 50 },
      posicion: { x: 100, y: 100 },
    })

    canvasStore.navegarAElemento(elementoId)
    await nextTick()

    alert.displayAlert()

    expect(alert.showAlert.value).toBe(true)
    expect(alert.alertMessage.value.message).toContain('Estante A1')
    expect(alert.alertMessage.value.subtext).toContain('Planta Baja')
    expect(alert.alertMessage.value.subtext).toContain('Vista frontal')
    expect(alert.alertMessage.value.icon).toBe('📐')
  })
})
