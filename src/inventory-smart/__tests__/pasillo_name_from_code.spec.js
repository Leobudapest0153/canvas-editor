import { describe, it, expect } from 'vitest'
import { assignCodigoNombre } from '@/inventory-smart/utils/codeNameAssigner'

describe('Asignación de nombre a pasillos desde código', () => {
  it('debe generar nombre "Pasillo A" para el primer pasillo', () => {
    const elemento = {
      id: 'pasillo_1',
      tipo: 'pasillos',
      plantaId: 'planta_1',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    }
    
    const allElements = []
    assignCodigoNombre(elemento, allElements)
    
    expect(elemento.codigo).toBe('A')
    expect(elemento.nombre).toBe('Pasillo A')
  })

  it('debe generar nombre "Pasillo B" para el segundo pasillo', () => {
    const pasillo1 = {
      id: 'pasillo_1',
      tipo: 'pasillos',
      codigo: 'A',
      nombre: 'Pasillo A',
      plantaId: 'planta_1',
    }
    
    const elemento = {
      id: 'pasillo_2',
      tipo: 'pasillos',
      plantaId: 'planta_1',
      x: 100,
      y: 300,
      width: 200,
      height: 100,
    }
    
    const allElements = [pasillo1]
    assignCodigoNombre(elemento, allElements)
    
    expect(elemento.codigo).toBe('B')
    expect(elemento.nombre).toBe('Pasillo B')
  })

  it('debe generar nombre "Pasillo Z" para el pasillo 26', () => {
    const existingPasillos = []
    for (let i = 0; i < 25; i++) {
      const code = String.fromCharCode(65 + i) // A-Y
      existingPasillos.push({
        id: `pasillo_${i + 1}`,
        tipo: 'pasillos',
        codigo: code,
        nombre: `Pasillo ${code}`,
        plantaId: 'planta_1',
      })
    }
    
    const elemento = {
      id: 'pasillo_26',
      tipo: 'pasillos',
      plantaId: 'planta_1',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    }
    
    assignCodigoNombre(elemento, existingPasillos)
    
    expect(elemento.codigo).toBe('Z')
    expect(elemento.nombre).toBe('Pasillo Z')
  })

  it('debe generar nombre "Pasillo AA" para el pasillo 27', () => {
    const existingPasillos = []
    for (let i = 0; i < 26; i++) {
      const code = String.fromCharCode(65 + i) // A-Z
      existingPasillos.push({
        id: `pasillo_${i + 1}`,
        tipo: 'pasillos',
        codigo: code,
        nombre: `Pasillo ${code}`,
        plantaId: 'planta_1',
      })
    }
    
    const elemento = {
      id: 'pasillo_27',
      tipo: 'pasillos',
      plantaId: 'planta_1',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    }
    
    assignCodigoNombre(elemento, existingPasillos)
    
    expect(elemento.codigo).toBe('AA')
    expect(elemento.nombre).toBe('Pasillo AA')
  })

  it('debe regenerar nombre cuando se regenera el código', () => {
    const elemento = {
      id: 'pasillo_1',
      tipo: 'pasillos',
      codigo: 'X',
      nombre: 'Nombre Antiguo',
      plantaId: 'planta_1',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    }
    
    const allElements = []
    assignCodigoNombre(elemento, allElements, { regenerateCode: true })
    
    expect(elemento.codigo).toBe('A')
    expect(elemento.nombre).toBe('Pasillo A')
  })

  it('no debe cambiar el nombre de elementos que no son pasillos', () => {
    const elemento = {
      id: 'cuarto_1',
      tipo: 'cuartos',
      nombre: 'Mi Cuarto Especial',
      plantaId: 'planta_1',
      x: 100,
      y: 100,
      width: 300,
      height: 300,
    }
    
    const allElements = []
    assignCodigoNombre(elemento, allElements)
    
    expect(elemento.codigo).toBe('CRT-001')
    expect(elemento.nombre).toBe('Mi Cuarto Especial')
  })

  it('debe respetar el código manual si ya está asignado (sin regenerateCode)', () => {
    const elemento = {
      id: 'pasillo_1',
      tipo: 'pasillos',
      codigo: 'Z',
      plantaId: 'planta_1',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
    }
    
    const allElements = []
    assignCodigoNombre(elemento, allElements)
    
    expect(elemento.codigo).toBe('Z')
    expect(elemento.nombre).toBe('Pasillo Z')
  })
})
