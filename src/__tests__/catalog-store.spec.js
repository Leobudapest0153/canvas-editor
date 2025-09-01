import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from '@/stores/catalog'
import { JERARQUIA_PERMITIDA, CATALOGO } from '@/utils/constants'

describe('Catalog store', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCatalogStore()
    store.items = [
      {
        id: 'anaquel_metalico_grande',
        nombre: 'Anaquel',
        tipo: 'elementos',
        categoria: 'anaqueles',
        props: { system: true },
      },
      {
        id: 'estante_pared_pequeno',
        nombre: 'Estante de Pared',
        tipo: 'elementos',
        categoria: 'estantes',
        props: { system: true },
      },
      {
        id: 'barril_plastico_200l',
        nombre: 'Barril',
        tipo: 'elementos',
        categoria: 'barriles',
        props: { system: true },
      },
      {
        id: 'contenedor_base',
        nombre: 'Contenedor Base',
        tipo: 'contenedores',
        categoria: 'contenedores',
        props: { system: true },
      },
    ]
    store.searchText = ''
    store.selectedCategory = null
    store.setContext({ mode: 'root', currentId: undefined, currentType: undefined })
  })

  it('baseSystemGuard respects system and catalogVisible', () => {
    expect(store.baseSystemGuard({ props: { system: true } })).toBe(true)
    expect(store.baseSystemGuard({ props: { system: false } })).toBe(false)
    expect(
      store.baseSystemGuard({ props: { system: true, catalogVisible: false } }),
    ).toBe(false)
  })

  it('allowedTypesForContext derives from hierarchy', () => {
    expect(store.allowedTypesForContext({ mode: 'root' })).toEqual(
      JERARQUIA_PERMITIDA.plantas,
    )
    expect(store.allowedTypesForContext({ mode: 'detail-element' })).toEqual(
      JERARQUIA_PERMITIDA.elementos,
    )
    expect(store.allowedTypesForContext({ mode: 'detail-container' })).toEqual(
      JERARQUIA_PERMITIDA.contenedores,
    )
  })

  it('filters root catalog to base system keys', () => {
    const ids = store.filteredCatalogItems.map((i) => i.id)
    expect(ids.sort()).toEqual(CATALOGO.SISTEMA_BASE_KEYS.slice().sort())
  })

  it('filters by hierarchy and text', () => {
    store.setContext({ mode: 'detail-container' })
    store.searchText = 'barril'
    const ids = store.filteredCatalogItems.map((i) => i.id)
    expect(ids).toEqual(['barril_plastico_200l'])
  })

  it('applies category filter in pipeline', () => {
    store.setContext({ mode: 'detail-container' })
    store.selectedCategory = 'anaqueles'
    const ids = store.filteredCatalogItems.map((i) => i.id)
    expect(ids).toEqual(['anaquel_metalico_grande'])
  })
})
