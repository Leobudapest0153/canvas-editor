import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'

// Prueba de integración básica del nuevo campo plantillas en export

describe('Serialización con plantillas v1.1.0', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('incluye plantillas y métricas de plantillas en export', () => {
    const canvas = useCanvasStore()
    const catalog = useCatalogStore()

    // Asegurar estado base mínimo (ya existe planta por defecto en store)
    // Agregar un elemento simple para que no esté vacío
    canvas.elementos.push({
      id: 'el_1',
      tipo: 'elementos',
      nombre: 'Elemento Test',
      plantaId: 'planta_1',
      x: 0,
      y: 0,
      dimensiones: { ancho: 10, largo: 10, alto: 10 },
      width: 100,
      height: 100,
      hijos: [],
    })

    // Agregar plantilla ficticia
    const now = new Date().toISOString()
    catalog.templates.push({
      id: 'tpl_test',
      name: 'Plantilla Demo',
      createdAt: now,
      updatedAt: now,
      meta: { elementType: 'elementos', width: 10, height: 10, depth: 10, childrenCount: 0 },
      payload: { rootId: 'el_root', elements: [{ id: 'el_root', tipo: 'elementos', nombre: 'Root', x: 0, y: 0, width: 50, height: 50, hijos: [], dimensiones: { ancho: 10, largo: 10, alto: 10 } }] },
      tags: [],
    })

    const json = canvas.serialize()
    const parsed = JSON.parse(json)

    expect(parsed.meta.version).toBe('1.1.0')
    expect(Array.isArray(parsed.plantillas)).toBe(true)
    expect(parsed.plantillas.length).toBe(1)
    expect(parsed.meta.metrics.totalPlantillas).toBe(1)
    expect(parsed.plantillas[0]).toHaveProperty('estructura')
    expect(parsed.plantillas[0].estructura.nodos.length).toBe(1)
  })
})

