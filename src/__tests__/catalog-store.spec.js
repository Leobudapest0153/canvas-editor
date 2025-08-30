import { describe, expect, test, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import {
  useCatalogStore,
  baseSystemGuard,
  allowedTypesForContext,
} from '@/stores/catalog'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { CATALOGO, JERARQUIA_PERMITIDA } from '@/utils/constants'

describe('baseSystemGuard', () => {
  test('allows system items visible in catalog', () => {
    const item = { props: { system: true } }
    expect(baseSystemGuard(item)).toBe(true)
  })

  test('rejects items with catalogVisible false', () => {
    const item = { props: { system: true, catalogVisible: false } }
    expect(baseSystemGuard(item)).toBe(false)
  })
})

describe('allowedTypesForContext', () => {
  test('root returns system base keys', () => {
    expect(allowedTypesForContext({ mode: 'root' })).toEqual(
      CATALOGO.SISTEMA_BASE_KEYS,
    )
  })

  test('detail-element returns contenedores', () => {
    expect(allowedTypesForContext({ mode: 'detail-element' })).toEqual(
      JERARQUIA_PERMITIDA.elementos,
    )
  })

  test('detail-container returns elementos y contenedores', () => {
    expect(allowedTypesForContext({ mode: 'detail-container' })).toEqual(
      JERARQUIA_PERMITIDA.contenedores,
    )
  })
})

describe('filteredCatalogItems', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('filters by context, text and category', async () => {
    const canvas = useCanvasStore()
    const catalog = useCatalogStore()

    catalog.items = [
      {
        id: 'anaquel_metalico_grande',
        nombre: 'Anaquel',
        tipo: 'elementos',
        categoria: 'anaqueles',
        props: { system: true },
      },
      {
        id: 'estante_pared_pequeno',
        nombre: 'Estante',
        tipo: 'elementos',
        categoria: 'estantes',
        props: { system: true },
      },
      {
        id: 'contenedor_base',
        nombre: 'Contenedor',
        tipo: 'contenedores',
        categoria: 'contenedores',
        props: { system: true },
      },
    ]

    canvas.contextoNavegacion = { tipo: 'plantas', id: 'p1', path: [] }
    await nextTick()
    catalog.searchText = 'est'
    expect(catalog.filteredCatalogItems).toHaveLength(1)
    expect(catalog.filteredCatalogItems[0].id).toBe('estante_pared_pequeno')

    canvas.contextoNavegacion = { tipo: 'elementos', id: 'e1', path: [] }
    await nextTick()
    catalog.searchText = ''
    catalog.selectedCategory = 'contenedores'
    expect(catalog.filteredCatalogItems).toHaveLength(1)
    expect(catalog.filteredCatalogItems[0].id).toBe('contenedor_base')
  })
})
