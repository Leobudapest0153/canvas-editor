import { describe, it, expect, beforeEach } from 'vitest'
import { applyEdgeConstraint } from '@/utils/edgeConstraint'
import { resetEdgeState, getEdgeState } from '@/composables/useEdgeState'

const area = { minX: 0, minY: 0, maxX: 100, maxY: 100 }

describe('edgeConstraint: clamp puro y histéresis', () => {
  const el = { id: 'e1', width: 20, height: 10 }

  beforeEach(() => {
    resetEdgeState(el.id)
  })

  it('drags rápidos a cada borde terminan exactamente en el tope sin colchón', () => {
    // Izquierda
    let r = applyEdgeConstraint({ x: -50, y: 10 }, el, area)
    expect(r.pos.x).toBe(0)
    expect(r.pos.y).toBe(10)
    // Derecha
    r = applyEdgeConstraint({ x: 1000, y: 10 }, el, area)
    expect(r.pos.x).toBe(80) // maxX - w
    // Arriba
    r = applyEdgeConstraint({ x: 40, y: -999 }, el, area)
    expect(r.pos.y).toBe(0)
    // Abajo
    r = applyEdgeConstraint({ x: 40, y: 999 }, el, area)
    expect(r.pos.y).toBe(90) // maxY - h
  })

  it('al salir del borde hacia adentro no se queda pegado (histéresis con velocidad)', () => {
    // Entrar en borde izquierdo
    let r = applyEdgeConstraint({ x: -10, y: 10 }, el, area)
    expect(r.pos.x).toBe(0)
    // Movernos hacia adentro un paso pequeño
    r = applyEdgeConstraint({ x: 1, y: 10 }, el, area)
    expect(r.pos.x).toBe(1)
    // Estado debe liberar el eje X
    const st = getEdgeState(el.id)
    expect(st.edgeX === null).toBe(true)
  })

  it('recorrer los cuatro bordes en secuencia no deja estados pegados', () => {
    // izquierda
    applyEdgeConstraint({ x: -5, y: 10 }, el, area)
    applyEdgeConstraint({ x: 1, y: 10 }, el, area)
    // arriba
    applyEdgeConstraint({ x: 10, y: -5 }, el, area)
    applyEdgeConstraint({ x: 10, y: 1 }, el, area)
    // derecha
    applyEdgeConstraint({ x: 1000, y: 20 }, el, area)
    applyEdgeConstraint({ x: 79, y: 20 }, el, area)
    // abajo
    applyEdgeConstraint({ x: 30, y: 1000 }, el, area)
    applyEdgeConstraint({ x: 30, y: 89 }, el, area)
    const st = getEdgeState(el.id)
    expect(st.edgeX).toBe(null)
    expect(st.edgeY).toBe(null)
  })

  it('no aplica snap-to-grid durante el drag (solo clamp puro)', () => {
    // cercano a una grilla hipotética 10px -> 37 debería quedar 37, no 40
    const r = applyEdgeConstraint({ x: 37, y: 23 }, el, area)
    expect(r.pos.x).toBe(37)
    expect(r.pos.y).toBe(23)
  })
})

