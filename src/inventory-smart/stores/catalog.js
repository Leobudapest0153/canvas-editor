import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ELEMENTOS_PREDEFINIDOS, JERARQUIA_PERMITIDA, CATALOGO } from '@/inventory-smart/utils/constants'

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref(ELEMENTOS_PREDEFINIDOS)
  const searchText = ref('')
  const selectedCategory = ref(null)
  const selectedCatalog = ref('elementos')

  const catalogContext = ref({ mode: 'root', currentId: undefined, currentType: undefined })

  const baseSystemGuard = (item) =>
    item?.props?.system === true && item?.props?.catalogVisible !== false

  const allowedTypesForContext = (context) => {
    const map = {
      root: 'plantas',
      'detail-element': 'elementos',
      'detail-container': 'contenedores',
    }
    const parent = map[context.mode]
    return parent ? JERARQUIA_PERMITIDA[parent] || [] : []
  }

  const match = (texto) => (e) =>
    e?.nombre?.toLowerCase?.().includes(texto?.toLowerCase?.() ?? '')

  const filteredCatalogItems = computed(() => {
    let result = items.value.filter(baseSystemGuard)

    if (catalogContext.value.mode === 'root') {
      result = result.filter((item) => CATALOGO.SISTEMA_BASE_KEYS.includes(item.id))
    } else {
      const allowed = allowedTypesForContext(catalogContext.value)
      result = result.filter((item) => allowed.includes(item.tipo))
    }

    if (searchText.value) {
      result = result.filter(match(searchText.value))
    }

    if (selectedCategory.value) {
      result = result.filter((item) => item.categoria === selectedCategory.value)
    }

    return result
  })

  const setCatalogContext = (ctx) => {
    catalogContext.value = ctx
  }

  const setSelectedCatalog = (val) => {
    selectedCatalog.value = val
  }

  return {
    items,
    searchText,
    selectedCategory,
    selectedCatalog,
    catalogContext,
    setCatalogContext,
    setSelectedCatalog,
    allowedTypesForContext,
    baseSystemGuard,
    filteredCatalogItems,
  }
})
