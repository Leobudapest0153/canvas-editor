import { describe, it, expect } from 'vitest'
import { getPasilloContainerHeight, applyPasilloHeight } from '@/inventory-smart/utils/pasilloHeightHelper'

describe('Asignación automática de altura para pasillos', () => {
  const mockPlantas = [
    {
      id: 'planta_1',
      nombre: 'Planta Principal',
      dimensiones: { ancho: 1000, largo: 800, alto: 300 }
    },
    {
      id: 'planta_2',
      nombre: 'Planta Secundaria',
      dimensiones: { ancho: 800, largo: 600, alto: 250 }
    }
  ]

  const mockElementos = [
    {
      id: 'cuarto_1',
      tipo: 'cuartos',
      nombre: 'Cuarto A',
      plantaId: 'planta_1',
      dimensiones: { ancho: 500, largo: 400, alto: 280 }
    },
    {
      id: 'piso_1',
      tipo: 'pisos',
      nombre: 'Piso 1',
      padre: 'cuarto_1',
      plantaId: 'planta_1',
      dimensiones: { ancho: 500, largo: 400, alto: 200 }
    }
  ]

  const getPlantaById = (id) => mockPlantas.find(p => p.id === id)
  const getElementoById = (id) => mockElementos.find(e => e.id === id)

  describe('getPasilloContainerHeight', () => {
    it('debe obtener altura de la planta cuando el pasillo está directamente en planta', () => {
      const alto = getPasilloContainerHeight({
        contextoActual: { tipo: 'plantas', id: 'planta_1' },
        elementoPadreId: null,
        getPlantaById,
        getElementoById
      })
      
      expect(alto).toBe(300)
    })

    it('debe obtener altura del elemento padre cuando el pasillo está dentro de un cuarto', () => {
      const alto = getPasilloContainerHeight({
        contextoActual: { tipo: 'cuartos', id: 'cuarto_1' },
        elementoPadreId: 'cuarto_1',
        getPlantaById,
        getElementoById
      })
      
      expect(alto).toBe(280)
    })

    it('debe obtener altura del elemento padre cuando el pasillo está dentro de un piso', () => {
      const alto = getPasilloContainerHeight({
        contextoActual: { tipo: 'pisos', id: 'piso_1' },
        elementoPadreId: 'piso_1',
        getPlantaById,
        getElementoById
      })
      
      expect(alto).toBe(200)
    })

    it('debe retornar null si no encuentra el contenedor', () => {
      const alto = getPasilloContainerHeight({
        contextoActual: { tipo: 'plantas', id: 'planta_inexistente' },
        elementoPadreId: null,
        getPlantaById,
        getElementoById
      })
      
      expect(alto).toBeNull()
    })

    it('debe priorizar el padre directo sobre el contexto', () => {
      const alto = getPasilloContainerHeight({
        contextoActual: { tipo: 'plantas', id: 'planta_1' },
        elementoPadreId: 'cuarto_1',
        getPlantaById,
        getElementoById
      })
      
      // Debe usar el alto del cuarto (280), no de la planta (300)
      expect(alto).toBe(280)
    })
  })

  describe('applyPasilloHeight', () => {
    it('debe aplicar altura del contenedor a un pasillo sin dimensiones', () => {
      const pasillo = {
        id: 'pasillo_1',
        tipo: 'pasillos',
        nombre: 'Pasillo A'
      }
      
      applyPasilloHeight(pasillo, {
        contextoActual: { tipo: 'plantas', id: 'planta_1' },
        elementoPadreId: null,
        getPlantaById,
        getElementoById
      })
      
      expect(pasillo.dimensiones).toBeDefined()
      expect(pasillo.dimensiones.alto).toBe(300)
    })

    it('debe actualizar altura de un pasillo con dimensiones existentes', () => {
      const pasillo = {
        id: 'pasillo_2',
        tipo: 'pasillos',
        nombre: 'Pasillo B',
        dimensiones: { ancho: 150, largo: 600, alto: 100 }
      }
      
      applyPasilloHeight(pasillo, {
        contextoActual: { tipo: 'cuartos', id: 'cuarto_1' },
        elementoPadreId: 'cuarto_1',
        getPlantaById,
        getElementoById
      })
      
      expect(pasillo.dimensiones.alto).toBe(280)
      expect(pasillo.dimensiones.ancho).toBe(150) // No debe cambiar otras dimensiones
      expect(pasillo.dimensiones.largo).toBe(600)
    })

    it('no debe modificar elementos que no son pasillos', () => {
      const cuarto = {
        id: 'cuarto_test',
        tipo: 'cuartos',
        nombre: 'Cuarto Test',
        dimensiones: { ancho: 500, largo: 400, alto: 280 }
      }
      
      const original = { ...cuarto }
      
      applyPasilloHeight(cuarto, {
        contextoActual: { tipo: 'plantas', id: 'planta_1' },
        elementoPadreId: null,
        getPlantaById,
        getElementoById
      })
      
      expect(cuarto.dimensiones.alto).toBe(original.dimensiones.alto)
    })

    it('no debe fallar si no encuentra altura del contenedor', () => {
      const pasillo = {
        id: 'pasillo_3',
        tipo: 'pasillos',
        nombre: 'Pasillo C',
        dimensiones: { ancho: 150, largo: 600, alto: 100 }
      }
      
      const altoOriginal = pasillo.dimensiones.alto
      
      applyPasilloHeight(pasillo, {
        contextoActual: { tipo: 'plantas', id: 'planta_inexistente' },
        elementoPadreId: null,
        getPlantaById,
        getElementoById
      })
      
      // No debe cambiar si no encuentra el contenedor
      expect(pasillo.dimensiones.alto).toBe(altoOriginal)
    })
  })

  describe('Casos de jerarquía compleja', () => {
    it('debe manejar pasillo en piso dentro de cuarto dentro de planta', () => {
      const alto = getPasilloContainerHeight({
        contextoActual: { tipo: 'pisos', id: 'piso_1' },
        elementoPadreId: 'piso_1',
        getPlantaById,
        getElementoById
      })
      
      // Debe usar altura del piso (200), no del cuarto (280) ni de la planta (300)
      expect(alto).toBe(200)
    })
  })
})
